# EML BENCH

**Languages / 语言 · [中文说明](README.zh.md)**

A **public, static** leaderboard for [Elementary Meta-Language (EML)](https://en.wikipedia.org/wiki/Formal_language) encodings. Data lives in this repo; the site is usually deployed to **GitHub Pages**.

## Live site

After you enable **Settings → Pages → Source: GitHub Actions** and push to `main`, the workflow in [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) builds and deploys the `dist` folder.

- **User site (root URL)** `https://eml-bench.github.io/`: the repository name **must** be exactly **`eml-bench.github.io`**. The workflow sets `VITE_BASE=/` for that name.  
- **Project site** `https://eml-bench.github.io/<repo>/`: any other repository name, e.g. `eml-bench` → open **`https://eml-bench.github.io/eml-bench/`** (note the path prefix). The root `https://eml-bench.github.io/` will **not** show that project unless you also use a user site repo or a redirect.

If you see **404** on the site URL, see [Site shows 404](#site-shows-404) below.

## Local preview (contributors / maintainers)

Requires **Node 20+** or **22**.

```bash
git clone <this-repo-url>
cd eml-bench
npm install
npm run dev
```

Open the URL printed in the terminal (often `http://127.0.0.1:5173`). Use **EN / 中文** in the app header to switch the UI language.

## Submit a leaderboard row

Do **not** edit `public/data/leaderboard.json` directly. Add JSON under `submissions/incoming/` and open a PR, following [`submissions/README.md`](./submissions/README.md) and [CONTRIBUTING.en.md](CONTRIBUTING.en.md) / [CONTRIBUTING.zh.md](CONTRIBUTING.zh.md).

Optional check (stdlib Python only):

```bash
python3 scripts/validate_submissions.py
```

## What this repository does *not* ship

- No vendored `SymbolicRegressionPackage` and no `npm run gen:data` script; maintainers refresh the main table on their own toolchain and then push.  
- No deployable in-browser SymPy API; the public site is **static**. A future “compile in browser” would be a separate service.

## Site shows 404

1. **Repository name**  
   - `https://eml-bench.github.io/` (no path) only works for the repo named **`eml-bench.github.io`**.  
   - If your repo is e.g. **`eml-bench`**, the deployed app is at **`https://eml-bench.github.io/eml-bench/`**, not the domain root.
2. **Pages source**  
   In the repo, open **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch” unless you intend legacy branch deploy).
3. **First deployment**  
   After the first push, open **Actions** and wait until **Deploy GitHub Pages** is green. A first run may need you to **approve the `github-pages` environment** (once per repo) under **Settings → Environments**.
4. **Wait & hard refresh**  
   After a green workflow, allow 1–3 minutes, then try again with cache bypass (hard reload).

## License

MIT
