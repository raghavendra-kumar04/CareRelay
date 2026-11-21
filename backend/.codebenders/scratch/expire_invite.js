const fs = require('fs');
const path = require('path');
const mongoose = require(path.join(process.cwd(), 'node_modules', 'mongoose'));
const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const m = env.match(/^MONGODB_URI=(.*)$/m);
const uri = m ? m[1].trim() : null;
(async () => {
  if (!uri) { console.log('MONGODB_URI missing'); process.exit(2); }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const fid = new mongoose.Types.ObjectId(process.argv[2]);
  const past = new Date(Date.now() - 60 * 60 * 1000);
  const res = await db.collection('families').updateOne({ _id: fid }, { $set: { inviteTokenExpiresAt: past } });
  console.log('matched=' + res.matchedCount + ' modified=' + res.modifiedCount + ' set=' + past.toISOString());
  await mongoose.disconnect();
})().catch(e => { console.error('ERR ' + e.message); process.exit(1); });
