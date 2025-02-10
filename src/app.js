const express = require('express');
const cors = require('cors');
const path = require('path');
const { logger } = require('./utils/logger');
const routes = require('./routes');
const { redisClient } = require('./services/cache');

const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/', routes);

const gracefulShutdown = async () => {
    logger.info('Shutting down gracefully...');
    try {
        await redisClient.quit();
        logger.info('Redis connection closed.');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const startServer = () => {
    const port = process.env.PORT || 7000;
    const server = app.listen(port, () => {
        logger.info(`Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
    });

    server.on('error', (error) => {
        logger.error('Server error:', error);
        process.exit(1);
    });
};

module.exports = {
    startServer
}; 