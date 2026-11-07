import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { loadSource } from './load-source.mjs';
import { NextRequest } from 'next/server.js';

const { isPublicPage, isAuthPage, safeRedirectPath, appOrigin } = loadSource('src/lib/security/routes.ts');
assert.ok(isPublicPage('/auth/callback'));
assert.ok(!isAuthPage('/login-other'));
assert.ok(!isPublicPage('/feed'));
for (const target of ['//evil.example', '/\\evil.example', '/%2f%2fevil.example', '/%0d%0aLocation:evil', 'https://evil.example', '%']) {
  assert.equal(safeRedirectPath(target), '/feed');
}
assert.equal(safeRedirectPath('/settings?tab=account'), '/settings?tab=account');
const oldAppUrl = process.env.NEXT_PUBLIC_APP_URL;
process.env.NEXT_PUBLIC_APP_URL = 'https://bakaiti.example';
assert.equal(appOrigin('http://localhost:3100/auth/callback'), 'https://bakaiti.example');
if (oldAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = oldAppUrl;

const { isCronAuthorized } = loadSource('src/lib/security/cron.ts');
assert.ok(isCronAuthorized('Bearer test-secret', 'test-secret'));
assert.ok(!isCronAuthorized(null, 'test-secret'));
assert.ok(!isCronAuthorized('Bearer wrong', 'test-secret'));
assert.ok(!isCronAuthorized('Bearer undefined', undefined));

const { isPublicAddress, resolvePublicAddress, previewUrl } = loadSource('src/lib/security/preview.ts');
for (const ip of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '172.16.1.1', '192.168.0.1', '100.64.1.1', '224.0.0.1', '0.0.0.0', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1', '2001:db8::1', '2002:7f00:1::']) {
  assert.equal(isPublicAddress(ip), false, `Block ${ip}`);
}
assert.ok(isPublicAddress('8.8.8.8'));
assert.ok(isPublicAddress('2606:4700:4700::1111'));
for (const url of ['file:///etc/passwd', 'ftp://example.com', 'http://user:password@example.com', 'https://example.com:8443']) {
  assert.throws(() => previewUrl(url));
}
await assert.rejects(resolvePublicAddress(previewUrl('http://2130706433').hostname));
await assert.rejects(resolvePublicAddress('mixed.example', async () => [{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 }]));

// Exercise actual redirect, size-limit and pinned-address code without opening network sockets.
function previewFixture(responses) {
  const requested = [];
  const request = (url, options, receive) => {
    requested.push(url.href);
    options.lookup(url.hostname, {}, (_error, address) => assert.equal(address, '8.8.8.8'));
    const emitter = new EventEmitter();
    emitter.end = () => queueMicrotask(() => {
      const fixture = responses.shift();
      const response = new PassThrough();
      response.statusCode = fixture.status ?? 200;
      response.headers = fixture.headers ?? { 'content-type': 'text/html' };
      receive(response);
      if (!response.destroyed) response.end(fixture.body ?? '<html><title>Test</title></html>');
    });
    return emitter;
  };
  const source = loadSource('src/lib/security/preview.ts', {
    'node:dns/promises': { lookup: async () => [{ address: '8.8.8.8', family: 4 }] },
    'node:http': { request }, 'node:https': { request },
  });
  return { requested, fetch: source.fetchPreviewHtml };
}
let fixture = previewFixture([{}]);
assert.match((await fixture.fetch('https://public.example')).html, /Test/);
fixture = previewFixture([{ status: 302, headers: { location: 'http://127.0.0.1/internal' } }]);
await assert.rejects(fixture.fetch('https://public.example'));
assert.equal(fixture.requested.length, 1, 'Never open a socket to a forbidden redirect');
fixture = previewFixture([{ body: Buffer.alloc(1024 * 1024 + 1) }]);
await assert.rejects(fixture.fetch('https://public.example'), /too large/);

const { mediaUrl, validateUpload, validObjectPath } = loadSource('src/lib/media.ts');
const previousProjectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
try {
  assert.equal(mediaUrl('https://project.supabase.co/storage/v1/object/public/message-media/alice/file.pdf'), '/api/media/message-media/alice/file.pdf');
  assert.equal(mediaUrl('https://project.supabase.co/storage/v1/object/public/avatars/alice/avatar.jpg'), 'https://project.supabase.co/storage/v1/object/public/avatars/alice/avatar.jpg');
  assert.equal(validateUpload('message-media', 'alice/voice.webm', { size: 10, type: 'audio/webm;codecs=opus' }, 'alice'), 'audio/webm');
  assert.throws(() => validateUpload('message-media', 'bob/file.pdf', { size: 10, type: 'application/pdf' }, 'alice'));
  assert.throws(() => validateUpload('avatars', 'alice/x.svg', { size: 10, type: 'image/svg+xml' }, 'alice'));
  assert.throws(() => validateUpload('post-media', 'alice/x.jpg', { size: 51 * 1024 * 1024, type: 'image/jpeg' }, 'alice'));
  for (const path of ['alice/../bob', 'alice//file', 'alice/%2e%2e/file', 'alice/./file', 'alice/a?x']) assert.equal(validObjectPath(path), false);
} finally {
  if (previousProjectUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = previousProjectUrl;
}

// Proxy permits the callback and bearer-authenticated cron route, preserving refresh cookies on redirects.
function proxyFixture(user) {
  return loadSource('src/lib/supabase/middleware.ts', {
    '@supabase/ssr': { createServerClient: (_url, _key, options) => ({ auth: { getUser: async () => {
      options.cookies.setAll([{ name: 'refreshed', value: 'yes', options: { httpOnly: true } }]);
      return { data: { user } };
    } } }) },
  }).updateSession;
}
const signedOutProxy = proxyFixture(null);
let response = await signedOutProxy(new NextRequest('https://bakaiti.example/auth/callback?code=test'));
assert.equal(response.headers.get('x-middleware-next'), '1');
response = await signedOutProxy(new NextRequest('https://bakaiti.example/feed?secret=do-not-copy'));
assert.equal(response.headers.get('location'), 'https://bakaiti.example/login');
assert.equal(response.cookies.get('refreshed')?.value, 'yes');
response = await signedOutProxy(new NextRequest('https://bakaiti.example/api/upload'));
assert.equal(response.status, 401);
response = await loadSource('src/lib/supabase/middleware.ts', {
  '@supabase/ssr': { createServerClient: () => { throw new Error('Cron must not need a user session'); } },
}).updateSession(new NextRequest('https://bakaiti.example/api/cron'));
assert.equal(response.headers.get('x-middleware-next'), '1');

const user = { id: '11111111-1111-4111-8111-111111111111' };
let allowed = true;
let tokenRoom;
let callInvites = [];
const tokenHandler = loadSource('src/app/api/livekit/token/route.ts', {
  '@/lib/supabase/server': { createClient: async () => ({
    auth: { getUser: async () => ({ data: { user } }) },
    from: () => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        neq: () => builder,
        single: async () => ({ data: allowed ? { id: 'membership' } : null, error: null }),
        then: (resolve) => resolve({ data: [{ user_id: '22222222-2222-4222-8222-222222222222' }], error: null }),
      };
      return builder;
    },
  }) },
  '@/lib/supabase/admin': { createAdminClient: () => ({ from: () => ({ insert: async (rows) => { callInvites = rows; return { error: null }; } }) }) },
  '@/lib/livekit': { generateLiveKitToken: async (_userId, room) => { tokenRoom = room; return 'test-token'; } },
}).POST;
const originalKey = process.env.LIVEKIT_API_KEY;
const originalSecret = process.env.LIVEKIT_API_SECRET;
process.env.LIVEKIT_API_KEY = 'test'; process.env.LIVEKIT_API_SECRET = 'test';
const tokenRequest = (body) => new NextRequest('https://bakaiti.example/api/livekit/token', { method: 'POST', body: JSON.stringify(body) });
try {
  response = await tokenHandler(tokenRequest({ conversationId: user.id, callType: 'voice', inviteParticipants: true }));
  assert.equal(response.status, 200);
  assert.equal(tokenRoom, `bakaiti_${user.id}`);
  assert.equal(callInvites.length, 1, 'Create an incoming-call notification for other conversation members');
  assert.equal(callInvites[0].actor_id, user.id);
  assert.equal(callInvites[0].body, 'is calling you (voice call)');
  response = await tokenHandler(tokenRequest({ conversationId: user.id, callType: 'voice' }));
  assert.equal(response.status, 200);
  assert.equal(callInvites.length, 1, 'Joining an existing call does not ring the other members again');
  response = await tokenHandler(tokenRequest({ conversationId: user.id, callType: 'voice', roomName: 'victim-room' }));
  assert.equal(response.status, 400, 'Reject caller-selected rooms');
  allowed = false;
  response = await tokenHandler(tokenRequest({ conversationId: user.id, callType: 'voice' }));
  assert.equal(response.status, 403);
} finally {
  if (originalKey === undefined) delete process.env.LIVEKIT_API_KEY; else process.env.LIVEKIT_API_KEY = originalKey;
  if (originalSecret === undefined) delete process.env.LIVEKIT_API_SECRET; else process.env.LIVEKIT_API_SECRET = originalSecret;
}

