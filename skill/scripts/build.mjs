import { build } from 'esbuild';

// 把 web/src/engine 打包为 skill 自带的引擎(engine/engine.mjs),与网页版同一份代码同源导出。
// 提交在库中,让 Agent 拷走 skill/ 目录后即可零依赖运行;改引擎后必须重新 build 并 test。
await build({
  entryPoints: ['../web/src/engine/index.ts'],
  outfile: 'engine/engine.mjs',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'node18',
  charset: 'utf8',
  sourcemap: false,
  logLevel: 'info',
  banner: { js: '/* 生成文件:由 scripts/build.mjs 从 web/src/engine 同源打包,请勿手改;重新生成:cd skill && npm run build */' },
});
