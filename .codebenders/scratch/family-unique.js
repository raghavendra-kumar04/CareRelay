const base = 'http://localhost:5000/api';
const stamp = Date.now();
async function call(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch (e) {}
  return { status: res.status, data };
}
(async () => {
  let allOk = true;
  for (let i = 1; i <= 3; i++) {
    const suffix = Math.random().toString(36).slice(2, 8);
    const email = `fam${stamp}${i}${suffix}@example.com`;
    const reg = await call('POST', '/auth/register', { name: `User ${i}`, email, password: 'Min8Chars!' });
    console.log(`register ${i}: status=${reg.status}`);
    if (reg.status !== 201) { allOk = false; console.log(JSON.stringify(reg.data)); continue; }
    const token = reg.data.data.accessToken;
    const fam = await call('POST', '/families', { name: `Family ${stamp}-${i}-${suffix}` }, token);
    console.log(`family ${i}: status=${fam.status} id=${fam.data && fam.data.data && fam.data.data.family && fam.data.data.family._id}`);
    if (fam.status !== 201) { allOk = false; console.log(JSON.stringify(fam.data)); }
  }
  console.log(allOk ? 'RESULT: PASS' : 'RESULT: FAIL');
  process.exit(allOk ? 0 : 1);
})().catch(e => { console.error('ERROR', e); process.exit(2); });