let signed = 0;
let authenticated = false;
const mediaHandler = loadSource('src/app/api/media/[bucket]/[...path]/route.ts', {
  '@/lib/supabase/server': { createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: authenticated ? user : null } }) },
    storage: { from: () => ({ createSignedUrl: async () => { signed++; return { data: { signedUrl: 'https://project.supabase.co/signed/test' }, error: null }; } }) },
  }) },
}).GET;
const mediaParams = { params: Promise.resolve({ bucket: 'message-media', path: [user.id, 'test.pdf'] }) };
response = await mediaHandler(new NextRequest('https://bakaiti.example/api/media/message-media/test'), mediaParams);
assert.equal(response.status, 401);
assert.equal(signed, 0);
authenticated = true;
response = await mediaHandler(new NextRequest('https://bakaiti.example/api/media/message-media/test'), mediaParams);
assert.equal(response.status, 307);
assert.equal(response.headers.get('cache-control'), 'private, no-store');

const callback = loadSource('src/app/auth/callback/route.ts', {
  '@/lib/supabase/server': { createClient: async () => ({ auth: { exchangeCodeForSession: async () => ({ error: null }) } }) },
}).GET;
response = await callback(new Request('https://bakaiti.example/auth/callback?code=test&next=//evil.example'));
assert.equal(response.headers.get('location'), 'https://bakaiti.example/feed');

