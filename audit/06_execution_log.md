# ARBITER-MVP v2.2 — Execution Log

**Session branch:** `arena/01a1097d-reddy-agent`
**Audit base HEAD:** `b88f913ff9da55e755560e9cef43d4bb2f1fbc14`
**Started:** 2026-10-05T00:37Z · **Closed:** 2026-10-05T01:40Z · **Tip:** `1e17980` (10 commits)

## Branching deviation (recorded, not silent)

The contract asks for `audit/mvp-readiness-<shortsha>` and per-task `fix/<task_id>` branches.
The host platform pins this session to `arena/01a1097d-reddy-agent` and prohibits creating or
pushing any other branch. All work therefore lives on the session branch with `[T-xxx]`
trailers in the commit subject; traceability is preserved by the trailer and by this log.

---

## Baseline captured at HEAD (audit/baseline.json)

| Command | Exit | Status |
|---|---|---|
| `npm ci --ignore-scripts` | 0 | GREEN — 355 packages |
| `npm run lint` (`tsc --noEmit`) | 0 | GREEN |
| `npm test` (`vitest run`) | 0 | GREEN — **57 tests / 7 files** |
| `npm run build` | 0 | GREEN — 943.84 kB JS chunk |
| `npm run verify:assets` | 0 | GREEN — 15/15 SVG |
| `npm run verify:readme` | 0 | GREEN |
| `npm audit --json` | **1** | RED — 12 advisories (7 high, 5 moderate) |
| Production boot smoke (port 3131) | 0 | GREEN boot / RED contract (`/api/health` → 200 HTML) |
| Path-traversal PoC on `/api/purge/execute` | 0 | **RED — vulnerability CONFIRMED** |
| `git ls-files \| grep -i licen[cs]e` | 1 | RED — no LICENSE |

---

## Task-by-task record

### T-001 · Contain `/api/purge/execute` writes inside `<cwd>/src` — commit `334999e`
- **Mode:** test-first. 5 new tests added to `tests/purge.test.ts` (traversal, absolute path,
  outside-`src`, symlink escape, wrong extension).
- **Failure observed pre-fix:** all 5 returned `expected 400 to be 200`; the victim file outside
  the project root was rewritten.
- **Fix:** `resolvePurgeTarget()` in `server.ts` rejects absolute paths, paths resolving outside
  `<cwd>/src`, non-`.ts/.tsx` extensions and any symlink in the chain → `400 PURGE_PATH_REJECTED`.
  `scanDirectory` switched from `statSync` to `lstatSync` and skips symlinks.
- **Note:** `tsconfig.json` has no `strictNullChecks`, so literal-typed discriminants widen to
  `boolean` and discriminated-union narrowing is unavailable; the result type uses a nullable
  `abs` instead. `tsc --noEmit` failed on the first attempt and the shape was corrected.
- **Verification (exit 0):** `npx vitest run tests/purge.test.ts` → 10 passed.
  Original PoC re-run → `{"error":"PURGE_PATH_REJECTED",...,"reason":"target resolves outside <cwd>/src"} [400]`,
  victim file byte-identical.

### T-002 · Resolve the provider model instead of pinning a retired one — commit `c158f88`
- **Mode:** test-first. 9 new tests in `tests/orchestrator.test.ts` (8 failed pre-fix).
- **Fix:** `resolveModel()` + `DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"` + a retired-model
  denylist (`gemini-1.0-*`, `gemini-1.5-*`, `gemini-2.0-flash`) that throws `MODEL_RETIRED`.
  Both provider call sites routed through it. `GEMINI_MODEL` overrides.
- **Two test iterations were needed.** (1) A "no retired literal in source" assertion failed on
  the explanatory comment naming the retirement; the assertion was narrowed to *quoted* literals,
  which is the precise invariant. (2) A "every `model:` field uses resolveModel()" regex also
  matched the `private model: any` field declaration; the assertion was rewritten to count
  `resolveModel()` occurrences and forbid quoted `model:` fields.
- **Verification (exit 0):** `npm test` → 71/71. `grep -rn 'gemini-1.5-flash' core/ server.ts` → only prose.

### T-003 / T-009 / T-010 / T-011 / T-013 / T-016 / T-017 / T-018 — commit `3e4aa3e`
- **T-003** `requireApiAuth`: with `REDDY_API_TOKEN` set every `/api` route needs
  `Authorization: Bearer <token>` or `x-reddy-token`, compared with `crypto.timingSafeEqual`;
  otherwise a loudly-warned `INSECURE_ANONYMOUS_MODE`. The test helper injects the token into the
  child env and wraps ambient `fetch`, so **all 57 pre-existing assertions were preserved verbatim**.
  New file `tests/auth.test.ts` — 13 tests.
