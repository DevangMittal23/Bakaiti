import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = new URL('../', import.meta.url);
const port = process.env.SMOKE_PORT || '3100';
assert.match(port, /^\d{4,5}$/);
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [fileURLToPath(new URL('node_modules/next/dist/bin/next', root)), 'start', '--hostname', '127.0.0.1', '--port', port], {
  cwd: fileURLToPath(root), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
let exited = false;
let spawnError;
child.stdout.on('data', (chunk) => { output = (output + chunk).slice(-4000); });
child.stderr.on('data', (chunk) => { output = (output + chunk).slice(-4000); });
child.on('exit', () => { exited = true; });
child.on('error', (error) => { spawnError = error; });

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (spawnError) throw spawnError;
    if (exited) throw new Error(`Production server exited: ${output}`);
    try {
      const response = await fetch(`${base}/login`, { redirect: 'manual', signal: AbortSignal.timeout(1000) });
      if (response.status === 200) { ready = true; break; }
      await response.body?.cancel();
    } catch { /* Server may still be starting. */ }
    await delay(150);
  }
  assert.ok(ready, `Production server did not become ready: ${output}`);
  for (const [path, status, destination] of [
    ['/login', 200],
    ['/feed?secret=do-not-copy', 307, '/login'],
    ['/auth/callback', 307, '/login?error=auth_callback_failed'],
    ['/api/cron?secret=test', 401],
    ['/api/og-preview?url=http://127.0.0.1', 401],
    ['/api/media/message-media/alice/file.jpg', 401],
  ]) {
    const response = await fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, status, path);
    if (destination) {
      // Auth uses the configured public origin, which can differ from the local smoke server.
      const location = new URL(response.headers.get('location'), base);
      assert.equal(location.pathname + location.search, destination);
    }
    if (path === '/login') {
      const html = await response.text();
      assert.match(html, /Bakaiti/);
      assert.match(html, /login-username/);
      assert.ok(!html.includes('login-email'));
    }
    else await response.body?.cancel();
    console.log(`${path.split('?')[0]}: ${response.status}`);
  }
  for (const action of ['signup', 'login', 'verify-signup', 'resend-signup']) {
    const response = await fetch(`${base}/api/auth/${action}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, 400, `${action} validates input before Auth calls`);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.ok((await response.json()).error);
    console.log(`/api/auth/${action}: invalid input rejected`);
  }
  console.log('Production HTTP smoke checks passed.');
} finally {
  if (!exited) {
    child.kill();
    await Promise.race([once(child, 'exit'), delay(2000)]);
  }
}
