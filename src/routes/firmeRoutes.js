const express = require("express");
const router = express.Router();
const firmeController = require("../controllers/firmeController");
const { authMiddleware } = require("../middleware/auth");

// GET rute
router.get("/", authMiddleware, firmeController.getAllFirme);
router.get("/aktivne", authMiddleware, firmeController.getAktivneFirme);
router.get("/nula", authMiddleware, firmeController.getFirmeNaNuli);
router.get("/id/:id", firmeController.getFirmaById); // Dodano bez auth za testiranje
router.get("/:pib", authMiddleware, firmeController.getFirmaByPib);

// POST rute
router.post("/", authMiddleware, firmeController.addFirma);

// PUT rute
router.put("/:pib", authMiddleware, firmeController.updateFirma);

// DELETE rute
router.delete("/:pib", authMiddleware, firmeController.deleteFirma);

// Fallback za hosting provajdere koji ne podržavaju DELETE
router.post("/:pib/delete", authMiddleware, firmeController.deleteFirma);

// Fallback za hosting provajdere koji ne podržavaju PUT
router.post("/:pib/edit", authMiddleware, firmeController.updateFirma);

module.exports = router;
