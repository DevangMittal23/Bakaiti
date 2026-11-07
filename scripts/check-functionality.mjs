import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';

// Query doubles execute the actual actions against small, explicit records.
const me = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const room = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const marker = { id: 'read', conversation_id: room, sender_id: me, created_at: '2026-10-28T10:00:00Z', is_deleted: false };
const tables = {
  users: [{ id: me, username: 'mira' }, { id: other, username: 'arjun' }],
  participants: [{ conversation_id: room, user_id: me, last_read_message_id: marker.id }],
  conversations: [{ id: room, participants: [{ user_id: me, last_read_message_id: marker.id }] }],
  messages: [marker, { id: 'old', conversation_id: room, sender_id: other, created_at: '2026-10-28T09:00:00Z', is_deleted: false }, { id: 'new', conversation_id: room, sender_id: other, created_at: '2026-10-28T11:00:00Z', is_deleted: false }, { id: 'own', conversation_id: room, sender_id: me, created_at: '2026-10-28T12:00:00Z', is_deleted: false }, { id: 'deleted', conversation_id: room, sender_id: other, created_at: '2026-10-28T13:00:00Z', is_deleted: true }],
  friendships: [{ id: 'relationship-id', requester_id: other, addressee_id: me, status: 'pending' }],
  posts: [{ id: 'post-id', author_id: other, content: 'A real post', visibility: 'public' }],
  post_likes: [{ post_id: 'post-id', user_id: me }], post_bookmarks: [], notifications: [],
};
let changedFriendship;
const failureTables = new Set();
function from(table) {
  let records = [...(tables[table] || [])], single = false;
  const query = {
    select: () => query,
    eq: (field, value) => { records = records.filter((row) => row[field] === value); return query; },
    neq: (field, value) => { records = records.filter((row) => row[field] !== value); return query; },
    gt: (field, value) => { records = records.filter((row) => row[field] > value); return query; },
    in: (field, values) => { records = records.filter((row) => values.includes(row[field])); return query; },
    or: () => query,
    order: (field, options) => { records.sort((a, b) => (a[field] > b[field] ? 1 : -1) * (options.ascending ? 1 : -1)); return query; },
    limit: (limit) => { records = records.slice(0, limit); return query; },
    maybeSingle: () => { single = true; return query; }, single: () => { single = true; return query; },
    update: (updates) => { changedFriendship = { id: records[0]?.id, ...updates }; return query; },
    insert: () => query,
    delete: () => query,
    then: (resolve, reject) => Promise.resolve({ data: single ? records[0] || null : records, count: records.length, error: failureTables.has(table) ? { message: 'Service unavailable' } : null }).then(resolve, reject),
  };
  return query;
}
const mocks = { '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: me } } }) }, from }) }, 'next/cache': { revalidatePath: () => {} } };
const conversations = loadSource('src/actions/conversations.ts', mocks);
assert.equal((await conversations.getConversations())[0].unread_count, 1, 'Unread counts start at the read marker and exclude own/deleted messages');
tables.conversations[0].participants[0].last_read_message_id = null;
assert.equal((await conversations.getConversations())[0].unread_count, 2, 'A new conversation counts incoming messages only');
const friendships = loadSource('src/actions/friendships.ts', mocks);
assert.equal((await friendships.respondToFriendRequest(other, true)).success, true);
assert.deepEqual(changedFriendship, { id: 'relationship-id', status: 'accepted' });
tables.friendships[0].requester_id = me;
assert.ok((await friendships.respondToFriendRequest(other, true)).error, 'Cannot accept an outgoing request');
const posts = loadSource('src/actions/posts.ts', mocks);
assert.equal((await posts.getPost('post-id')).is_liked, true);
assert.equal((await posts.getPost('post-id')).is_bookmarked, false);
assert.equal(await posts.getPost('missing'), null);
assert.equal((await posts.getTrendingPosts())[0].is_liked, true, 'Explore must preserve actual viewer like state');
failureTables.add('post_likes');
assert.ok((await posts.unlikePost('post-id')).error, 'A failed unlike must not look saved');
failureTables.add('post_bookmarks');
assert.ok((await posts.unbookmarkPost('post-id')).error, 'A failed bookmark removal must not look saved');
failureTables.clear();

let rolledBack = 0;
const creation = loadSource('src/actions/conversations.ts', {
  '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: me } } }) }, from: (table) => {
    let inserted = false;
    const query = { select: () => query, eq: () => query, single: () => query,
      insert: () => { inserted = true; return query; }, delete: () => { rolledBack++; return query; },
      then: (resolve, reject) => Promise.resolve({ data: table === 'conversations' ? { id: room } : [], error: table === 'participants' && inserted ? { message: 'Membership failed' } : null }).then(resolve, reject) };
    return query;
  } }) },
});
assert.ok((await creation.createDM(other)).error);
assert.ok((await creation.createGroup('Test group', [other])).error);
assert.equal(rolledBack, 2, 'Membership failures are reported and partial conversations are cleaned up');

// Exercise the real global store and hook with delayed service responses.
const cache = new Map();
const { useAuthStore } = loadSource('src/stores/auth-store.ts', {}, cache);
const { useChatStore } = loadSource('src/stores/chat-store.ts', {}, cache);
useAuthStore.getState().setUser({ id: me });
useChatStore.getState().setConversations([{ id: room, unread_count: 0, last_message_at: marker.created_at }]);
const ownMessage = { ...marker, id: 'own-latest' };
useChatStore.getState().updateConversationPreview(room, ownMessage);
assert.equal(useChatStore.getState().totalUnread, 0, 'Own sends do not inflate unread badges');
const incoming = { ...marker, id: 'incoming', sender_id: other };
useChatStore.getState().updateConversationPreview(room, incoming);
useChatStore.getState().updateConversationPreview(room, incoming);
assert.equal(useChatStore.getState().totalUnread, 1, 'A duplicate delivery does not count twice');

