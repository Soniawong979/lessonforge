# LessonForge

LessonForge 是一个面向教师的开源项目，帮助将 PDF 教学资料整理成可编辑的 PowerPoint 大纲。你可以在浏览器中提取 PDF 文字、生成并修改幻灯片大纲，再将编辑后的内容导出为 `.pptx` 文件。

LessonForge 仍处于早期开发阶段，功能和使用体验可能会继续调整。

目前没有公开的在线演示地址，也没有已发布的 Windows 安装包。项目需要在本地开发环境中运行。

## 项目目标

教师常常需要把已有的 PDF 讲义或教学资料改编成演示文稿。手动复制内容、拆分页面和调整顺序可能比较费时。

LessonForge 提供一个本地运行的起点：提取 PDF 中可读取的文字，按简单规则整理成幻灯片草稿，再由教师编辑并导出。生成的大纲是便于继续加工的初稿，不代替教师判断，也不保证自动生成完整、精美的课件。

## 功能

- 上传 PDF 并查看逐页提取的文字。
- 根据文本段落和句子切分出初步幻灯片大纲。
- 编辑幻灯片标题和要点；添加、删除幻灯片或要点，并调整幻灯片顺序。
- 导出 `.pptx` 文件。标题和要点会作为独立的 PowerPoint 文本对象，而不是整页图片。
- 在当前浏览器中自动保存大纲草稿；下次打开时可选择恢复。
- 删除本地草稿，并清除当前页面关联的大纲和 PDF 提取结果。

## 技术栈

- Vite
- React
- TypeScript
- PDF.js（`pdfjs-dist`）：在浏览器中读取 PDF 和提取页面文字。
- PptxGenJS：在浏览器中生成 PowerPoint 文件。
- pnpm：依赖管理和项目命令。
- ESLint：代码检查。

## 当前工作流程

1. 选择一个 PDF 文件。当前限制为 PDF 格式、最大 50 MB。
2. PDF.js 在浏览器中逐页提取可读取的文字，并显示页码和内容。
3. LessonForge 使用本地规则按段落和句子整理初步大纲。长内容会拆分；标题由要点文字生成。此过程不是 AI 语义理解。
4. 检查和编辑标题、要点、幻灯片内容及顺序。
5. 导出 `.pptx`，在 PowerPoint 或兼容软件中继续编辑。
6. 编辑中的大纲自动保存在浏览器本地存储中。重新打开页面时，LessonForge 会询问是否恢复草稿。

## 环境要求

- Node.js 22.13 或更高版本。
- pnpm 9 或更高版本。
- 支持现代 JavaScript ES modules、Web Workers、文件选择和 `localStorage` 的浏览器。

Node.js 版本要求同时考虑了当前 PDF.js 与 Vite 的运行要求。建议使用当前受支持的现代桌面浏览器。

## 安装与本地运行

在终端中进入项目目录后运行：

```bash
pnpm install
pnpm dev
```

Vite 会在终端显示本地开发地址，通常为 `http://localhost:5173`。在浏览器中打开该地址即可使用。

## 构建和代码检查

```bash
pnpm run build
pnpm run lint
```

- `pnpm run build`：运行 TypeScript 项目构建检查并生成 Vite 生产构建。
- `pnpm run lint`：使用 ESLint 检查代码。

如需在本地预览生产构建，可先构建，再运行：

```bash
pnpm run preview
```

目前 `package.json` 没有配置独立的测试脚本。

## 隐私与数据处理

- 应用代码目前没有实现将 PDF 或大纲上传到 LessonForge 后端或外部 API 的功能。PDF 文本提取和 PPTX 生成由浏览器端代码执行；此说明仅描述应用实现，不对第三方依赖的网络行为作绝对保证。
- 本地草稿保存在当前网站来源（origin）的浏览器 `localStorage` 中，包含来源 PDF 文件名、大纲内容和更新时间；不会保存完整 PDF 文件。
- 草稿不是云端备份，不会自动同步到其他浏览器或设备。清理浏览器网站数据、使用无痕窗口或更换浏览器/网站地址，都可能导致无法恢复草稿。
- 使用“删除本地草稿”会删除保存的大纲草稿并清理当前页面的相关状态。

## 当前限制

- 大纲由简单规则生成，不是 AI 总结或教学语义分析；教师需要检查和修改生成结果。
- PDF 文字提取效果取决于文件本身。多栏、表格、复杂排版可能影响文字顺序；扫描版 PDF 通常没有可直接提取的文字。
- 当前不支持 OCR，因此不能保证识别扫描页面中的文字。
- PPTX 使用基础版式和文本对象，不会自动生成完整的视觉设计、插图或图表。中文字体效果取决于打开文件的设备是否安装相应字体。
- 草稿只保存在当前浏览器中，没有云同步或跨设备恢复。
- 目前没有公开的在线演示地址，也没有已发布的 Windows 安装包。

## 后续计划

后续方向可能包括改善复杂 PDF 的文本整理、提供大纲导入导出和更丰富的演示文稿版式，以及探索 OCR 等能力。以上是可能的改进方向，并不表示功能已经实现或有确定的发布时间。

## 贡献方式与许可证

