const mongoose = require('d:/CareRelay/backend/node_modules/mongoose');
const BASE = 'http://localhost:5000/api';
const MONGO = 'mongodb://localhost:27017/carerelay_verify';
const DAY = 864e5;
const results = [];
const fiveHundreds = [];
let failures = 0;

async function call(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch (e) {}
  if (res.status >= 500) fiveHundreds.push({ method, path, status: res.status, body: json });
  return { status: res.status, body: json };
}
const errCode = (r) => (r.body && r.body.error ? r.body.error.code : undefined);
const errMsg = (r) => (r.body && r.body.error ? r.body.error.message : undefined);
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function st(r, status, code) {
  const actual = `${r.status} ${errCode(r) || ''}`.trim() + (errMsg(r) ? ` "${errMsg(r)}"` : '');
  const ok = r.status === status && (code === undefined || errCode(r) === code);
  assert(ok, `expected ${status}${code ? ' ' + code : ''}, got ${actual}`);
  return `${status}${code ? ' ' + code : ''} OK (actual ${actual})`;
}
async function t(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, pass: true, detail: detail || '' });
  } catch (e) {
    failures++;
    results.push({ name, pass: false, detail: e.message });
  }
}
const idOf = (u) => (u._id || u.id);

async function main() {
  await mongoose.connect(MONGO);
  const ts = Date.now();
  const mk = (role) => ({ name: role + ' Verify', email: `${role.toLowerCase()}.${ts}@example.com`, password: 'Min8Chars!' });
  const A = mk('ADMIN'), M = mk('MEMBER'), O = mk('OUTSIDER');

  const reg = async (u) => {
    const r = await call('POST', '/auth/register', null, u);
    assert(r.status === 201, `register ${u.name} got ${r.status} ${JSON.stringify(r.body)}`);
    return { token: r.body.data.accessToken, id: idOf(r.body.data.user) };
  };
  const adm = await reg(A);
  const mem = await reg(M);
  const out = await reg(O);
  A.token = adm.token; A.id = adm.id;
  M.token = mem.token; M.id = mem.id;
  O.token = out.token; O.id = out.id;

  let fid = null, fid2 = null, inviteToken = null;
  const fam = await call('POST', '/families', A.token, { name: 'Verify Family' });
  assert(fam.status === 201, `create family got ${fam.status} ${JSON.stringify(fam.body)}`);
  fid = fam.body.data.family._id;
  const inv = await call('POST', `/families/${fid}/invite`, A.token);
  assert(inv.status === 200, `invite got ${inv.status}`);
  inviteToken = inv.body.data.inviteToken;
  const join = await call('POST', `/families/join/${inviteToken}`, M.token);
  assert(join.status === 200, `join got ${join.status} ${JSON.stringify(join.body)}`);
  const fam2 = await call('POST', '/families', O.token, { name: 'Other Family' });
  assert(fam2.status === 201, `create other family got ${fam2.status}`);
  fid2 = fam2.body.data.family._id;

  // Setup: 25 tasks. Creation failures are recorded, not fatal.
  const cats = ['appointment', 'medication', 'document', 'transport', 'communication', 'other'];
  const prios = ['low', 'medium', 'high', 'urgent'];
  const ids = [];
  const createStatuses = {};
  let firstCreateFailure = null;
  for (let i = 0; i < 25; i++) {
    const due = i % 3 === 0 ? new Date(Date.now() - 2 * DAY).toISOString()
      : i % 3 === 1 ? new Date(Date.now() + 5 * DAY).toISOString() : null;
    const r = await call('POST', `/families/${fid}/tasks`, A.token, {
      title: `Task ${i}`,
      category: cats[i % 6],
      priority: prios[i % 4],
      assignedTo: i % 2 === 0 ? A.id : M.id,
      dueDate: due,
    });
    createStatuses[r.status] = (createStatuses[r.status] || 0) + 1;
    if (r.status === 201) ids.push(r.body.data.task._id);
    else {
      ids.push(null);
      if (!firstCreateFailure) firstCreateFailure = `task ${i}: ${r.status} ${JSON.stringify(r.body)}`;
    }
  }
  await t('setup: create 25 tasks (ADMIN)', async () => {
    assert(!firstCreateFailure, `create statuses ${JSON.stringify(createStatuses)}; first failure ${firstCreateFailure}`);
    return `all 201`;
  });
  const [T1, T2, T3] = [ids[0], ids[1], ids[2]];
  const need = (x, n) => assert(x, `${n} unavailable (task create failed earlier)`);

  // a) validation
  await t('a1 assignedTo OUTSIDER -> 400 INVALID_ASSIGNEE', async () =>
    st(await call('POST', `/families/${fid}/tasks`, A.token, { title: 'x', category: 'other', assignedTo: O.id }), 400, 'INVALID_ASSIGNEE'));
  await t('a2 missing title -> 400 VALIDATION_ERROR', async () =>
    st(await call('POST', `/families/${fid}/tasks`, A.token, { category: 'other', assignedTo: A.id }), 400, 'VALIDATION_ERROR'));

  // b) pagination
  await t('b1 list page 1 -> 200, total 25, 20 items', async () => {
    const r = await call('GET', `/families/${fid}/tasks?page=1`, A.token);
    const s = st(r, 200);
    assert(r.body.pagination.total === 25, `total=${r.body.pagination.total}`);
    assert(r.body.data.length === 20, `items=${r.body.data.length}`);
    return s + `; total=25 items=20`;
  });
  await t('b2 list page 2 -> 5 items', async () => {
    const r = await call('GET', `/families/${fid}/tasks?page=2`, A.token);
    const s = st(r, 200);
    assert(r.body.data.length === 5, `items=${r.body.data.length}`);
    return s + '; items=5';
  });
  await t('b3 limit=101 -> 400 VALIDATION_ERROR', async () =>
    st(await call('GET', `/families/${fid}/tasks?limit=101`, A.token), 400, 'VALIDATION_ERROR'));

  // c) ordering on page 1
  await t('c1 page 1 dueDate ascending, nulls last', async () => {
    const r = await call('GET', `/families/${fid}/tasks?page=1`, A.token);
    let seenNull = false, prev = -Infinity, nulls = 0;
    for (const item of r.body.data) {
      if (item.dueDate === null || item.dueDate === undefined) { seenNull = true; nulls++; continue; }
      assert(!seenNull, 'non-null dueDate appeared after a null dueDate');
      const v = new Date(item.dueDate).getTime();
      assert(v >= prev, `dueDate out of order: ${item.dueDate}`);
      prev = v;
    }
    return `ordered OK; null-due items on page 1 = ${nulls}`;
  });

  // d) filters
  const now = Date.now();
  const filterCase = (label, qs, pred) => t(label, async () => {
    const r = await call('GET', `/families/${fid}/tasks?${qs}`, A.token);
    const s = st(r, 200);
    assert(r.body.data.length > 0, 'filter returned zero items, so the check would be vacuous');
    const bad = r.body.data.filter((x) => !pred(x));
    assert(bad.length === 0, `${bad.length} item(s) violate filter, e.g. ${JSON.stringify(bad[0])}`);
    return `${s}; items=${r.body.data.length} total=${r.body.pagination.total}`;
  });
  await filterCase('d1 status=pending', 'status=pending', (x) => x.status === 'pending');
  await filterCase('d2 priority=high', 'priority=high', (x) => x.priority === 'high');
  await filterCase('d3 category=appointment', 'category=appointment', (x) => x.category === 'appointment');
  await filterCase('d4 assignedTo=MEMBER', `assignedTo=${M.id}`, (x) => x.assignedTo && String(x.assignedTo._id) === M.id);
  await filterCase('d5 overdue=true', 'overdue=true', (x) => x.status !== 'completed' && x.dueDate && new Date(x.dueDate).getTime() < now);

  // e) status transitions on T1
  await t('e1 ADMIN PATCH T1 in-progress -> 200', async () => {
    need(T1, 'T1');
    const r = await call('PATCH', `/families/${fid}/tasks/${T1}`, A.token, { status: 'in-progress' });
    const s = st(r, 200);
    assert(r.body.data.task.status === 'in-progress', `status=${r.body.data.task.status}`);
    return s;
  });
  await t('e2 PATCH T1 pending -> 200', async () => {
    need(T1, 'T1');
    const r = await call('PATCH', `/families/${fid}/tasks/${T1}`, A.token, { status: 'pending' });
    return st(r, 200);
  });
  await t('e3 completed without note -> 400 COMPLETION_NOTE_REQUIRED', async () => {
    need(T1, 'T1');
    return st(await call('PATCH', `/families/${fid}/tasks/${T1}`, A.token, { status: 'completed' }), 400, 'COMPLETION_NOTE_REQUIRED');
  });
  await t('e4 completionNote "ok" -> 400 COMPLETION_NOTE_REQUIRED', async () => {
    need(T1, 'T1');
    return st(await call('PATCH', `/families/${fid}/tasks/${T1}`, A.token, { status: 'completed', completionNote: 'ok' }), 400, 'COMPLETION_NOTE_REQUIRED');
  });
  await t('e5 completionNote "Booked for Saturday" -> 200 completed + completedAt', async () => {
    need(T1, 'T1');
    const r = await call('PATCH', `/families/${fid}/tasks/${T1}`, A.token, { status: 'completed', completionNote: 'Booked for Saturday' });
    const s = st(r, 200);
    assert(r.body.data.task.status === 'completed', `status=${r.body.data.task.status}`);
    assert(r.body.data.task.completedAt, 'completedAt not set');
    return s + `; completedAt=${r.body.data.task.completedAt}`;
  });
  await t('e6 MEMBER PATCH completed T1 -> 403 TASK_LOCKED', async () => {
    need(T1, 'T1');
    return st(await call('PATCH', `/families/${fid}/tasks/${T1}`, M.token, { status: 'in-progress' }), 403, 'TASK_LOCKED');
  });
  await t('e7 ADMIN PATCH completed T1 in-progress -> 200, completedAt null', async () => {
    need(T1, 'T1');
    const r = await call('PATCH', `/families/${fid}/tasks/${T1}`, A.token, { status: 'in-progress' });
    const s = st(r, 200);
    assert(r.body.data.task.completedAt === null, `completedAt=${r.body.data.task.completedAt}`);
    return s;
  });

  // f) assignee on T2
  await t('f1 PATCH T2 assignedTo OUTSIDER -> 400 INVALID_ASSIGNEE', async () => {
    need(T2, 'T2');
    return st(await call('PATCH', `/families/${fid}/tasks/${T2}`, A.token, { assignedTo: O.id }), 400, 'INVALID_ASSIGNEE');
  });
  await t('f2 PATCH T2 assignedTo MEMBER -> 200 (T2 already MEMBER-assigned, no-op)', async () => {
    need(T2, 'T2');
    return st(await call('PATCH', `/families/${fid}/tasks/${T2}`, A.token, { assignedTo: M.id }), 200);
  });
  await t('f3 ADMIN reassigns T2 to ADMIN -> 200 (real reassignment, needed for activity check)', async () => {
    need(T2, 'T2');
    const r = await call('PATCH', `/families/${fid}/tasks/${T2}`, A.token, { assignedTo: A.id });
    const s = st(r, 200);
    assert(String(r.body.data.task.assignedTo._id) === A.id, 'assignedTo not updated');
    return s;
  });

  // g) notes on T2
  await t('g1 MEMBER POST note on T2 -> 201, notes length 1', async () => {
    need(T2, 'T2');
    const r = await call('POST', `/families/${fid}/tasks/${T2}/notes`, M.token, { text: 'Called clinic' });
    const s = st(r, 201);
    assert(r.body.data.task.notes.length === 1, `notes=${r.body.data.task.notes.length}`);
    return s + '; notes=1';
  });
  await t('g2 empty note text -> 400 VALIDATION_ERROR', async () => {
    need(T2, 'T2');
    return st(await call('POST', `/families/${fid}/tasks/${T2}/notes`, M.token, { text: '' }), 400, 'VALIDATION_ERROR');
  });

  // h) soft delete on T3
  await t('h1 MEMBER DELETE T3 -> 403 INSUFFICIENT_ROLE', async () => {
    need(T3, 'T3');
    return st(await call('DELETE', `/families/${fid}/tasks/${T3}`, M.token), 403, 'INSUFFICIENT_ROLE');
  });
  await t('h2 ADMIN DELETE T3 -> 200 deleted true', async () => {
    need(T3, 'T3');
    const r = await call('DELETE', `/families/${fid}/tasks/${T3}`, A.token);
    const s = st(r, 200);
    assert(r.body.data.deleted === true, `deleted=${r.body.data.deleted}`);
    return s;
  });
  await t('h3 GET T3 -> 404 TASK_NOT_FOUND', async () => {
    need(T3, 'T3');
    return st(await call('GET', `/families/${fid}/tasks/${T3}`, A.token), 404, 'TASK_NOT_FOUND');
  });
  await t('h4 list total now 24', async () => {
    const r = await call('GET', `/families/${fid}/tasks?page=1`, A.token);
    st(r, 200);
    assert(r.body.pagination.total === 24, `total=${r.body.pagination.total}`);
    return 'total=24';
  });
  await t('h5 raw caretasks doc for T3 has deletedAt set (not hard-deleted)', async () => {
    need(T3, 'T3');
    const doc = await mongoose.connection.db.collection('caretasks').findOne({ _id: new mongoose.Types.ObjectId(T3) });
    assert(doc, 'document missing from raw collection (hard-deleted?)');
    assert(doc.deletedAt instanceof Date, `deletedAt=${doc.deletedAt}`);
    return `deletedAt=${doc.deletedAt.toISOString()}`;
  });

  // i) cross-family isolation
  await t('i1 OUTSIDER GET Verify family tasks -> 403 FAMILY_ACCESS_DENIED', async () =>
    st(await call('GET', `/families/${fid}/tasks`, O.token), 403, 'FAMILY_ACCESS_DENIED'));
  await t('i2 ADMIN GET Other family tasks -> 403 FAMILY_ACCESS_DENIED', async () =>
    st(await call('GET', `/families/${fid2}/tasks`, A.token), 403, 'FAMILY_ACCESS_DENIED'));
  await t('i3 OUTSIDER GET Verify task via Other fid -> 404 TASK_NOT_FOUND', async () => {
    need(T1, 'T1');
    return st(await call('GET', `/families/${fid2}/tasks/${T1}`, O.token), 404, 'TASK_NOT_FOUND');
  });

  // j) activity log
  const counts = {};
  let immutability = null;
  await t('j1 activities for Verify fid: created count = 25', async () => {
    const rows = await mongoose.connection.db.collection('activities').aggregate([
      { $match: { familyId: new mongoose.Types.ObjectId(fid) } },
      { $group: { _id: '$action', n: { $sum: 1 } } },
    ]).toArray();
    for (const row of rows) counts[row._id] = row.n;
    assert(counts.created === 25, `created=${counts.created}`);
    return `created=${counts.created}`;
  });
  await t('j2 activities include completed, reassigned, status_changed, note_added, deleted', async () => {
    const missing = ['completed', 'reassigned', 'status_changed', 'note_added', 'deleted'].filter((a) => !counts[a]);
    assert(missing.length === 0, `missing actions: ${missing.join(', ')}`);
    return ['completed', 'reassigned', 'status_changed', 'note_added', 'deleted'].map((a) => `${a}=${counts[a]}`).join(' ');
  });
  await t('j3 no activity document has updatedAt', async () => {
    const n = await mongoose.connection.db.collection('activities').countDocuments({
      familyId: new mongoose.Types.ObjectId(fid), updatedAt: { $exists: true },
    });
    assert(n === 0, `${n} docs have updatedAt`);
    return '0 docs with updatedAt';
  });
  await t('j4 Activity.updateOne throws "Activity records are immutable"', async () => {
    const Activity = require('d:/CareRelay/backend/src/models/Activity.js');
    let msg;
    try {
      await Activity.updateOne({}, { $set: { actorName: 'x' } });
      msg = 'NO ERROR THROWN';
    } catch (e) {
      msg = e.message;
    }
    immutability = msg;
    assert(msg === 'Activity records are immutable', `got: ${msg}`);
    const tampered = await mongoose.connection.db.collection('activities').countDocuments({ actorName: 'x' });
    assert(tampered === 0, `${tampered} docs were tampered`);
    return `message="${msg}"; tampered docs=0`;
  });

  // k) 500s
  await t('k1 no 500 responses during run', async () => {
    assert(fiveHundreds.length === 0, `${fiveHundreds.length} x 500; first=${JSON.stringify(fiveHundreds[0])}`);
    return 'none';
  });
  const txHits = fiveHundreds.filter((x) => /Transaction numbers|replica set/.test(JSON.stringify(x.body)));
  // l) auth required
  await t('l1 GET list with no Authorization -> 401 TOKEN_MISSING', async () => {
    const r = await call('GET', `/families/${fid}/tasks`, null);
    return st(r, 401, 'TOKEN_MISSING');
  });

  await mongoose.disconnect();
  const passed = results.filter((x) => x.pass).length;
  console.log(JSON.stringify({
    summary: { total: results.length, passed, failed: results.length - passed, fid, fid2 },
    results,
    activityCounts: counts,
    immutability,
    transactionCheck: txHits.length ? txHits : 'no "Transaction numbers"/"replica set" messages seen',
    fiveHundreds,
  }, null, 2));
}

main().then(
  () => { process.exitCode = failures > 0 ? 1 : 0; },
  async (e) => {
    console.log('FATAL: ' + (e && e.stack ? e.stack : e));
    try { await mongoose.disconnect(); } catch (x) {}
    process.exitCode = 2;
  }
);
