const manifest = {
    id: 'community.collectionaddon',
    version: '1.0.0',
    logo: "https://i.imgur.com/jEPaX6R.png",
    name: 'Collection Content',
    description: 'Lists content within a TMDB collection, sorted by release date with the ability to navigate between items directly on Stremio. It also includes the option to retrieve ratings from TMDB, the number of votes, and to display the tagline of the content.',
    types: ['movie'],
    idPrefixes: ['tt'],
    resources: ['stream'],
    catalogs: [],
    behaviorHints: {
        configurable: true,
        configurationRequired: false,
    },
    config: [
        {
            key: 'tmdbApiKey',
            type: 'text',
            title: 'TMDB API Key (<a href="https://www.themoviedb.org/settings/api" target="_blank">Get it here</a>)',
            required: true,
        },
        {
            key: 'language',
            type: 'text',
            title: 'Language (<a href="https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes" target="_blank">ISO 639-1 codes</a>)',
            required: true,
        },
        {
            key: "showRating",
            type: "checkbox",
            title: "Show Rating",
        },
        {
            key: "showTagline",
            type: "checkbox",
            title: "Show Tagline",
        }
    ]
};

module.exports = manifest;
