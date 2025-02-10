const express = require('express');
const path = require('path');
const manifest = require('../config/manifest');

const router = express.Router();

router.get("/", (req, res) => {
    res.redirect("/configure");
});

router.get("/configure", (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/configure.html'));
});

router.get("/manifest.json", (req, res) => {
    res.json(manifest);
});

module.exports = router; 