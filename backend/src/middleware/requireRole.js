const { AppError } = require('./errorHandler');

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.membership) {
      return next(new AppError(403, 'FAMILY_ACCESS_DENIED', 'Family membership required'));
    }

    if (!allowedRoles.includes(req.membership.role)) {
      return next(
        new AppError(
          403,
          'INSUFFICIENT_ROLE',
          'This action requires one of the roles: ' + allowedRoles.join(', ')
        )
      );
    }

    return next();
  };
}

module.exports = requireRole;
