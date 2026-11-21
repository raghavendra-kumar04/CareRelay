class AppError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    const body = { code: err.code, message: err.message };
    if (err.details) {
      body.details = err.details;
    }
    return res.status(err.statusCode).json({ success: false, error: body });
  }

  // MongoDB duplicate key error (unique index violation)
  if (err && err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: { code: 'EMAIL_ALREADY_EXISTS', message: 'Email is already registered' },
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}

module.exports = { AppError, asyncHandler, notFound, errorHandler };
