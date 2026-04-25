# EML BENCH

**语言 / Languages · [English / README](README.md)**

面向访问者的 **EML 表达式公开排行榜** 静态站（[Elementary Meta-Language](https://en.wikipedia.org/wiki/Formal_language) 结构编码对照）。数据在仓库内，站点通常用 **GitHub Pages** 发布。

## 向排行榜提交新条目

**不要**直接改 `public/data/leaderboard.json`；在 `submissions/incoming/` 下按 [`submissions/README.md`](submissions/README.md) 添加 JSON 并发 PR。网页内 **「提交与纳入流程」**（中/英）与之一致，可对照使用。

数据自检（仅 Python 标准库）：

```bash
python3 scripts/validate_submissions.py
```

## 本仓库不包含的内容

- **不附带** 上游工具链与 `npm run gen:data` 种子生成脚本；**主表**由维护者本地用内部流程更新后推送。  
- **不附带** 可部署的「在线 SymPy 编译」后端；公网为**纯静态**页面。

## 许可

MIT
