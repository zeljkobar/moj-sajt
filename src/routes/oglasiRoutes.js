const express = require('express');
const router = express.Router();
const {
  getOglasi,
  getOglasById,
  createOglas,
  getFirmaOglasi,
  updateOglas,
  deleteOglas,
  getOglasiStats,
} = require('../controllers/oglasiController');
const { authMiddleware } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/roleAuth');
const { subscriptionMiddleware } = require('../middleware/subscription');

// Javne rute (bez autentifikacije)
router.get('/', getOglasi); // GET /api/oglasi
router.get('/:id', getOglasById); // GET /api/oglasi/:id

// Rute za firme (zahtevaju autentifikaciju)
router.get(
  '/firma/moji',
  authMiddleware,
  requireRole([ROLES.FIRMA]),
  getFirmaOglasi
); // GET /api/oglasi/firma/moji
router.post(
  '/',
  authMiddleware,
  requireRole([ROLES.FIRMA]),
  subscriptionMiddleware,
  createOglas
); // POST /api/oglasi
router.put('/:id', authMiddleware, requireRole([ROLES.FIRMA]), updateOglas); // PUT /api/oglasi/:id
router.delete('/:id', authMiddleware, requireRole([ROLES.FIRMA]), deleteOglas); // DELETE /api/oglasi/:id

// Admin rute
router.get(
  '/admin/stats',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  getOglasiStats
); // GET /api/oglasi/admin/stats

module.exports = router;
