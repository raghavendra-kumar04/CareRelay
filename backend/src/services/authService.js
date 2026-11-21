const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const RefreshToken = require('../models/RefreshToken');

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/auth';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const AVATAR_COLORS = ['#5C8A6E', '#D4830A', '#2E7D52', '#6B7B7A', '#C0392B'];

function pickAvatarColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id) }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });
}

function generateRawRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// Creates and stores a new refresh token for the user, returning the raw value.
async function issueRefreshToken(userId) {
  const rawToken = generateRawRefreshToken();
  await RefreshToken.create({
    tokenHash: hashToken(rawToken),
    userId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  return rawToken;
}

function refreshCookieBaseOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    path: REFRESH_COOKIE_PATH,
  };
}

function setRefreshCookie(res, rawToken) {
  res.cookie(REFRESH_COOKIE_NAME, rawToken, {
    ...refreshCookieBaseOptions(),
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieBaseOptions());
}

module.exports = {
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_MS,
  AVATAR_COLORS,
  pickAvatarColor,
  signAccessToken,
  hashToken,
  issueRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
};
