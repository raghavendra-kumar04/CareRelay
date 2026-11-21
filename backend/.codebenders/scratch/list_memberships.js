const fs = require('fs'); const path = require('path');
const mongoose = require(path.join(process.cwd(), 'node_modules', 'mongoose'));
const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const uri = env.match(/^MONGODB_URI=(.*)$/m)[1].trim();
(async () => {
  await mongoose.connect(uri);
  const c = mongoose.connection.db.collection('memberships');
  const docs = await c.find({ familyId: new mongoose.Types.ObjectId(process.argv[2]) }).toArray();
  console.log('memberships for family: ' + docs.length);
  for (const d of docs) console.log('  userId=' + String(d.userId) + ' role=' + d.role + ' deletedAt=' + (d.deletedAt ? 'set' : 'null'));
  await mongoose.disconnect();
})().catch(e => { console.error('ERR ' + e.message); process.exit(1); });
