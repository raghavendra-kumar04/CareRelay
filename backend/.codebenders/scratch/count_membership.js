const fs = require('fs'); const path = require('path');
const mongoose = require(path.join(process.cwd(), 'node_modules', 'mongoose'));
const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const uri = env.match(/^MONGODB_URI=(.*)$/m)[1].trim();
(async () => {
  await mongoose.connect(uri);
  const c = mongoose.connection.db.collection('memberships');
  const n = await c.countDocuments({ familyId: new mongoose.Types.ObjectId(process.argv[2]), userId: new mongoose.Types.ObjectId(process.argv[3]) });
  console.log('membership docs for familyId+userId = ' + n);
  await mongoose.disconnect();
})().catch(e => { console.error('ERR ' + e.message); process.exit(1); });
