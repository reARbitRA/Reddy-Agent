# ARBITER-MVP v2.2 — Launch Readiness Audit & Autonomous Remediation

**Repository:** `reARbitRA/Reddy-Agent`
**Audit base:** `b88f913ff9da55e755560e9cef43d4bb2f1fbc14` (2026-09-29)
**Remediation tip:** `1e17980` on `arena/01a1097d-reddy-agent` (10 commits)
**Audit window:** 2026-10-05 00:37Z → 01:20Z
**Validation stamp:** `DEGRADED — SINGLE-MODEL` (no independent model available in this environment)

---

## 1. Executive adjudication — BEFORE vs AFTER

```
═══════════════════════════════════════════════════════════
  ARBITER-MVP v2.2 — LAUNCH ADJUDICATION — b88f913f (BEFORE)
═══════════════════════════════════════════════════════════
  VERDICT            : NO-GO — BLOCKED
  SCORE-ROBUSTNESS   : SUL 0.00
  READINESS SCORE    : 60.2916 / 100  (Grade C)
  95% CI (MC)        : [53.8196, 66.4196]  N=10000 seed=424242 ε~N(0,3)
  AUDIT CONFIDENCE   : 92.21%  (Coverage: 86.49%, Grade A/B: 96.55%, Spot-Check: 100%)
  ───────────────────────────────────────────────────────────
  P0: 2   P1: 6   P2: 15   P3: 6        (29 findings)
  JOURNEYS           : 6 VERIFIED / 0 PARTIAL / 2 BROKEN / 1 UNTESTABLE
  UNMET CONDITIONS   : 2 open P0 · 2 journeys BROKEN · 6 open P1 · SUL 0.00 · no LICENSE · no CI
  HARD GATES TRIPPED : P0>=1 (SUL<=0.05) · P1>=5 (SUL<=0.35) · journey BROKEN (SUL<=0.10)
  ───────────────────────────────────────────────────────────
  DISTANCE TO GO     : 14.7084 pts | 11.25 hrs (9.25 autonomous)
  TOP 5 BLOCKERS     : F-SEC-001 · F-EXEC-001 · F-SEC-002 · F-EXEC-002 · F-EXEC-004
═══════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════
  ARBITER-MVP v2.2 — LAUNCH ADJUDICATION — e2b9745 (AFTER)
═══════════════════════════════════════════════════════════
  VERDICT            : CONDITIONAL GO
  SCORE-ROBUSTNESS   : SUL 0.8010
  READINESS SCORE    : 77.9168 / 100  (Grade B)
  95% CI (MC)        : [71.5734, 83.7067]  N=10000 seed=424242 ε~N(0,3)
  AUDIT CONFIDENCE   : 92.21%  (Coverage: 86.49%, Grade A/B: 96.55%, Spot-Check: 100%)
  ───────────────────────────────────────────────────────────
  P0: 0   P1: 3   P2: 4   P3: 3         (10 open findings)
  JOURNEYS           : 6 VERIFIED / 1 PARTIAL / 0 BROKEN / 2 UNTESTABLE
  UNMET CONDITIONS   :
    · J1 (agent chat) UNTESTABLE — no API key and no provider egress in this sandbox
    · J8 (Google Workspace) UNTESTABLE — no browser or Google account available
    · J2 PARTIAL — save/status verified, the live provider ping is environment-blocked
    · F-EXEC-004 (no active CI) — the GitHub App lacks the 'workflows' permission
    · F-LEGAL-001 (no LICENSE) — requires an owner decision
    · F-SEC-003 (excessive Gmail OAuth scopes) — requires an owner decision
  HARD GATES TRIPPED : NONE
  ───────────────────────────────────────────────────────────
  DISTANCE TO GO     : 0 pts | 2.25 human-gated hrs
  TOP 5 REMAINING    : F-LEGAL-001 · F-SEC-003 · F-EXEC-004 · F-QUAL-001 · F-OPS-001
═══════════════════════════════════════════════════════════
```

**Verdict walk (AFTER), top-down, first match wins:**

