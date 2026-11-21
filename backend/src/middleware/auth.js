const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const { AppError, asyncHandler } = require('./errorHandler');

const BEARER_PREFIX = 'Bearer ';

const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith(BEARER_PREFIX)) {
    throw new AppError(401, 'TOKEN_MISSING', 'Access token is missing');
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  if (!token) {
    throw new AppError(401, 'TOKEN_MISSING', 'Access token is missing');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Access token has expired');
    }
    throw new AppError(401, 'TOKEN_INVALID', 'Access token is invalid');
  }

  if (!payload || !mongoose.isValidObjectId(payload.sub)) {
    throw new AppError(401, 'TOKEN_INVALID', 'Access token is invalid');
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new AppError(401, 'TOKEN_INVALID', 'Access token is invalid');
  }

  req.user = user;
  return next();
});

module.exports = requireAuth;
