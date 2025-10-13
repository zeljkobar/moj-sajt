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
  getAllOglasiForAdmin,
  adminDeleteOglas,
  adminToggleFeatured,
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
router.get(
  '/admin/all',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  getAllOglasiForAdmin
); // GET /api/oglasi/admin/all
router.delete(
  '/admin/:id',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  adminDeleteOglas
); // DELETE /api/oglasi/admin/:id
router.patch(
  '/admin/:id/featured',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  adminToggleFeatured
); // PATCH /api/oglasi/admin/:id/featured

module.exports = router;
