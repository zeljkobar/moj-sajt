const express = require('express');
const router = express.Router();
const radniciController = require('../controllers/radniciController');
const { authMiddleware } = require('../middleware/auth');
const {
  validateRadnik,
  validateRadnikEdit,
  validateId,
  validateFirmaId,
} = require('../middleware/validation');
const rateLimiter = require('../middleware/rateLimiting');

// GET rute za radnike
router.get(
  '/',
  authMiddleware,
  rateLimiter.api,
  radniciController.getAllRadnici
);
router.get(
  '/search',
  authMiddleware,
  rateLimiter.api,
  radniciController.searchRadnici
);
router.get(
  '/firma/:firmaId',
  authMiddleware,
  rateLimiter.api,
  validateFirmaId,
  radniciController.getRadniciByFirma
);
router.get(
  '/id/:id',
  authMiddleware,
  validateId,
  radniciController.getRadnikById
);
router.post(
  '/',
  authMiddleware,
  rateLimiter.api,
  validateRadnik,
  radniciController.addRadnik
);
router.put(
  '/:id',
  authMiddleware,
  rateLimiter.api,
  validateId,
  validateRadnikEdit,
  radniciController.updateRadnik
);
router.delete(
  '/:id',
  authMiddleware,
  rateLimiter.api,
  validateId,
  radniciController.deleteRadnik
);

// Endpoint za produžavanje ugovora
router.post(
  '/produzi-ugovor',
  authMiddleware,
  rateLimiter.api,
  radniciController.produzUgovor
);

module.exports = router;
