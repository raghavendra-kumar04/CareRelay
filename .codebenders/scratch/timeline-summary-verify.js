'use strict';
const crypto = require('crypto');
const mongoose = require('d:/CareRelay/backend/node_modules/mongoose');

const BASE = 'http://localhost:5000/api';
const MONGO_URI = 'mongodb://localhost:27017/carerelay_verify';
const { ObjectId } = mongoose.Types;

const rows = [];
const summaryBodies = [];
const SAFE_AI_CODES = ['AI_NOT_CONFIGURED', 'AI_GENERATION_FAILED', 'AI_MALFORMED_RESPONSE', 'AI_TIMEOUT'];
const ACTIVITY_KEYS = ['_id', 'familyId', 'actorId', 'actorName', 'entityType', 'entityId',
  'entityTitle', 'action', 'meta', 'createdAt'];

function idOf(obj) {
  return obj && (obj._id || obj.id);
}

async function call(method, url, opts = {}) {
  const headers = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let body;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(BASE + url, { method, headers, body, signal: AbortSignal.timeout(30000) });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {
    json = null;
  }
  return {
    status: res.status,
    json,
    text,
    code: json && json.error ? json.error.code : null,
  };
}

function statusCode(r, wantStatus, wantCode) {
  return {
    pass: r.status === wantStatus && (wantCode ? r.code === wantCode : true),
    status: r.status,
    code: r.code,
    detail: '',
  };
}

async function check(name, fn) {
  try {
    const out = await fn();
    rows.push({ name, pass: Boolean(out.pass), status: out.status, code: out.code || null, detail: out.detail || '' });
  } catch (err) {
    rows.push({ name, pass: false, status: null, code: null, detail: `EXCEPTION ${err.message}` });
  }
}

async function register(label) {
  const email = `${label.toLowerCase()}.${Date.now()}.${crypto.randomBytes(3).toString('hex')}@example.com`;
  const r = await call('POST', '/auth/register', {
    body: { name: `${label} Verify`, email, password: 'Min8Chars!' },
  });
  if (r.status !== 201) throw new Error(`register ${label}: ${r.status} ${r.code}`);
  return { token: r.json.data.accessToken, user: r.json.data.user };
}

