const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const Membership = require('../models/Membership');
const socketService = require('../services/socketService');

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
  });

  // Handshake authentication: mirrors requireAuth (src/middleware/auth.js).
  io.use(async (socket, next) => {
    const raw = socket.handshake.auth?.token;
    if (typeof raw !== 'string' || !raw.trim()) {
      return next(new Error('TOKEN_MISSING'));
    }

    let payload;
    try {
      payload = jwt.verify(raw.trim(), env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return next(new Error('TOKEN_EXPIRED'));
      }
      return next(new Error('TOKEN_INVALID'));
    }

    if (!payload || !mongoose.isValidObjectId(payload.sub)) {
      return next(new Error('TOKEN_INVALID'));
    }

    try {
      const user = await User.findById(payload.sub).select('_id').lean();
      if (!user) {
        return next(new Error('TOKEN_INVALID'));
      }
    } catch (err) {
      return next(err);
    }

    socket.data.userId = String(payload.sub);
    return next();
  });

  io.on('connection', async (socket) => {
    try {
      // Rooms are derived only from active memberships in the DB.
      // Clients never supply room names.
      const memberships = await Membership.find({
        userId: socket.data.userId,
        deletedAt: null,
      })
        .select('familyId')
        .lean();
      const rooms = memberships.map((m) => `family:${String(m.familyId)}`);
      socket.join(rooms);
    } catch (err) {
      socket.disconnect(true);
    }
  });

  socketService.setIO(io);

  if (env.NODE_ENV !== 'test') {
    console.log('Socket.IO initialised');
  }

  return io;
}

module.exports = { initSocket };
