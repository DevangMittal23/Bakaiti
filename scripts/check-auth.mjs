import assert from 'node:assert/strict';
import { NextRequest, NextResponse } from 'next/server.js';
import { loadSource } from './load-source.mjs';

const signup = { email: 'new@example.com', username: 'new_user', display_name: 'New User', password: 'my-password' };
const user = { id: 'user-id', email: signup.email, email_confirmed_at: '2026-10-28T00:00:00Z' };
let result = { data: { user, session: { access_token: 'private-token' } }, error: null };
let profile = { id: user.id };
let signedOut = 0;
const calls = [];
const auth = Object.fromEntries(['signUp', 'signInWithPassword', 'verifyOtp', 'resend'].map((method) => [method, async (input) => {
  calls.push({ method, input });
  return result;
}]));
auth.signOut = async () => { signedOut++; return { error: null }; };
const actions = loadSource('src/actions/auth.ts', {
  '@/lib/supabase/server': { createClient: async () => ({ auth }) },
  '@/lib/supabase/admin': { createAdminClient: () => ({
    from: (table) => {
      assert.equal(table, 'users');
      const query = { select: (columns) => { assert.equal(columns, 'id'); return query; },
        eq: (column, value) => { assert.equal(column, 'username'); assert.equal(value, signup.username); return query; },
        maybeSingle: async () => ({ data: profile, error: null }) };
      return query;
    },
    auth: { admin: { getUserById: async (id) => { assert.equal(id, user.id); return { data: { user }, error: null }; } } },
  }) },
  'next/navigation': { redirect: () => { throw new Error('Unexpected redirect'); } },
});

assert.equal((await actions.signUp({ ...signup, password: 'short' })).status, 400);
assert.equal((await actions.verifySignupCode({ email: signup.email, token: '123' })).status, 400);
assert.equal(calls.length, 0, 'Validate before contacting Auth');
result = { data: { user: { ...user, email_confirmed_at: null }, session: null }, error: null };
assert.equal((await actions.signUp(signup)).verificationRequired, true);
assert.deepEqual(calls.at(-1), { method: 'signUp', input: { email: signup.email, password: signup.password,
  options: { data: { username: signup.username, display_name: signup.display_name } } } });
result = { data: { user, session: { access_token: 'private-token' } }, error: null };
assert.equal((await actions.signUp(signup)).status, 503, 'Fail closed if Confirm email is disabled');
assert.equal(signedOut, 1);
assert.deepEqual(await actions.verifySignupCode({ email: signup.email, token: '123456' }), { success: true });
assert.deepEqual(calls.at(-1), { method: 'verifyOtp', input: { email: signup.email, token: '123456', type: 'email' } });
result = { data: { user: { ...user, email_confirmed_at: null }, session: null }, error: null };
assert.ok((await actions.verifySignupCode({ email: signup.email, token: '123456' })).error);
result = { data: {}, error: { status: 403, code: 'otp_expired', message: 'Do not expose provider details' } };
assert.match((await actions.verifySignupCode({ email: signup.email, token: '123456' })).error, /invalid or expired/);
result = { data: {}, error: { status: 429, code: 'over_email_send_rate_limit' } };
assert.equal((await actions.resendSignupCode({ email: signup.email })).retryAfter, 60);
result = { data: {}, error: null };
assert.equal((await actions.resendSignupCode({ email: signup.email })).success, true);
assert.deepEqual(calls.at(-1), { method: 'resend', input: { type: 'signup', email: signup.email } });

