#!/usr/bin/env python3
"""
ARBITER-MVP v2.2 — Monte Carlo readiness simulator (zero external dependencies).

Reads ./audit/01_findings.json, applies the fixed <scoring_constants> arithmetic,
runs N=10000 iterations with seed 424242, applies hard gates, and self-asserts
that its independently computed R_point matches the published value within 0.01.

PRNG: Linear Congruential Generator (a=1664525, c=1013904223, m=2**32) with the
Box-Muller transform, exactly as mandated by the zero-dependency fallback clause.
"""
import json, math, os, sys

SEED = 424242
N_ITER = 10000
SIGMA_BIAS = 3.0
GO_THRESHOLD = 75.0

BASE = {"P0": 45.0, "P1": 18.0, "P2": 6.0, "P3": 1.5}
GMULT = {"A": 1.00, "B": 0.90, "C": 0.70, "D": 0.45}
HALFW = {"A": 3.0, "B": 7.0, "C": 13.0, "D": 21.0}
WEIGHTS = {"D1": 18, "D2": 14, "D3": 14, "D4": 8, "D5": 8, "D6": 8,
           "D7": 7, "D8": 6, "D9": 6, "D10": 5, "D11": 3, "D12": 3}
GRADE_ORDER = {"A": 4, "B": 3, "C": 2, "D": 1}


def clamp(x, lo=0.0, hi=100.0):
    return max(lo, min(hi, x))


# ---------------------------------------------------------------- LCG + normals
class LCG:
    def __init__(self, seed):
        self.s = seed & 0xFFFFFFFF

    def u(self):
        self.s = (1664525 * self.s + 1013904223) & 0xFFFFFFFF
        return self.s / 4294967296.0

    def normal(self, mu=0.0, sigma=1.0):
        u1 = self.u()
        while u1 <= 1e-12:
            u1 = self.u()
        u2 = self.u()
        z = math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)
        return mu + sigma * z


def triangular(rng, a, mode, b):
    if b - a <= 1e-12:
        return mode
    c = (mode - a) / (b - a)
    u = rng.u()
    if u < c:
        return a + math.sqrt(u * (b - a) * (mode - a))
    return b - math.sqrt((1.0 - u) * (b - a) * (b - mode))


# ---------------------------------------------------------------- load findings
HERE = os.path.dirname(os.path.abspath(__file__))
# Optional re-run configuration (milestone close ritual). Defaults reproduce the
# original Phase 3 run byte-for-byte.
FINDINGS = sys.argv[1] if len(sys.argv) > 1 else "01_findings.json"
COVERAGE = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
EXPECTED_R = float(sys.argv[3]) if len(sys.argv) > 3 else 60.2916
OUT_PATH = sys.argv[4] if len(sys.argv) > 4 else "02_scorecard.json"
CORE_FAILED = (sys.argv[5].split(",") if len(sys.argv) > 5 and sys.argv[5] else ["D1"])
# Explicit dominant-grade overrides for dimensions with zero findings. Per the
# scoring contract the dominant grade of a zero-finding dimension is the HIGHEST
# grade at which that dimension was positively verified.
DOMINANT_OVERRIDE = json.loads(sys.argv[6]) if len(sys.argv) > 6 and sys.argv[6] else {}
with open(os.path.join(HERE, FINDINGS)) as fh:
    DOC = json.load(fh)

findings = DOC["findings"]
ledger = DOC["dimension_penalty_ledger"]

# ------------------------------------------------- dominant grade per dimension
dominant = {}
for d in WEIGHTS:
    items = ledger.get(d, [])
    if not items:
        dominant[d] = DOMINANT_OVERRIDE.get(d, "A")
        continue
    by_grade = {}
    for it in items:
        by_grade[it["grade"]] = by_grade.get(it["grade"], 0.0) + it["penalty"]
    best = max(by_grade.values())
    cands = [g for g, v in by_grade.items() if abs(v - best) < 1e-9]
    dominant[d] = sorted(cands, key=lambda g: -GRADE_ORDER[g])[0]

# --------------------------------------------------------- cap-2 / cap-4 inputs
# Cap 2: core verification command failed (exit != 0) for that dimension.
# Only D1's core journey execution failed: POST /api/chat returned HTTP 500 and
# J1/J2 could not be driven to a successful observable outcome (cmd#8).
CORE_CMD_FAILED = {d: True for d in CORE_FAILED}
PASS_RATE = 105.0 / 105.0
# Cap 3 inputs
JOURNEYS = DOC["journey_classification"]
VW = sum(1 for j in JOURNEYS if j["status"] == "VERIFIED_WORKING")
TOTAL_J = len(JOURNEYS)

# ------------------------------------------------------------------- raw scores
raw, dims = {}, {}
for d in WEIGHTS:
    pen = sum(it["penalty"] for it in ledger.get(d, []))
    raw[d] = clamp(100.0 - pen)

# recompute penalties from findings to prove the ledger is not hand-typed
recomputed = {d: 0.0 for d in WEIGHTS}
for f in findings:
    d = f["dimension"]
    recomputed[d] += BASE[f["severity"]] * f["confidence"] * GMULT[f["evidence_grade"]]
for d in WEIGHTS:
    assert abs(recomputed[d] - sum(i["penalty"] for i in ledger.get(d, []))) < 1e-6, \
        f"ledger mismatch for {d}: recomputed={recomputed[d]} ledger={sum(i['penalty'] for i in ledger.get(d, []))}"

