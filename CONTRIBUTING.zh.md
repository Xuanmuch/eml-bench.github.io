# 贡献指南（中文）

## 流程概要（贡献者）

1. Fork 本仓库并新建分支。  
2. **不要**直接改 `public/data/leaderboard.json`。在 `submissions/incoming/` 下**新增一个 JSON 文件**（每条拟收录记录一个文件），字段形状与主表单条 `entries` 元素相同；可复制 `submissions/template.entry.json`。详见 [`submissions/README.md`](./submissions/README.md)。  
3. 发起 Pull Request，标题建议：`submission: <简要描述>`。  
4. **维护者**审核合并该 PR 后，**再**将条目写入 `public/data/leaderboard.json` 并部署；可选将副本移入 `submissions/archive/` 归档。

（若团队仍允许直接向主表提 PR，请在本文件中单独写明；默认以 `submissions/incoming/` 为准。）

## 验证（由维护团队自行约定）

以下**不是**对贡献者的强制条款，仅供维护者内部参考。

- 维护者可用与项目公开规则一致的任意方式核对 `source_wl` 与 `eml`（例如官方 EML 编译器、数值检验、符号笔记本等）。  
- 也可采用：贡献者提供数学等价说明 + 团队认可的其它证据；**请在本文件或项目说明中写清规则**，避免社区困惑。

合并后，维护者可将 `verified` 更新为 `pr`（或你们自定义的标签），并可选填写 `pr_url`。

## JSON 字段约定

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | 稳定 id，如 `sin_x`，建议小写字母、数字、下划线 |
| `source_wl` | 是 | Wolfram 风格源式，如 `Sin[x]` |
| `eml` | 是 | 对应 EML 字符串（来源可为编译器或经你们认可的等价推导） |
| `metrics` | 是 | `char_len`, `eml_node_count`, `max_bracket_depth`；建议与榜单排序逻辑一致 |
| `verified` | 是 | 如：`seed`（脚本种子）、`pr`（经 PR 合并）、`pending`（待审）；**具体枚举可由维护者扩展** |
| `submitter` | 否 | 昵称或联系方式 |
| `pr_url` | 否 | 合并对应的 PR 链接 |
| `notes_zh` / `notes_en` | 否 | 备注 |

若条目声称比现有 `id` **更短/更浅**的等价 EML，请在 PR 正文中说明**与谁竞争**、**等价性依据**，并附上你们团队要求的任意证明材料。

## 建议拒绝的情况（示例，可改）

- 无法在你们**当前公开规则**下给出任何可信依据的「手写 EML」；  
- 明显恶意、超大或无关内容。

更严格的 JSON 形状见 [`docs/leaderboard.schema.json`](./docs/leaderboard.schema.json)（可按团队需要修改 schema）。
