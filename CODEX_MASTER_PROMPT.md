# VocabSprite：Codex 完整实现任务

## 0. 任务性质

你不是来写概念方案、伪代码或产品说明书的。你需要在当前空仓库或现有仓库中，实际实现一个可运行、可测试、可构建、可演示的开源桌面应用。

项目暂定名：

- 英文项目名：`VocabSprite`
- 中文副标题：`桌角单词精灵`
- 一句话定位：**让单词以不会打断工作的桌面小卡片形式出现，并通过动态词义、个人助记画像、易混词图谱、提示逐步撤离以及跨学段词包融合，帮助用户真正记住并会用英语单词。**

不要使用“词灵”作为产品中文名称，因为该名称已有同类产品使用。`VocabSprite` 目前只作为开发代号；README 中须声明发布前仍需完成商标、域名与应用商店名称检索。

## 1. 最终目标

交付一个 Windows 优先、离线优先、无强制登录、不开启 AI 也能完整使用的桌面词汇学习应用。它必须具备以下完整闭环：

1. 用户选择一个或多个学习模块；
2. 系统将模块中的重复词义合并，而不是让用户重复学习同一个词；
3. 系统根据用户掌握情况和 FSRS 调度生成学习队列；
4. 小卡片在桌面角落以不抢焦点、可拖动、可关闭、可暂停、可展开的方式出现；
5. 卡片通过图片、动态词义、例句、词根、对比和声音等线索帮助建立记忆；
6. 随着掌握程度提高，系统逐步撤去图片、中文和首字母提示，转向主动回忆与运用；
7. 用户答错后，系统记录“错成了哪个词”，形成个人易混词图谱；
8. 多次遗忘时，系统不机械重复同一张卡，而是切换助记通道；
9. 所有学习记录、词包、图片缓存和设置默认保存在本机；
10. 用户可以清楚看到“为什么此刻出现这个词”。

## 2. 不可妥协的差异化支柱

下面六项不是未来愿景，而是 v0.1 的强制实现内容。任何一项缺失，都不能宣称项目完成。

### 2.1 Meaning in Motion：动态词义

卡片的动作、形态或文字动画要克制地表现词义。至少实现 12 个可复用效果：

- `cling`：贴向卡片或屏幕边缘；
- `reluctant`：拖动或进入时出现轻微阻力感；
- `vanish`：文字逐步消失后要求回忆；
- `scatter`：字母短暂散开后归位；
- `expand`：内容舒展；
- `shrink`：内容缩小；
- `wobble`：轻微摇晃；
- `fragile`：出现非破坏性的裂纹视觉；
- `bounce`：克制弹跳；
- `swift`：快速划入；
- `hesitate`：动作开始前短暂停顿；
- `gloomy`：亮度或饱和度轻微降低。

要求：

- 动画由数据中的 `MotionRecipe` 驱动，不要把某个单词硬编码在组件里；
- 支持 `prefers-reduced-motion`；
- 设置中必须有“关闭动态效果”“低强度”“标准强度”；
- 动画不允许闪烁，不允许快速大幅缩放，不允许影响键盘输入；
- 为每个效果编写单元测试或组件测试，至少验证 class/状态与降级逻辑；
- 没有专用效果的单词必须使用平静的通用过渡，而不是随机乱动。

### 2.2 Curriculum Fusion：学段词包无重复融合

内置以下可选择模块入口：

- 小学基础；
- 初中核心；
- 高中核心；
- 大学英语四级 CET-4；
- 大学英语六级 CET-6；
- 考研英语；
- 自定义词包。

第一版允许每个内置模块只附带经过人工可核查的演示词包，但模块选择、进度统计、融合算法、导入管线和升级机制必须完整可用。

核心规则：

