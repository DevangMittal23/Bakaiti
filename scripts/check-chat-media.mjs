import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';

const { fitChatMedia, formatAttachmentSize, attachmentKind } = loadSource('src/lib/chat-media.ts');

// A panoramic banner must not grow to the conversation width; portraits fit height too.
assert.deepEqual(fitChatMedia(1600, 400), { width: 320, height: 80 });
assert.deepEqual(fitChatMedia(900, 1600), { width: 202, height: 360 });
assert.deepEqual(fitChatMedia(64, 48), { width: 64, height: 48 }, 'Small originals are not upscaled');
assert.deepEqual(fitChatMedia(1200, 1200, 280, 280), { width: 280, height: 280 });
for (const pair of [[0, 100], [100, -1], [Infinity, 100], [100, NaN], [undefined, undefined]]) {
  assert.equal(fitChatMedia(...pair), null, 'Unknown/invalid geometry must not produce invented dimensions');
}
assert.equal(formatAttachmentSize(420), '420 B');
assert.equal(formatAttachmentSize(1024), '1.0 KB');
assert.equal(formatAttachmentSize(50 * 1024 * 1024), '50.0 MB');
assert.equal(formatAttachmentSize(undefined), '');
assert.equal(formatAttachmentSize(NaN), '');
assert.equal(attachmentKind('notes.pdf'), 'PDF');
assert.equal(attachmentKind('track.m4a', 'audio/mp4'), 'Audio');
assert.equal(attachmentKind('no-extension'), 'File');
console.log('Chat media checks passed: panoramic/portrait bounds, no upscaling, invalid metadata and honest file details.');