# --------------------------------------------------------------- caps 1..4 + D
scores, trace = {}, {}
for d in WEIGHTS:
    steps = [("raw", raw[d])]
    s = raw[d]
    dg = dominant[d]
    if dg in ("C", "D"):                                  # Cap 1
        s2 = min(s, 55.0); steps.append(("cap1_evidence_quality", s2)); s = s2
    if CORE_CMD_FAILED.get(d):                             # Cap 2
        s2 = min(s, 30.0); steps.append(("cap2_execution_failure", s2)); s = s2
    if d == "D1":                                          # Cap 3
        s2 = min(s, 100.0 * (VW / max(1, TOTAL_J))); steps.append(("cap3_journey", s2)); s = s2
    if d == "D2":                                          # Cap 4
        s2 = min(s, 100.0 * (0.5 * PASS_RATE + 0.5 * min(COVERAGE / 70.0, 1.0)))
        steps.append(("cap4_coverage", s2)); s = s2
    allD = bool(ledger.get(d)) and all(i["grade"] == "D" for i in ledger[d])
    if allD:                                               # Grade D floor override
        s2 = clamp(s, 20.0, 55.0); steps.append(("grade_D_floor", s2)); s = s2
    scores[d] = round(s, 4)
    trace[d] = steps

# ------------------------------------------------------------- uncertainty band
bands = {}
for d in WEIGHTS:
    hw = HALFW[dominant[d]]
    if not ledger.get(d) and GRADE_ORDER[dominant[d]] >= GRADE_ORDER["B"]:
        hw = max(hw - 2.0, 2.0)
    bands[d] = (clamp(scores[d] - hw), scores[d], clamp(scores[d] + hw))

# ------------------------------------------------------------------- R_point
R_point = sum(WEIGHTS[d] / 100.0 * scores[d] for d in WEIGHTS)

# ---------------------------------------------------------------- Monte Carlo
rng = LCG(SEED)
results = []
for _ in range(N_ITER):
    eps = rng.normal(0.0, SIGMA_BIAS)
    acc = eps
    for d in WEIGHTS:
        lo, mode, hi = bands[d]
        acc += WEIGHTS[d] / 100.0 * triangular(rng, lo, mode, hi)
    results.append(clamp(acc))

SUL_raw = sum(1 for r in results if r >= GO_THRESHOLD) / float(N_ITER)
results_sorted = sorted(results)
p025 = results_sorted[int(0.025 * N_ITER)]
p975 = results_sorted[int(0.975 * N_ITER)]
mean = sum(results) / N_ITER

# ------------------------------------------------------------------ hard gates
sev_counts = {"P0": 0, "P1": 0, "P2": 0, "P3": 0}
for f in findings:
    sev_counts[f["severity"]] += 1
broken = [j["id"] for j in JOURNEYS if j["status"] == "BROKEN"]

gates = []
SUL = SUL_raw
if sev_counts["P0"] >= 1:
    SUL = min(SUL, 0.05); gates.append("P0_count>=1 -> SUL<=0.05")
if sev_counts["P1"] >= 5:
    SUL = min(SUL, 0.35); gates.append("P1_count>=5 -> SUL<=0.35")
if broken:
    SUL = min(SUL, 0.10); gates.append("primary journey BROKEN -> SUL<=0.10")


def letter(x):
    for t, g in [(95, "A+"), (90, "A"), (85, "A-"), (80, "B+"), (75, "B"), (70, "B-"),
                 (65, "C+"), (60, "C"), (55, "C-"), (45, "D")]:
        if x >= t:
            return g
    return "F"


# ------------------------------------------------------- script self-assertion
assert abs(R_point - EXPECTED_R) < 0.01, \
    f"R_point self-assertion FAILED: computed {R_point:.4f} vs expected {EXPECTED_R}"

out = {
    "engine": "ARBITER-MVP v2.2 scoring constants (fixed)",
    "prng": "LCG a=1664525 c=1013904223 m=2**32 + Box-Muller",
    "seed": SEED, "iterations": N_ITER, "sigma_bias": SIGMA_BIAS,
    "inputs": {"findings_file": FINDINGS, "coverage_pct": COVERAGE,
               "pass_rate": PASS_RATE, "core_cmd_failed_dims": CORE_FAILED},
    "severity_counts": sev_counts,
    "journeys": {"total": TOTAL_J, "verified_working": VW,
                 "partial": sum(1 for j in JOURNEYS if j["status"] == "PARTIAL"),
                 "broken": len(broken),
                 "untestable": sum(1 for j in JOURNEYS if j["status"] == "UNTESTABLE"),
                 "broken_ids": broken},
    "dominant_grade": dominant,
    "raw_scores": {d: round(raw[d], 4) for d in WEIGHTS},
    "cap_trace": {d: [(n, round(v, 4)) for n, v in t] for d, t in trace.items()},
    "dimension_scores": scores,
    "uncertainty_bands": {d: [round(bands[d][0], 4), round(bands[d][1], 4), round(bands[d][2], 4)] for d in WEIGHTS},
    "weights": WEIGHTS,
    "R_point": round(R_point, 4),
    "letter_grade": letter(R_point),
    "monte_carlo": {
        "SUL_raw": round(SUL_raw, 4), "SUL_after_gates": round(SUL, 4),
        "hard_gates_tripped": gates,
        "mean": round(mean, 4), "p2_5": round(p025, 4), "p97_5": round(p975, 4),
        "ci_95": [round(p025, 4), round(p975, 4)],
    },
    "self_assertion": {"expected_R_point": EXPECTED_R, "computed_R_point": round(R_point, 4), "passed": True},
}

print(json.dumps(out, indent=2))

with open(os.path.join(HERE, OUT_PATH), "w") as fh:
    json.dump(out, fh, indent=2)
    fh.write("\n")
