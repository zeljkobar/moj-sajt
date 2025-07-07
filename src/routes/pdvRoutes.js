const express = require("express");
const router = express.Router();
const pdvController = require("../controllers/pdvController");
const { authMiddleware } = require("../middleware/auth");

// GET /api/pdv - dohvati PDV pregled za trenutni mjesec
router.get("/", authMiddleware, pdvController.getPDVOverview);

// POST /api/pdv/:firmaId/submit - označi kao predano
router.post("/:firmaId/submit", authMiddleware, pdvController.markAsSubmitted);

// POST /api/pdv/:firmaId/unsubmit - ukloni oznaku predano
router.post(
  "/:firmaId/unsubmit",
  authMiddleware,
  pdvController.unmarkSubmitted
);

// POST /api/pdv/novi-mjesec - kreiraj novi mjesec
router.post("/novi-mjesec", authMiddleware, pdvController.createNewMonth);

// GET /api/pdv/istorija - dohvati istoriju prijava
router.get("/istorija", authMiddleware, pdvController.getPDVHistory);

// GET /api/pdv/statistike - dohvati statistike
router.get("/statistike", authMiddleware, pdvController.getPDVStatistics);

module.exports = router;
