const express = require('express');
const router = express.Router();
const poslovniImenikController = require('../controllers/poslovniImenikController');
const { authMiddleware } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiting');

// =====================
// JAVNE RUTE (bez login-a)
// =====================

// GET /api/imenik - lista odobrenih firmi
router.get('/', rateLimiter.api, poslovniImenikController.getPublicList);

// GET /api/imenik/profil/:slug - javni profil firme
router.get('/profil/:slug', rateLimiter.api, poslovniImenikController.getPublicProfile);

// =====================
// AUTENTIFIKOVANE RUTE (korisnik)
// =====================

// GET /api/imenik/moj-unos - status/podaci vlastitog unosa
router.get('/moj-unos', authMiddleware, rateLimiter.api, poslovniImenikController.getMojUnos);

// POST /api/imenik - podnesi zahtjev za upis
router.post('/', authMiddleware, rateLimiter.api, poslovniImenikController.submitUnos);

// PUT /api/imenik/moj-unos - ažuriraj vlastiti unos
router.put('/moj-unos', authMiddleware, rateLimiter.api, poslovniImenikController.updateMojUnos);

module.exports = router;