- 用户可以多选模块；
- 同一个 `lemma + part_of_speech + sense` 只创建一个学习对象；
- 同一拼写的不同义项保留为不同 `sense`；
- 合并后保留全部模块标签，例如一个词可以同时属于“高中、CET-4、考研”；
- 学习进度保存到 `sense` 级别，在不同模块之间继承；
- 每个模块仍独立计算覆盖率、已掌握比例、待学习数量和预计工作量；
- 新选更高模块时，不得把已掌握的低阶词重新当作新词；
- 提供“桥接模式”：优先补齐高阶模块所依赖但用户尚未掌握的基础词；
- 包升级后通过稳定 ID 和 alias 映射保留用户进度；
- 冲突不能静默覆盖，要进入可查看的冲突报告。

为此实现：

- `PackManifest`；
- `Lexeme`；
- `WordSense`；
- `PackMembership`；
- `PackVersion`；
- `AliasMap`；
- `PackConflict`；
- `PackFusionService`；
- `pack validate` 命令或脚本；
- `pack import` 命令或脚本；
- `pack diff` 命令或脚本。

每个词包 manifest 至少包含：

```json
{
  "schemaVersion": 1,
  "id": "cn.cet4.demo",
  "title": "CET-4 演示词包",
  "stage": "cet4",
  "version": "0.1.0",
  "language": "en",
  "uiLocale": "zh-CN",
  "coverage": "demo",
  "officialStatus": "community-compatible",
  "sourceName": "VocabSprite original demo content",
  "sourceUrl": null,
  "license": "CC0-1.0",
  "attribution": null,
  "checksum": "..."
}
```

内容合规要求：

- 不得抓取、复制或捆绑来源和许可不明的商业词书；
- 不得把社区兼容词包标为“官方词表”；
- 每个捆绑词包必须声明来源、许可、覆盖范围和是否官方；
- README 必须解释“模块入口存在”不等于“捆绑了考试机构的官方完整词表”；
- 提供用户导入自己合法拥有的 CSV/JSON 词表的能力；
- 为七个模块各提供至少 15 个高质量演示词条，内容要原创、可校验、无明显释义错误；
- 演示词条必须覆盖名词、动词、形容词和常见多义词，且至少 20 个词条带本地 SVG 或场景插画；
- 所有示例句必须原创且简短自然，避免复制词典例句。

### 2.3 Personal Confusion Graph：个人易混词图谱

系统要记录用户“将 A 错答成 B”，而不仅仅记录对错。

实现：

- `ConfusionEdge(sourceSenseId, targetSenseId, weight, count, lastSeenAt)`；
- 拼写相似、含义相近、形态相近和用户实际错答四类边；
- 错答时提升边权；
- 长期不再混淆时缓慢降低边权；
- 连续混淆达到阈值后，自动生成二选一、对比例句或辨析卡；
- 详情页提供个人易混图谱的可视化；
- 点击一条边可看到两词差异、典型搭配和用户错误历史；
- 至少内置以下演示对：
  - adapt / adopt
  - affect / effect
  - assure / ensure / insure
  - complement / compliment
  - principal / principle
  - conscious / conscience
- 图谱数据必须本地存储；
- 为边权更新、阈值触发和衰减编写确定性测试。

### 2.4 Scaffold Fading：提示逐步撤离

不能让用户永久依赖图片和中文。

每个词义至少有四个可追踪掌握方向：

- English → Meaning；
- Meaning → English；
- Context → English；
- Audio → English。

实现四阶段提示：

1. `Acquire`：单词、核心中文、图片、发音、助记；
2. `Recognize`：减少中文，强调图片和例句；
3. `Recall`：中文或情境到英文，允许首字母提示；
4. `Use`：搭配、易混词、句子运用或听写。

要求：

- 阶段由学习记录驱动，不是固定天数；
- 某一方向失败时，只回退相关方向，不要整体清零；
- UI 要显示当前阶段和升级/回退原因；
- 用户可以手动降低难度，但不能通过一次点击伪造全部掌握；
- 为阶段转换矩阵编写完整单元测试。

### 2.5 Mnemonic Fingerprint + Memory Rescue：个人助记画像与遗忘救援

每个词可有四类助记线索：

- visual：视觉场景；
- sound：发音或音形联想；
- morphology：词根、前后缀、词族；
- contrast：近义、反义或易混对比。

用户可评价：

