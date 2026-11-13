export function errorHandler(err, req, res, next) {
  console.error('[Error Handler]', err);

  // Zod validation error
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // MySQL specific error handling
  if (err.code) {
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        return res.status(409).json({
          success: false,
          error: 'Duplicate entry error: A record with this value already exists.',
          code: err.code,
          details: err.message
        });
      case 'ER_NO_REFERENCED_ROW_2':
        return res.status(400).json({
          success: false,
          error: 'Foreign key constraint failed: referenced entity does not exist.',
          code: err.code
        });
      case 'ECONNREFUSED':
        return res.status(503).json({
          success: false,
          error: 'Database connection failed. Ensure MySQL server is running.',
          code: err.code
        });
    }
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
}

