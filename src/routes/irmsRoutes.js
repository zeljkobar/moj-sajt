const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiting');
const irmsApiClient = require('../services/irmsApiClient');

router.post('/search', authMiddleware, rateLimiter.api, async (req, res) => {
  try {
    const pib = String(req.body?.pib || '').trim();

    if (!pib) {
      return res.status(400).json({ message: 'PIB je obavezan' });
    }

    if (!/^\d{8}$/.test(pib)) {
      return res.status(400).json({ message: 'PIB mora imati 8 cifara' });
    }

    const result = await irmsApiClient.searchByPIB(pib);

    if (!result) {
      return res.status(404).json({
        message: 'Privredni subjekat sa ovim PIB-om nije pronađen u IRMS-u',
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Greška pri IRMS pretrazi:', error.message);
    res.status(502).json({
      message: 'IRMS servis trenutno nije dostupan',
    });
  }
});

module.exports = router;
