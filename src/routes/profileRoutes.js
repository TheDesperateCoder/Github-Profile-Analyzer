const express = require('express');
const router = express.Router();
const controller = require('../controllers/profileController');

// Fetch from GitHub, analyze, and store/update insights for a username
router.post('/:username/analyze', controller.analyzeProfile);

// List all stored analyzed profiles (supports ?limit=&offset=&sortBy=&order=)
router.get('/', controller.listProfiles);

// Fetch one stored, already-analyzed profile by username
router.get('/:username', controller.getProfile);

// Remove a stored profile
router.delete('/:username', controller.removeProfile);

module.exports = router;