| Rule | Condition | Result |
|---|---|---|
| 1 | P0 ≥ 1 or any journey BROKEN | NO — 0 P0, 0 BROKEN |
| 2 | SUL < 0.35 | NO — 0.8010 |
| 3 | SUL < 0.60 | NO |
| 4 | SUL ≥ 0.85 **and** P1 ≤ 2 **and** all journeys VW | NO — SUL 0.8010 < 0.85, P1 = 3 > 2, and journeys are not all VW |
| 5 | otherwise | **CONDITIONAL GO** |

The score is above the 75-point threshold and no hard gate is tripped, but a CONDITIONAL GO is
the strongest verdict the evidence supports: **the single most important journey — talking to the
agent — has never been observed working in this environment.** The specific blocker that made it
BROKEN (a provider model Google shut down on 2025-09-29) is fixed and pinned by tests, but
positively verifying J1 requires a `GEMINI_API_KEY` and outbound HTTPS to
`generativelanguage.googleapis.com`, neither of which exists here.

---

## 2. Delta table

| Dim | Weight | Before | After | Δ | Cap applied | Tasks |
|---|---|---|---|---|---|---|
| D1 Core completeness | 18 | 30.00 | 30.00 | **0.00** | Cap 2 (execution) + Cap 3 (journeys 6/9) | T-002 |
| D2 Correctness & tests | 14 | 50.00 | 70.82 | **+20.82** | Cap 4 (coverage 29.15 %) | T-005, T-017 |
| D3 Security & secrets | 14 | 3.28 | 85.54 | **+82.26** | — | T-001, T-003, T-010, T-019, T-021, T-022 |
| D4 Data integrity | 8 | 90.01 | 95.68 | **+5.67** | — | T-011, T-018 |
| D5 Build, CI, reproducibility | 8 | 82.00 | 82.00 | **0.00** | — | T-004 **PARTIAL** — workflow authored but not installable (§6) |
| D6 Deploy & runtime | 8 | 88.00 | 94.00 | **+6.00** | — | T-009 |
| D7 Errors, logs, observability | 7 | 88.00 | 100.00 | **+12.00** | — | T-012, T-013 |
| D8 Performance & scale | 6 | 93.10 | 97.69 | **+4.59** | — | T-014, T-020 |
| D9 API/contract stability | 6 | 82.72 | 100.00 | **+17.28** | — | T-006, T-023 |
| D10 Code quality | 5 | 92.65 | 94.00 | **+1.35** | — | T-016 |
| D11 Docs & onboarding | 3 | 98.65 | 100.00 | **+1.35** | — | T-015 |
| D12 Legal & compliance | 3 | 77.68 | 77.68 | **0.00** | — | blocked (T-007, T-028) |
| **R_point** | 100 | **60.2916** | **77.9168** | **+17.6252** | | |

**Why D1 did not move.** `resolveModel()` removes the retired-model blocker and is verified by 9
tests, but Cap 2 still applies: `POST /api/chat` cannot be driven to a successful observable
outcome in this sandbox in either state. The cap encodes exactly that epistemic limit, and it was
applied identically before and after rather than relaxed to show progress.

---

## 3. Validation certificates

| Phase | Scope | Validator | Result |
|---|---|---|---|
| 5 (initial) | Full audit | `NONE_AVAILABLE` — cross-implementation re-derivation (Node/JS vs Python) | `MAD 0.000000` · `MAX_DEV 0.000000` · `ΔR 0.000000` · `P0_Jaccard 1.0000` · `HALLUC 0` · spot-check **10/10** → arithmetic **PASS**, stamped **DEGRADED — SINGLE-MODEL** |
| 5 reconciliation | F-SEC-003 severity/journey consistency | rule re-application | Divergence found (`P0_Jaccard 0.6667`), resolved on the merits, `1.0000` after |
| Milestone close | Post-remediation dimensions | same | `MAD 0.000002` · `MAX_DEV 0.000029` · `ΔR 0.000000` → **PASS** |

**Freeze hashes** (`audit/04_validation.json`):
`mvp_definition` `13e423b8…` · `01_findings.json` `777bcdbf…` · `relevant_file_set` `efeb8686…`

**What DEGRADED means here, plainly.** There is no second model in this environment, so discovery
and severity assignment are single-model. The agreement metrics prove the *arithmetic* is
reproducible across two independent implementations; they cannot detect a missed P0. Every verdict
downstream inherits that risk.

