const { logger } = require('../utils/logger');

const requestLogger = (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const origin = req.get('origin') || '';
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

    logger.info('--- Request received ---');
    logger.debug(`Full URL: ${fullUrl}`);
    logger.debug(`Method: ${req.method}`);
    logger.debug(`Query parameters: ${JSON.stringify(req.query, null, 2)}`);
    logger.debug(`Request body: ${JSON.stringify(req.body, null, 2)}`);
    logger.debug(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
    logger.debug(`User-Agent: ${userAgent}`);
    logger.debug(`Origin: ${origin}`);

    next();
};

module.exports = requestLogger; 