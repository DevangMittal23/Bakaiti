// Local-only fake Supabase transport for visual/interaction QA. Never import in src/.
import http from 'node:http';
import { randomUUID } from 'node:crypto';

export const fixturePort = 54329;
export const fixtureOrigin = `http://127.0.0.1:${fixturePort}`;
export const ids = { me: '11111111-1111-4111-8111-111111111111', arjun: '22222222-2222-4222-8222-222222222222', zoe: '33333333-3333-4333-8333-333333333333', leena: '44444444-4444-4444-8444-444444444444', dm: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', group: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' };
const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();
const profile = (id, username, display_name, bio, pulse_type, signal_score) => ({ id, username, display_name, bio, pulse_type, signal_score, avatar_url: null, created_at: ago(60_000), updated_at: ago(100), online_at: ago(20), pulse_set_at: ago(15), pulse_expires_at: new Date(Date.now() + 60 * 60_000).toISOString(), signal_score_updated_at: ago(60) });
export const users = [profile(ids.me, 'mira', 'Mira Shah', 'Collecting little moments. Usually making a playlist.', 'chill', 642), profile(ids.arjun, 'arjun', 'Arjun Rao', 'Design things. Break things. Repeat.', 'active', 810), profile(ids.zoe, 'zoe', 'Zoe Park', 'One more song, then I’m going home.', 'hyped', 736), profile(ids.leena, 'leena', 'Leena Das', 'Here for the conversations.', null, 0)];
const authUser = { id: ids.me, aud: 'authenticated', role: 'authenticated', email: 'mira@example.invalid', email_confirmed_at: ago(1000), confirmed_at: ago(1000), created_at: ago(60_000), updated_at: ago(100), app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { username: 'mira', display_name: 'Mira Shah' }, identities: [] };
const token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: ids.me, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86_400, iat: Math.floor(Date.now() / 1000), iss: `${fixtureOrigin}/auth/v1` })).toString('base64url'), 'preview-signature'].join('.');
const message = (id, conversation_id, sender_id, content, minutes) => ({ id, conversation_id, sender_id, content, type: 'text', media_url: null, media_metadata: null, gif_url: null, reply_to_id: null, is_edited: false, is_deleted: false, deleted_for: 'none', created_at: ago(minutes), updated_at: ago(minutes) });
const messages = [message('c1111111-1111-4111-8111-111111111111', ids.dm, ids.me, 'That little café we found deserves a second visit.', 50), message('c2222222-2222-4222-8222-222222222222', ids.dm, ids.arjun, 'Saturday? I’m putting together a playlist for the walk 🎧', 45), message('c3333333-3333-4333-8333-333333333333', ids.dm, ids.me, 'Already in. Send me your current favourite?', 35), message('c4444444-4444-4444-8444-444444444444', ids.dm, ids.arjun, 'You have to hear the new album. Zero skips.', 2), message('c5555555-5555-4555-8555-555555555555', ids.group, ids.zoe, 'Golden hour walk, anyone? Meeting at the usual spot.', 7), message('c6666666-6666-4666-8666-666666666666', ids.group, ids.arjun, 'Count me in. Bringing the camera 📸', 5)];
const post = (id, author_id, content, minutes, likes_count, comments_count) => ({ id, author_id, content, visibility: 'public', media_urls: [], media_types: [], link_url: null, link_preview: null, likes_count, comments_count, reposts_count: 0, is_repost: false, original_post_id: null, created_at: ago(minutes), updated_at: ago(minutes) });
const posts = [post('d1111111-1111-4111-8111-111111111111', ids.zoe, 'Hot take: the best plans are the ones that start with “are you free in 10?” 🌇\n\n#littlethings #afterhours', 12, 24, 2), post('d2222222-2222-4222-8222-222222222222', ids.arjun, 'Made a tiny playlist for the walk home. What’s the one song you keep coming back to?\n\n#onrepeat', 38, 12, 1), post('d3333333-3333-4333-8333-333333333333', ids.me, 'A reminder to send your friend the thing that made you think of them. That’s the whole post. 💜', 90, 7, 0)];
const participants = [ids.me, ids.arjun].map((user_id, i) => ({ id: `e1111111-1111-4111-8111-11111111111${i}`, user_id, conversation_id: ids.dm, role: 'member', last_read_message_id: user_id === ids.me ? messages[2].id : null, joined_at: ago(5000) })).concat([ids.me, ids.arjun, ids.zoe].map((user_id, i) => ({ id: `e2222222-2222-4222-8222-22222222222${i}`, user_id, conversation_id: ids.group, role: i === 0 ? 'admin' : 'member', last_read_message_id: null, joined_at: ago(3000) })));
const data = {
  users, messages, participants, posts,
  conversations: [{ id: ids.dm, type: 'dm', name: null, avatar_url: null, created_by: ids.me, created_at: ago(5000), last_message_at: ago(2) }, { id: ids.group, type: 'group', name: 'the usual suspects', avatar_url: null, created_by: ids.me, created_at: ago(3000), last_message_at: ago(5) }],
  friendships: [{ id: 'f1111111-1111-4111-8111-111111111111', requester_id: ids.me, addressee_id: ids.arjun, status: 'accepted', created_at: ago(5000) }, { id: 'f2222222-2222-4222-8222-222222222222', requester_id: ids.zoe, addressee_id: ids.me, status: 'pending', created_at: ago(180) }],
  notifications: [{ id: 'a1111111-1111-4111-8111-111111111111', actor_id: ids.zoe, recipient_id: ids.me, type: 'friend_request', entity_type: 'user', entity_id: ids.zoe, body: 'sent you a friend request', is_read: false, created_at: ago(180) }, { id: 'a2222222-2222-4222-8222-222222222222', actor_id: ids.arjun, recipient_id: ids.me, type: 'post_like', entity_type: 'post', entity_id: posts[2].id, body: 'liked your post', is_read: false, created_at: ago(80) }],
  post_likes: [{ post_id: posts[0].id, user_id: ids.me }], post_bookmarks: [{ post_id: posts[1].id, user_id: ids.me }],
  comments: [{ id: 'b1111111-1111-4111-8111-111111111111', post_id: posts[0].id, author_id: ids.arjun, content: 'The spontaneous ones always win.', parent_id: null, likes_count: 0, created_at: ago(10) }],
  comment_likes: [], stories: [], story_views: [], message_reactions: [],
  signal_score_history: [410, 450, 432, 520, 570, 612, 642].map((score, index) => ({ id: randomUUID(), user_id: ids.me, score, calculated_at: ago((6 - index) * 1440), breakdown: {} })),
};
function split(value) {
  let depth = 0, start = 0; const parts = [];
  for (let i = 0; i < value.length; i++) { if (value[i] === '(') depth++; if (value[i] === ')') depth--; if (value[i] === ',' && depth === 0) { parts.push(value.slice(start, i)); start = i + 1; } }
  return [...parts, value.slice(start)];
}
function matches(row, field, expression) {
  const separator = expression.indexOf('.');
  const operator = expression.slice(0, separator), value = expression.slice(separator + 1);
  if (operator === 'not') return !matches(row, field, value);
  if (operator === 'in') return value.replace(/^\(|\)$/g, '').split(',').includes(String(row[field]));
  if (operator === 'is') return value === 'null' ? row[field] == null : String(row[field]) === value;
  if (operator === 'ilike' || operator === 'like') return String(row[field] ?? '').toLowerCase().includes(value.replace(/[%*]/g, '').toLowerCase());
  if (operator === 'eq') return String(row[field]) === value;
  if (operator === 'neq') return String(row[field]) !== value;
  if (operator === 'gt') return row[field] > value;
  if (operator === 'gte') return row[field] >= value;
  if (operator === 'lt') return row[field] < value;
  return true;
}
function expression(row, value) {
  if (value.startsWith('and(')) return split(value.slice(4, -1)).every((part) => expression(row, part));
  if (value.startsWith('or(')) return split(value.slice(3, -1)).some((part) => expression(row, part));
  const dot = value.indexOf('.'); return matches(row, value.slice(0, dot), value.slice(dot + 1));
}
function joined(table, row) {
  const person = (id) => users.find((user) => user.id === id);
  if (table === 'conversations') return { ...row, participants: data.participants.filter((p) => p.conversation_id === row.id).map((p) => ({ ...p, user: person(p.user_id) })) };
  return { ...row, ...(row.author_id ? { author: person(row.author_id) } : {}), ...(row.sender_id ? { sender: person(row.sender_id), reactions: data.message_reactions.filter((reaction) => reaction.message_id === row.id) } : {}), ...(row.actor_id ? { actor: person(row.actor_id) } : {}), ...(row.requester_id ? { requester: person(row.requester_id), addressee: person(row.addressee_id) } : {}), ...(row.user_id ? { user: person(row.user_id) } : {}) };
}
export function startFixtures({ appOrigin = 'http://127.0.0.1:3000' } = {}) {
  const objects = new Map();
  let failNextUpload = false;
  let uploadDelay = 0;
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, fixtureOrigin);
    const headers = { 'content-type': 'application/json', 'access-control-allow-origin': appOrigin, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,HEAD,OPTIONS', 'access-control-expose-headers': 'content-range', 'cache-control': 'no-store' };
    const send = (body, status = 200, extra = {}) => { response.writeHead(status, { ...headers, ...extra }); response.end(request.method === 'HEAD' ? undefined : JSON.stringify(body)); };
    if (request.method === 'OPTIONS') return send(null, 204);
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    const objectPrefix = '/storage/v1/object/';
    if (url.pathname.startsWith(objectPrefix) && !url.pathname.startsWith(`${objectPrefix}sign/`) && request.method === 'POST') {
      if (uploadDelay) await new Promise((resolve) => setTimeout(resolve, uploadDelay));
      if (failNextUpload) { failNextUpload = false; return send({ message: 'Fixture upload failure' }, 503); }
      const path = decodeURIComponent(url.pathname.slice(objectPrefix.length));
      objects.set(path, { bytes, type: request.headers['content-type'] || 'application/octet-stream' });
      return send({ Key: path }, 200);
    }
    const readPrefix = `${objectPrefix}authenticated/`;
    if (url.pathname.startsWith(readPrefix) && request.method === 'GET') {
      const object = objects.get(decodeURIComponent(url.pathname.slice(readPrefix.length)));
      if (!object) return send({ message: 'Fixture object not found' }, 404);
      response.writeHead(200, { ...headers, 'content-type': object.type });
      return response.end(object.bytes);
    }
    let body = {}; try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { return send({ message: 'Invalid JSON' }, 400); }
    if (url.pathname === '/__fixtures/upload-control' && request.method === 'POST') {
      failNextUpload = body.failNext === true;
      uploadDelay = Math.min(3000, Math.max(0, Number(body.delayMs) || 0));
      return send({ configured: true });
    }
    if (url.pathname.startsWith(`${objectPrefix}sign/`) && request.method === 'POST') {
      const path = decodeURIComponent(url.pathname.slice(`${objectPrefix}sign/`.length));
      if (!objects.has(path)) return send({ message: 'Fixture object not found' }, 404);
      return send({ signedURL: `/object/authenticated/${path}` });
    }
    if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'password' && body.password !== 'preview-only') return send({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
      return send({ access_token: token, token_type: 'bearer', expires_in: 86400, refresh_token: 'preview-refresh-token', user: authUser });
    }
    if (url.pathname === '/auth/v1/user' || url.pathname.startsWith('/auth/v1/admin/users/')) return send(authUser);
    if (url.pathname === '/auth/v1/logout') return send({});
    if (url.pathname === '/auth/v1/signup' || url.pathname === '/auth/v1/resend') return send({ user: authUser, session: null });
    if (url.pathname === '/auth/v1/verify') return body.token === '123456' ? send({ access_token: token, token_type: 'bearer', expires_in: 86400, refresh_token: 'preview-refresh-token', user: authUser }) : send({ error_code: 'otp_expired', msg: 'Invalid code' }, 403);
    if (url.pathname.startsWith('/rest/v1/rpc/')) return send([{ id: 'afterhours', name: 'afterhours', usage_count: 1 }, { id: 'onrepeat', name: 'onrepeat', usage_count: 1 }].filter((tag) => tag.name.includes(body.search_query || '')));
    const table = url.pathname.slice('/rest/v1/'.length);
    if (!url.pathname.startsWith('/rest/v1/') || !Object.hasOwn(data, table)) return send({ message: 'Fixture endpoint not implemented' }, 404);
    let selected = data[table].filter((row) => [...url.searchParams].every(([field, value]) => ['select', 'order', 'limit', 'offset', 'on_conflict'].includes(field) || (field === 'or' ? split(value.slice(1, -1)).some((part) => expression(row, part)) : matches(row, field, value))));
    if (request.method === 'POST') {
      const defaults = table === 'messages' ? { type: 'text', is_deleted: false, is_edited: false, deleted_for: 'none', media_url: null, gif_url: null, reply_to_id: null }
        : table === 'posts' ? { likes_count: 0, comments_count: 0, media_urls: [], media_types: [], visibility: 'public', is_repost: false } : {};
      selected = (Array.isArray(body) ? body : [body]).map((item) => ({ ...defaults, id: randomUUID(), created_at: new Date().toISOString(), ...item }));
      for (const item of selected) { const fields = url.searchParams.get('on_conflict')?.split(',') || ['id']; const existing = data[table].find((row) => fields.every((key) => row[key] === item[key])); if (existing) Object.assign(existing, item); else data[table].push(item); }
      if (table === 'messages') for (const item of selected) { const conversation = data.conversations.find((row) => row.id === item.conversation_id); if (conversation) conversation.last_message_at = item.created_at; }
    } else if (request.method === 'PATCH') selected.forEach((row) => Object.assign(row, body));
    else if (request.method === 'DELETE') data[table] = data[table].filter((row) => !selected.includes(row));
    const total = selected.length;
    const order = url.searchParams.get('order');
    if (order) { const [field, direction] = order.split('.'); selected.sort((a, b) => a[field] < b[field] ? direction === 'desc' ? 1 : -1 : a[field] > b[field] ? direction === 'desc' ? -1 : 1 : 0); }
    selected = selected.slice(Number(url.searchParams.get('offset') || 0), Number(url.searchParams.get('offset') || 0) + Number(url.searchParams.get('limit') || total));
    const result = selected.map((row) => joined(table, row));
    const single = request.headers.accept?.includes('vnd.pgrst.object');
    if (single && result.length !== 1) return send({ code: 'PGRST116', message: 'No single row' }, 406);
    send(single ? result[0] : result, request.method === 'POST' ? 201 : 200, { 'content-range': `0-${Math.max(0, total - 1)}/${total}` });
  });
  server.on('upgrade', (_request, socket) => socket.destroy());
  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(fixturePort, '127.0.0.1', () => resolve(server)); });
}