---

## 4. Codebase quality ratings

**Overall:** `C` (60.29) → **`B`** (79.36)

| Module | Before | After | Basis |
|---|---|---|---|
| `core/memory.ts` | B+ | A | Bounded summary, 12 tests, 100 % statements |
| `core/registry.ts` | A | A | 100 % coverage, unchanged |
| `core/engine.ts` | B | A− | Tool-call turn recorded, 8 tests, 100 % statements |
| `core/orchestrator.ts` | C+ | B | Model resolver + timeout + tri-state validation; 66.66 % statements, real round-trip unverified |
| `server.ts` | D | B | Contained purge, auth, health, logging, safe ids — but 0 % in-process coverage (out-of-process tests) and still synchronous fs in the purge path |
| `src/App.tsx` | D+ | C | 1186 LOC god component; silent catches closed, nothing decomposed |
| `src/components/WorkspaceWidget.tsx` | C− | C− | 845 LOC, untouched; J8 untestable |
| `src/components/KeyDeck.tsx` | B− | B+ | Tri-state validation with an explicit Save-Anyway path |
| `tests/` | B | A− | 57 → **105** tests, 7 → 8 files, hermetic, coverage-instrumented |
| `scripts/` | A | A | Both verifiers still pass |

---

## 5. Code modification accounting

| Metric | Value |
|---|---|
| Commits | 10 |
| Files changed (code, excl. `audit/` and lockfile) | 20 (+1 relocated to `audit/proposed-ci/`) |
| Lines | **+1 129 / −72** |
| Test lines | **+623 / −5** |
| Tests | 57 → **105** (+48) |
| Test files | 7 → **8** (new: `tests/auth.test.ts`) |
| Coverage | not measurable → **29.15 % statements / 30.41 % branches / 40.84 % functions** |
| `npm audit` | 12 advisories (7 high, 5 moderate) → **4 (all high, all unreachable)** |
| Secrets in the diff | **0** signature hits across 417 291 diff bytes |
| Tests skipped / weakened / deleted | **0** — all 57 original assertions preserved verbatim |

---

## 6. Could-not-do ceiling

| task_id | Reason | Required human action | Effort | Blocks launch |
|---|---|---|---|---|
| T-007 (F-LEGAL-001) | Choosing a licence transfers rights | Pick MIT / Apache-2.0 / proprietary and add `LICENSE` | 0.5 h | **Y** — no redistribution without it |
| T-008 (F-SEC-003) | Scope reduction removes capability; OAuth verification is an owner action | Approve the minimum scope set; complete Google OAuth verification (restricted scope `mail.google.com` needs a third-party security assessment) | 1.5 h | **Y** for the Workspace panel |
| T-024 (F-QUAL-001) | 1186- and 845-LOC components, no component test harness | Approve a component test strategy (jsdom + Testing Library) | 6 h | N |
| T-026 (F-OPS-001) | No `docker` binary — a Dockerfile could be written but never built or smoke-tested here | Build and smoke-test the image in an environment with Docker | 1.5 h | N |
| T-027 (F-DATA-002) | Storage-backend selection is left open by the README | Choose SQLite vs JSON file vs hosted store | 4 h | N |
| T-028 (F-LEGAL-002) | A privacy policy is a legal artefact | Draft and publish; then wire the UI "clear local data" control | 2 h | N |
| T-004 (F-EXEC-004) | **PARTIAL** — the workflow is complete and every command in it ran locally with exit 0, but the push of `.github/workflows/ci.yml` was rejected: *refusing to allow a GitHub App to create or update workflow without `workflows` permission*. Preserved at `audit/proposed-ci/ci.yml`. | `cp audit/proposed-ci/ci.yml .github/workflows/ci.yml` and push from an identity holding the `workflows` permission (or grant the App it) | 0.25 h | **Y** (P1) |
| — (J1 verification) | No `GEMINI_API_KEY`, egress to `generativelanguage.googleapis.com` blocked | Run `npm run dev` with a real key and exercise a chat turn | 0.25 h | **Y** for a confident GO |

---

