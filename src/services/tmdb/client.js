const axios = require('axios');
const { logger } = require('../../utils/logger');

class RateLimiter {
    constructor(requestsPerSecond, maxConcurrent) {
        this.requestsPerSecond = requestsPerSecond;
        this.maxConcurrent = maxConcurrent;
        this.queue = [];
        this.running = 0;
        this.requests = [];
        this.lastCheck = Date.now();
    }

    async add(fn) {
        const now = Date.now();
        const oneSecondAgo = now - 1000;
        this.requests = this.requests.filter(time => time > oneSecondAgo);
        
        while (
            this.running >= this.maxConcurrent || 
            this.requests.length >= this.requestsPerSecond
        ) {
            await new Promise(resolve => {
                this.queue.push(resolve);
                if (this.requests.length >= this.requestsPerSecond) {
                    setTimeout(resolve, 1000 - (now - this.requests[0]));
                }
            });
        }

        this.running++;
        this.requests.push(now);

        try {
            return await fn();
        } finally {
            this.running--;
            if (this.queue.length > 0) {
                const next = this.queue.shift();
                next();
            }
        }
    }
}

class TMDBClient {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.language = config.language;
        this.baseURL = 'https://api.themoviedb.org/3';
        this.rateLimiter = new RateLimiter(45, 20); // 45 req/s, 20 connexions parallèles max
        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: 5000,
            params: {
                api_key: this.apiKey,
                language: this.language
            }
        });
    }

    async request(endpoint, params = {}, retries = 3) {
        return this.rateLimiter.add(async () => {
            try {
                const { data } = await this.axiosInstance.get(endpoint, { params });
                return data;
            } catch (error) {
                if (error.response?.status === 429 && retries > 0) {
                    logger.warn(`Rate limit exceeded for ${endpoint}. Retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return this.request(endpoint, params, retries - 1);
                }
                throw error;
            }
        });
    }

    async batchRequest(requests) {
        return Promise.all(
            requests.map(({ endpoint, params }) => 
                this.request(endpoint, params)
            )
        );
    }
}

module.exports = TMDBClient; 