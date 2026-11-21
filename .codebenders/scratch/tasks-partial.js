const BASE = 'http://localhost:5000/api';
const results = [];
const uniq = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const PW = 'Min8Chars!';

async function call(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null;
  try { json = await res.json(); } catch (_) {}
  return { status: res.status, json };
}
const code = (r) => (r.json && r.json.error && r.json.error.code) || null;
const msg = (r) => (r.json && r.json.error && r.json.error.message) || (r.json ? JSON.stringify(r.json).slice(0, 300) : '(no body)');
const idOf = (o) => (o && (o.id || o._id)) || null;

async function check(name, fn) {
  try {
    const { pass, detail } = await fn();
    results.push({ name, pass, detail });
  } catch (e) {
    results.push({ name, pass: false, detail: 'EXCEPTION: ' + (e && e.message) });
  }
}
function expectStatus(r, status, errCode) {
  const ok = r.status === status && (errCode === undefined || code(r) === errCode);
  return { pass: ok, detail: `status=${r.status} error.code=${code(r)} error.message=${msg(r)}` };
}

async function main() {
  const reg = async (label) => {
    const email = `partial+${Date.now()}${Math.random().toString(36).slice(2,6)}@example.com`;
    const r = await call('POST', '/auth/register', null, { name: label, email, password: PW });
    if (r.status !== 201) throw new Error(`register ${label} status=${r.status} ${msg(r)}`);
    return { token: r.json.data.accessToken, id: idOf(r.json.data.user), email };
  };
  const ADMIN = await reg('ADMIN');
  const MEMBER = await reg('MEMBER');
  const OUTSIDER = await reg('OUTSIDER');

  const fam = await call('POST', '/families', ADMIN.token, { name: 'Partial Family' });
  if (fam.status !== 201) throw new Error('create family ' + fam.status + ' ' + msg(fam));
  const fid = idOf(fam.json.data.family);

  const other = await call('POST', '/families', OUTSIDER.token, { name: 'Other Family' });
  if (other.status !== 201) throw new Error('create other family ' + other.status + ' ' + msg(other));
  const otherFid = idOf(other.json.data.family);

  const inv = await call('POST', `/families/${fid}/invite`, ADMIN.token);
  if (inv.status !== 200) throw new Error('invite ' + inv.status + ' ' + msg(inv));
  const joinR = await call('POST', `/families/join/${inv.json.data.inviteToken}`, MEMBER.token);
  results.push({ name: 'setup: MEMBER joins family', pass: joinR.status === 200 || joinR.status === 201, detail: `status=${joinR.status} ${msg(joinR)}` });

  const T = `/families/${fid}/tasks`;
  const ZERO = '000000000000000000000000';

  await check('a) GET tasks no Authorization -> 401 TOKEN_MISSING', async () => {
    const r = await call('GET', T, null);
    return expectStatus(r, 401, 'TOKEN_MISSING');
  });
  await check('b) ADMIN GET tasks -> 200, array, pagination {page:1,limit:20,total:0}', async () => {
    const r = await call('GET', T, ADMIN.token);
    const p = r.json && r.json.pagination;
    const ok = r.status === 200 && Array.isArray(r.json.data) && p && p.page === 1 && p.limit === 20 && p.total === 0;
    return { pass: !!ok, detail: `status=${r.status} isArray=${Array.isArray(r.json && r.json.data)} pagination=${JSON.stringify(p)}` };
  });
  await check('c1) GET ?limit=101 -> 400 VALIDATION_ERROR', async () => expectStatus(await call('GET', T + '?limit=101', ADMIN.token), 400, 'VALIDATION_ERROR'));
  await check('c2) GET ?status=bogus -> 400 VALIDATION_ERROR', async () => expectStatus(await call('GET', T + '?status=bogus', ADMIN.token), 400, 'VALIDATION_ERROR'));
  await check('c3) GET ?overdue=true -> 200', async () => {
    const r = await call('GET', T + '?overdue=true', ADMIN.token);
    return { pass: r.status === 200, detail: `status=${r.status} error.code=${code(r)}` };
  });
  await check('d) OUTSIDER GET tasks -> 403 FAMILY_ACCESS_DENIED', async () => expectStatus(await call('GET', T, OUTSIDER.token), 403, 'FAMILY_ACCESS_DENIED'));
  await check('e) ADMIN GET other family tasks -> 403 FAMILY_ACCESS_DENIED', async () => expectStatus(await call('GET', `/families/${otherFid}/tasks`, ADMIN.token), 403, 'FAMILY_ACCESS_DENIED'));
  await check('f) MEMBER GET unknown task id -> 404 TASK_NOT_FOUND', async () => expectStatus(await call('GET', `${T}/${ZERO}`, MEMBER.token), 404, 'TASK_NOT_FOUND'));
  await check('g) MEMBER GET not-an-id -> 400 VALIDATION_ERROR', async () => expectStatus(await call('GET', `${T}/not-an-id`, MEMBER.token), 400, 'VALIDATION_ERROR'));
  await check('h) MEMBER DELETE unknown task id -> 403 INSUFFICIENT_ROLE', async () => expectStatus(await call('DELETE', `${T}/${ZERO}`, MEMBER.token), 403, 'INSUFFICIENT_ROLE'));
  await check('i1) ADMIN POST {title:""} -> 400 VALIDATION_ERROR', async () => expectStatus(await call('POST', T, ADMIN.token, { title: '' }), 400, 'VALIDATION_ERROR'));
  await check('i2) ADMIN POST {title:x,category:bogus,assignedTo:bad} -> 400 VALIDATION_ERROR', async () => expectStatus(await call('POST', T, ADMIN.token, { title: 'x', category: 'bogus', assignedTo: 'bad' }), 400, 'VALIDATION_ERROR'));
  await check('j) MEMBER POST valid task -> expected 500 (replica set / transactions)', async () => {
    const r = await call('POST', T, MEMBER.token, { title: 'x', category: 'other', assignedTo: ADMIN.id });
    return { pass: r.status === 500, expectedBlocked: true, detail: `status=${r.status} error.code=${code(r)} error.message=${msg(r)}` };
  });

  console.log(JSON.stringify(results, null, 2));
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
