const express = require('express');
const { performance } = require('perf_hooks');
const { logger } = require('../utils/logger');
const { TMDBService } = require('../services/tmdb');
const { formatVoteCount, ratingToEmoji } = require('../utils/formatting');

const router = express.Router();

const prepareStreams = async (content, showRating, showTagline, userAgent) => {
    const today = new Date();

    return content.map(item => {
        const rating = showRating ? (item.vote_average?.toFixed(1) || 'N/A') : '';
        const ratingValue = parseFloat(rating);
        const emoji = ratingValue > 0 ? ratingToEmoji(ratingValue) : '';
        const ratingText = ratingValue > 0 ? `${rating} ${emoji}` : '';
        const voteCountText = showRating && item.vote_count ? ` (${formatVoteCount(item.vote_count)} 👥)` : '';

        const releaseDate = new Date(item.release_date);
        const isUpcoming = releaseDate > today;
        const newLine = '\n';

        const externalUrl = item.release_date
            ? (isUpcoming
                ? `https://www.themoviedb.org/movie/${item.id}`
                : userAgent.includes('Stremio')
                    ? `stremio:///detail/movie/${item.imdb_id || ''}`
                    : `https://web.stremio.com/#/detail/movie/${item.imdb_id || ''}`)
            : `https://www.themoviedb.org/movie/${item.id}`;

        return {
            name: item.release_date ? item.release_date.match(/^\d{4}/)?.[0] || 'TMDB' : 'TMDB',
            title: `${item.title}${ratingText ? `${newLine}${ratingText}` : ''}${showRating ? `${voteCountText}` : ''}${showTagline && item.tagline ? `${newLine}${item.tagline}` : ''}`,
            externalUrl
        };
    }).sort((a, b) => {
        const yearA = parseInt(a.name, 10);
        const yearB = parseInt(b.name, 10);
        if (isNaN(yearA) && isNaN(yearB)) return 0;
        if (isNaN(yearA)) return 1;
        if (isNaN(yearB)) return -1;
        return yearA - yearB;
    });
};

const streamHandler = async (req, res, next) => {
    const startTime = performance.now();
    const { id, configParameters } = req.params;
    let config = { ...req.query };
    const userAgent = req.headers['user-agent'] || '';

    if (configParameters) {
        try {
            const decodedConfig = JSON.parse(decodeURIComponent(configParameters));
            config = { ...config, ...decodedConfig };
        } catch (error) {
            logger.error(`Failed to decode configParameters: ${error.message}`, error);
            return res.status(400).json({ error: 'Invalid config parameters' });
        }
    }

    config = {
        ...config,
        tmdbApiKey: process.env.TMDB_API_KEY || config.tmdbApiKey?.trim(),
        language: config.language?.trim(),
        showRating: config.showRating === "on",
        showTagline: config.showTagline === "on"
    };

    if (!config.tmdbApiKey || !config.language) {
        logger.error('API Key and Language must be provided.');
        return res.json({ streams: [] });
    }

    try {
        const tmdbService = new TMDBService(config);
        const content = await tmdbService.getCollectionContent(id);
        
        if (!content) {
            return res.json({ streams: [] });
        }

        const streams = await prepareStreams(content, config.showRating, config.showTagline, userAgent);

        const endTime = performance.now();
        logger.info(`Processing time: ${(endTime - startTime).toFixed(2)} ms`);

        res.json({ streams });
    } catch (error) {
        next(error);
    }
};

module.exports = streamHandler; 