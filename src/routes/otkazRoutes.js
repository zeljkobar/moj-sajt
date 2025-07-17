const express = require("express");
const router = express.Router();
const otkazController = require("../controllers/otkazController");
const { authMiddleware } = require("../middleware/auth");

// Sve rute zahtevaju autentifikaciju
router.use(authMiddleware);

// POST /api/otkazi - Kreiranje novog otkaza
router.post("/", otkazController.createOtkaz);

// GET /api/otkazi - Dobijanje svih otkaza
router.get("/", otkazController.getOtkazi);

// GET /api/otkazi/firma/:firmaId - Dobijanje otkaza po firmi
router.get("/firma/:firmaId", otkazController.getOtkazByFirma);

// GET /api/otkazi/radnik/:radnikId - Dobijanje otkaza po radniku
router.get("/radnik/:radnikId", otkazController.getOtkazByRadnik);

// GET /api/otkazi/:id - Dobijanje otkaza po ID-u
router.get("/:id", otkazController.getOtkazById);

// DELETE /api/otkazi/:id - Brisanje otkaza
router.delete("/:id", otkazController.deleteOtkaz);

module.exports = router;
