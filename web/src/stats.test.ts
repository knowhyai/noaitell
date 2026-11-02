import { afterEach, expect, it, vi } from 'vitest';

// Same DOM adapter approach as main.test.ts; covers the stats-area scaffold line (Part B).
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
    nodes,
    html: () => nodes.get('#app')!.innerHTML,
    input: (text: string) => { nodes.get('#editor')!.value = text; nodes.get('#editor')!.listeners.input(); },
  };
}

afterEach(() => vi.unstubAllGlobals());

it('Part B: shows one neutral scaffold line in the stats area when a chain is present', async () => {
  const app = await mount();
  app.input('首先，我们要看清问题。其次，拆解问题的成因。最后，给出可执行的方案。');
  expect(app.html()).toContain('另检测到 1 处序列骨架（首先…其次…最后式结构）');
  expect(app.html()).toContain('数值不代表 AI 生成概率');
});

it('Part B: no scaffold line without chains; zero-hit wording untouched', async () => {
  const app = await mount();
  app.input('Ordinary text with no skeleton at all.');
  expect(app.html()).not.toContain('序列骨架');
  expect(app.html()).toContain('未发现当前规则覆盖的问题');
});
