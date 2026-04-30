/**
 * Global error handler middleware
 * Must be registered LAST in the middleware chain (4 args)
 */
const errorHandler = (err, req, res, next) => {
    console.error('Unhandled Error:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';

    res.status(statusCode).json({
        status: 'error',
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
