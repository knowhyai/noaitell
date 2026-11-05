import { afterEach, expect, it, vi } from 'vitest';
import { analyze, defaultOptions, type CleanOptions } from './engine';

// A small DOM adapter exercises the actual event handlers and rendered copy.
// The engine itself remains DOM-free.
function makeNode() {
  const listeners: Record<string, (e?: unknown) => void> = {};
  const classes = new Set<string>();
  const classList = {
    add: (c: string) => classes.add(c),
    remove: (c: string) => classes.delete(c),
    contains: (c: string) => classes.has(c),
    toggle: (c: string, force?: boolean) => { const next = force === undefined ? !classes.has(c) : force; if (next) classes.add(c); else classes.delete(c); return next; },
  };
  const node: {
    innerHTML: string; value: string; checked: boolean; scrollTop: number; style: Record<string, string>;
    selection: number[]; selectionStart: number; dataset: Record<string, string>;
    classList: typeof classList; scrollIntoView: (options?: { block?: string }) => void;
    listeners: Record<string, (e?: unknown) => void>;
    onclick?: (e?: unknown) => void;
    addEventListener: (event: string, listener: (e?: unknown) => void) => void;
    focus: () => void; setSelectionRange: (start: number, end: number) => void;
  } = {
    innerHTML: '', value: '', checked: false, scrollTop: 0, style: {}, selection: [-1, -1], selectionStart: 0,
    dataset: {}, classList, scrollIntoView: () => {}, listeners,
    addEventListener: (event, listener) => { listeners[event] = listener; },
    focus: () => {},
    setSelectionRange: (start, end) => { node.selection = [start, end]; },
  };
  return node;
}

const sample = 'It is important to note that this works. Visit [guide](https://example.com/a?utm_source=x) now.';

async function mount() {
  vi.resetModules();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) });
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
    querySelectorAll: (selector: string) => selector === '[data-option]' ? [typography] : nodes.has(selector) ? [nodes.get(selector)!] : [],
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
  expect(app.html()).toContain('Cleaned 1 items · 2 findings remain (including unselected items and review suggestions)');
  app.typography.checked = false;
  app.typography.onchange();
  expect(app.html()).toContain('Cleaned 1 items · 2 findings remain');
  app.click('#restore');
  expect(app.html()).not.toContain('Cleaned 1 items');
});

it('F11: still displays statistics when cleaning produces empty output', async () => {
  const app = await mount();
  app.input('\u200B');
  app.click('#clean');
  expect(app.html()).toContain('Cleaned 1 items · 0 findings remain');
});

