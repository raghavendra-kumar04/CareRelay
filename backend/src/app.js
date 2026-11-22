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
const activityRoutes = require('./routes/activities.routes');
const summaryRoutes = require('./routes/summary.routes');
const appointmentRoutes = require('./routes/appointments.routes');
const prescriptionRoutes = require('./routes/prescriptions.routes');
const { startReminderJob } = require('./jobs/reminderJob');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const http = require('http');
const { initSocket } = require('./socket/socketServer');

const app = express();

// Trust reverse proxy (Render, Heroku, AWS ELB) for secure cookie handling
app.set('trust proxy', 1);

app.use(helmet());
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      // Support Vercel production and preview deployments
      try {
        const parsed = new URL(origin);
        if (parsed.hostname.endsWith('.vercel.app')) {
          return callback(null, true);
        }
      } catch {}
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/api/auth', authRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/families/:fid/tasks', taskRoutes);
app.use('/api/families/:fid/appointments', appointmentRoutes);
app.use('/api/families/:fid/prescriptions', prescriptionRoutes);
app.use('/api/families/:fid/activities', activityRoutes);
app.use('/api/families/:fid/summaries', summaryRoutes);

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  connectDB()
    .then(() => {
      const httpServer = http.createServer(app);
      initSocket(httpServer);
      startReminderJob();

      httpServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${env.PORT} is already in use by another process. Run: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${env.PORT}).OwningProcess -Force`);
        } else {
          console.error('Server error:', err.message);
        }
        process.exit(1);
      });

      httpServer.listen(env.PORT, () => {
        console.log(`Server listening on port ${env.PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err.message);
      process.exit(1);
    });
}

module.exports = app;
