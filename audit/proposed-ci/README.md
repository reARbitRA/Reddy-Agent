# Proposed CI workflow — NOT ACTIVE

`ci.yml` in this directory is a complete, verified GitHub Actions workflow. It is
**not** installed at `.github/workflows/ci.yml`, so it does not run.

**Why.** The push that would have placed it at `.github/workflows/ci.yml` was rejected:

```
! [remote rejected] arena/01a1097d-reddy-agent (refusing to allow a GitHub App to
  create or update workflow `.github/workflows/ci.yml` without `workflows` permission)
```

The GitHub App backing this session lacks the `workflows` permission on this repository.

**To activate it (one step, needs a human with admin rights):**

```bash
cp audit/proposed-ci/ci.yml .github/workflows/ci.yml
git add .github/workflows/ci.yml
git commit -m "ci: install the verified workflow"
git push
```

Or grant the App the `workflows` permission under
*Repository → Settings → Actions → General* / *GitHub Apps*, then re-push.

**What it enforces** (every command below was executed locally in this session and
exited 0 — the workflow file itself has never run on GitHub):

`npm ci` · `npm run lint` · `npm run test:coverage` · `npm run build` ·
`npm run verify:assets` · `npm run verify:readme` · `npm audit --audit-level=critical --omit=dev`
· a production boot smoke asserting 401 without a token, 200 with one, JSON 404 on
unknown `/api` routes and `200 text/html` on the shell.
