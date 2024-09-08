const express = require('express');
const path = require('path');
const { performance } = require('perf_hooks');
const log = require('./logger');
const { getContentFromImdbId, getContentDetails, getImdbId, checkAndUpdateCache } = require('./tmdb');
const { formatVoteCount, ratingToEmoji } = require('./utils');
const { requestLogger, errorHandler } = require('./middleware');

const router = express.Router();

const getContentDetailsById = async (item, apiKey, language) => {
    try {
        log.debug(`Fetching details for item ID: ${item.id}`);
        const details = await getContentDetails(item.id, item.media_type, apiKey, language);
        return {
            ...item,
            title: details.title || details.name,
            tagline: details.tagline || '',
            rating: details.vote_average,
            vote_count: details.vote_count,
            released: details.release_date || details.first_air_date
        };
    } catch (error) {
        log.error(`Error fetching details for item ID: ${item.id}`, error);
        throw new Error('Failed to get content details');
    }
};

const prepareStreams = async (content, apiKey, language, showRating, showTagline, userAgent) => {
    const today = new Date();

    if (!Array.isArray(content)) {
        throw new TypeError('Expected content to be an array');
    }

    const contentDetails = await Promise.all(
        content.map(item => getContentDetailsById(item, apiKey, language))
    );

    const imdbIdResults = await Promise.all(contentDetails.map(async item => {
        return (new Date(item.released) <= today) ? getImdbId(item.id, item.media_type, apiKey, language) : null;
    }));

    const preparedContent = await Promise.all(contentDetails.map(async (item, index) => {
        const rating = showRating ? (item.rating?.toFixed(1) || 'N/A') : '';
        const ratingValue = parseFloat(rating);
        const emoji = ratingValue > 0 ? ratingToEmoji(ratingValue) : '';
        const ratingText = ratingValue > 0 ? `${rating} ${emoji}` : '';
        const voteCountText = showRating && item.vote_count ? ` (${formatVoteCount(item.vote_count)} 👥)` : '';

        const releaseDate = new Date(item.released);
        const isUpcoming = releaseDate > today;

        const newLine = '\n';

        const externalUrl = item.released
            ? (isUpcoming
                ? `https://www.themoviedb.org/${item.media_type}/${item.id}`
                : userAgent.includes('Stremio')
                    ? `stremio:///detail/${item.media_type}/${imdbIdResults[index] || ''}`
                    : `https://web.stremio.com/#/detail/${item.media_type}/${imdbIdResults[index] || ''}`)
            : `https://www.themoviedb.org/${item.media_type}/${item.id}`;

        return {
            name: item.released ? item.released.match(/^\d{4}/)?.[0] || 'TMDB' : 'TMDB',
            title: `${item.title}${ratingText ? `${newLine}${ratingText}` : ''}${showRating ? `${voteCountText}` : ''}${showTagline && item.tagline ? `${newLine}${item.tagline}` : ''}`,
            externalUrl
        };
    }));

    const sortedContent = preparedContent.sort((a, b) => {
        const yearA = parseInt(a.name, 10);
        const yearB = parseInt(b.name, 10);

        if (isNaN(yearA) && isNaN(yearB)) return 0;
        if (isNaN(yearA)) return 1;
        if (isNaN(yearB)) return -1;

        return yearA - yearB;
    });

    return sortedContent;
};

router.use(requestLogger);

router.get("/", (req, res) => {
    log.info('Route /: Redirecting to /configure');
    res.redirect("/configure");
});

router.get("/:configParameters?/configure", (req, res) => {
    log.info('Route /:configParameters?/configure: Sending configure.html page');
    res.sendFile(path.join(__dirname, '../public/configure.html'));
});

router.get("/:configParameters?/manifest.json", (req, res) => {
    log.info('Route /manifest.json: Sending manifest');
    res.json(require('./config'));
});

router.get("/:configParameters?/stream/:type/:id.json", async (req, res, next) => {
    const startTime = performance.now();
    const { id, configParameters } = req.params;

    let config = { ...req.query };
    const userAgent = req.headers['user-agent'] || '';

    if (configParameters) {
        try {
            const decodedConfig = JSON.parse(decodeURIComponent(configParameters));
            config = { ...config, ...decodedConfig };
        } catch (error) {
            log.error(`Failed to decode configParameters: ${error.message}`, error);
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
        log.error('API Key and Language must be provided.');
        return res.json({ streams: [] });
    }

    try {
        const content = await getContentFromImdbId(id, config.tmdbApiKey, config.language);
        if (!content) {
            log.warn(`Content not found for IMDb ID: ${id}`);
            return res.json({ streams: [] });
        }

        const contentDetails = await getContentDetails(content.tmdbId, content.type, config.tmdbApiKey, config.language);
        if (!contentDetails?.belongs_to_collection) {
            log.info('Content does not belong to any collection.');
            return res.json({ streams: [] });
        }

        const collectionId = contentDetails.belongs_to_collection.id;
        const { collectionContent } = await checkAndUpdateCache(collectionId, config.tmdbApiKey, config.language);

        if (!Array.isArray(collectionContent)) {
            throw new TypeError('Expected collectionContent to be an array');
        }

        const streams = await prepareStreams(collectionContent, config.tmdbApiKey, config.language, config.showRating, config.showTagline, userAgent);
        log.info(`Prepared collection: ${JSON.stringify(streams, null, 2)}`);

        const endTime = performance.now();
        const duration = endTime - startTime;
        log.info(`Processing time: ${duration.toFixed(2)} ms`);

        res.json({ streams });
    } catch (error) {
        log.error(`Error processing request: ${error.message}`, error);
        next(error);
    }
});

router.use(errorHandler);

module.exports = router;
