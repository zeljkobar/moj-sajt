const express = require('express');
const router = express.Router();
const zajmodavciController = require('../controllers/zajmodavciController');
const { authMiddleware } = require('../middleware/auth');
const {
  validateZajmodavac,
  validateId,
  validateFirmaId,
} = require('../middleware/validation');

// Svi rute su zaštićeni autentifikacijom
router.use(authMiddleware);

// GET /api/firme/:firmaId/zajmodavci - Dohvati sve zajmodavce za firmu
router.get(
  '/:firmaId/zajmodavci',
  validateFirmaId,
  zajmodavciController.getZajmodavciByFirma
);

// POST /api/firme/:firmaId/zajmodavci - Kreiraj novog zajmodavca
router.post(
  '/:firmaId/zajmodavci',
  validateFirmaId,
  validateZajmodavac,
  zajmodavciController.createZajmodavac
);

module.exports = router;