欢迎通过 [GitHub 仓库](https://github.com/Soniawong979/lessonforge) 查看项目、报告问题或提出改进建议。提交代码前，建议先创建 Issue 讨论需求；Pull Request 请说明改动内容，并尽量运行 `pnpm run build` 和 `pnpm run lint`。

**当前仓库根目录未发现 LICENSE 文件，因此项目目前没有在仓库中声明许可证。** 在维护者添加并确认许可证前，请不要假设代码采用 MIT 或其他开源许可证，也不要据此推断代码的再分发或再使用权限。

---

# LessonForge (English)

LessonForge is an open-source project for teachers who want to turn PDF teaching materials into editable PowerPoint outlines. It extracts readable text from PDFs in the browser, creates a draft slide outline, lets you edit it, and exports the result as a `.pptx` file.

LessonForge is still in early development, and its features and user experience may continue to change.

There is currently no public online demo and no released Windows installer. The project must be run in a local development environment.

## Project goal

Teachers often need to adapt existing PDF handouts and learning materials into presentations. Copying text, splitting it across slides, and reordering the content manually can take time.

LessonForge provides a local workflow to extract readable PDF text, arrange it into a draft outline using simple rules, and let the teacher revise and export it. The generated outline is a starting point for further editing. It does not replace a teacher's judgment or promise a complete, polished presentation.

## Features

- Upload a PDF and view the extracted text page by page.
- Create a preliminary slide outline by splitting text into paragraphs and sentences.
- Edit slide titles and bullet points; add or delete slides and bullet points; reorder slides.
- Export a `.pptx` file. Titles and bullet points are separate editable PowerPoint text objects, not a single image per slide.
- Automatically save the outline draft in the current browser and offer to restore it on a later visit.
- Delete the local draft and clear the related outline and PDF extraction results from the current page.

## Technology stack

- Vite
- React
- TypeScript
- PDF.js (`pdfjs-dist`) for reading PDFs and extracting page text in the browser.
- PptxGenJS for generating PowerPoint files in the browser.
- pnpm for dependency management and project commands.
- ESLint for code checks.

## Current workflow

1. Select a PDF file. The current limit is PDF format and 50 MB.
2. PDF.js extracts readable text page by page in the browser and displays each page number and its text.
3. LessonForge uses local rules to split paragraphs and sentences into a preliminary outline. Long text is split into smaller pieces, and titles are derived from bullet text. This is not AI-based semantic understanding.
4. Review and edit slide titles, bullet points, slide contents, and order.
5. Export a `.pptx` file and continue editing it in PowerPoint or compatible software.
6. The current outline is automatically saved in the browser's local storage. On a later visit, LessonForge asks whether to restore the draft.

## Requirements

- Node.js 22.13 or later.
- pnpm 9 or later.
- A modern browser with support for JavaScript ES modules, Web Workers, file selection, and `localStorage`.

The Node.js requirement accounts for the runtime requirements of the installed PDF.js and Vite versions. A current modern desktop browser is recommended.

## Install and run locally

From the project directory, run:

```bash
pnpm install
pnpm dev
```

Vite prints a local development URL in the terminal, usually `http://localhost:5173`. Open that URL in a browser.

## Build and code checks

```bash
pnpm run build
pnpm run lint
```

- `pnpm run build` runs the TypeScript project build check and creates a Vite production build.
- `pnpm run lint` checks the code with ESLint.

To preview a production build locally, build first and then run:

```bash
pnpm run preview
```

There is currently no separate test script configured in `package.json`.

## Privacy and data handling

- The application code does not currently implement uploading PDFs or outlines to a LessonForge backend or an external API. PDF text extraction and PPTX generation are performed by browser-side application code; this describes the application's implementation and is not an absolute guarantee about the network behavior of third-party dependencies.
- Local drafts are stored in the browser's `localStorage` for the current site origin. A draft contains the source PDF filename, outline contents, and update time; it does not contain the PDF file.
- A local draft is not a cloud backup and is not automatically synchronized across browsers or devices. Clearing browser site data, using a private browsing window, or changing browsers or the site address may make a draft unavailable.
- Choosing “Delete local draft” removes the saved outline draft and clears the related state from the current page.

## Current limitations

- Outlines are generated with simple rules, not AI summarization or semantic analysis. Teachers should review and edit the result.
- Text extraction depends on the PDF. Multi-column layouts, tables, and complex formatting may affect text order; scanned PDFs often do not contain directly extractable text.
- OCR is not currently supported, so text in scanned pages cannot be guaranteed to be recognized.
- PPTX export uses a basic layout and editable text objects. It does not automatically create a complete visual design, illustrations, or charts. Chinese font rendering depends on the fonts available on the computer that opens the file.
- Drafts are stored only in the current browser; there is no cloud synchronization or cross-device recovery.
- There is currently no public online demo and no released Windows installer.

## Future plans

Possible future directions include improving text organization for complex PDFs, adding outline import/export and richer slide layouts, and exploring OCR. These are potential improvements, not implemented features or commitments to a release schedule.

## Contributions and license

You are welcome to visit the [GitHub repository](https://github.com/Soniawong979/lessonforge), report issues, or suggest improvements. Before contributing code, consider opening an Issue to discuss the proposed change. Pull Requests should explain the change and, where possible, run `pnpm run build` and `pnpm run lint`.

**No LICENSE file was found in the repository root, so the repository currently does not declare a license.** Until the maintainer adds and confirms a license, do not assume the code is licensed under MIT or any other open-source license, or infer permission to redistribute or reuse it.