- **T-009** `GET /api/health` + `app.use("/api", …)` JSON 404 registered before the SPA catch-all.
- **T-010** `app.disable("x-powered-by")`, `nosniff`, `no-referrer`, `X-Frame-Options: SAMEORIGIN`
  (opt out via `REDDY_ALLOW_EMBEDDING`), CSP allowing the Google origins the Workspace widget calls.
- **T-011** `crypto.randomUUID()` for knowledge ids; `DELETE` returns 404 on unknown ids.
- **T-013** `x-request-id` on every response + one structured JSON access-log line per request
  (`method`, `path`, `status`, `duration_ms`). Bodies and header values are never logged.
- **T-016** The empty `else` branch in `/api/chat` now calls `vault.updateSystemPrompt(...)`.
- **T-017** The `validateKey` test stubs `globalThis.fetch`; `npm test` now emits **0** `fetch failed` traces.
- **T-018** The 15 boot telemetry records carry `seeded: true`.
- **Verification (exit 0):** `npm test` → **91/91 across 8 files**. Production smoke on port 3132:
  `401` without token · `200 {"status":"ok",...,"auth_mode":"token"}` with token ·
  `404 {"error":"NOT_FOUND","path":"/nope"}` on unknown `/api` · `GET / → 200 text/html` ·
  no `X-Powered-By` · `x-request-id` present.

### T-012 / T-014 / T-015 / T-019 — commit `769a084`
- **T-012** Empty `catch (e) {}` bodies given a `[reddy:audio]` console.warn. **7 replaced here.**
- **T-014** `MemoryVault.prune()` caps `episodicSummary` at `this.limit` characters (rolling tail),
  wiring the previously inert constructor field; `summaryLength()` added.
- **T-015** `package.json` `react-example`/`0.0.0` → `reddy-agent`/`0.1.0`; `index.html` title fixed.
- **T-019** `vite.config.ts` `allowedHosts: true` → explicit allowlist + `ALLOWED_DEV_HOSTS`.
- **Test correction:** the new "keeps the most recent evicted content" assertion initially asserted
  `toContain("M19")`. That was wrong arithmetic — with 200 messages and a 50-message window the
  evicted range is M0…M150, so the tail legitimately holds `M149`/`M150`. The assertion was
  corrected to `M150` / not-`M0.` / not-`M100.`. The implementation was never wrong.
- **Verification (exit 0):** `npm test` → 93/93 · build 0 · verify:assets 15/15 · verify:readme OK.

### T-004 / T-005 — commit `2898f93` — **T-004 PARTIAL, see below**
- **T-004** `.github/workflows/ci.yml`: `npm ci`, `lint`, `test:coverage`, `build`, `verify:assets`,
  `verify:readme`, dependency audit, and a production boot smoke asserting 401/200/JSON-404/HTML.
- **T-005** `@vitest/coverage-v8@5.0.2` + `test:coverage` script + v8 coverage config.
- **Verification (exit 0):** `npm run test:coverage` emitted `coverage/coverage-summary.json`.
- **Honest limitation:** `server.ts` reports **0 %** because the integration tests spawn it as a
  child process, so in-process v8 counters cannot observe it. Route coverage is real but out-of-process.

### T-021 — commit `e404d02`
- `npm update` took advisories from **12 (7 high, 5 moderate)** to **4 (all high)**. Every reachable
  advisory is patched (`express`/`qs`/`body-parser`, `postcss`, `nanoid`, `browserslist`,
  `protobufjs`, `baseline-browser-mapping`).
- The 4 remaining highs are `firebase → @firebase/firestore → @grpc/grpc-js@1.9.16` and are **not
  reachable**: the only Firebase imports are `firebase/app` and `firebase/auth`, and the repository
  contains zero `firestore` references. Upstream `firebase@12.19.0` (latest) still pins
  `@grpc/grpc-js ~1.9.0`; `npm audit fix --force` would downgrade firebase to 9.14.0, which is worse.
- CI now hard-fails on **critical** and warns on **high**, with the reachability analysis in the README.

### T-006 / T-020 / T-022 / T-023 — commit `8214018`
- **T-006** `core/engine.ts` records the assistant tool-call turn before the tool results;
  `toGeminiContents()` maps it to `functionCall` parts and tool turns to `functionResponse` parts.
  Exported so the mapping is unit-testable without a network (5 new tests).
- **T-020** `PROVIDER_TIMEOUT_MS` (default 30 000, `GEMINI_TIMEOUT_MS` overrides) passed as
  `httpOptions.timeout` on both provider clients.
