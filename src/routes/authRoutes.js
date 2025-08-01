const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const {
  validateLogin,
  validateRegistration,
} = require("../middleware/validation");
const rateLimiter = require("../middleware/rateLimiting");
const { logInfo } = require("../utils/logger");

// POST rute sa validacijom (rate limiting je globalno preko smartRateLimiter)
router.post(
  "/login",
  (req, res, next) => {
    logInfo("Login request received", {
      url: req.originalUrl,
      method: req.method,
    });
    next();
  },
  validateLogin,
  authController.login
);
router.post("/logout", authController.logout);
router.post("/register", validateRegistration, authController.register);

// GET rute
router.get("/check-auth", authController.checkAuth);

module.exports = router;
