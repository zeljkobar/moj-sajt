const express = require("express");
const router = express.Router();
const firmeController = require("../controllers/firmeController");
const { authMiddleware } = require("../middleware/auth");

// GET rute
router.get("/", authMiddleware, firmeController.getAllFirme);
router.get("/aktivne", authMiddleware, firmeController.getAktivneFirme);
router.get("/nula", authMiddleware, firmeController.getFirme0);
router.get("/:pib", authMiddleware, firmeController.getFirmaByPib);

// POST rute
router.post("/", authMiddleware, firmeController.createAktivnaFirma);
router.post("/nula", authMiddleware, firmeController.createFirma0);

// PUT rute
router.put("/:pib", authMiddleware, firmeController.updateFirma);

// DELETE rute
router.delete("/:pib", authMiddleware, firmeController.deleteFirma);

module.exports = router;