- 很有效；
- 一般；
- 让我更混乱。

系统维护 `CueEffectiveness`，按用户、线索类型和词义统计成功率。

当某词连续遗忘时，触发 `Memory Rescue`：

- 不再原样重复；
- 选择过去对该用户更有效、且当前词尚未充分尝试的线索；
- 生成或选择新的卡片配方；
- 明确显示“本次换一种方法，因为你连续两次没有想起”。

第一版不要求调用大模型。必须用本地模板和人工演示内容完成闭环。AI 只能作为未来可插拔 provider，默认关闭，不得成为核心流程依赖。

### 2.6 Ambient Attention Budget：环境式注意力预算

桌面卡不能变成骚扰软件。

实现：

- 每日最多出现次数；
- 最短出现间隔；
- 每日新词上限；
- 每日复习上限；
- 安静时段；
- 暂停 15 分钟、1 小时、今天；
- 专注模式；
- 用户主动打开时不受弹出预算限制；
- “关闭”默认含义为稍后再出现，不是删除单词；
- 删除必须进入详情页并二次确认；
- 卡片必须解释“为什么现在出现”；
- 用户可以查看今日预算已用和剩余；
- 若检测全屏或系统勿扰状态在当前平台不可可靠实现，必须采用安全降级：不弹出、记录原因、允许用户手动关闭检测；不得持续轮询造成高 CPU 占用。

## 3. 各模块的学习体验

模块不是简单标签。不同模块应有不同默认卡片权重，但用户可以修改。

### 小学基础

- 图片和发音优先；
- 例句短；
- 默认只展示一个核心义项；
- 拼写训练采用字母块或首字母；
- 动画更直观但仍须克制；
- 不显示复杂词源。

### 初中核心

- 加入基础拼写、常见搭配和简单句；
- 加入少量反义词；
- 开始使用情境填空。

### 高中核心

- 强调多义词、词性转换和完形语境；
- 加入派生词和常见搭配；
- 降低长期图片依赖。

### CET-4

- 强调常用学术与生活语境；
- 加入快速识别、选词填空和常见搭配；
- 显示该词是否已在高中模块掌握。

### CET-6

- 强调抽象义、近义辨析、语体和长句片段；
- 提高 Meaning → English 与 Context → English 权重；
- 与 CET-4 重叠词只增加新义项或更高阶用法，不重复建卡。

### 考研英语

- 强调熟词生义、词根词族、长句语境、语义关系与搭配；
- 支持英语一/英语二标签，但第一版可共用主词包；
- 重点展示“已有词的新义项”，而不是只追求生词数量。

### 自定义词包

- 支持 CSV 和 JSON；
- 用户可映射列；
- 导入前预览；
- 显示重复、冲突和缺失字段；
- 用户可指定模块、标签、来源和许可；
- 导入失败不得产生半成品数据。

## 4. 桌面交互要求

### 4.1 窗口形态

至少实现三个状态：

- `Dot`：桌面角落小圆点或小精灵；
- `CompactCard`：紧凑学习卡；
- `ExpandedPanel`：详细学习面板。

紧凑卡建议尺寸约 320 × 190，展开面板建议约 440 × 640；可根据实际 UI 调整。

必须支持：

- 无边框；
- 可拖动；
- 可固定在最前；
- 可取消置顶；
- 可调透明度；
- 关闭、最小化为圆点、展开；
- 记住每个显示器上的位置；
- 超出屏幕后自动纠正；
- 多显示器切换；
- Windows 系统托盘；
- 开机启动开关，默认关闭；
- 卡片出现时不主动抢夺当前应用焦点；
- 只有用户点击输入框后才获得键盘焦点；
- 键盘可访问；
- 右键菜单提供暂停、下一个、打开主页和退出。

### 4.2 紧凑卡

至少支持六种题型：

- 单词 → 含义；
- 含义 → 单词；
- 例句挖空；
- 易混词二选一；
- 听音辨词；
- 图片/动态 → 单词。

反馈不要只做“对/错”。至少提供：

- 忘记；
- 模糊；
- 记得；
- 太简单；
- 助记有效；
- 助记无效；
- 与另一个词混淆。

