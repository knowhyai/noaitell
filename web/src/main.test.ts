import { afterEach, expect, it, vi } from 'vitest';
import { analyze, defaultOptions, type CleanOptions } from './engine';

// A small DOM adapter exercises the actual event handlers and rendered copy.
// The engine itself remains DOM-free.
function makeNode() {
  const listeners: Record<string, (e?: unknown) => void> = {};
  const node: {
    innerHTML: string; value: string; checked: boolean; scrollTop: number; style: Record<string, string>;
    selection: number[]; listeners: Record<string, (e?: unknown) => void>;
    onclick?: (e?: unknown) => void;
    addEventListener: (event: string, listener: (e?: unknown) => void) => void;
    focus: () => void; setSelectionRange: (start: number, end: number) => void;
  } = {
    innerHTML: '', value: '', checked: false, scrollTop: 0, style: {}, selection: [-1, -1], listeners,
    addEventListener: (event, listener) => { listeners[event] = listener; },
    focus: () => {},
    setSelectionRange: (start, end) => { node.selection = [start, end]; },
  };
  return node;
}

const sample = 'It is important to note that this works. Visit [guide](https://example.com/a?utm_source=x) now.';

async function mount() {
  vi.resetModules();
  const nodes = new Map<string, ReturnType<typeof makeNode>>();
  for (const selector of ['#app', '#editor', '#clean', '#high', '#restore', '#backdrop', '#hide']) {
    nodes.set(selector, makeNode());
  }
  const bodyClasses = new Set<string>();
  const classList = {
    add: (c: string) => bodyClasses.add(c),
    remove: (c: string) => bodyClasses.delete(c),
    contains: (c: string) => bodyClasses.has(c),
    toggle: (c: string) => (bodyClasses.has(c) ? bodyClasses.delete(c) : bodyClasses.add(c)),
  };
  const typography = { dataset: { option: 'typography' }, checked: false, onchange: () => {} };
  vi.stubGlobal('document', {
    body: { classList },
    querySelector: (selector: string) => nodes.get(selector) || null,
    querySelectorAll: (selector: string) => selector === '[data-option]' ? [typography] : [],
  });
  vi.stubGlobal('location', { pathname: '/' });
  await import('./main');
  const app = nodes.get('#app')!;
  return {
    nodes, typography, bodyClasses,
    html: () => app.innerHTML,
    editor: nodes.get('#editor')!,
    backdrop: () => nodes.get('#backdrop')!.innerHTML,
    input: (text: string) => { nodes.get('#editor')!.value = text; nodes.get('#editor')!.listeners.input(); },
    click: (selector: string) => nodes.get(selector)!.listeners.click(),
    change: (selector: string) => nodes.get(selector)!.listeners.change({ target: nodes.get(selector) }),
    tap: (dataset: Record<string, string>) => app.onclick?.({ target: { closest: () => ({ dataset }) } } as unknown as Event),
  };
}

afterEach(() => vi.unstubAllGlobals());

it('F11: renders statistics from the actual cleaning action, including high-confidence options', async () => {
  const app = await mount();
  app.input('English “quotes”. A\u200BB');
  app.typography.checked = true;
  app.typography.onchange();
  app.click('#high');
  expect(app.html()).toContain('已实际清理 1 项 · 结果中剩余命中 2 项（含未选清理项与需复核项）');
  app.typography.checked = false;
  app.typography.onchange();
  expect(app.html()).toContain('已实际清理 1 项 · 结果中剩余命中 2 项');
  app.click('#restore');
  expect(app.html()).not.toContain('已实际清理');
});

it('F11: still displays statistics when cleaning produces empty output', async () => {
  const app = await mount();
  app.input('\u200B');
  app.click('#clean');
  expect(app.html()).toContain('已实际清理 1 项 · 结果中剩余命中 0 项');
});

it('keeps the zero-hit wording and excludes invisible findings from inline highlights', async () => {
  const app = await mount();
  app.input('Ordinary text.');
  expect(app.html()).toContain('未发现当前规则覆盖的问题');
  app.input('A\u200BB');
  expect(app.backdrop()).not.toContain('<mark');
});

it('renders one backdrop mark per non-ignored, renderable finding', async () => {
  const app = await mount();
  app.input(sample);
  const expected = analyze(sample).findings.filter(f => !f.ignored && f.ruleId !== 'CHAR01').length;
  expect(expected).toBeGreaterThan(1);
  const marks = (app.backdrop().match(/<mark\b/g) || []).length;
  expect(marks).toBe(expected);
});

it('hides and restores backdrop marks through the pane-head toggle', async () => {
  const app = await mount();
  app.input(sample);
  expect(app.backdrop()).toContain('<mark');
  app.nodes.get('#hide')!.checked = true;
  app.change('#hide');
  expect(app.backdrop()).not.toContain('<mark');
  app.nodes.get('#hide')!.checked = false;
  app.change('#hide');
  expect(app.backdrop()).toContain('<mark');
});

it('collapses cleanup options into a one-line summary that expands on demand', async () => {
  const app = await mount();
  const selected = (['invisible', 'markdown', 'typography', 'tracking', 'whitespace', 'homoglyph'] as Array<keyof CleanOptions>)
    .filter(k => defaultOptions[k]).length;
  expect(app.html()).toContain(`已选 ${selected}/6`);
  expect(app.html()).toContain('展开');
  expect(app.html()).not.toContain('data-option');
  app.tap({ cleanup: 'toggle' });
  expect(app.html()).toContain('data-option');
  expect(app.html()).toContain('收起');
  expect(app.html()).toContain('清理所选项');
  app.tap({ cleanup: 'toggle' });
  expect(app.html()).not.toContain('data-option');
});

it('cycles 上一处/下一处 through findings in document order', async () => {
  const app = await mount();
  expect(app.html()).toMatch(/data-nav="prev"[^>]*disabled/);
  app.input(sample);
  const starts = analyze(sample).findings.filter(f => !f.ignored).map(f => f.start).sort((a, b) => a - b);
  expect(starts.length).toBeGreaterThan(1);
  app.tap({ nav: 'next' });
  expect(app.editor.selection[0]).toBe(starts[0]);
  app.tap({ nav: 'next' });
  expect(app.editor.selection[0]).toBe(starts[1]);
  app.tap({ nav: 'prev' });
  expect(app.editor.selection[0]).toBe(starts[0]);
  app.tap({ nav: 'prev' });
  expect(app.editor.selection[0]).toBe(starts[starts.length - 1]);
});

it('closes the mobile drawer when locating a finding', async () => {
  const app = await mount();
  app.input(sample);
  const id = app.html().match(/data-locate="([^"]+)"/)?.[1];
  expect(id).toBeTruthy();
  app.bodyClasses.add('drawer-open');
  app.tap({ locate: id! });
  expect(app.bodyClasses.has('drawer-open')).toBe(false);
  expect(app.editor.selection[0]).toBeGreaterThanOrEqual(0);
});

it('keeps the H1 verbatim in the thin top bar and drops the marketing banner', async () => {
  const app = await mount();
  expect(app.html()).toContain('<h1 class="page-title">不判断作者，只找可清理的痕迹。</h1>');
  expect(app.html()).toContain('⌾ 本地运行 · 不上传');
  expect(app.html()).not.toContain('class="intro"');
  expect(app.html()).toContain('class="page-note"');
});
