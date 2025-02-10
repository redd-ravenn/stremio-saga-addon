require('dotenv').config();

const { logger } = require('../utils/logger');

const config = {
    app: {
        port: process.env.PORT || 7000,
        env: process.env.NODE_ENV || 'development',
    },
    tmdb: {
        apiKey: process.env.TMDB_API_KEY,
        defaultLanguage: 'en',
        rateLimit: 45,
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        reconnectInterval: 5000,
        cacheDuration: 6 * 30 * 24 * 60 * 60 // 6 mois en secondes
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        enabled: process.env.LOG_ENABLED !== 'false',
        retention: process.env.LOG_INTERVAL_DELETION || '3d'
    }
};

logger.info('Configuration loaded');

module.exports = config; 