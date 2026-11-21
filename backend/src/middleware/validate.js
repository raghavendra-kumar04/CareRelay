const { AppError } = require('./errorHandler');

// Express 5 makes req.query a getter, so the parsed query is stored in
// req.validatedQuery instead of being assigned back to req.query.
function validate({ body, params, query } = {}) {
  return (req, res, next) => {
    const parts = [
      ['body', body],
      ['params', params],
      ['query', query],
    ];
    const parsed = {};
    const details = [];

    for (const [part, schema] of parts) {
      if (!schema) {
        continue;
      }
      const result = schema.safeParse(req[part]);
      if (result.success) {
        parsed[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({
            field: issue.path.join('.'),
            message: issue.message,
          });
        }
      }
    }

    if (details.length > 0) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'Validation failed', details));
    }

    if (parsed.body !== undefined) {
      req.body = parsed.body;
    }
    if (parsed.params !== undefined) {
      req.params = parsed.params;
    }
    if (parsed.query !== undefined) {
      req.validatedQuery = parsed.query;
    }

    return next();
  };
}

module.exports = validate;
