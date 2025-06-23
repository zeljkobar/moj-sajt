// src/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/userController");

router.route("/").get(ctrl.getUsers).post(ctrl.createUser);

router
  .route("/:id")
  .get(ctrl.getUserById)
  .put(ctrl.updateUser)
  .delete(ctrl.deleteUser);

module.exports = router;