let effects = [], pending = new Map();
const chain = { on: () => chain, subscribe: () => chain };
const hook = loadSource('src/hooks/use-messages.ts', {
  react: { useEffect: (effect) => effects.push(effect), useCallback: (callback) => callback, useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
  '@/lib/supabase/client': { createClient: () => ({ channel: () => chain, removeChannel: () => {} }) },
  '@/stores/chat-store': { useChatStore: Object.assign(() => useChatStore.getState(), { getState: useChatStore.getState }) },
  '@/actions/messages': { getMessages: (id) => new Promise((resolve) => pending.set(id, resolve)), sendMessage: async () => ({}) },
});
const drain = async () => { await new Promise((resolve) => setImmediate(resolve)); };
hook.useMessages('room-a');
const cleanA = effects.map((effect) => effect()); effects = [];
await drain();
hook.useMessages('room-b');
cleanA.forEach((cleanup) => cleanup());
const cleanB = effects.map((effect) => effect()); effects = [];
await drain();
pending.get('room-b')({ messages: [{ id: 'b', conversation_id: 'room-b', created_at: marker.created_at }], hasMore: false });
await drain();
pending.get('room-a')({ messages: [{ id: 'a', conversation_id: 'room-a', created_at: marker.created_at }], hasMore: false });
await drain();
assert.deepEqual(useChatStore.getState().messages.map((message) => message.id), ['b'], 'A late history response cannot overwrite another room');
cleanB.forEach((cleanup) => cleanup());

// Profile hydration can finish after a directly opened chat has loaded its history.
const originalWindow = globalThis.window;
let resolveSession, authEvent, authCleanup;
try {
  globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} };
  useAuthStore.getState().setUser(null);
  const provider = loadSource('src/components/auth/auth-provider.tsx', {
    react: { useEffect: (effect) => { authCleanup = effect(); } },
    '@/lib/supabase/client': { createClient: () => ({
      auth: {
        getUser: () => new Promise((resolve) => { resolveSession = resolve; }),
        onAuthStateChange: (callback) => { authEvent = callback; return { data: { subscription: { unsubscribe: () => {} } } }; },
      },
      from: () => ({ select: () => ({ eq: (_field, id) => ({ single: async () => ({ data: { id }, error: null }) }) }) }),
    }) },
    '@/stores/auth-store': { useAuthStore }, '@/stores/chat-store': { useChatStore },
    '@/stores/notification-store': { useNotificationStore: { getState: () => ({ reset: () => {} }) } },
    '@/stores/call-store': { useCallStore: { getState: () => ({ reset: () => {} }) } },
    '@/stores/feed-store': { useFeedStore: { getState: () => ({ reset: () => {} }) } },
  });
  provider.AuthProvider({ children: null });
  useChatStore.getState().setActiveConversation(room);
  useChatStore.getState().setMessages([marker]);
  resolveSession({ data: { user: { id: me } } });
  await drain();
  assert.equal(useChatStore.getState().activeConversationId, room, 'Initial profile hydration must not clear the active room');
  assert.deepEqual(useChatStore.getState().messages, [marker]);
  authEvent('SIGNED_IN', { user: { id: other } });
  await drain();
  assert.equal(useChatStore.getState().messages.length, 0, 'Switching established accounts must clear private chat state');
  useChatStore.getState().setMessages([marker]);
  authEvent('SIGNED_OUT', null);
  await drain();
  assert.equal(useChatStore.getState().messages.length, 0, 'Signing out must clear private chat state');
  authCleanup();
} finally {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
}

// Missing GIF configuration must never masquerade as a successful search.
const originalKey = process.env.TENOR_API_KEY;
const originalFetch = globalThis.fetch;
try {
  const gifRoute = loadSource('src/app/api/gif/search/route.ts', {
    'next/server': { NextResponse: { json: (data, options) => Response.json(data, options) } },
  });
  const request = { nextUrl: new URL('http://localhost/api/gif/search?q=hello&limit=999') };
  delete process.env.TENOR_API_KEY;
  globalThis.fetch = async () => { assert.fail('Unconfigured GIF search must not call a provider'); };
  assert.equal((await gifRoute.GET(request)).status, 503);
  process.env.TENOR_API_KEY = 'test-key';
  globalThis.fetch = async (url) => {
    const params = new URL(url).searchParams;
    assert.equal(params.get('q'), 'hello');
    assert.equal(params.get('limit'), '50');
    return Response.json({ results: [{ id: 'gif', title: 'Hello', media_formats: { gif: { url: 'https://example.com/full.gif' } } }, { id: 'missing-media' }] });
  };
  const response = await gifRoute.GET(request);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).results, [{ id: 'gif', title: 'Hello', url: 'https://example.com/full.gif', preview: 'https://example.com/full.gif' }]);
  globalThis.fetch = async () => { throw new Error('Private provider details'); };
  const failure = await gifRoute.GET(request);
  assert.equal(failure.status, 502);
  assert.equal(JSON.stringify(await failure.json()).includes('Private provider details'), false);
} finally {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.TENOR_API_KEY;
  else process.env.TENOR_API_KEY = originalKey;
}
console.log('Functionality checks passed: unread markers, own/duplicate sends, relationship IDs, post viewer state, stale rooms, auth hydration/account clearing and GIF provider failures.');
