// 段落级骨架:ZH07「重复段首模板」(实验规则,只标不改)与 scaffoldChains「序列骨架」统计。
// 两者输出完全分离:ZH07 走 findings(默认关闭,启用与否由验收裁决);scaffoldChains 只计数,
// 不产生命中、不高亮、不参与清理,也不影响句式命中密度口径。

// ZH07(RULES.md):≥3 个相邻段落以「首先要/其次要/最后要」等固定框架展开。
// 裸过渡词(首先/其次/最后)不在词表内——既有裁决:裸过渡词不单独成规则,走密度口径。
export const ZH07_MIN_ADJACENT = 3;
const ZH07_FRAME = /(?:首先需要|其次需要|再次需要|最后需要|首先要|其次要|再次要|最后要)/;
// 操作教程特征:UI/软件操作动词与界面元素;链内每段首句都出现时,整条链按操作教程豁免。
const TUTORIAL_CUE = /(?:打开|点击|双击|长按|滑动|拖动|勾选|输入|粘贴|下载|上传|安装|卸载|登录|登出|重启|刷新|保存|填写|弹窗|按钮|菜单|页面|输入框|快捷键|网址)/;
// 步骤说明特征:链内任一段出现「第X步/步骤X」即整条链豁免。
const STEP_CUE = /第[一二三四五六七八九十\d]+步|步骤[一二三四五六七八九十\d]/;

export function repeatedOpeningHits(body: string, original: string): Array<{ start: number; end: number; label: string }> {
  const out: Array<{ start: number; end: number; label: string }> = [];
  type Frame = { start: number; end: number; firstSentence: string; paragraph: string };
  let run: Frame[] = [];
  const flush = () => {
    const stepWise = run.some(p => STEP_CUE.test(p.paragraph));
    const tutorial = run.every(p => TUTORIAL_CUE.test(p.firstSentence));
    if (run.length >= ZH07_MIN_ADJACENT && !stepWise && !tutorial) out.push(...run.map(({ start, end }) => ({ start, end, label: '重复段首模板' })));
    run = [];
  };
  for (const match of body.matchAll(/[^\n]+(?:\n(?![ \t]*\n)[^\n]+)*/g)) {
    const para = match[0];
    const lead = /^[ \t]*/.exec(para)![0].length;
    const frame = ZH07_FRAME.exec(para.slice(lead));
    if (!frame) { flush(); continue; }
    const start = match.index + lead + frame.index;
    // 框架必须落在原文该行的行首:豁免「行首是引用/列表等被掩码内容、框架只是紧随其后」的边缘情况。
    const lineStart = original.lastIndexOf('\n', start - 1) + 1;
    if (!/^[ \t]*$/.test(original.slice(lineStart, start))) { flush(); continue; }
    run.push({ start, end: start + frame[0].length, firstSentence: para.slice(lead).split(/[。！？\n]/)[0], paragraph: para });
  }
  flush();
  return out;
}

// scaffoldChains:完整有序序列链条数。一条链 = 同族序列标记按序(严格递增)出现 ≥3 个;
// 遇到不递增的标记则当前链重开;链计满即计数并清空,同链标记不重复计;中英两族独立计数。
// 作用域:与命中扫描同口径,代码块/引用/链接内的标记不计(detect 传入掩码后的正文)。
const ZH_RANK = new Map([['首先', 1], ['其次', 2], ['再次', 3], ['然后', 3]]);
const ZH_NUMERAL = new Map([...Array.from('一二三四五六七八九十')].map((c, i) => [c, i + 1]));
// 「第X」须位于行首或句读之后;「第X步」「第X名/次/天…」等计数与排名用法不是序列标记;「最后一天/最后一次」同理。
const ZH_MARKER = /首先|其次|然后|最后(?![一次天月年日名轮批款项条页个])|(?<![^\n。！？；，、：\s])(?:再次|第[一二三四五六七八九十](?![一次天月年日名轮批款项条页章步]))/g;
const ZH_ORDINAL = /^第[一二三四五六七八九十]$/;
// 英文标记须位于行首或 .!?;: 之后,避免 the first / at first 一类普通名词用法。
const EN_RANK = new Map([['first', 1], ['firstly', 1], ['second', 2], ['secondly', 2], ['third', 3], ['thirdly', 3], ['fourth', 4], ['fourthly', 4], ['fifth', 5], ['fifthly', 5], ['finally', 99], ['lastly', 99]]);
const EN_MARKER = /\b(?:firstly|first|secondly|second|thirdly|third|fourthly|fourth|fifthly|fifth|lastly|finally)\b/gi;
const TERMINAL_RANK = 99;

export function scaffoldChainCount(body: string): number {
  const chains = (ranks: number[]) => {
    let count = 0, run = 0, last = 0;
    for (const rank of ranks) {
      if (rank > last) { run++; last = rank; if (run === 3) { count++; run = 0; last = 0; } }
      else { run = 1; last = rank; }
    }
    return count;
  };
  const zh: number[] = [];
  for (const match of body.matchAll(ZH_MARKER)) zh.push(ZH_ORDINAL.test(match[0]) ? ZH_NUMERAL.get(match[0][1])! : ZH_RANK.get(match[0]) ?? TERMINAL_RANK);
  const en: number[] = [];
  for (const match of body.matchAll(EN_MARKER)) {
    if (match.index && !/[\n.!?;:]\s*$/.test(body.slice(0, match.index))) continue;
    en.push(EN_RANK.get(match[0].toLowerCase()) ?? TERMINAL_RANK);
  }
  return chains(zh) + chains(en);
}
