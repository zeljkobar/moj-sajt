const express = require('express');
const router = express.Router();
const godisnjiomdoriController = require('../controllers/godisnjiomdoriController');

// GET /api/godisnji-odmori/praznici - praznici (MORA biti prije dinamičkih ruta)
router.get('/praznici', godisnjiomdoriController.getPraznici);

// POST /api/godisnji-plan/sync - sinhronizacija planova
router.post('/plan/sync', godisnjiomdoriController.syncPlanovi);

// GET /api/godisnji-plan/:firma_id - planovi za firmu
router.get('/plan/:firma_id', godisnjiomdoriController.getPlanByFirma);

// POST /api/godisnji-odmori - novi zahtjev za odmor
router.post('/', godisnjiomdoriController.createZahtjev);

// PUT /api/godisnji-odmori/:id/approve - odobri zahtjev
router.put('/:id/approve', godisnjiomdoriController.approveZahtjev);

// PUT /api/godisnji-odmori/:id/reject - odbaci zahtjev
router.put('/:id/reject', godisnjiomdoriController.rejectZahtjev);

// GET /api/godisnji-odmori/:firma_id - svi odmori za firmu (MORA biti zadnja dinamička ruta)
router.get('/:firma_id', godisnjiomdoriController.getOdmoriByFirma);

module.exports = router;