### 4.3 详细面板

显示：

- 单词、音标、英美发音入口；
- 词性和分义项；
- 中文核心释义与简明英文释义；
- 原创例句；
- 常见搭配；
- 同义词的差异；
- 反义词；
- 易混词；
- 词根和词族；
- 图片或 SVG 场景；
- 动态词义预览；
- 当前所属模块；
- 当前四方向掌握情况；
- 复习历史；
- 当前助记线索；
- 下次计划时间；
- “为什么出现”说明；
- 编辑与删除入口。

## 5. 学习调度

使用 Rust 版 FSRS 库或一个经过充分测试、许可证兼容的 FSRS 实现。

要求：

- FSRS 状态与业务状态分离；
- 保存全部 review log；
- 支持 Again / Hard / Good / Easy 与产品中文反馈之间的明确映射；
- 时间全部使用 UTC 存储，界面按本地时区展示；
- 跨时区后不得重复或丢失复习；
- 可配置目标保留率；
- 复习队列同时考虑：
  - 到期程度；
  - 当前选中模块；
  - 用户每日预算；
  - 混淆图谱优先级；
  - Memory Rescue；
  - 新旧词比例；
  - 模块考试日期；
- 队列算法必须可复现并有固定种子的测试；
- 不要自行发明一个“看起来像遗忘曲线”的定时器代替 FSRS；
- 在界面中用普通语言解释调度原因，不暴露令人困惑的内部公式。

## 6. 图片、发音和助记内容

### 图片

v0.1 必须离线可用：

- 至少提供 20 个原创、本地 SVG 场景；
- 提供通用场景模板与 fallback；
- 每个资源有 `assetId`、作者、许可和用途；
- 不得热链未知站点图片；
- 不得把网络图片缓存为永久资源而不记录来源；
- 未来图片提供器使用接口抽象，但默认 provider 为本地资源。

### 发音

- 优先使用操作系统或 Web Speech API 可用语音；
- 允许用户选择语音和语速；
- 不得假设每台机器都有同名 voice；
- 无合适语音时要友好降级；
- 不要求第一版做发音评分。

### 助记

- 核心事实来自词包；
- 助记是辅助内容，不能覆盖或改写词典事实；
- 任何未来 AI 内容必须标记来源和“未人工核验”状态；
- 用户确认后才能长期保存为正式内容。

## 7. 隐私与安全

默认原则：本地优先、最小权限、显式触发。

必须满足：

- 无强制登录；
- 不持续监听剪贴板；
- 只有用户按下全局快捷键后才读取剪贴板；
- 不后台截图；
- 不执行 OCR；
- 不上传原始上下文；
- 不收集遥测，除非用户明确开启；
- 设置页提供“导出全部数据”和“删除全部个人数据”；
- 数据库使用迁移；
- 导入文件设置大小限制；
- 防止 zip bomb、路径穿越和恶意超大 JSON；
- Tauri capability/permission 采用最小授权；
- 禁止任意 shell 执行；
- 外部链接必须通过受控 allowlist 打开；
- CSP 不得使用不受控的 `*`；
- 用户输入在界面渲染前必须转义；
- 日志不得记录完整剪贴板内容、API 密钥或隐私上下文；
- 若实现可选 AI provider，密钥使用系统安全存储，不得明文写入仓库或普通日志。

## 8. 技术栈

优先采用：

- Tauri 2；
- React；
- TypeScript 严格模式；
- Vite；
- Rust stable；
- SQLite；
- Rust migrations；
- FSRS Rust 实现；
- pnpm workspace；
- Vitest；
- React Testing Library；
- Playwright；
- ESLint；
- Prettier；
- cargo fmt；
- cargo clippy；
- GitHub Actions。

不要为了“技术先进”随意替换核心栈。确实遇到不可解决的兼容问题时，在 `docs/decisions/` 写 ADR 后再调整。

建议目录：

