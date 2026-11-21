const bcrypt = require('bcryptjs');
const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const {
  REFRESH_COOKIE_NAME,
  pickAvatarColor,
  signAccessToken,
  hashToken,
  issueRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
} = require('../services/authService');

const BCRYPT_ROUNDS = 12;

// Clears the refresh cookie and returns the 401 error to throw.
function rejectRefresh(res, code, message) {
  clearRefreshCookie(res);
  return new AppError(401, code, message);
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({
    name,
    email,
    passwordHash,
    avatarColor: pickAvatarColor(),
  });

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user._id);
  setRefreshCookie(res, refreshToken);

  return res.status(201).json({
    success: true,
    data: { user: user.toSafeObject(), accessToken },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  const passwordMatches = user
    ? await bcrypt.compare(password, user.passwordHash)
    : false;

  if (!user || !passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user._id);
  setRefreshCookie(res, refreshToken);

  return res.status(200).json({
    success: true,
    data: { user: user.toSafeObject(), accessToken },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const rawToken = req.cookies && req.cookies[REFRESH_COOKIE_NAME];
  if (!rawToken) {
    throw rejectRefresh(res, 'TOKEN_MISSING', 'Refresh token is missing');
  }

  // Atomically claim the token: only one request can revoke a given token.
  // The document is soft-revoked (revokedAt set), never deleted.
  const now = new Date();
  const stored = await RefreshToken.findOneAndUpdate(
    { tokenHash: hashToken(rawToken), revokedAt: null },
    { $set: { revokedAt: now } }
  );
  if (!stored) {
    throw rejectRefresh(res, 'TOKEN_INVALID', 'Refresh token is invalid');
  }

  if (stored.expiresAt <= now) {
    throw rejectRefresh(res, 'TOKEN_EXPIRED', 'Refresh token has expired');
  }

  const user = await User.findById(stored.userId);
  if (!user) {
    throw rejectRefresh(res, 'TOKEN_INVALID', 'Refresh token is invalid');
  }

  const accessToken = signAccessToken(user);
  const newRefreshToken = await issueRefreshToken(user._id);
  setRefreshCookie(res, newRefreshToken);

  return res.status(200).json({
    success: true,
    data: { accessToken },
  });
});

const logout = asyncHandler(async (req, res) => {
  const rawToken = req.cookies && req.cookies[REFRESH_COOKIE_NAME];
  if (rawToken) {
    await RefreshToken.updateOne(
      { tokenHash: hashToken(rawToken), userId: req.user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }

  clearRefreshCookie(res);
  return res.status(200).json({ success: true, data: null });
});

const getMe = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    data: { user: req.user.toSafeObject() },
  });
});

module.exports = { register, login, refresh, logout, getMe };
