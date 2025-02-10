const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error(`Error occurred: ${err.message}\nStack trace: ${err.stack}`);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

module.exports = errorHandler; 