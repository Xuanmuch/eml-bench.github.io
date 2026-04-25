# Contributing (English)

## Workflow (contributors)

1. Fork this repository and create a branch.  
2. **Do not** edit `public/data/leaderboard.json` directly. Add **one JSON file per proposed row** under `submissions/incoming/` (same shape as a single `entries` item); copy `submissions/template.entry.json`. See [`submissions/README.md`](./submissions/README.md).  
3. Open a Pull Request; suggested title: `submission: <short description>`.  
4. **Maintainers** merge the submission PR, then **manually** add the row to `public/data/leaderboard.json` and deploy; they may copy the file to `submissions/archive/` for traceability.

(If your team still allows direct edits to the main table, state that explicitly here; the default path is `submissions/incoming/`.)

## Verification (maintainer-defined)

Nothing here is a hard requirement on contributors; it is guidance for maintainers. **Your team decides** whether entries must be reproduced with a public compiler, numerical harness, or any other evidence (e.g. symbolic notebooks, external tools).

- Keep whatever rule you choose documented in this repo so contributors know what to provide.

After merge, set `verified` (e.g. `pr`) and optionally `pr_url`.

## JSON fields

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Stable id, e.g. `sin_x`; lowercase letters, digits, underscore |
| `source_wl` | yes | Wolfram-style source, e.g. `Sin[x]` |
| `eml` | yes | Full EML string (from compiler or any method your team accepts) |
| `metrics` | yes | `char_len`, `eml_node_count`, `max_bracket_depth` |
| `verified` | yes | e.g. `seed`, `pr`, `pending`; extend as needed |
| `submitter` | no | |
| `pr_url` | no | |
| `notes_zh` / `notes_en` | no | |

For **shorter / shallower** claimed improvements, the PR should name the competing `id`, explain equivalence, and attach whatever proof your team requires.

## Examples of what to reject (editable)

- Hand-written `eml` with **no** credible evidence under your published rules.  
- Obvious spam or huge unrelated payloads.

See also [`docs/leaderboard.schema.json`](./docs/leaderboard.schema.json).
