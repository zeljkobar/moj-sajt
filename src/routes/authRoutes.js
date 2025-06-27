const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// POST rute
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/register", authController.register);

// GET rute
router.get("/check-auth", authController.checkAuth);

module.exports = router;
