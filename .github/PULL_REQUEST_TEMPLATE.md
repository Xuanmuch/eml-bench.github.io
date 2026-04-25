## Submission PR (submissions/incoming/)

Use this template when you add or change files under **`submissions/incoming/`** only.

- [ ] I added **`submissions/incoming/*.json`** (one file per proposed leaderboard row). I did **not** edit `public/data/leaderboard.json`.
- [ ] I ran `python3 scripts/validate_submissions.py` locally (or CI will run it).
- [ ] In the PR description I explained **how to verify** `eml` vs `source_wl` (compiler command, notebook, etc.).

### Evidence / notes (paste below)

```

```

> After merge, **maintainers** copy accepted rows into `public/data/leaderboard.json` and deploy.

---

## Maintainer PR (direct edit to leaderboard.json)

If this PR **only** updates `public/data/leaderboard.json` (maintainer workflow):

- [ ] Describe what changed and link the contributor submission PR or Issue if applicable.