```text
vocabsprite/
├─ AGENTS.md
├─ README.md
├─ README.zh-CN.md
├─ LICENSE
├─ SECURITY.md
├─ PRIVACY.md
├─ CONTRIBUTING.md
├─ CODE_OF_CONDUCT.md
├─ package.json
├─ pnpm-workspace.yaml
├─ apps/
│  └─ desktop/
│     ├─ src/
│     ├─ src-tauri/
│     └─ tests/
├─ packages/
│  ├─ domain/
│  ├─ pack-schema/
│  ├─ ui/
│  └─ test-fixtures/
├─ crates/
│  ├─ learning-core/
│  ├─ pack-engine/
│  ├─ storage/
│  └─ platform/
├─ packs/
│  ├─ catalog.json
│  ├─ primary-demo/
│  ├─ junior-demo/
│  ├─ senior-demo/
│  ├─ cet4-demo/
│  ├─ cet6-demo/
│  ├─ postgraduate-demo/
│  └─ custom-template/
├─ scripts/
├─ docs/
│  ├─ architecture.md
│  ├─ learning-model.md
│  ├─ pack-format.md
│  ├─ content-licensing.md
│  ├─ threat-model.md
│  ├─ accessibility.md
│  └─ decisions/
└─ .github/
   └─ workflows/
```

可以根据实际构建需求调整，但职责必须清晰。

## 9. 核心数据模型

至少实现以下实体：

```text
User
UserSettings
LearningGoal
Pack
PackVersion
PackMembership
Lexeme
WordSense
Pronunciation
ExampleSentence
Collocation
Relation
MnemonicCue
CueEffectiveness
MotionRecipe
VisualAsset
ReviewCard
ReviewEvent
DirectionalMastery
ScaffoldState
ConfusionEdge
SourceContext
AttentionBudget
SnoozeEvent
ImportJob
PackConflict
```

关键原则：

- `Lexeme` 表示拼写和词形；
- `WordSense` 表示具体义项；
- FSRS 学习状态绑定到可复习卡片或方向，而不是笼统绑定整个拼写；
- 模块归属通过多对多关系实现；
- 内容数据与用户学习数据分开；
- 所有稳定 ID 均不可依赖数据库自增值；
- pack 更新不得更改既有稳定 ID；
- 删除词包不能删除用户自建内容或无关学习历史；
- 所有迁移都要可测试。

## 10. 首次使用流程

实现以下 onboarding：

1. 选择界面语言；
2. 选择学习目标：
   - 日常积累；
   - 小学；
   - 初中；
   - 高中；
   - CET-4；
   - CET-6；
   - 考研；
3. 可多选模块；
4. 设置每日新词数、最大卡片次数和安静时段；
5. 选择卡片出现位置与是否置顶；
6. 选择动画强度；
7. 可进行 10～20 题快速摸底；
8. 根据摸底跳过明显已掌握词，但允许撤销；
9. 显示第一张卡；
10. 明确说明所有数据默认保存在本机。

## 11. 统计与可解释性

主页至少显示：

- 今日新学；
- 今日复习；
- 今日剩余注意力预算；
- 连续学习天数；
- 各模块覆盖率；
- 各模块主动词汇与识别词汇；
- 最常混淆的词对；
- 最有效的助记类型；
- 即将到来的复习负担；
- 最近触发的 Memory Rescue；
- 数据导出入口。

不要只显示一个无法解释的“词汇量”。要区分：

- seen；
- recognized；
- recallable；
- usable；
- mature。

## 12. 导入与导出

支持：

- CSV 导入；
- VocabSprite JSON Pack 导入；
- VocabSprite 全量备份导出；
- 学习记录 CSV 导出；
- 自定义词包导出；
- 可选的 Anki 文本格式兼容导入；
- 第一版不必写 `.apkg` 二进制导出，但须在 README 中明确。

导入必须：

- 预览；
- 验证；
- 报告重复；
- 报告冲突；
- 原子提交；
- 失败回滚；
- 记录来源；
- 支持 dry run；
- 不执行文件中任何脚本或 HTML。

## 13. 可访问性

必须：

