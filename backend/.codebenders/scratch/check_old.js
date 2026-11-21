const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const backend = 'd:\\CareRelay\\backend';
require(path.join(backend, 'node_modules', 'dotenv')).config({ path: path.join(backend, '.env') });
const mongoose = require(path.join(backend, 'node_modules', 'mongoose'));
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.db.collection('refreshtokens');
  const old = fs.readFileSync(path.join(__dirname, 'old_refresh.txt'), 'utf8').trim();
  const hash = crypto.createHash('sha256').update(old).digest('hex');
  const doc = await col.findOne({ tokenHash: hash });
  console.log('old token doc exists:', !!doc);
  if (doc) console.log('old token revokedAt set:', doc.revokedAt instanceof Date, '| revokedAt:', doc.revokedAt);
  const all = await col.find({ userId: doc ? doc.userId : null }).project({ revokedAt: 1, expiresAt: 1 }).toArray();
  console.log('docs for this user:', all.length, '| revoked:', all.filter(d => d.revokedAt).length, '| active:', all.filter(d => !d.revokedAt).length);
  await mongoose.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
