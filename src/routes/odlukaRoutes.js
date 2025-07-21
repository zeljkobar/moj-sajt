const express = require("express");
const router = express.Router();
const odlukaController = require("../controllers/odlukaController");
const { authMiddleware } = require("../middleware/auth");

// GET /api/odluka/povracaj/:povracajId - Dobij podatke za odluku o povraćaju
router.get(
  "/povracaj/:povracajId",
  authMiddleware,
  odlukaController.getOdlukaPovracaj
);

module.exports = router;
