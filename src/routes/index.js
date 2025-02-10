const express = require('express');
const path = require('path');
const { logger } = require('../utils/logger');
const manifestRoutes = require('./manifest');
const streamRoutes = require('./stream');
const { requestLogger, errorHandler } = require('../middleware');

const router = express.Router();

router.use(requestLogger);

router.use('/public', express.static(path.join(__dirname, '../../public')));

router.get("/", (req, res) => {
    logger.info('Route /: Redirecting to /configure');
    res.redirect("/configure");
});

router.get("/:configParameters?/configure", (req, res) => {
    logger.info('Route /:configParameters?/configure: Sending configure.html page');
    res.sendFile(path.join(__dirname, '../../public/configure.html'));
});

router.get("/:configParameters?/manifest.json", (req, res) => {
    logger.info('Route /manifest.json: Sending manifest');
    res.json(require('../config/manifest'));
});

router.get("/:configParameters?/stream/:type/:id.json", streamRoutes);

router.use(errorHandler);

module.exports = router; 