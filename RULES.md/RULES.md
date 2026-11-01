# NoAITell 句式规则清单（v1 定稿，2026-11-01）

来源：ChatGPT 第二轮半（EN01–07 / ZH01–07）+ GLM（ZCode）第二轮（E1–E8 / C1–C8）合并去重，Andi 裁决。与 SPEC 修订补充四一致：v1 首批只启用中英各 5 条高精度规则，其余列实验，误报测试达标（高置信规则精确率 ≥85%）后再启用。准确率优先于覆盖面。

## 规则数据结构（每条必填）
id / language（en|zh）/ category（sentence-pattern）/ confidence（high|medium|low，即规则可靠性，非 AI 来源概率）/ autoFix（句式类恒为 false，只标不改）/ description / matcher / threshold（可独立调参）/ exemptions / testCases（正例+反例）。

## 通用豁免与引擎约束（全规则共用）
1. 成对引号、引用块、代码块、链接内不匹配。
2. 位置条件：开场类仅段首/句首命中，收尾类仅末段命中。
3. 文体模式（学术/公文/营销/文艺）：开启时对应高风险规则降档或停用（v1 先做数据结构预留，UI 后置）。
4. 密度联动：单次命中取默认置信档；同段或千字内重复出现升一档；句式密度与格式残留分开计数、分开呈现。
5. 术语白名单：用户可编辑，命中白名单不报。
6. 语言分别归一化：中英密度分开算；阈值均为可调参数，不是产品承诺（破折号密度同理入统计口径，不做逐项规则）。

## 英文规则
首批启用（5）：EN01、EN02、EN05、EN08、EN10。实验：EN03、EN04、EN06、EN07、EN09、EN11、EN12、EN13。

