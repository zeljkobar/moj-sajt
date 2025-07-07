const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { authMiddleware } = require("../middleware/auth");

// GET /api/notifications - dobijanje svih obavještenja
router.get("/", authMiddleware, notificationController.getNotifications);

module.exports = router;
