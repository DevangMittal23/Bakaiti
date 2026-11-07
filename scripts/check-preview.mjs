import assert from 'node:assert/strict';
import { startFixtures, fixtureOrigin } from './preview-fixtures.mjs';

const appOrigin = 'http://127.0.0.1:3001';
const server = await startFixtures({ appOrigin });
try {
  const path = '/message-media/11111111-1111-4111-8111-111111111111/preview.png';
  const bytes = Buffer.from([137, 80, 78, 71, 0, 1, 2, 3]);
  const upload = await fetch(`${fixtureOrigin}/storage/v1/object${path}`, {
    method: 'POST', headers: { 'content-type': 'image/png' }, body: bytes,
  });
  assert.equal(upload.status, 200);
  assert.equal(upload.headers.get('access-control-allow-origin'), appOrigin);
  const signed = await fetch(`${fixtureOrigin}/storage/v1/object/sign${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ expiresIn: 60 }),
  });
  const { signedURL } = await signed.json();
  const media = await fetch(`${fixtureOrigin}/storage/v1${signedURL}`);
  assert.equal(media.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await media.arrayBuffer()), bytes);
  await fetch(`${fixtureOrigin}/__fixtures/upload-control`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ failNext: true }),
  });
  const failed = await fetch(`${fixtureOrigin}/storage/v1/object${path}`, { method: 'POST', body: bytes });
  assert.equal(failed.status, 503);
  assert.deepEqual(Buffer.from(await (await fetch(`${fixtureOrigin}/storage/v1${signedURL}`)).arrayBuffer()), bytes, 'An upload failure preserves an existing object');
  console.log('Preview checks passed: isolated origin, binary media upload/sign/read and controlled upload failure.');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
