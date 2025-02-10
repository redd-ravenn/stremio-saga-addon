const redisClient = require('./redis');
const { logger } = require('../../utils/logger');

class CacheService {
    constructor(client) {
        this.client = client;
    }

    async get(key) {
        try {
            const data = await this.client.get(key);
            if (data) {
                logger.debug(`Cache hit for key: ${key}`);
                return data;
            }
            logger.debug(`Cache miss for key: ${key}`);
            return null;
        } catch (error) {
            throw error;
        }
    }

    async set(key, data) {
        try {
            await this.client.set(key, data);
            logger.debug(`Cache set for key: ${key}`);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = {
    cacheService: new CacheService(redisClient),
    redisClient
}; 