## 7. Residual risk register

| ID | Sev | Blast radius | Residual risk | Mitigation in place |
|---|---|---|---|---|
| F-LEGAL-001 | P1 | legal | No licence ⇒ default all-rights-reserved; nobody may legally copy or deploy | README states it; CI does not gate on it |
| F-SEC-003 | P1 | single-user | `https://mail.google.com/` + `gmail.send/modify/compose` requested for a dashboard; a compromised build can read and send the user's mail | 4 `window.confirm` gates on destructive actions; token kept in browser memory only |
| F-EXEC-004 | P1 | engineering-process | No active CI — lint / test / build / verify / audit / boot-smoke enforce nothing, so a regression can land on main silently | Workflow content complete at `audit/proposed-ci/ci.yml`; one `cp` + push by an authorised identity |
| F-QUAL-001 | P2 | all-users | Two god components; no component-level tests, so UI regressions are invisible | 105 server/core tests; UI untouched by this remediation |
| F-OPS-001 | P2 | total-outage | No container spec, no restart policy, no declared Node version (`engines` still absent) | CI pins Node 22 for the build |
| F-DATA-002 | P2 | data-loss | Restart silently destroys knowledge entries, protocols, skills and telemetry | README discloses; no export path yet |
| F-SEC-007 | P3 | all-users | 4 high advisories in `@grpc/grpc-js@1.9.16` via `@firebase/firestore` | Unreachable (no firestore import); CI hard-fails on critical |
| F-RELY-003 | P3 | all-users | Purge scanner/rewrite still synchronous on the event loop | Provider timeout added; purge is behind auth and rate-independent |
| F-RELY-004 | P3 | all-users | 943 kB single-chunk bundle | Vite warns; no split yet |
| — | — | all-users | **J1 never positively verified.** The provider round-trip is unproven in this environment | 9 resolver tests; `MODEL_RETIRED` fails loudly instead of 404ing silently |

---

## 8. Distance to GO

- **Points needed:** `max(0, 75 − 77.9168)` = **0** — the score threshold is already met.
- **What still gates a full GO:** SUL 0.8010 < 0.85, three open P1s, and two UNTESTABLE journeys.
  None of these is engineering-blocked; all are human-gated or environment-gated.
- **Critical path:** ~2.25 h of human decisions (licence 0.5 h · OAuth scopes 1.5 h · CI install
  0.25 h) plus a 15-minute smoke test with a real `GEMINI_API_KEY`.

**Top 10 next actions**

1. Set `GEMINI_API_KEY`, run `npm run dev`, send one chat turn, confirm a real response. This is the
   single highest-value action in the list — it converts J1 from UNTESTABLE to VERIFIED.
2. `cp audit/proposed-ci/ci.yml .github/workflows/ci.yml` and push it — completes T-004.
3. Add a `LICENSE` (T-007).
4. Reduce the OAuth scopes and start Google OAuth verification (T-008).
5. Set `REDDY_API_TOKEN` in every non-localhost deployment; the anonymous fallback is dev-only.
6. Restrict the Firebase web API key by HTTP referrer and enable App Check for Auth.
7. Publish a privacy policy (T-028).
8. Add a `Dockerfile` and build it where Docker exists (T-026).
9. Persist the knowledge vault (T-027).
10. Convert the purge scanner to `fs.promises` (residual F-RELY-003) and decompose `App.tsx` /
    `WorkspaceWidget.tsx` behind a component test harness (T-024).

---

## 9. Operational launch runbook

**Deploy**
1. `npm ci` (Node 22; add an `engines` field — see F-OPS-001).
2. `npm run build` → `dist/assets/*` + `dist/server.cjs`.
3. Set `REDDY_API_TOKEN` (mandatory off-localhost), `GEMINI_API_KEY`, `NODE_ENV=production`, `PORT`.
   Optionally `GEMINI_MODEL`, `GEMINI_TIMEOUT_MS`, `REDDY_KEY_RATE_LIMIT`, `ALLOWED_DEV_HOSTS`,
   `REDDY_ALLOW_EMBEDDING`.
4. `npm start`. Put an HTTPS-terminating proxy in front; the server binds `0.0.0.0`.

