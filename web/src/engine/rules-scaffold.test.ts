import { describe, expect, it } from 'vitest';
import { rules } from './rules';
import { analyze } from './detect';
import { repeatedOpeningHits, scaffoldChainCount } from './frames';
import { clean, defaultOptions } from './clean';

// ZH07 与 scaffoldChains 的启用评估语料(任务书:规则加强批 2026-11-02)。
// 正例 = 含 ≥3 个相邻段首「要/需要」框架的中文文本;反例 = 操作教程、步骤说明、真实逻辑顺序、
// 少于 3 个框架与人类随笔等易误报场景。ZH07 实验状态默认关闭,评估走 repeatedOpeningHits 直测。
const zh07 = rules.find(r => r.id === 'ZH07')!;
const join = (paras: string[]) => paras.join('\n\n');

describe('ZH07 重复段首模板(实验规则)', () => {
  it('stays experimental: sentence-pattern, mark-only, disabled by default', () => {
    expect(zh07.enabled).toBe(false);
    expect(zh07.category).toBe('sentence-pattern');
    expect(zh07.autoFix).toBe(false);
  });

  const positives: Array<[string, string[]]> = [
    ['议论文', ['首先要明确自己的目标，不能什么都想要。', '其次要保持足够的专注，把精力集中在关键任务上。', '最后要坚持复盘，让每次尝试都变成经验。']],
    ['工作总结', ['首先要建立清晰的分工，让每件事都有明确的责任人。', '其次要保证信息同步，避免各做各的。', '最后要定期回顾项目节奏，及时调整方向。']],
    ['产品规划', ['首先要确认核心场景，明确产品到底解决什么问题。', '其次要打磨关键路径，让主要流程足够顺滑。', '最后要建立反馈渠道，持续收集用户的声音。']],
    ['学习方法', ['首先要制定一份可执行的学习计划。', '其次要保证每天的练习量，积累真实的语料。', '最后要定期检验成果，查漏补缺。']],
    ['健康科普', ['首先要控制总热量的摄入，饮食结构比总量更关键。', '其次要保证蛋白质的供应，维持肌肉量。', '最后要保持规律的运动习惯，循序渐进。']],
    ['营销策划', ['首先要明确目标人群，避免广撒网。', '其次要统一品牌的表达口径，形成记忆点。', '最后要持续追踪转化数据，动态调整投放。']],
    ['需要-变体', ['首先需要确定调研的范围。', '其次需要明确各项责任人。', '最后需要排出时间表。']],
  ];
  for (const [genre, paras] of positives) it(`正例命中：${genre}（3 段框架逐段标注）`, () => {
    const text = join(paras);
    const hits = repeatedOpeningHits(text, text);
    expect(hits).toHaveLength(3);
    for (const [i, para] of paras.entries()) {
      expect(hits[i].start).toBe(text.indexOf(para));
      expect(text.slice(hits[i].start, hits[i].end)).toMatch(/^(?:首先|其次|最后)(?:要|需要)$/);
      expect(hits[i].label).toBe('重复段首模板');
    }
  });

  const negatives: Array<[string, string]> = [
    ['操作教程（第一步式，无框架）', join(['第一步要准备安装环境，确认系统版本。', '第二步要下载安装包并解压到目标目录。', '第三步要运行安装脚本，等待完成即可。'])],
    ['操作教程（框架句全是界面操作，整链豁免）', join(['首先要打开系统设置页面。', '其次要点击账户与同步选项。', '最后要保存更改并重启应用。'])],
    ['步骤说明（框架+第X步标记，整链豁免）', join(['首先要备份当前的数据库文件。', '第二步要迁移配置文件到新目录。', '最后要验证服务的运行状态。'])],
    ['真实逻辑顺序说明文（无框架）', join(['光合作用的起点是叶片中的叶绿体，它负责捕获光能。', '二氧化碳和水在光能驱动下合成糖类，为植物提供养分。', '氧气在这一过程中被释放出来，重新回到大气。'])],
    ['只有 1 个段首框架', join(['首先要明确目标，这一点没有争议。', '剩下的执行细节可以灵活调整，不必强求统一的格式。', '进度本身才是最重要的指标。'])],
    ['只有 2 个相邻段首框架', join(['首先要明确目标，避免资源分散。', '其次要保持节奏，按周检查进展。', '团队氛围同样值得关注，好的协作会让执行更轻松。'])],
    ['人类风格随笔', join(['写字这件事，急不来。我常常在深夜改一段话，改到第七遍才发现问题出在开头。', '朋友劝我用提纲，我试过几次，总觉得提纲把话说死了。', '后来索性先写完再回头删，删掉的三分之一往往是最用力的部分。'])],
    ['引用块内的框架不报', '> 首先要明确目标。\n> 其次要保持专注。\n> 最后要坚持复盘。'],
  ];
  for (const [name, text] of negatives) it(`反例不命中：${name}`, () => {
    expect(repeatedOpeningHits(text, text)).toHaveLength(0);
    expect(analyze(text).findings.filter(f => f.ruleId === 'ZH07')).toHaveLength(0);
  });

  it('段内出现框架（非段首）不参与统计', () => {
    const text = join(['执行时我们首先要考虑成本，其次要考虑进度。', '另一段是普通内容，讲一些别的事情。', '第三段继续普通内容。']);
    expect(repeatedOpeningHits(text, text)).toHaveLength(0);
  });

  it('启用后逐段标注、不改写文本；关闭后恢复零命中', () => {
    const text = join(['首先要明确目标。', '其次要保持专注。', '最后要坚持复盘。']);
    zh07.enabled = true;
    try {
      const a = analyze(text);
      expect(a.findings.filter(f => f.ruleId === 'ZH07')).toHaveLength(3);
      expect(a.patternHits).toBe(3);
      expect(clean(text, defaultOptions).text).toBe(text);
    } finally {
      zh07.enabled = false;
    }
    expect(analyze(text).findings.filter(f => f.ruleId === 'ZH07')).toHaveLength(0);
  });
});

