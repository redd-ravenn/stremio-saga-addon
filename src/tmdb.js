require('dotenv').config();
const axios = require('axios');
const log = require('./logger');
const { getAsync, runAsync } = require('./db');

const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED !== 'false';
const MAX_REQUESTS_PER_SECOND = 45;
const REQUEST_INTERVAL = 1000 / MAX_REQUESTS_PER_SECOND;

let lastRequestTime = 0;

const CACHE_DURATION = 6 * 30 * 24 * 60 * 60 * 1000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const handleAPIError = async (endpoint, params, retries, apiKey, language, error) => {
    if (error.response) {
        const statusCode = error.response.status;

        if (statusCode === 401) {
            log.error(`Unauthorized access for ${endpoint}.`);
            throw new Error('Invalid TMDB API key. Please check your API key configuration.');
        }

        if (statusCode === 429 && retries > 0) {
            log.warn(`Rate limit exceeded for ${endpoint}. Retrying...`);
            await sleep(60000);
            return fetchFromTMDB(endpoint, params, retries - 1, apiKey, language);
        }
    }

    log.error(`Error fetching from TMDB [${endpoint}]: ${error.message}`);
    if (retries > 0) {
        await sleep(1000);
        return fetchFromTMDB(endpoint, params, retries - 1, apiKey, language);
    }
    throw error;
};

const getCache = async (cacheKey) => {
    const row = await getAsync('SELECT data, timestamp FROM cache WHERE key = ?', [cacheKey]);
    if (row) {
        const cacheAge = Date.now() - row.timestamp;
        if (cacheAge < CACHE_DURATION) {
            log.debug(`Cache hit for key: ${cacheKey}`);
            return JSON.parse(row.data);
        }
        log.debug(`Cache expired for key: ${cacheKey}`);
    } else {
        log.debug(`Cache miss for key: ${cacheKey}`);
    }
    return null;
};

const setCache = async (cacheKey, data) => {
    await runAsync('REPLACE INTO cache (key, data, timestamp) VALUES (?, ?, ?)', [cacheKey, JSON.stringify(data), Date.now()]);
    log.debug(`Fetched and cached data for key: ${cacheKey}`);
};

const buildParams = (apiKey, language, params) => ({
    api_key: apiKey,
    language,
    ...params
});

const fetchFromTMDB = async (endpoint, params = {}, retries = 3, apiKey, language, forceRefresh = false) => {
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    const url = `https://api.themoviedb.org/3/${endpoint}`;

    try {
        if (!forceRefresh) {
            const cachedData = await getCache(cacheKey);
            if (cachedData) return cachedData;
        }

        const now = Date.now();
        const elapsedTime = now - lastRequestTime;
        if (elapsedTime < REQUEST_INTERVAL) {
            await sleep(REQUEST_INTERVAL - elapsedTime);
        }
        lastRequestTime = Date.now();

        const { data } = await axios.get(url, { params: buildParams(apiKey, language, params), timeout: 5000 });
        await setCache(cacheKey, data);

        return data;

    } catch (error) {
        return handleAPIError(endpoint, params, retries, apiKey, language, error);
    }
};

const checkAndUpdateCache = async (collectionId, apiKey, language) => {
    const cacheKey = `collection:${collectionId}`;

    try {
        const cachedDataRow = await getAsync('SELECT data, timestamp FROM cache WHERE key = ?', [cacheKey]);
        if (cachedDataRow) {
            log.debug(`Cached data row: ${JSON.stringify(cachedDataRow)}`);
        } else {
            log.debug(`No cached data found for key: ${cacheKey}`);
        }

        const currentCollection = await fetchFromTMDB(`collection/${collectionId}`, {}, 3, apiKey, language, true);
        log.debug(`Current collection data: ${JSON.stringify(currentCollection)}`);

        const currentParts = (currentCollection?.parts || []).map(item => ({
            id: item.id,
            media_type: item.media_type
        }));
        log.debug(`Current collection parts: ${JSON.stringify(currentParts)}`);

        if (cachedDataRow) {
            const cachedData = JSON.parse(cachedDataRow.data);
            const cachedParts = (cachedData.collectionContent || []).map(item => ({
                id: item.id,
                media_type: item.media_type
            }));
            log.debug(`Cached collection content: ${JSON.stringify(cachedData.collectionContent)}`);
            log.debug(`Cached parts: ${JSON.stringify(cachedParts)}`);

            if (JSON.stringify(currentParts) === JSON.stringify(cachedParts)) {
                log.info('Cache is valid. No update needed.');
                return cachedData;
            }
            log.info('Cache outdated. Updating...');
        } else {
            log.info('Cache miss. Fetching new data...');
        }

        const updatedData = {
            title: currentCollection.name,
            collectionContent: currentParts
        };
        log.debug(`Updating cache with new data: ${JSON.stringify(updatedData)}`);

        await runAsync('REPLACE INTO cache (key, data, timestamp) VALUES (?, ?, ?)', [cacheKey, JSON.stringify(updatedData), Date.now()]);

        log.debug(`Cache updated for key: ${cacheKey}`);
        return updatedData;

    } catch (error) {
        log.error(`Error checking or updating cache: ${error.message}`);
        throw error;
    }
};

const getContentFromImdbId = async (imdbId, apiKey, language) => {
    const cleanedImdbId = imdbId.split(':')[0];
    log.info(`Checking content from IMDb ID: ${cleanedImdbId}`);
    const data = await fetchFromTMDB(`find/${cleanedImdbId}`, { external_source: 'imdb_id' }, 3, apiKey, language);
    const content = data.movie_results?.[0] || data.tv_results?.[0];
    return content ? {
        tmdbId: content.id,
        title: content.title || content.name,
        type: data.movie_results?.length ? 'movie' : 'tv'
    } : null;
};

const getContentDetails = async (tmdbId, type, apiKey, language) => {
    log.debug(`Checking content details for TMDB ID: ${tmdbId}`);
    return await fetchFromTMDB(`${type}/${tmdbId}`, {}, 3, apiKey, language);
};

const getImdbId = async (tmdbId, type, apiKey, language) => {
    log.debug(`Checking IMDb ID for TMDB ID: ${tmdbId}`);
    const data = await fetchFromTMDB(`${type}/${tmdbId}`, {}, 3, apiKey, language);
    return data?.imdb_id || null;
};

module.exports = {
    getContentFromImdbId,
    getContentDetails,
    getImdbId,
    checkAndUpdateCache
};