**Smoke tests (all must pass)**
```
curl -sf  -H "authorization: Bearer $REDDY_API_TOKEN" $URL/api/health   # 200 {"status":"ok"}
curl -s -o /dev/null -w '%{http_code}' $URL/api/health                  # 401
curl -s -o /dev/null -w '%{http_code}' -H "authorization: Bearer $REDDY_API_TOKEN" $URL/api/nope  # 404 JSON
curl -s -o /dev/null -w '%{http_code} %{content_type}' $URL/            # 200 text/html
curl -s -X POST -H "authorization: Bearer $REDDY_API_TOKEN" -H 'content-type: application/json' \
     -d '{"message":"ping","session_id":"smoke"}' $URL/api/chat         # 200 with a real key
curl -s -X POST -H 'content-type: application/json' \
     -d '{"items":[{"file":"../../etc/hostname","line":1,"text":"x","category":"MOCK_STATIC_DATA"}]}' \
     -H "authorization: Bearer $REDDY_API_TOKEN" $URL/api/purge/execute # 400 PURGE_PATH_REJECTED
```

**Monitoring**
- One structured JSON line per request carries `request_id`, `method`, `path`, `status`,
  `duration_ms`. Correlate it with the `x-request-id` response header.
- `PURGE_PATH_REJECTED` warnings in the log are attack or client-bug signal — alert on them.
- `Key Validation Failed {"reason":"transport"}` spikes mean provider egress, not bad keys.

**Rollback criteria and steps**
- Roll back immediately on: any 5xx rate above baseline, `PURGE_PATH_REJECTED` from a known-good
  client, `MODEL_RETIRED` in the log (means `GEMINI_MODEL` was set to a dead model), or CSP
  violations blocking the dashboard.
- Steps: redeploy the previous `dist/` bundle (`git revert` the offending commit, `npm ci`,
  `npm run build`, restart). No migrations exist, so there is no data rollback — but note that a
  restart clears all in-memory state (F-DATA-002).

---

## 10. Evidence appendix

Every claim above traces to a command executed or a file opened in this session. Key tokens:

| Token | What it establishes |
|---|---|
| `[E:cmd#1]` | HEAD SHA, branch list, clean tree, 1 reachable commit |
| `[E:cmd#2]` | Baseline: lint 0, **57/57 tests**, and the live outbound call trace |
| `[E:cmd#4]` | Baseline build: 943.84 kB chunk + Vite warning |
| `[E:cmd#6]` | `npm audit` 12 advisories (7 high, 5 moderate) |
| `[E:cmd#8]` | Production smoke: `/api/health` → 200 HTML, `X-Powered-By` present |
| `[E:cmd#9]` | **Path-traversal PoC executed** — file outside the project root rewritten |
| `[E:cmd#10]` | No LICENSE tracked |
| `[E:cmd#13]` | Secret signature scan: 2 hits, both reported redacted |
| `[E:cmd#16]` | No `.github`, no Dockerfile, no `mise.toml`/`.nvmrc` |
| `[E:cmd#30]` | Post-update audit: 4 advisories, all high, all unreachable |
| `[E:server.ts:134-160]` | `path.join(process.cwd(), filePath)` + `fs.writeFileSync` |
| `[E:core/orchestrator.ts:52]` | The retired `gemini-1.5-flash` pin |
| `[E:url:https://ai.google.dev/gemini-api/docs/changelog]` | Gemini 1.5 models shut down 2025-09-29 |
| `[E:url:https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash]` | `gemini-3.8-flash` GA 2026-09-02 |
| `[E:src/lib/firebase.ts:11-18]` | Eight OAuth scopes incl. `https://mail.google.com/` |

**Seeded deterministic spot-check** — `int(sha256(HEAD_SHA + str(i))[:8], 16) mod total_tokens`:
- Pre-remediation set (66 tokens): **10/10 confirmed**, including live re-execution of `[E:cmd#9]`.
- Post-remediation set (14 tokens, 6 distinct): **10/10 confirmed**.

---

## 11. Assumptions register

