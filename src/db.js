const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const log = require('./logger');

const DB_PATH = path.resolve(__dirname, '../db/cache.db');
const DB_DIR = path.dirname(DB_PATH);

const ensureDatabaseDirectory = () => {
    if (!fs.existsSync(DB_DIR)) {
        log.info(`Directory ${DB_DIR} does not exist. Creating...`);
        try {
            fs.mkdirSync(DB_DIR, { recursive: true });
            log.info(`Directory ${DB_DIR} created successfully.`);
        } catch (err) {
            log.error(`Error creating directory ${DB_DIR}: ${err.message}`);
            throw err;
        }
    }
};

ensureDatabaseDirectory();

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        log.error('Error opening database:', err.message);
        throw err;
    }
    log.info('SQLite database connected.');
    db.run(`CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        data TEXT,
        timestamp INTEGER
    )`, (err) => {
        if (err) {
            log.error('Error creating cache table:', err.message);
            throw err;
        }
        displayDatabaseStats();
    });
});

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const displayDatabaseStats = async () => {
    try {
        const totalDataSizeResult = await getAsync('SELECT SUM(LENGTH(data)) AS totalSize FROM cache');
        const totalDataSizeBytes = totalDataSizeResult ? totalDataSizeResult.totalSize || 0 : 0;
        const totalDataSizeFormatted = formatBytes(totalDataSizeBytes);

        const collectionCountResult = await getAsync(`
            SELECT COUNT(*) AS count 
            FROM cache 
            WHERE key LIKE "%collection%" AND (key LIKE "%{%" AND key LIKE "%}%")
        `);
        const collectionCountValue = collectionCountResult ? collectionCountResult.count : 0;

        const movieCountResult = await getAsync('SELECT COUNT(*) AS count FROM cache WHERE key LIKE "%movie%"');
        const movieCountValue = movieCountResult ? movieCountResult.count : 0;

        const seriesCountResult = await getAsync('SELECT COUNT(*) AS count FROM cache WHERE key LIKE "%series%"');
        const seriesCountValue = seriesCountResult ? seriesCountResult.count : 0;

        log.info(`Database Statistics: Collections: ${collectionCountValue}, Movies: ${movieCountValue}, Series: ${seriesCountValue}, Total data size: ${totalDataSizeFormatted}`);
    } catch (error) {
        log.error('Error retrieving database statistics:', error.message);
    }
};

const runAsync = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) {
                log.error('Error executing query:', err.message);
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
};

const getAsync = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) {
                log.error('Error retrieving row:', err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

const allAsync = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                log.error('Error retrieving rows:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

module.exports = {
    db,
    runAsync,
    getAsync,
    allAsync,
    close: () => new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                log.error('Error closing database:', err.message);
                reject(err);
            } else {
                resolve();
            }
        });
    })
};
