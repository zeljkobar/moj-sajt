const express = require("express");
const router = express.Router();
const povracajController = require("../controllers/povracajController");
const { authMiddleware } = require("../middleware/auth");

// GET rute
router.get(
  "/pozajmica/:pozajmicaId",
  authMiddleware,
  povracajController.getPovracajeByPozajmica
);
router.get(
  "/firma/:firmaId",
  authMiddleware,
  povracajController.getPovracajeByFirma
);
router.get(
  "/statistike/firma/:firmaId",
  authMiddleware,
  povracajController.getStatistikeByFirma
);

// POST rute
router.post("/", authMiddleware, povracajController.createPovracaj);

// PUT rute
router.put("/:id", authMiddleware, povracajController.updatePovracaj);

// DELETE rute
router.delete("/:id", authMiddleware, povracajController.deletePovracaj);

module.exports = router;