- 完整键盘操作；
- 合理焦点顺序；
- 清晰 focus ring；
- ARIA 标签；
- 高对比主题；
- 深色和浅色主题；
- 减少动态效果；
- 动画关闭后仍能理解词义；
- 不仅依靠颜色表达正确与错误；
- 发音按钮有文字替代；
- 小学模式不等于幼稚化，也不要使用难以辨认的花哨字体。

## 14. 性能目标

在普通 Windows 电脑上：

- 空闲时 CPU 使用应接近 0；
- 紧凑卡首次显示不应长时间白屏；
- 首屏数据从本地数据库读取；
- 10000 个词义、100000 条复习日志时仍能正常启动和查询；
- 数据库关键查询有索引；
- 不在前端一次性加载全部复习历史；
- 图片使用懒加载与缓存；
- 动画保持平滑且可关闭；
- 记录基准测试脚本和结果，不得编造测试数字。

## 15. 测试与验收

至少完成以下自动化测试。

### 15.1 Pack Fusion

- 选择 CET-4 和 CET-6 后，相同义项只存在一个学习对象；
- 相同拼写不同义项不会误合并；
- 模块标签全部保留；
- 取消一个模块不会删除另一个模块仍需要的词；
- pack 升级后学习进度保留；
- 冲突能被报告；
- 无许可证 manifest 被拒绝；
- checksum 不一致被拒绝。

### 15.2 Scheduler

- 相同输入产生相同队列；
- 跨时区不丢卡；
- 每日预算生效；
- snooze 生效；
- Memory Rescue 优先级正确；
- 新词上限正确；
- 已暂停时不会弹卡。

### 15.3 Scaffold

- 四阶段正常前进；
- 单方向失败只回退该方向；
- 多次失败触发救援；
- 用户手动降低难度不会破坏历史。

### 15.4 Confusion Graph

- 错成目标词时建立边；
- 重复错误增加权重；
- 达阈值生成对抗卡；
- 衰减不产生负值；
- 删除用户数据后边消失。

### 15.5 Desktop Behavior

- Compact/Expanded/Dot 状态可切换；
- 关闭等于 snooze；
- 删除需要二次确认；
- 位置持久化；
- 屏幕边界修正；
- reduced motion 生效；
- 卡片默认不抢焦点；
- tray 菜单有效；
- 无语音时不崩溃。

### 15.6 Privacy/Security

- 未按快捷键不读取剪贴板；
- 无 opt-in 时没有网络请求；
- 导入恶意路径被拒绝；
- 超大文件被拒绝；
- 外链 allowlist 生效；
- 日志不包含敏感内容；
- 全量删除可验证。

### 15.7 Import/Export

- CSV round trip；
- JSON pack round trip；
- 全量备份恢复；
- 导入失败回滚；
- 重复词处理一致；
- 旧 schema 有明确迁移或错误信息。

## 16. 构建命令

根目录必须提供以下可用命令；名字可以略作调整，但 README 必须同步：

```bash
pnpm install
pnpm dev
pnpm tauri:dev
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:rust
pnpm pack:validate
pnpm pack:diff
pnpm build
pnpm tauri:build
```

Rust 侧至少运行：

```bash
cargo fmt --all --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace
```

## 17. CI 与发布

GitHub Actions 至少包含：

- TypeScript lint/typecheck/test；
- Rust fmt/clippy/test；
- pack schema 与内容校验；
- Playwright；
- Windows Tauri build；
- 依赖缓存；
- 上传构建产物；
- 不把密钥写进 workflow；
- Dependabot 或 Renovate 配置；
- Release 草稿流程。

第一版以 Windows 10/11 为主要支持平台。macOS/Linux 可以通过 CI 做基础兼容检查，但 README 必须如实标注未充分验证的能力。

## 18. 文档

必须交付：

- `README.md`：英文；
- `README.zh-CN.md`：中文；
- 架构图；
- 功能截图或可复现的截图脚本；
- 60 秒演示流程；
- 安装、开发、测试、构建步骤；
- 词包格式文档；
- 内容许可说明；
- 隐私说明；
- 威胁模型；
- 可访问性说明；
- 贡献指南；
- Roadmap；
- FAQ；
- “与 Anki 等通用卡片工具的关系”：不要贬低其他项目，说明 VocabSprite 聚焦环境式词汇学习。

