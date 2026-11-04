import { build } from 'vite';
export default async function setup() {
  await build({ root: new URL('../', import.meta.url).pathname, logLevel: 'silent' });
}