- EN01 否定式升级（高）：not just X, but (also) Y。例：It's not just software, but a new way of thinking. 豁免：广告修辞与正常强调常见，孤立一次仅提示。
- EN02 纠正式对偶（高）：It's not about X, it's about Y。例：It's not about speed. It's about precision. 豁免：事实纠错、论证辩论。
- EN03 从 A 到 B 夸张扩展（中，实验）：From X to Y + 跨领域抽象名词。例：From innovation to transformation, AI reshapes everything. 豁免：时间/空间/数字范围。
- EN04 三段式重复（中，实验）：连续三个平行短分句、共享语法开头。例：It empowers teams. It accelerates growth. It unlocks potential. 豁免：编号清单、诗歌、演讲引文。
- EN05 元话语开场（高）：Let's (dive into | explore | unpack) / delve into。例：Let's dive into the key benefits. 豁免：教学文章、真实任务指令；delve 的文学正当语域。
- EN06 机械式收束（低，实验）：In conclusion / To sum up + 泛化总结。例：In conclusion, technology offers both opportunities and challenges. 豁免：学术正文、正式报告单次出现。
- EN07 重复段落开头（中，实验）：≥3 个相邻段落同句首框架。例：The key is... ×3。豁免：有意排比、条款文本。
- EN08 时代背景开场（高）：句首 In (today's|the) (fast-paced|modern|digital|ever-evolving|rapidly changing) (world|landscape|era|age|environment)。例：In today's fast-paced digital world, efficiency is everything. 豁免：非句首不报；引号内不报。（in the realm of 作为同类套话词条并入本条词表管理。）
- EN09 抽象名词三连（中，实验）：≥3 项逗号并列、≥2 项为抽象名词（-ity/-ment/-ness/-tion 或词表）、谓语属 offer/provide/deliver/ensure/combine 类。例：This approach offers flexibility, scalability, and reliability. 豁免：任一项为专名/数字/具体名词不报；标题与列表项不报。
- EN10 元话语填充（中高）：句首 It('s|is) (important|worth|crucial|essential) to (note|remember|mention|highlight) / It should be noted that。例：It's important to note that results may vary. 豁免：法律合规、学术写作；学术模式降为中。
- EN11 play a crucial role（中，实验）：play(s) a (crucial|vital|pivotal|key|significant|critical) role。例：Sleep plays a crucial role in recovery. 豁免：ESL/科普常见；与 EN09 同段共现升一档。
- EN12 a testament to（高，实验）：固定短语直匹配。例：The museum's growth is a testament to community support. 豁免：讣告/纪念文、建筑评论降档。
- EN13 Whether you're X or Y（中，实验）：句首 Whether you('re|are) … (or|and) …。例：Whether you're a student or a professional, this tool can help. 豁免：FAQ/营销文案降档；非句首不报。

## 中文规则
首批启用（5）：ZH01、ZH02、ZH04、ZH05、ZH06。实验：ZH03、ZH07、ZH08、ZH09。

- ZH01 不仅—更是（中高）：同句内「不仅/不但 … 更/而且/还」双标记共现（跨度 <40 字），含变体「这不仅仅是 X，更是 Y」。例：这不仅提高了效率，更改变了团队协作的方式。豁免：议论文/演讲合法修辞降档；单标记不报。
- ZH02 不是—而是（中高）：不是 X，而是 Y，同段重复或伴抽象评价时升档。例：真正重要的不是效率，而是价值。豁免：明确事实纠错、事实对比。
- ZH03 排比递进（中，实验）：三连平行结构，含「是…，是…，更是…」型。例：它是一种工具，是一种习惯，更是一种思维方式。豁免：诗歌、政策条款、刻意排比；引文不报。
- ZH04 时代背景套壳（中）：段首「在当今/如今/当下 … 的时代/社会/背景/环境下」或段首「随着 … 的不断/日益/快速/持续 发展/普及/进步」。例：随着人工智能的不断发展，内容创作正在被重塑。豁免：有具体年代、行业数据或背景论证时降权；公文模式停用；与 ZH05/ZH03 共现升档。
- ZH05 空泛强调开场（中高）：词表：值得注意的是｜需要指出的是｜值得一提的是｜不容忽视的是｜不可否认｜毋庸置疑，后接未具体说明的泛化判断。例：值得注意的是，这一趋势具有深远意义。豁免：后接证据/数据/明确例外；引文脚注；千字内 ≥2 次升档。
- ZH06 机械收束（中）：综上所述｜总而言之｜总的来看｜不难发现，仅限末段段首。例：综上所述，我们应积极拥抱变化，共创美好未来。豁免：正式报告结论、后接具体行动；学术/公文模式停用。
- ZH07 重复段首模板（中，实验）：≥3 个相邻段落以「首先要/其次要/最后要」等固定框架展开。豁免：操作教程、步骤说明、真实逻辑顺序。（注：「首先/其次/最后」裸过渡词不单独成规则，走密度口径。）
- ZH08 四字格三连堆砌（中，实验）：顿号/逗号分隔连续 ≥3 项、每项恰 4 字且命中四字格词库。例：我们要提质增效、降本增效、协同联动。豁免：公文模式停用；任一项含数字或专名不报。（本条正例已勘误：GLM 原稿举例为二字词，与匹配条件不符，已换四字格例。）
- ZH09 黑话/官样词表（中，实验，只标不改）：赋能｜抓手｜闭环｜颗粒度｜拉通｜沉淀｜打法｜组合拳｜致力于打造｜深度融合。例：通过数据赋能业务，形成增长闭环。豁免：行业内部文档靠用户白名单；单次中置信，同段 ≥2 次升档。

## 取舍原则
v1 只收「单发即可判」的高精度结构规则（位置条件 + 词表 + 结构共现三重约束）；纯词频类信号一律降级为密度指标或置信联动条件，不单独产生命中。候补暂缓：Not only … but also 倒装、em-dash 密度、句长方差（均入统计口径）；「深入探讨/深度解析」「让我们来看看」（人类高频或教程误报高，待文体识别后再议）。
