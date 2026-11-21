const env = require('./config/env');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const familyRoutes = require('./routes/family.routes');
const taskRoutes = require('./routes/tasks.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/api/auth', authRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/families/:fid/tasks', taskRoutes);

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(env.PORT, () => {
        console.log(`Server listening on port ${env.PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err.message);
      process.exit(1);
    });
}

module.exports = app;
