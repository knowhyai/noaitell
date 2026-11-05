import { afterEach, expect, it, vi } from 'vitest';

// Same DOM adapter approach as main.test.ts; covers the stats-area scaffold line (Part B).
async function mount() {
  vi.resetModules();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) });
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
  expect(app.html()).toContain('Found 1 ordered scaffold chain(s)');
  expect(app.html()).toContain('may overlap findings above');
  expect(app.html()).toContain('excluded from pattern density');
  expect(app.html()).toContain('not an authorship judgment');
  expect(app.html()).not.toContain('另检测到');
  expect(app.html()).toContain('Counts do not represent AI generation probability');
});

it('Part B: no scaffold line without chains; zero-hit wording untouched', async () => {
  const app = await mount();
  app.input('Ordinary text with no skeleton at all.');
  expect(app.html()).not.toContain('ordered scaffold');
  expect(app.html()).toContain('No issues found by current rules');
});
