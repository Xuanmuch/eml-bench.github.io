# Leaderboard submissions（排行榜提交）

Contributors **do not** edit `public/data/leaderboard.json` directly. Add **one JSON file per proposed row** under `submissions/incoming/`, then open a Pull Request. Maintainers merge the PR for the submission first, then copy the row into `leaderboard.json`, set `verified` / `pr_url` as needed, and may move your file to `submissions/archive/` for traceability.

## File layout

| Path | Role |
|------|------|
| `incoming/` | New submission JSON files (you add these). |
| `archive/` | Optional copies of accepted submissions (maintainers). |
| `template.entry.json` | Copy-paste starter; replace placeholders. |
| `entry.schema.json` | JSON Schema for one entry object. |

## Naming

Use a unique filename, e.g. `yourgithubhandle_2026-04-21_sin_alternate.json`.

## Required fields

Same as one element of `entries` in [`docs/leaderboard.schema.json`](../docs/leaderboard.schema.json): at minimum `id`, `source_wl`, `eml`, `metrics`, `verified`. For community proposals, use `verified: "pending"` until a maintainer updates it after review.

## Verification

Describe in PR body (and optional `notes_*`) how a maintainer can verify `eml` against `source_wl` (e.g. compiler command output, notebook, or other evidence you accept). See [`CONTRIBUTING.zh.md`](../CONTRIBUTING.zh.md) / [`CONTRIBUTING.en.md`](../CONTRIBUTING.en.md).

---

## 中文说明

**请勿**直接修改 `public/data/leaderboard.json`。请在 `submissions/incoming/` 中**新增一个 JSON 文件**（每条拟收录记录一个文件），然后发起 Pull Request。维护者先审核并合并该 PR，再**手动**将条目写入主表的 `leaderboard.json`，必要时更新 `verified`、`pr_url`，并可将你的提交副本移入 `submissions/archive/` 以便溯源。

**文件名**建议带 GitHub 用户名与日期，避免冲突。字段形状见 `template.entry.json` 与 `entry.schema.json`。
