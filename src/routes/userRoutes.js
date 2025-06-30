// src/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/userController");
const { authMiddleware } = require("../middleware/auth");

router.route("/").get(ctrl.getUsers).post(ctrl.createUser);

// Profile management routes (require authentication)
router.get("/current", authMiddleware, ctrl.getCurrentUser);
router.put("/profile", authMiddleware, ctrl.updateProfile);
router.put("/change-password", authMiddleware, ctrl.changePassword);
router.post("/change-password", authMiddleware, ctrl.changePassword); // Backup POST route for servers that don't support PUT

router
  .route("/:id")
  .get(ctrl.getUserById)
  .put(ctrl.updateUser)
  .delete(ctrl.deleteUser);

module.exports = router;
