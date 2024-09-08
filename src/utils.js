const log = require('./logger');

const formatVoteCount = (voteCount) => {
    if (voteCount >= 1000000) {
        return `${Math.round(voteCount / 1000000)}M`;
    } else if (voteCount >= 1000) {
        return `${Math.round(voteCount / 1000)}k`;
    }
    return voteCount.toString();
};

const ratingToEmoji = (rating) => {
    if (rating >= 9) return '🏆';
    if (rating >= 8) return '🔥';
    if (rating >= 6) return '⭐';
    if (rating >= 5) return '😐';
    return '🥱';
};

const displayEnvironmentConfig = () => {
    const envConfig = {
        PORT: process.env.PORT || 'Not defined',
        RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED || 'Not defined',
        LOG_ENABLED: process.env.LOG_ENABLED || 'Not defined',
        LOG_LEVEL: process.env.LOG_LEVEL || 'Not defined',
        LOG_INTERVAL_DELETION: process.env.LOG_INTERVAL_DELETION || 'Not defined',
        TMDB_API_KEY: process.env.TMDB_API_KEY ? 'Defined' : 'Not defined',
        NODE_ENV: process.env.NODE_ENV || 'Not defined'
    };

    log.info(`Environment Configuration: ${JSON.stringify(envConfig, null, 2)}`);
};

module.exports = {
    formatVoteCount,
    ratingToEmoji,
    displayEnvironmentConfig
};
