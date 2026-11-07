import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startFixtures, fixtureOrigin } from './preview-fixtures.mjs';

const port = process.env.BAKAITI_PREVIEW_PORT || '3000';
if (!/^\d{4,5}$/.test(port) || Number(port) > 65535) throw new Error('Invalid preview port');
const appOrigin = `http://127.0.0.1:${port}`;
const fixtures = await startFixtures({ appOrigin });
const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url)), 'dev', '--hostname', '127.0.0.1', '--port', port], {
  cwd: fileURLToPath(new URL('../', import.meta.url)), windowsHide: true, stdio: 'inherit',
  env: { ...process.env, BAKAITI_FIXTURE_PREVIEW: '1', NEXT_PUBLIC_SUPABASE_URL: fixtureOrigin, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'preview-anon-key', SUPABASE_SERVICE_ROLE_KEY: 'preview-service-key', NEXT_PUBLIC_APP_URL: appOrigin, TENOR_API_KEY: '', LIVEKIT_API_KEY: '', LIVEKIT_API_SECRET: '', NEXT_PUBLIC_LIVEKIT_URL: '', CRON_SECRET: '' },
});
console.log(`LOCAL FIXTURE PREVIEW — ${appOrigin}/login — username mira / password preview-only. Signup code 123456.`);
console.log('No real Supabase data, SMTP delivery, Storage, Realtime or LiveKit is exercised. Fixtures reset when stopped.');
const stop = () => { child.kill(); fixtures.close(); };
process.once('SIGINT', stop); process.once('SIGTERM', stop);
child.once('exit', () => { fixtures.close(); });
child.once('error', (error) => { console.error(error.message); fixtures.close(); process.exitCode = 1; });