README 的首屏应突出以下五点：

1. 桌面角落、可拖动且不打扰；
2. 小学到考研的模块融合；
3. 动态词义；
4. 个人易混词图谱；
5. 提示逐步撤离。

不要把“AI”放在首屏核心卖点。

## 19. 实施阶段

不要一次性写大量未运行代码。按以下阶段推进，每阶段结束都运行相关测试并记录结果。

### 阶段 A：仓库与决策

- 检查当前仓库；
- 写 `docs/implementation-plan.md`；
- 写关键 ADR；
- 建立 monorepo；
- 建立 AGENTS.md；
- 完成 CI 骨架；
- 确认许可证兼容性。

### 阶段 B：领域模型与词包引擎

- schema；
- pack validator；
- importer；
- fusion；
- demo packs；
- 数据库迁移；
- 单元测试。

### 阶段 C：学习引擎

- FSRS adapter；
- directional mastery；
- scaffold state；
- confusion graph；
- cue effectiveness；
- memory rescue；
- attention budget；
- 测试。

### 阶段 D：桌面垂直切片

- onboarding；
- 模块选择；
- compact card；
- expanded panel；
- tray；
- window state；
- 一次完整学习流程；
- 本地数据持久化。

### 阶段 E：动态词义与视觉内容

- 12 个 motion；
- 20 个 SVG；
- reduced motion；
- 图片 fallback；
- 组件测试。

### 阶段 F：导入导出、统计与打磨

- CSV/JSON；
- 备份恢复；
- 统计主页；
- why-now；
- accessibility；
- security hardening；
- performance checks。

### 阶段 G：发布验证

- 从干净环境安装；
- 运行全部命令；
- Windows build；
- 修复失败；
- 生成截图；
- 检查 README；
- 输出最终报告。

## 20. 工作方式

- 先检查仓库和环境，再行动；
- 不要只给计划，必须实际修改文件；
- 不要因为任务较大而停在脚手架；
- 不要询问可以从现有信息合理决定的问题；
- 遇到非关键歧义时选择最安全、最简单、最可维护的方案并记录；
- 可以使用子代理并行检查架构、UI、学习引擎、安全和测试，但主代理必须整合结果；
- 不要伪造命令成功；
- 无法运行的测试必须明确说明具体环境原因；
- 不要把 TODO 当作已完成功能；
- 不要为了通过测试而删除测试或降低断言；
- 每个阶段保持应用可启动；
- 任何对用户数据有破坏性的迁移都必须有备份策略；
- 保持核心流程在完全离线状态可用。

## 21. 完成定义

只有同时满足以下条件才可结束任务：

- 应用能启动；
- 首次使用可选择多个模块；
- 模块融合真实工作；
- 至少七个模块入口及演示内容存在；
- 桌面卡可拖动、关闭、展开、缩小；
- 关闭不会删除词；
- FSRS 调度工作；
- 四阶段提示撤离工作；
- 易混词图谱工作；
- Memory Rescue 工作；
- 至少 12 个动态词义效果；
- 至少 20 个本地 SVG 场景；
- 无网络也能完整学习；
- 全部核心数据持久化；
- 导入导出可用；
- 隐私和许可信息真实；
- 关键测试通过；
- Windows 构建成功，或明确给出唯一阻塞原因与已验证的替代证据；
- README 的命令从干净环境可复现。

## 22. 最终回复格式

完成后只给出基于真实执行结果的报告，包含：

1. 实现概览；
2. 关键架构；
3. 差异化功能逐项对应；
4. 创建或修改的主要文件；
5. 实际运行的命令；
6. 测试结果；
7. 构建产物位置；
8. 截图位置；
9. 已知限制；
10. 下一步优先级。

现在开始：先检查当前目录、工具链和已有文件，创建 `docs/implementation-plan.md`，然后按阶段实际实现。不要停留在讨论层面。