| id | Statement | Impact | Verification attempted | Result | Could change verdict |
|---|---|---|---|---|---|
| A-01 | `gemini-1.5-flash` returns 404 for every request | H | Tried to call the provider from the sandbox | **UNVERIFIABLE** — egress blocked; rests on Google's published lifecycle docs (Grade C) | **Yes** — if the model somehow still served, J1 was never BROKEN and the BEFORE score was understated |
| A-02 | `gemini-3.8-flash` is a currently supported stable model | H | Fetched Google's model documentation | **CONFIRMED** (Grade C) | Yes — a wrong default would re-break J1 |
| A-03 | The 4 residual high advisories are unreachable | M | Grepped the import graph for `firestore` | **CONFIRMED** — zero references; only `firebase/app` + `firebase/auth` imported | No |
| A-04 | Firebase web API keys are public-by-design client config | L | Read the file and the README statement | **CONFIRMED** as intent; console referrer restrictions **UNVERIFIABLE** from the repo | No |
| A-05 | The Workspace widget works against real Google APIs | M | No browser or Google account available | **UNVERIFIABLE** (J8) | Yes — a broken J8 would not change the verdict but would lower D1 |
| A-06 | The GitHub Actions workflow will run green | M | Every command in it was executed locally; the workflow itself never ran on GitHub | **PARTIALLY CONFIRMED** (Grade C for the CI runtime) | No |
| A-07 | The test-helper fetch wrapper does not weaken any pre-existing assertion | M | Diffed the 57 original tests | **CONFIRMED** — assertion bodies unchanged | No |
| A-08 | `allowedHosts` narrowing does not break hosted previews | M | Verified the config change; preview not exercised | **UNVERIFIED** — `ALLOWED_DEV_HOSTS` exists as the escape hatch | No |

---

## 12. Mandatory honesty statement

I verified claims by execution (Grade A) where a command was run and its exit code and output
observed — the baseline and post-remediation suites, both smoke tests, the traversal PoC, the
secret scan, `npm audit`, the build and both verifiers; by file inspection (Grade B) for every
source read this session; by declaration (Grade C) for the Gemini model lifecycle and the CI
runtime; and by inference (Grade D) only for J8's browser behaviour. Deterministic spot-check:
**10/10 confirmed** on both the pre- and post-remediation evidence sets. **SUL measures readiness
score stability across the Monte Carlo band, not real-world commercial success probability.**
Validator `NONE_AVAILABLE`: cross-implementation re-derivation gave R = 77.9168, MAD = 0.000002,
ΔR = 0.000000 — arithmetic agreement only, **not** independent discovery; a missed P0 would not
have been detected. Potential prompt injections quarantined: **0** — a targeted signature sweep
found none. All repository text was treated as untrusted data. Zero secrets echoed in plain text
(the Firebase web key appears only as `[REDACTED:GENERIC:****Guus:len=39:sha256=7bd73af1]`); zero
credentials tested for liveness.

**Two errors and one blocked deliverable of my own are recorded rather than buried:**
1. **F-RELY-001 undercounted silent catch blocks (7 reported, 14 actual).** The Phase 2 grep
   pattern matched only the spaced `} catch (e) {}` form. The first T-012 verification command
   passed while the criterion was unmet, because it reused the same incomplete pattern. All 14 are
   now closed and the corrected grep returns 0.
2. **The push of `.github/workflows/ci.yml` was rejected by GitHub** — *refusing to allow a GitHub
   App to create or update workflow without `workflows` permission*. I did not work around it: the
   file now lives at `audit/proposed-ci/ci.yml`, T-004 is recorded **PARTIAL**, F-EXEC-004 was
   **reopened** as an open P1, and the score was recomputed downward (79.3568 → 77.9168) rather
   than left at the pre-rejection figure.
3. **F-SEC-003's `blocks_journey` was inconsistent with its severity.** An independent
   re-application of the severity rules returned `P0_Jaccard 0.6667`. J8 is UNTESTABLE, not
   BROKEN — excessive scopes impose a distribution gate, they do not break the code path. The
   annotation was corrected on the merits; no score input changed.

**What I could not verify, stated plainly:** the agent chat journey has never been observed
working in this environment. Everything in this report about J1 rests on code reading, unit tests
of the resolver, and Google's published model lifecycle — not on a successful request.
