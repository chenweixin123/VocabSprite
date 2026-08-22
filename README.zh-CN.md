# VocabSprite

VocabSprite 是一个离线优先、Windows 优先的环境式桌面词汇学习应用：小卡片安静地待在桌面角落；不同学段按**具体义项**融合；克制的动态表现词义；个人易混关系留在本机；提示会随着掌握程度逐步撤离。

![VocabSprite 主页](docs/screenshots/03-dashboard.png)

> VocabSprite 目前只是开发代号。公开发布前仍须完成商标、域名与应用商店名称检索。

## 五个核心特点

- **桌角、可拖动、不打扰**：透明 Compact 卡片会随内容和所选尺寸收缩，右上角可即时调整大小、配色、透明度、动态和置顶；Expanded、Dot 形态按需切换，关闭等于 snooze，绝不等于删除。
- **小学到考研的模块融合**：小学、初中、高中、CET-4、CET-6、考研和自定义共七个入口；相同义项共享进度，同形异义分别保留。
- **动态词义**：12 种可复用且受约束的效果、平静 fallback、系统减少动态支持，以及 20 个原创本地 SVG 场景。
- **个人易混词图谱**：具体错成哪个词会形成有上限、可衰减的本地边，并在达到阈值后触发辨析。
- **提示逐步撤离**：英→义、义→英、语境→英、听音→英四个方向分别经历获取、识别、回忆、运用。

核心闭环不需要 AI、不需要账号，也不需要联网。

小屏卡片可选择紧凑、标准或宽大尺寸与四套配色。“给我一点提示”是可选模式，默认关闭；开启后只提供首字母、长度、词性或搭配线索，不会直接显示答案。

首次设置提供常用学习量滑杆和明确的“自定义”入口；每日新词可设 1–1,000，
每日复习可设 1–5,000，同时保留独立的环境式弹卡预算，避免高学习量自动变成高打扰量。

## 当前范围

这是面向 Windows 10/11 的候选发布实现，不是任何考试机构的官方词汇产品。七个模块各附 15 个**原创演示词条**，用于验证入口、融合、统计、导入与升级；它们不是完整词表，也不是官方词表。macOS/Linux 尚未人工验证托盘、开机启动、全局快捷键和不抢焦点等平台能力。

浏览器/Vite 版本是使用 `localStorage` 的开发预览；Tauri 原生版本使用 SQLite 和 Rust FSRS。因此，真实 FSRS 调度位于原生桌面路径；浏览器预览可以验证提示撤离，但不宣称复现 FSRS。

## 快速开始

需要 Node.js 22+、Corepack 与 pnpm 10.19.0。原生构建还需要 Rust stable、MSVC C++ Build Tools、Windows SDK 和 WebView2。

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

浏览器打开 `http://127.0.0.1:1420`。运行原生应用：

```powershell
pnpm tauri:dev
```

首次流程会设置多模块、注意力预算、安静时段、卡片位置、动态强度和可跳过的本地摸底；不会要求登录或联网授权。

## 开发与验证命令

```text
pnpm install --frozen-lockfile  按锁文件安装依赖
pnpm dev                        浏览器开发预览
pnpm tauri:dev                  Tauri 原生开发应用
pnpm lint                       ESLint，零警告
pnpm format:check               Prettier 格式检查
pnpm typecheck                  严格 TypeScript 检查
pnpm test                       Vitest 单元/组件/集成测试
pnpm test:e2e                   Playwright 完整旅程
pnpm test:rust                  Rust 工作区测试
pnpm pack:validate              校验 catalog、schema 与 checksum
pnpm assets:validate            校验 SVG 安全性与来源元数据
pnpm pack:diff -- <旧manifest> <旧entries> <新manifest> <新entries>
pnpm benchmark                  1 万义项/10 万复习记录基准
pnpm build                      构建 Web 工作区
pnpm tauri:build                构建 Windows 安装包
pnpm screenshots                复现文档截图
```

Rust 侧发布检查：

```powershell
cargo fmt --all --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace
```

## 隐私与安全

- 没有强制账号、遥测端点、分析 SDK、OCR、后台截图或持续剪贴板监听。
- 只有明确按下 `Ctrl+Shift+V` 后，才在 3 秒授权窗口内读取一次剪贴板；内容不写日志。
- 网络和遥测选项默认关闭；v0.1 尚无网络 provider，因此即使开启未来 provider 偏好也不会发请求。
- 导入先做大小限制、dry run 预览、schema/checksum 校验和脚本/HTML 拒绝；确认后才原子提交。
- 设置页提供全量导出和二次确认的全量删除；捆绑内容与个人学习数据分离。

详见 [隐私说明](PRIVACY.md)、[安全策略](SECURITY.md)和[威胁模型](docs/threat-model.md)。

## 导入、导出与工具关系

界面支持带列映射的 UTF-8 CSV 和 schemaVersion 1 的 VocabSprite JSON Pack；CLI 支持拆分 manifest/entries 的 catalog 校验和 pack diff。可以导出全量 JSON 备份、学习记录 CSV 和自定义词包 JSON。Anki 风格文本可先规范成文档模板；第一版**不支持二进制 `.apkg` 导入或导出**。

Anki 等是灵活的通用卡片工具。VocabSprite 不贬低、也不试图替代它们，而是聚焦桌面角落的环境式词汇学习、学段义项融合、分方向提示撤离和个人易混关系。开放格式与导出能力让用户可以自行选择合适工具。

更多资料：[架构](docs/architecture.md)、[学习模型](docs/learning-model.md)、[词包格式](docs/pack-format.md)、[内容许可](docs/content-licensing.md)、[无障碍](docs/accessibility.md)、[60 秒演示](docs/demo-script.md)、[FAQ](docs/faq.md)与[Roadmap](docs/roadmap.md)。

代码采用 AGPL-3.0-or-later；原创演示内容和 SVG 以各自元数据声明的 CC0-1.0 发布。贡献前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 与 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。
