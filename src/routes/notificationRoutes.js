const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { authMiddleware } = require("../middleware/auth");

// GET /api/notifications - dobijanje svih obavještenja
router.get("/", authMiddleware, notificationController.getNotifications);

// GET /api/debug-sql - debug endpoint za SQL testiranje
router.get("/debug-sql", authMiddleware, notificationController.debugSQL);

module.exports = router;
