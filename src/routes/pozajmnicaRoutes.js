const express = require("express");
const router = express.Router();
const pozajmnicaController = require("../controllers/pozajmnicaController");
const { authMiddleware } = require("../middleware/auth");

// GET rute
router.get("/", authMiddleware, pozajmnicaController.getAllPozajmice);
router.get(
  "/next-broj",
  authMiddleware,
  pozajmnicaController.getNextBrojUgovora
);
router.get(
  "/firma/:firmaId",
  authMiddleware,
  pozajmnicaController.getPozajmiceByFirma
);
router.get("/:id", authMiddleware, pozajmnicaController.getPozajmicaById);

// POST rute
router.post("/", authMiddleware, pozajmnicaController.createPozajmica);

// PUT rute
router.put("/:id", authMiddleware, pozajmnicaController.updatePozajmica);

// DELETE rute
router.delete("/:id", authMiddleware, pozajmnicaController.deletePozajmica);

module.exports = router;
