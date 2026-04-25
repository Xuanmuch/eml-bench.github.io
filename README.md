# EML BENCH

**Languages / 语言 · [中文说明](README.zh.md)**

A **public, static** leaderboard for [Elementary Meta-Language (EML)](https://en.wikipedia.org/wiki/Formal_language) encodings. Data lives in this repo; the site is usually deployed to **GitHub Pages**.

## Submit a leaderboard row

Do **not** edit `public/data/leaderboard.json` directly. Add JSON under `submissions/incoming/` and open a PR, following [`submissions/README.md`](./submissions/README.md). The in-app page **「Submission and Inclusion Workflow»** (EN / 中文) mirrors the same steps.

Optional check (stdlib Python only):

```bash
python3 scripts/validate_submissions.py
```

## What this repository does *not* ship

- No vendored `SymbolicRegressionPackage` and no `npm run gen:data` script; maintainers refresh the main table on their own toolchain and then push.  
- No deployable in-browser SymPy API; the public site is **static**. A future “compile in browser” would be a separate service.

## License

MIT
