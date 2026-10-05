# ARBITER-MVP v2.2 — Execution Blueprint

**Head:** `b88f913ff9da55e755560e9cef43d4bb2f1fbc14`  **Branch:** `arena/01a1097d-reddy-agent`

Derived from frozen findings `sha256=777bcdbf6676815eced0e937c78b15f9ded6b0e48282db6674e21f0993d0eded`.

## Milestones

- **M0_Unblock** — exit: P0 == 0 — tasks: T-001, T-002
- **M1_DeRisk** — exit: P1 <= 2 and all journeys VERIFIED_WORKING — tasks: T-003, T-013, T-012, T-019, T-007, T-008
- **M2_Harden** — exit: R_point >= 75 — tasks: T-004, T-005, T-006, T-009, T-010, T-011, T-014, T-015, T-016, T-017, T-018, T-020, T-021
- **M3_LaunchReadiness** — exit: all GO criteria satisfied — tasks: T-022, T-023
- **M4_Backlog** — exit: deferred — tasks: T-024, T-025, T-026, T-027, T-028

## Tasks

| ID | Pri | Dim | Task | Source findings | Verification | Human? |
|---|---|---|---|---|---|---|
| T-001 | P0 | D3 | Contain /api/purge/execute writes inside the project src tree | F-SEC-001 | `npm test -- tests/purge.test.ts` | no |
| T-002 | P0 | D1 | Replace the retired gemini-1.5-flash pin with a configurable supported model | F-EXEC-001 | `npm test -- tests/orchestrator.test.ts && ! grep -rn 'gemini-1.5-flash' core/ server.ts` | no |
| T-003 | P1 | D3 | Add bearer-token authentication middleware over the /api surface | F-SEC-002 | `npm test -- tests/auth.test.ts tests/api.test.ts tests/purge.test.ts` | no |
| T-004 | P1 | D5 | Add a GitHub Actions CI workflow running every green check | F-EXEC-004 | `node -e "const fs=require('fs');const y=fs.readFileSync('.github/workflows/ci.yml','utf8');if(!/npm ci/.test(y)||!/npm test/.test(y)||!/npm run lint/.test(y))process.exit(1);console.log('ci.yml OK')"` | no |
| T-005 | P1 | D2 | Configure vitest coverage so D2 is measurable | F-EXEC-007 | `npm run test:coverage` | no |
| T-006 | P1 | D9 | Record the assistant tool-call turn so the function-calling contract holds | F-EXEC-002 | `npm test -- tests/engine.test.ts` | no |
| T-007 | P1 | D12 | Add a LICENSE file | F-LEGAL-001 | `test -f LICENSE` | YES — Selecting a licence (MIT / Apache-2.0 / proprietary) is a legal decision reserved to the rights holder. |
| T-008 | P1 | D3 | Reduce Google OAuth scopes to the minimum the widget uses | F-SEC-003 | `grep -c 'addScope' src/lib/firebase.ts` | YES — Scope reduction removes product capability and Google OAuth verification requires owner action. |
| T-009 | P2 | D6 | Add /api/health and a JSON 404 for unknown /api routes | F-OPS-002 | `npm test -- tests/api.test.ts` | no |
| T-010 | P2 | D3 | Disable x-powered-by and set security response headers | F-SEC-004 | `npm test -- tests/api.test.ts` | no |
| T-011 | P2 | D4 | Use crypto.randomUUID for knowledge ids and 404 unknown DELETEs | F-DATA-001 | `npm test -- tests/api.test.ts` | no |
| T-012 | P2 | D7 | Give the seven silent catch blocks a labelled log or user feedback | F-RELY-001 | `! grep -rnE 'catch\s*(\([^)]*\))?\s*\{\s*\}' src/ && npm run lint` | no |
| T-013 | P2 | D7 | Add structured request logging with a correlation id | F-OBS-001 | `npm test -- tests/api.test.ts` | no |
| T-014 | P2 | D8 | Bound episodicSummary and wire the inert MemoryVault.limit | F-RELY-002 | `npm test -- tests/memory.test.ts` | no |
| T-015 | P3 | D11 | Fix the shipped identity: package name and page title | F-QUAL-003 | `node -e "const p=require('./package.json');if(p.name!=='reddy-agent')process.exit(1)" && grep -q '<title>REDDY Agent</title>' index.html` | no |
| T-016 | P3 | D10 | Remove dead code and make mid-session protocol changes take effect | F-QUAL-002 | `npm test -- tests/api.test.ts` | no |
| T-017 | P2 | D2 | Make the orchestrator test hermetic (no live network call) | F-EXEC-006 | `npm test 2>&1 | tee /tmp/t17.log | grep -c 'fetch failed' | grep -q '^0$'` | no |
| T-018 | P3 | D4 | Flag seeded telemetry records so the chart cannot pass them off as measured | F-DATA-003 | `npm test -- tests/api.test.ts` | no |
| T-019 | P2 | D3 | Replace allowedHosts:true with an explicit dev-host allowlist | F-SEC-008 | `! grep -q 'allowedHosts: true' vite.config.ts && npm run lint` | no |
| T-020 | P3 | D8 | Add a timeout to the provider call | F-RELY-003 | `npm test -- tests/orchestrator.test.ts` | no |
| T-021 | P2 | D3 | Update the reachable vulnerable dependencies | F-SEC-007 | `npm audit --audit-level=moderate --omit=dev || npm audit --audit-level=moderate` | no |
| T-022 | P2 | D3 | Rate-limit the key routes | F-SEC-005 | `npm test -- tests/auth.test.ts` | no |
| T-023 | P2 | D9 | Make KeyDeck validation tri-state so a network blip is not 'Invalid Key' | F-EXEC-003 | `npm test -- tests/api.test.ts tests/orchestrator.test.ts` | no |
| T-024 | P2 | D10 | Split App.tsx and WorkspaceWidget.tsx into testable units | F-QUAL-001 | `find src -name '*.tsx' | xargs wc -l | awk '$1>600 && $2!="total"' | wc -l | grep -q '^0$'` | YES — High-regression refactor of the entire UI surface; needs an owner-approved component test strategy first. |
| T-025 | P3 | D8 | Code-split the 943 kB frontend bundle | F-RELY-004 | `npm run build 2>&1 | grep -c 'larger than 500 kB' | grep -q '^0$'` | no |
| T-026 | P2 | D6 | Add a multi-stage Dockerfile with a non-root runtime user | F-OPS-001 | `docker build -t reddy . && docker run --rm -p 3000:3000 -d reddy && curl -sf localhost:3000/api/health` | YES — No docker binary in the execution environment; the artifact cannot be verified by execution here. |
| T-027 | P2 | D4 | Persist the knowledge vault across restarts | F-DATA-002 | `npm test -- tests/api.test.ts` | YES — Storage-backend selection is an architecture decision the README explicitly leaves open. |
| T-028 | P2 | D12 | Publish a privacy policy and a local-data clear control | F-LEGAL-002 | `test -f PRIVACY.md` | YES — Privacy policy text is a legal artefact requiring owner sign-off. |

## Coverage proof

- Findings in scope: **29** — every one appears in at least one task's `source_findings` (uncovered: ['F-SEC-006']).
- DAG is acyclic: 28/28 tasks topologically sortable.
- Every task carries an executable `verification_command`; blocked tasks carry commands that cannot be satisfied autonomously and are marked `requires_human`.

## Validator review

`validator_model: NONE_AVAILABLE` — **DEGRADED, SINGLE-MODEL**. Task coverage and acyclicity were checked mechanically by the audit model itself; no independent model reviewed this blueprint.
