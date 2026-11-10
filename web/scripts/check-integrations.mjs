import { integrationStatus, loadIntegrationEnv } from './analytics.mjs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const rows = integrationStatus(loadIntegrationEnv(root));
console.log('NoAITell integration check (informational; missing hooks stay empty and this command does not fail the build)');
for (const row of rows) console.log(`${row.state.padEnd(11)} ${row.key}  ${row.label}`);
process.exit(0);
