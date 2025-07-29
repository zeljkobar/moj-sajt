const express = require("express");
const router = express.Router();
const pozajmnicaController = require("../controllers/pozajmnicaController");
const { authMiddleware } = require("../middleware/auth");
const {
  validatePozajmica,
  validateId,
  validateFirmaId,
} = require("../middleware/validation");
const rateLimiter = require("../middleware/rateLimiting");

// GET rute
router.get(
  "/",
  authMiddleware,
  rateLimiter.api,
  pozajmnicaController.getAllPozajmice
);
router.get(
  "/next-broj",
  authMiddleware,
  rateLimiter.api,
  pozajmnicaController.getNextBrojUgovora
);
router.get(
  "/firma/:firmaId",
  authMiddleware,
  rateLimiter.api,
  validateFirmaId,
  pozajmnicaController.getPozajmiceByFirma
);
router.get(
  "/:id",
  authMiddleware,
  validateId,
  pozajmnicaController.getPozajmicaById
);

// POST rute
router.post(
  "/",
  authMiddleware,
  rateLimiter.api,
  validatePozajmica,
  pozajmnicaController.createPozajmica
);

// PUT rute
router.put(
  "/:id",
  authMiddleware,
  rateLimiter.api,
  validateId,
  validatePozajmica,
  pozajmnicaController.updatePozajmica
);

// DELETE rute
router.delete("/:id", authMiddleware, pozajmnicaController.deletePozajmica);

module.exports = router;
