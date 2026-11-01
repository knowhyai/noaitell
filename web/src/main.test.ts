import { afterEach, expect, it, vi } from 'vitest';

// A small DOM adapter exercises the actual event handlers and rendered copy.
// The engine itself remains DOM-free.
async function mount() {
  vi.resetModules();
  const nodes = new Map<string, { innerHTML: string; value: string; listeners: Record<string, () => void>; addEventListener: (event: string, listener: () => void) => void }>();
  for (const selector of ['#app', '#editor', '#clean', '#high', '#restore', '#sourcePreview']) {
    const listeners: Record<string, () => void> = {};
    nodes.set(selector, { innerHTML: '', value: '', listeners, addEventListener: (event, listener) => { listeners[event] = listener; } });
  }
  const typography = { dataset: { option: 'typography' }, checked: false, onchange: () => {} };
  vi.stubGlobal('document', {
    querySelector: (selector: string) => nodes.get(selector) || null,
    querySelectorAll: (selector: string) => selector === '[data-option]' ? [typography] : [],
  });
  vi.stubGlobal('location', { pathname: '/' });
  await import('./main');
  return {
    nodes, typography,
    html: () => nodes.get('#app')!.innerHTML,
    input: (text: string) => { nodes.get('#editor')!.value = text; nodes.get('#editor')!.listeners.input(); },
    click: (selector: string) => nodes.get(selector)!.listeners.click(),
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
  expect(app.nodes.get('#sourcePreview')!.innerHTML).not.toContain('<mark');
});
