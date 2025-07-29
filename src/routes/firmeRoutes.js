const express = require("express");
const router = express.Router();
const firmeController = require("../controllers/firmeController");
const { authMiddleware } = require("../middleware/auth");
const { validateFirma, validateId } = require("../middleware/validation");
const rateLimiter = require("../middleware/rateLimiting");

// GET rute
router.get("/", authMiddleware, rateLimiter.api, firmeController.getAllFirme);
router.get(
  "/search",
  authMiddleware,
  rateLimiter.api,
  firmeController.searchFirme
);
router.get(
  "/aktivne",
  authMiddleware,
  rateLimiter.api,
  firmeController.getAktivneFirme
);
router.get(
  "/nula",
  authMiddleware,
  rateLimiter.api,
  firmeController.getFirmeNaNuli
);
router.get("/id/:id", validateId, firmeController.getFirmaById);
router.get(
  "/:pib",
  authMiddleware,
  rateLimiter.api,
  firmeController.getFirmaByPib
);

// POST rute
router.post(
  "/",
  authMiddleware,
  rateLimiter.api,
  validateFirma,
  firmeController.addFirma
);

// PUT rute
router.put(
  "/:pib",
  authMiddleware,
  rateLimiter.api,
  validateFirma,
  firmeController.updateFirma
);

// DELETE rute
router.delete(
  "/:pib",
  authMiddleware,
  rateLimiter.api,
  firmeController.deleteFirma
);

// Fallback za hosting provajdere koji ne podržavaju DELETE
router.post(
  "/:pib/delete",
  authMiddleware,
  rateLimiter.api,
  firmeController.deleteFirma
);

// Fallback za hosting provajdere koji ne podržavaju PUT
router.post(
  "/:pib/edit",
  authMiddleware,
  rateLimiter.api,
  validateFirma,
  firmeController.updateFirma
);

module.exports = router;
