import { build } from 'esbuild';

// 两个产物都从 web/src/engine 同源打包,保证扩展与网页版引擎完全一致:
// - popup.js      IIFE,由 popup.html 加载(引擎已内联)
// - engine.js     ESM,打包后引擎的独立产物,供 scripts/smoke.mjs 与 web 实时编译结果做逐字节输出比对
const common = { bundle: true, target: ['chrome120'], sourcemap: false, logLevel: 'info', charset: 'utf8' };

await build({
  entryPoints: ['src/popup.ts'],
  outfile: 'popup.js',
  format: 'iife',
  ...common,
});

await build({
  entryPoints: ['../web/src/engine/index.ts'],
  outfile: 'engine.js',
  format: 'esm',
  platform: 'neutral',
  banner: { js: '/* 生成文件:由 scripts/build.mjs 从 web/src/engine 打包,请勿手改;重新生成:cd extension && npm run build */' },
  ...common,
});
