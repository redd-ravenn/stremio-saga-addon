const Redis = require('ioredis');
const { logger } = require('../../utils/logger');

class RedisClient {
    constructor() {
        this.isConnected = false;
        this.client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            retryStrategy: (times) => {
                if (!this.isConnected) {
                    return 5000;
                }
                return Math.min(times * 50, 2000);
            },
            maxRetriesPerRequest: null,
            enableReadyCheck: true,
            lazyConnect: true
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.on('error', (err) => {
            if (this.isConnected) {
                logger.error('Redis connection lost. Attempting to reconnect...', err);
                this.isConnected = false;
            }
        });

        this.client.on('connect', () => {
            if (!this.isConnected) {
                logger.info('Connected to Redis');
                this.isConnected = true;
            }
        });
    }

    async connect() {
        if (!this.isConnected) {
            await this.client.connect();
        }
    }

    async get(key) {
        if (!this.isConnected) {
            await this.connect();
        }
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }

    async set(key, value, ttl = 6 * 30 * 24 * 60 * 60) { // 6 mois par défaut
        if (!this.isConnected) {
            await this.connect();
        }
        await this.client.set(key, JSON.stringify(value), 'EX', ttl);
    }

    async quit() {
        if (this.isConnected) {
            await this.client.quit();
            this.isConnected = false;
        }
    }
}

const redisClient = new RedisClient();
redisClient.connect().catch(err => {
    logger.error('Failed to connect to Redis:', err);
});

module.exports = redisClient; 