const originalCronSecret = process.env.CRON_SECRET;
const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.CRON_SECRET = 'test-cron';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
let cronFailure = false;
let cronCalls = 0;
const cron = loadSource('src/app/api/cron/route.ts', {
  '@supabase/supabase-js': { createClient: () => ({ rpc: async (name) => {
    assert.equal(name, 'run_scheduled_maintenance'); cronCalls++;
    return { data: { pulse_cleanup: 'ok' }, error: cronFailure ? { code: 'test-failure' } : null };
  } }) },
}).GET;
const cronProjectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
try {
  response = await cron(new NextRequest('https://bakaiti.example/api/cron?secret=test-cron'));
  assert.equal(response.status, 401);
  assert.equal(cronCalls, 0);
  response = await cron(new NextRequest('https://bakaiti.example/api/cron', { headers: { Authorization: 'Bearer test-cron' } }));
  assert.equal(response.status, 200);
  assert.equal(cronCalls, 1);
  cronFailure = true;
  const logError = console.error;
  try {
    console.error = () => {};
    response = await cron(new NextRequest('https://bakaiti.example/api/cron', { headers: { Authorization: 'Bearer test-cron' } }));
    assert.equal(response.status, 500, 'A failed job must not report success');
  } finally { console.error = logError; }
} finally {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = originalCronSecret;
  if (originalServiceKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
  if (cronProjectUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = cronProjectUrl;
}

console.log('Security checks passed: route/session handling, redirect validation, SSRF/DNS pinning, response limits, uploads, private-media signing and call-room authorization.');
