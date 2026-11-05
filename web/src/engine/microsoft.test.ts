import { expect, it } from 'vitest';
import { analyze, clean, defaultOptions } from './index';
it('detects and removes complete Windows watermark sequences while preserving functional joiners', () => {
  const marker = '\u200B\u034F\u2060\u200B';
  const source = 'Hello' + marker + ' world' + marker + '. 👩‍💻 a\u034Fb';
  expect(analyze(source).invisibleCount).toBe(2);
  expect(clean(source, defaultOptions).text).toBe('Hello world. 👩‍💻 a\u034Fb');
});