it('keeps the zero-hit wording and excludes invisible findings from inline highlights', async () => {
  const app = await mount();
  app.input('Ordinary text.');
  expect(app.html()).toContain('No issues found by current rules');
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
  expect(app.html()).toContain(`Selected ${selected}/6`);
  expect(app.html()).toContain('Expand');
  expect(app.html()).not.toContain('data-option');
  app.tap({ cleanup: 'toggle' });
  expect(app.html()).toContain('data-option');
  expect(app.html()).toContain('Collapse');
  expect(app.html()).toContain('Clean text');
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

it('uses the shared site brand and a single cleaning CTA', async () => {
  const app = await mount();
  expect(app.html()).not.toContain('class="brand"');
  expect(app.html().match(/class="primary"/g)).toHaveLength(1);
  expect(app.html()).toContain('Processed in your browser · Not uploaded');
  expect(app.html()).not.toContain('class="intro"');
  expect(app.html()).toContain('class="page-note"');
});

it('shows the verbatim cleanup note when the options panel expands', async () => {
  const app = await mount();
  expect(app.html()).not.toContain('You control the changes; ignored findings stay untouched.');
  app.tap({ cleanup: 'toggle' });
  expect(app.html()).toContain('You control the changes; ignored findings stay untouched.');
});

it('rescans automatically after the 700ms debounce when there is no clean result', async () => {
  vi.useFakeTimers();
  try {
    const app = await mount();
    app.input(sample);
    expect(app.backdrop()).toContain('<mark');
    const longer = sample + ' Let\'s dive into the key benefits.';
    app.input(longer);
    expect(app.html()).toContain('Text changed, checking again');
    vi.advanceTimersByTime(699);
    expect(app.html()).toContain('Text changed, checking again');
    expect(app.backdrop()).not.toContain('<mark');
    vi.advanceTimersByTime(1);
    expect(app.html()).not.toContain('Text changed');
    const expected = analyze(longer).findings.filter(f => !f.ignored && f.ruleId !== 'CHAR01').length;
    expect((app.backdrop().match(/<mark\b/g) || []).length).toBe(expected);
    app.input(longer + ' It is important to note that this works.');
    vi.advanceTimersByTime(699);
    expect(app.html()).toContain('Text changed, checking again');
    vi.advanceTimersByTime(1);
    expect(app.html()).not.toContain('Text changed');
  } finally { vi.useRealTimers(); }
});

it('keeps the manual stale banner without auto rescan while a clean result exists', async () => {
  vi.useFakeTimers();
  try {
    const app = await mount();
    app.input(sample);
    app.click('#clean');
    app.input(sample + ' Edit after cleaning.');
    expect(app.html()).toContain('Text changed, results may be out of date');
    expect(app.html()).not.toContain('checking again');
    vi.advanceTimersByTime(5000);
    expect(app.html()).toContain('Text changed, results may be out of date');
  } finally { vi.useRealTimers(); }
});

it('holds the debounced rescan while composing and restarts it on compositionend', async () => {
  vi.useFakeTimers();
  try {
    const app = await mount();
    app.input(sample);
    app.editor.listeners.compositionstart();
    app.input(sample + ' 组字中');
    vi.advanceTimersByTime(5000);
    expect(app.html()).not.toContain('Text changed');
    app.editor.listeners.compositionend();
    expect(app.html()).toContain('Text changed, checking again');
    vi.advanceTimersByTime(699);
    expect(app.html()).toContain('Text changed, checking again');
    vi.advanceTimersByTime(1);
    expect(app.html()).not.toContain('Text changed');
  } finally { vi.useRealTimers(); }
});

it('links the editor caret to the matching finding row and syncs navigation', async () => {
  const app = await mount();
  const text = sample + ' Let\'s dive into the key benefits.';
  app.input(text);
  const sorted = analyze(text).findings.filter(f => !f.ignored).sort((a, b) => a.start - b.start);
  expect(sorted.length).toBeGreaterThan(2);
  const target = sorted[1];
  const row = makeNode();
  row.dataset = { find: target.id };
  const scrollIntoView = vi.fn();
  row.scrollIntoView = scrollIntoView;
  app.nodes.set('.finding[data-find]', row);
  app.nodes.set(`.finding[data-find="${target.id}"]`, row);
  const gap = [...Array(text.length).keys()].find(pos => !sorted.some(f => f.start <= pos && pos < f.end));
  expect(gap).toBeDefined();
  app.editor.selectionStart = target.start;
  app.editor.listeners.click();
  expect(row.classList.contains('hl-hot')).toBe(true);
  expect(scrollIntoView).toHaveBeenCalledTimes(1);
  const starts = sorted.map(f => f.start);
  app.tap({ nav: 'next' });
  expect(app.editor.selection[0]).toBe(starts[2]);
  app.tap({ nav: 'prev' });
  expect(app.editor.selection[0]).toBe(starts[1]);
  app.editor.selectionStart = gap!;
  app.editor.listeners.select();
  expect(row.classList.contains('hl-hot')).toBe(false);
  expect(scrollIntoView).toHaveBeenCalledTimes(1);
});

it('blocks the fourth cleaning while keeping source and the previous result available', async () => {
  const app = await mount();
  app.input('A\u200BB');
  app.click('#clean');
  app.click('#clean');
  app.click('#clean');
  expect(app.html()).toContain('0 free uses left today');
  app.click('#clean');
  expect(app.html()).toContain('You have used today’s 3 free cleanings');
  expect(app.html()).toContain('A\u200BB');
  expect(app.html()).toContain('AB');
});

it('refuses oversized cleaning without consuming an allowance', async () => {
  const app = await mount();
  app.input('word '.repeat(501));
  app.click('#clean');
  expect(app.html()).toContain('Free cleaning supports up to 500 words per use');
  app.input('Short draft');
  app.click('#clean');
  expect(app.html()).toContain('2 free uses left today');
});

it('guides empty input without placeholder statistics and keeps cleaning under the editor', async () => {
  const app = await mount();
  expect(app.html()).toContain('Paste text to see pattern density and findings');
  expect(app.html()).not.toContain('<strong>—</strong>');
  expect(app.html()).toContain('Processed in your browser · Not uploaded · 3 free uses a day · No sign-up');
  expect(app.html().indexOf('id="clean"')).toBeLessThan(app.html().indexOf('<aside class="controls"'));
});