async function main() {
  const admin = await register('ADMIN');
  const member = await register('MEMBER');
  const outsider = await register('OUTSIDER');

  const famRes = await call('POST', '/families', { token: admin.token, body: { name: 'Timeline Family' } });
  if (famRes.status !== 201) throw new Error(`create family: ${famRes.status} ${famRes.code}`);
  const fid = idOf(famRes.json.data.family);

  const invRes = await call('POST', `/families/${fid}/invite`, { token: admin.token });
  if (invRes.status !== 200) throw new Error(`invite: ${invRes.status} ${invRes.code}`);
  const joinRes = await call('POST', `/families/join/${invRes.json.data.inviteToken}`, { token: member.token });
  if (joinRes.status < 200 || joinRes.status > 299) throw new Error(`join: ${joinRes.status} ${joinRes.code}`);

  const otherRes = await call('POST', '/families', { token: outsider.token, body: { name: 'Other Family' } });
  if (otherRes.status !== 201) throw new Error(`create other family: ${otherRes.status} ${otherRes.code}`);
  const otherFid = idOf(otherRes.json.data.family);

  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.db.collection('activities');
  const now = Date.now();
  const docs = [];
  for (let i = 0; i < 12; i++) {
    const actor = i % 2 === 0 ? admin : member;
    docs.push({
      familyId: new ObjectId(fid),
      actorId: new ObjectId(idOf(actor.user)),
      actorName: actor.user.name,
      entityType: i % 2 === 0 ? 'task' : 'appointment',
      entityId: new ObjectId(),
      entityTitle: `Seed item ${i + 1}`,
      action: ['created', 'completed', 'note_added'][i % 3],
      meta: {},
      createdAt: new Date(now - (11 - i) * 4 * 3600 * 1000),
    });
  }
  docs.push({
    familyId: new ObjectId(otherFid),
    actorId: new ObjectId(idOf(outsider.user)),
    actorName: outsider.user.name,
    entityType: 'task',
    entityId: new ObjectId(),
    entityTitle: 'Other family seed',
    action: 'created',
    meta: {},
    createdAt: new Date(now),
  });
  await col.insertMany(docs);

  const memberId = idOf(member.user);
  const base = `/families/${fid}/activities`;

  // a) no token
  await check('a) GET activities without token', async () =>
    statusCode(await call('GET', base), 401, 'TOKEN_MISSING'));

  // b) admin list
  let itemsAll = [];
  await check('b) admin GET activities: 200, 12 items, pagination, descending', async () => {
    const r = await call('GET', base, { token: admin.token });
    const items = r.json && Array.isArray(r.json.data) ? r.json.data : [];
    itemsAll = items;
    const p = r.json && r.json.pagination;
    const pagOk = p && p.page === 1 && p.limit === 20 && p.total === 12;
    const desc = items.every((x, i) => i === 0 || new Date(items[i - 1].createdAt) > new Date(x.createdAt));
    return {
      pass: r.status === 200 && items.length === 12 && pagOk && desc,
      status: r.status,
      code: r.code,
      detail: `count=${items.length} pagination=${JSON.stringify(p)} descending=${desc}`,
    };
  });

  // c) pagination
  await check('c) ?limit=5&page=2 -> 5 items, page 2, total 12', async () => {
    const r = await call('GET', `${base}?limit=5&page=2`, { token: admin.token });
    const items = r.json && Array.isArray(r.json.data) ? r.json.data : [];
    const p = r.json && r.json.pagination;
    return {
      pass: r.status === 200 && items.length === 5 && p && p.page === 2 && p.total === 12,
      status: r.status,
      code: r.code,
      detail: `count=${items.length} pagination=${JSON.stringify(p)}`,
    };
  });
  await check('c) ?limit=101 -> 400 VALIDATION_ERROR', async () =>
    statusCode(await call('GET', `${base}?limit=101`, { token: admin.token }), 400, 'VALIDATION_ERROR'));

  // d) entityType filter
  await check('d) ?entityType=task -> all task', async () => {
    const r = await call('GET', `${base}?entityType=task`, { token: admin.token });
    const items = r.json && Array.isArray(r.json.data) ? r.json.data : [];
    return {
      pass: r.status === 200 && items.length > 0 && items.every((x) => x.entityType === 'task'),
      status: r.status,
      code: r.code,
      detail: `count=${items.length}`,
    };
  });
  await check('d) ?entityType=bogus -> 400', async () =>
    statusCode(await call('GET', `${base}?entityType=bogus`, { token: admin.token }), 400, 'VALIDATION_ERROR'));

  // e) actorId filter
  await check('e) ?actorId=<MEMBER id> -> all that actor', async () => {
    const r = await call('GET', `${base}?actorId=${memberId}`, { token: admin.token });
    const items = r.json && Array.isArray(r.json.data) ? r.json.data : [];
    return {
      pass: r.status === 200 && items.length > 0 && items.every((x) => String(x.actorId) === memberId),
      status: r.status,
      code: r.code,
      detail: `count=${items.length}`,
    };
  });
  await check('e) ?actorId=bad -> 400', async () =>
    statusCode(await call('GET', `${base}?actorId=bad`, { token: admin.token }), 400, 'VALIDATION_ERROR'));

  // f) date range
  await check('f) ?startDate=1 day ago&endDate=now -> all in range', async () => {
    const start = new Date(Date.now() - 86400000);
    const end = new Date();
    const r = await call('GET',
      `${base}?startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}`,
      { token: admin.token });
    const items = r.json && Array.isArray(r.json.data) ? r.json.data : [];
    const inRange = items.every((x) => {
      const t = new Date(x.createdAt).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
    return {
      pass: r.status === 200 && items.length > 0 && inRange,
      status: r.status,
      code: r.code,
      detail: `count=${items.length} allInRange=${inRange}`,
    };
  });
  await check('f) startDate after endDate -> 400', async () => {
    const start = new Date(Date.now());
    const end = new Date(Date.now() - 86400000);
    const r = await call('GET',
      `${base}?startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}`,
      { token: admin.token });
    return statusCode(r, 400, 'VALIDATION_ERROR');
  });

  // g) membership access
  await check('g) MEMBER GET activities -> 200', async () =>
    statusCode(await call('GET', base, { token: member.token }), 200));
  await check('g) OUTSIDER GET Timeline activities -> 403', async () =>
    statusCode(await call('GET', base, { token: outsider.token }), 403, 'FAMILY_ACCESS_DENIED'));

  // h) DTO keys
  await check('h) activity items have exactly the expected keys', async () => {
    const expected = [...ACTIVITY_KEYS].sort().join(',');
    const bad = [];
    itemsAll.forEach((x, i) => {
      const got = Object.keys(x).sort().join(',');
      if (got !== expected) bad.push(i);
    });
    const first = itemsAll[0] ? Object.keys(itemsAll[0]) : [];
    const extra = first.filter((k) => !ACTIVITY_KEYS.includes(k));
    const missing = ACTIVITY_KEYS.filter((k) => !first.includes(k));
    return {
      pass: itemsAll.length > 0 && bad.length === 0,
      status: 200,
      code: null,
      detail: `itemsChecked=${itemsAll.length} mismatchedIdx=${JSON.stringify(bad)} extra=${JSON.stringify(extra)} missing=${JSON.stringify(missing)}`,
    };
  });

  // i) generate summary
  const summaryState = { id: null };
  await check('i) ADMIN POST summaries/generate -> 201 or safe AI error', async () => {
    const r = await call('POST', `/families/${fid}/summaries/generate`, { token: admin.token });
    summaryBodies.push(r.text);
    if (r.status === 201 && r.json && r.json.data && r.json.data.summary) {
      summaryState.id = idOf(r.json.data.summary);
    }
    const safe = r.status === 201 || (r.status >= 400 && SAFE_AI_CODES.includes(r.code));
    return {
      pass: safe,
      status: r.status,
      code: r.code,
      detail: r.status === 201 ? `summaryId=${summaryState.id}` : `bodyBytes=${r.text.length}`,
    };
  });

  // j) list and get
  await check('j) ADMIN GET summaries -> 200 with pagination', async () => {
    const r = await call('GET', `/families/${fid}/summaries`, { token: admin.token });
    summaryBodies.push(r.text);
    return {
      pass: r.status === 200 && Array.isArray(r.json && r.json.data) && !!(r.json && r.json.pagination),
      status: r.status,
      code: r.code,
      detail: `pagination=${JSON.stringify(r.json && r.json.pagination)}`,
    };
  });
  if (summaryState.id) {
    await check('j) ADMIN GET summaries/:id -> 200 with summary and sourceActivities', async () => {
      const r = await call('GET', `/families/${fid}/summaries/${summaryState.id}`, { token: admin.token });
      summaryBodies.push(r.text);
      const d = r.json && r.json.data;
      return {
        pass: r.status === 200 && !!(d && d.summary) && Array.isArray(d && d.sourceActivities),
        status: r.status,
        code: r.code,
        detail: `sourceActivities=${d && Array.isArray(d.sourceActivities) ? d.sourceActivities.length : 'n/a'}`,
      };
    });
  } else {
    await check('j) ADMIN GET summaries/000...0 -> 404 SUMMARY_NOT_FOUND', async () => {
      const r = await call('GET', `/families/${fid}/summaries/000000000000000000000000`, { token: admin.token });
      summaryBodies.push(r.text);
      return statusCode(r, 404, 'SUMMARY_NOT_FOUND');
    });
  }

  // k) member and outsider
  await check('k) MEMBER GET summaries -> 200', async () => {
    const r = await call('GET', `/families/${fid}/summaries`, { token: member.token });
    summaryBodies.push(r.text);
    return statusCode(r, 200);
  });
  await check('k) OUTSIDER POST generate on Timeline -> 403', async () =>
    statusCode(await call('POST', `/families/${fid}/summaries/generate`, { token: outsider.token }),
      403, 'FAMILY_ACCESS_DENIED'));

  // l) safety scan over summary responses
  await check('l) summary responses contain no email, passwordHash, inviteToken, accessToken', async () => {
    const joined = summaryBodies.join('\n');
    const hits = [];
    if (/@[A-Za-z0-9-]+\.[A-Za-z]{2,}/.test(joined)) hits.push('email-like');
    if (joined.includes('passwordHash')) hits.push('passwordHash');
    if (joined.includes('inviteToken')) hits.push('inviteToken');
    if (joined.includes('accessToken')) hits.push('accessToken');
    return {
      pass: hits.length === 0,
      status: null,
      code: null,
      detail: `bodiesScanned=${summaryBodies.length} hits=${JSON.stringify(hits)}`,
    };
  });

  await mongoose.disconnect();
}

(async () => {
  try {
    await main();
  } catch (err) {
    console.log(`SETUP ERROR: ${err.message}`);
    process.exitCode = 2;
    await mongoose.disconnect().catch(() => {});
    return;
  }
  let fails = 0;
  for (const r of rows) {
    if (!r.pass) fails += 1;
    console.log(`${r.pass ? 'PASS' : 'FAIL'} | ${r.name} | status=${r.status} | error.code=${r.code} | ${r.detail}`);
  }
  console.log(`TOTAL=${rows.length} FAILED=${fails}`);
  process.exitCode = fails > 0 ? 1 : 0;
})();
