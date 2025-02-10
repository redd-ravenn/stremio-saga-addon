const TMDBClient = require('./client');
const { cacheService } = require('../cache');
const { logger } = require('../../utils/logger');

class TMDBService {
    constructor(config) {
        this.client = new TMDBClient({
            apiKey: config.tmdbApiKey,
            language: config.language
        });
    }

    async getCollectionContent(id) {
        try {
            const content = await this.getContentFromImdbId(id);
            if (!content) {
                logger.warn(`Content not found for IMDb ID: ${id}`);
                return null;
            }

            const contentDetails = await this.getContentDetails(content.tmdbId, content.type);
            if (!contentDetails?.belongs_to_collection) {
                logger.info('Content does not belong to any collection.');
                return null;
            }

            const collectionId = contentDetails.belongs_to_collection.id;
            return this.getCollectionDetails(collectionId);
        } catch (error) {
            logger.error('Error fetching collection content:', error);
            throw error;
        }
    }

    async getContentFromImdbId(imdbId) {
        const cleanedImdbId = imdbId.split(':')[0];
        logger.info(`Checking content from IMDb ID: ${cleanedImdbId}`);
        const data = await this.client.request(`find/${cleanedImdbId}`, { external_source: 'imdb_id' });
        const content = data.movie_results?.[0] || data.tv_results?.[0];
        return content ? {
            tmdbId: content.id,
            title: content.title || content.name,
            type: data.movie_results?.length ? 'movie' : 'tv'
        } : null;
    }

    async getContentDetails(tmdbId, type) {
        logger.debug(`Checking content details for TMDB ID: ${tmdbId}`);
        return this.client.request(`${type}/${tmdbId}`);
    }

    async getCollectionDetails(collectionId) {
        const cacheKey = `collection:${collectionId}`;
        
        try {
            const cachedData = await cacheService.get(cacheKey);
            if (cachedData) return cachedData;

            const collection = await this.client.request(`collection/${collectionId}`);
            
            const detailRequests = collection.parts.map(movie => ({
                endpoint: `movie/${movie.id}`,
                params: {}
            }));

            const movieDetails = await this.client.batchRequest(detailRequests);

            const imdbRequests = movieDetails.map(movie => ({
                endpoint: `movie/${movie.id}/external_ids`,
                params: {}
            }));

            const imdbIds = await this.client.batchRequest(imdbRequests);

            const result = movieDetails.map((movie, index) => ({
                id: movie.id,
                title: movie.title,
                imdb_id: imdbIds[index].imdb_id,
                release_date: movie.release_date,
                vote_average: movie.vote_average,
                vote_count: movie.vote_count,
                tagline: movie.tagline
            }));

            await cacheService.set(cacheKey, result);
            return result;
        } catch (error) {
            logger.error('Error fetching collection details:', error);
            throw error;
        }
    }
}

module.exports = {
    TMDBService
}; 