describe('scaffoldChains 序列骨架统计', () => {
  const stat = (text: string) => analyze(text).scaffoldChains;

  it('中文链：首先/其次/最后 计 1 条', () => {
    expect(stat('首先，我们要看清问题。其次，拆解问题的成因。最后，给出可执行的方案。')).toBe(1);
  });
  it('中文变体：然后、再次与第一/第二/第三 同样成链', () => {
    expect(stat('首先要看清问题。然后要拆解成因。最后要给出方案。')).toBe(1);
    expect(stat('第一，明确范围。第二，指定责任人。第三，排出时间表。')).toBe(1);
    expect(stat('首先，回顾进度；再次，确认风险；最后，同步排期。')).toBe(1);
  });
  it('两条独立链计 2', () => {
    expect(stat('首先，A。其次，B。最后，C。\n\n首先，D。其次，E。最后，F。')).toBe(2);
  });
  it('反例：只有 2 个标记不成链（中英）', () => {
    expect(stat('首先，看清问题。其次，拆解成因。')).toBe(0);
    expect(stat('First, define the goal. Second, pick the metric.')).toBe(0);
  });
  it('反例：乱序不成链', () => {
    expect(stat('最后，总结全文。首先，回顾背景。其次，分析原因。')).toBe(0);
  });
  it('反例：计数与排名用法不误计', () => {
    expect(stat('第一步要准备环境。第二步要安装依赖。第三步要运行测试。')).toBe(0);
    expect(stat('他获得第一名，团队获得第二、第三名，创队史最好成绩。')).toBe(0);
    expect(stat('这是本月最后一次例会，其余议题顺延到下月。')).toBe(0);
  });
  it('英文链：First/Second/Third 与 Firstly/Secondly/Finally 各计 1 条', () => {
    expect(stat('First, define the goal. Second, pick the metric. Third, review weekly.')).toBe(1);
    expect(stat('Firstly, gather data. Secondly, clean it. Finally, publish the results.')).toBe(1);
  });
  it('英文非句首的 first/second 不计入', () => {
    expect(stat('The first chapter sets the scene, the second builds it, and the third resolves it.')).toBe(0);
  });
  it('代码块与引用块内不计', () => {
    expect(stat('```\nFirst, one. Second, two. Third, three.\n```\n> Finally, a quote.')).toBe(0);
  });
  it('统计独立于命中与清理：纯骨架文本零命中、密度与清理结果不变', () => {
    const text = '首先，我们要看清问题。其次，拆解问题的成因。最后，给出可执行的方案。';
    const a = analyze(text);
    expect(a.findings).toHaveLength(0);
    expect(a.patternHits).toBe(0);
    expect(a.scaffoldChains).toBe(1);
    expect(a.density).toBe(null);
    expect(clean(text, defaultOptions).text).toBe(text);
  });
  it('直接计数函数与 analyze 口径一致', () => {
    const text = '首先，A。其次，B。最后，C。';
    expect(scaffoldChainCount(text)).toBe(analyze(text).scaffoldChains);
  });
});
