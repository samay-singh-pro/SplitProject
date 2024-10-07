const errorHandler = (err , req, res, next) => {
    let statusCode = res.statusCode ===200 ? 500 : res.statusCode;
    let message = err.message || 'Internal Server Error';

    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map(val => val.message).join(', ');
    }

    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404;
        message = `Resource not found with id: ${err.value}`;
    }

    if (err.code === 11000) {
        statusCode = 400;
        message = 'Duplicate field value entered';
    }

    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token, please log in again';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired, please log in again';
    }

    res.status(200).json({
        status: statusCode,
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack, 
    })
}

export default errorHandler;