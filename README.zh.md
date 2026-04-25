# EML BENCH

**语言 / Languages · [English / README](README.md)**

面向访问者的 **EML 表达式公开排行榜** 静态站（[Elementary Meta-Language](https://en.wikipedia.org/wiki/Formal_language) 结构编码对照）。数据在仓库内，站点通常用 **GitHub Pages** 发布。

## 在线访问

在仓库中打开 **设置 → Pages**，将**源**选为 **GitHub Actions**（见 [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)），推送到 `main` 后会自动构建并部署 `dist`。

- **用户主页根地址** `https://eml-bench.github.io/`：仓库名**必须**为 **`eml-bench.github.io`**，工作流会对该名使用 `VITE_BASE=/`。  
- **项目站带路径**：若仓库名是例如 **`eml-bench`**，则站点在 **`https://eml-bench.github.io/eml-bench/`**，**没有**子路径的 `https://eml-bench.github.io/` 不会打开该项目。

若打开站点出现 **404**，请看下文「站点 404 排查」。

## 本地预览（贡献者/维护者）

需要 **Node 20+** 或 **22**。

```bash
git clone <本仓库地址>
cd eml-bench
npm install
npm run dev
```

在终端提示的地址打开（多为 `http://127.0.0.1:5173`）。页面顶栏可切换 **EN / 中文**（应用界面语言，与本文档无关；本文与根目录 [README（英文）](README.md) 为仓库说明切换）。

## 向排行榜提交新条目

**不要**直接改 `public/data/leaderboard.json`；在 `submissions/incoming/` 下按 [`submissions/README.md`](submissions/README.md) 添加 JSON 并发 PR。网页内 **「提交与纳入流程」**（中/英）与之一致，可对照使用。

数据自检（仅 Python 标准库）：

```bash
python3 scripts/validate_submissions.py
```

## 本仓库不包含的内容

- **不附带** 上游工具链与 `npm run gen:data` 种子生成脚本；**主表**由维护者本地用内部流程更新后推送。  
- **不附带** 可部署的「在线 SymPy 编译」后端；公网为**纯静态**页面。

## 站点 404 排查

1. **仓库名与 URL 是否一致**  
   只有仓库名为 **`eml-bench.github.io`** 时，站点才会在**根域** `https://eml-bench.github.io/` 生效。若仓库是别的名字（例如 `eml-bench`），请访问带仓库名的路径，例如 **`https://eml-bench.github.io/eml-bench/`**。只打开根域会出现 404 或空站。
2. **Pages 源**  
   **设置 → Pages** 中，**源**应选 **GitHub Actions**，不要长期使用「从分支发布」而从未跑通 Actions。
3. **首次运行**  
   打开 **Actions** 等 **Deploy GitHub Pages** 成功（绿色）。有时需在 **设置 → Environments → github-pages** 中**首次批准**工作流使用发布环境。
4. **时间**  
   成功后等待约 1～3 分钟再试，可强制刷新或无痕窗口。

## 许可

MIT