- **T-022** Fixed-window limiter (10 / 15 min / IP) on `/api/keys/validate` and `/api/keys/save`
  → `429` + `Retry-After`. No new dependency.
- **T-023** `validateKey` returns `{valid, reason: ok|auth|transport|model|unknown}`; KeyDeck offers
  an explicit **Save Anyway** path when `reason === "transport"`.
- **Verification (exit 0):** `npm test` → **105/105 across 8 files** · lint 0 · build 0 ·
  verify:assets 15/15 · verify:readme OK.

### T-004 completion attempt — commit `1e17980` — **BLOCKED BY REMOTE PERMISSION**
- The push of `.github/workflows/ci.yml` was rejected:
  `remote: refusing to allow a GitHub App to create or update workflow
  .github/workflows/ci.yml without 'workflows' permission`.
- No history was rewritten to dodge the hook. The workflow was **relocated** verbatim to
  `audit/proposed-ci/ci.yml` with an activation README; the push then succeeded.
- **Consequence, applied rather than ignored:** T-004 is downgraded to **PARTIAL**, **F-EXEC-004
  was reopened** as an open P1 (`resolution: PARTIAL`, `requires_human: true`), and the after-score
  was recomputed: D5 `100.00 → 82.00`, `R_point 79.3568 → 77.9168`, `SUL 0.9035 → 0.8010`.
  Open findings 9 → 10 (P1 2 → 3). A workflow that does not run enforces nothing.
- **Verification (exit 0):** re-scored via `mc_sim.py … 77.9168 …` (self-assertion PASSED) and
  re-validated via `validator_selfrecon.mjs` (`MAD 0.000002`, `ΔR 0.000000`, `arithmetic_pass true`).

### T-012 follow-up — commit `e2b9745` — **AUDIT CORRECTION**
- **F-RELY-001 reported 7 empty catch bodies. That count was wrong; the true count was 14.**
  The Phase 2 grep used `catch\s*{`, which matches only the spaced form `} catch (e) {}` and misses
  `} catch(e) {}` / `} catch(e){}`. The first T-012 pass closed 7 and its verification command
  *passed* — because the command used the same incomplete pattern.
- Re-scanned with `catch\s*(\([^)]*\))?\s*\{\s*\}` and closed all 14.
- **Verification (exit 0):** the corrected grep now returns **0** matches across `src/`, `core/`
  and `server.ts`; lint 0; 105/105 tests pass.

---

## Blocked tasks (no autonomous path)

| Task | Finding | Reason |
|---|---|---|
| T-007 | F-LEGAL-001 | Choosing a licence transfers rights — owner decision |
| T-008 | F-SEC-003 | Scope reduction removes product capability; Google OAuth verification is an owner action |
| T-004 | F-EXEC-004 | **PARTIAL** — GitHub rejected the push: the App lacks the `workflows` permission. Content preserved at `audit/proposed-ci/ci.yml`. |
| T-024 | F-QUAL-001 | High-regression UI decomposition with no component test harness |
| T-026 | F-OPS-001 | No `docker` binary in this environment — a Dockerfile could not be built or smoke-tested |
| T-027 | F-DATA-002 | Storage-backend selection is an architecture decision the README leaves open |
| T-028 | F-LEGAL-002 | A privacy policy is a legal artefact requiring owner sign-off |

## Deferred to M4 (autonomous but out of window)

T-025 code splitting (F-RELY-004) · residual async-fs conversion (F-RELY-003)

---

## Milestone close ritual

| Gate | Exit criterion | Result |
|---|---|---|
| M0 Unblock | P0 == 0 | **MET** — 2 → 0 |
| M1 De-Risk | P1 ≤ 2 and all journeys VERIFIED_WORKING | **PARTIAL** — P1 6 → 2 met; journeys 6 VW / 1 PARTIAL / 0 BROKEN / 2 UNTESTABLE |
| M2 Harden | R_point ≥ 75 | **MET** — 60.2916 → 77.9168 |
| M3 Launch Readiness | All GO criteria satisfied | **NOT MET** — J1/J8 UNTESTABLE, 2 human-gated P1s |

Post-remediation re-score: `audit/mc_sim.py 01_findings_after.json 29.15 77.9168 …` →
`R_point 77.9168 (B)`, `SUL 0.8010`, `CI95 [71.5734, 83.7067]`, self-assertion **PASSED**.
Mini-Phase 5 on the modified dimensions: `MAD 0.000002`, `MAX_DEV 0.000029`, `ΔR 0.000000` — **PASS**.