const originalConsoleError = console.error;
const signupDiagnostics = [];
try {
  console.error = (...args) => signupDiagnostics.push(args);
  for (const [code, pattern, status] of [
    ['email_address_not_authorized', /Email delivery is restricted/, 503],
    ['email_provider_disabled', /New email accounts are currently disabled/, 503],
    ['signup_disabled', /New email accounts are currently disabled/, 503],
    ['weak_password', /password does not meet the security requirements/, 400],
    ['email_address_invalid', /rejected this email address/, 400],
    ['captcha_failed', /security check could not be verified/, 400],
  ]) {
    result = { data: {}, error: { code, status: 400, message: `Private provider detail ${signup.email} ${signup.password}` } };
    const failure = await actions.signUp(signup);
    assert.match(failure.error, pattern);
    assert.equal(failure.status, status);
    assert.deepEqual(signupDiagnostics.at(-1), ['[auth:signup]', { code, status: 400 }]);
    assert.ok(!JSON.stringify(failure).includes(signup.email) && !JSON.stringify(failure).includes(signup.password));
  }
  for (const code of ['user_already_exists', 'email_exists', 'unknown_future_code']) {
    result = { data: {}, error: { code, status: 400 } };
    assert.match((await actions.signUp(signup)).error, /We could not complete signup/);
  }
  result = { data: {}, error: { code: `private:${signup.email}`, status: 400 } };
  await actions.signUp(signup);
  assert.equal(signupDiagnostics.at(-1)[1].code, 'unknown', 'Never log arbitrary provider content as an error code');
  const diagnosticText = JSON.stringify(signupDiagnostics);
  assert.ok(!diagnosticText.includes(signup.email) && !diagnosticText.includes(signup.password));
  const diagnosticNodeEnv = process.env.NODE_ENV;
  try {
    result = { data: {}, error: { code: 'validation_failed', status: 400, message: `private ${signup.password}` } };
    process.env.NODE_ENV = 'development';
    assert.match((await actions.signUp(signup)).error, /Auth code: validation_failed/);
    process.env.NODE_ENV = 'production';
    assert.ok(!(await actions.signUp(signup)).error.includes('validation_failed'), 'Public production errors exclude unmapped provider identifiers');
  } finally {
    if (diagnosticNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = diagnosticNodeEnv;
  }
} finally {
  console.error = originalConsoleError;
}

result = { data: { user, session: { access_token: 'private-token' } }, error: null };
const login = { username: signup.username, password: signup.password };
assert.deepEqual(await actions.signIn(login), { success: true });
assert.deepEqual(calls.at(-1), { method: 'signInWithPassword', input: { email: signup.email, password: signup.password } });
result = { data: {}, error: { status: 400, code: 'invalid_credentials' } };
const knownFailure = await actions.signIn(login);
profile = null;
assert.deepEqual(await actions.signIn(login), knownFailure, 'Unknown users and wrong passwords have the same response');
assert.equal(calls.at(-1).input.email, 'invalid-login@bakaiti.invalid');
result = { data: {}, error: { status: 400, code: 'email_address_invalid' } };
assert.deepEqual(await actions.signIn(login), knownFailure, 'Signup diagnostics must not reveal an unknown login through its placeholder email');
profile = { id: user.id };
result = { data: {}, error: { status: 400, code: 'email_not_confirmed' } };
assert.equal((await actions.signIn(login)).verificationRequired, true);
result = { data: { user: { ...user, email_confirmed_at: null }, session: {} }, error: null };
assert.equal((await actions.signIn(login)).status, 401, 'Reject unverified sessions');

const previousOrigin = process.env.NEXT_PUBLIC_APP_URL;
const previousNodeEnv = process.env.NODE_ENV;
process.env.NEXT_PUBLIC_APP_URL = 'https://bakaiti.example';
try {
  const { POST } = loadSource('src/app/api/auth/[action]/route.ts', { '@/actions/auth': actions, 'next/server': { NextRequest, NextResponse } });
  const request = (body, origin = 'https://bakaiti.example', contentType = 'application/json') => new NextRequest('https://bakaiti.example/api/auth/signup', {
    method: 'POST', headers: { origin, 'content-type': contentType }, body,
  });
  const context = (action = 'signup') => ({ params: Promise.resolve({ action }) });
  assert.equal((await POST(request('{}', 'https://evil.example'), context())).status, 403);
  assert.equal((await POST(request('{}', undefined, 'text/plain'), context())).status, 415);
  assert.equal((await POST(request('{'), context())).status, 400);
  assert.equal((await POST(request('x'.repeat(8193)), context())).status, 413);
  assert.equal((await POST(request('{}'), context('unknown'))).status, 404);
  assert.equal((await POST(request('{}'), context())).status, 400);

  // The browser may use 127.0.0.1 while .env.local uses localhost.
  process.env.NODE_ENV = 'development';
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  const localRequest = (origin, url = 'http://127.0.0.1:3000/api/auth/signup') => new NextRequest(url, {
    method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{}',
  });
  assert.equal((await POST(localRequest('http://127.0.0.1:3000'), context())).status, 400, 'Loopback aliases reach validation in development');
  assert.equal((await POST(localRequest('http://localhost:3000'), context())).status, 400);
  assert.equal((await POST(localRequest('http://[::1]:3000'), context())).status, 400);
  for (const origin of ['http://localhost:4000', 'https://127.0.0.1:3000', 'http://localhost.evil.example:3000', 'http://evil.example:3000', 'null']) {
    assert.equal((await POST(localRequest(origin), context())).status, 403, `Reject ${origin}`);
  }
  assert.equal((await POST(localRequest('http://127.0.0.1:3000', 'http://evil.example:3000/api/auth/signup'), context())).status, 403, 'Do not trust remote request hosts');
  process.env.NODE_ENV = 'production';
  assert.equal((await POST(localRequest('http://127.0.0.1:3000'), context())).status, 403, 'Production requires the exact configured origin');
  process.env.NEXT_PUBLIC_APP_URL = 'https://bakaiti.example';
  assert.equal((await POST(request('{}'), context())).status, 400);
  assert.equal((await POST(request('{}', 'https://evil.example'), context())).status, 403);
  result = { data: {}, error: { status: 429 } };
  const response = await POST(request(JSON.stringify({ email: signup.email })), context('resend-signup'));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const body = await response.text();
  assert.ok(!body.includes(signup.password) && !body.includes('private-token') && !body.includes('status'));
  const { isPublicAuthApi } = loadSource('src/lib/security/routes.ts');
  assert.ok(isPublicAuthApi('/api/auth/signup'));
  assert.ok(!isPublicAuthApi('/api/auth/admin'));
  assert.ok(!isPublicAuthApi('/api/upload'));
} finally {
  if (previousOrigin === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = previousOrigin;
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
}
const realFetch = globalThis.fetch;
try {
  const { authRequest } = loadSource('src/components/auth/auth-request.ts');
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.cache, 'no-store');
    return Response.json({ success: true, retryAfter: 90 });
  };
  assert.equal((await authRequest('resend-signup', { email: signup.email })).retryAfter, 90);
  const priorWindow = globalThis.window;
  const events = [];
  try {
    globalThis.window = { dispatchEvent: (event) => events.push(event.type) };
    await authRequest('login', login);
    await authRequest('verify-signup', { email: signup.email, token: '123456' });
    await authRequest('resend-signup', { email: signup.email });
    assert.deepEqual(events, ['bakaiti:auth-updated', 'bakaiti:auth-updated'], 'Server cookie sessions notify the client after login/verification only');
  } finally { if (priorWindow === undefined) delete globalThis.window; else globalThis.window = priorWindow; }
  globalThis.fetch = async () => Response.json({ error: 'Wait before resending', retryAfter: 60 }, { status: 429 });
  assert.equal((await authRequest('resend-signup', { email: signup.email })).error, 'Wait before resending');
  globalThis.fetch = async () => Response.json({});
  await assert.rejects(authRequest('login', login), /Unexpected authentication response/);
} finally { globalThis.fetch = realFetch; }

console.log('Auth checks passed: signup/password preservation, confirmation guards, safe failure categories/logs, OTP/resend, private username login, HTTP validation and client responses. No emails sent.');
