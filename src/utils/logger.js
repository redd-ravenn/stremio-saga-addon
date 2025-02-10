const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const createLogger = () => {
    const logFormat = winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} ${level}: ${message}`;
        })
    );

    const transports = [
        new winston.transports.Console()
    ];

    if (process.env.LOG_ENABLED === 'true') {
        transports.push(
            new DailyRotateFile({
                filename: path.join(__dirname, '../../log/application-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                maxSize: '20m',
                maxFiles: process.env.LOG_INTERVAL_DELETION || '3d'
            })
        );
    }

    return winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: logFormat,
        transports
    });
};

const logger = createLogger();

module.exports = {
    logger
}; 