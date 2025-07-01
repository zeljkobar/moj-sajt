const express = require("express");
const router = express.Router();
const contractController = require("../controllers/contractController");

// Rute za ugovore
router.get("/contracts", contractController.getAllContracts);
router.post("/contracts", contractController.addContract);
router.get("/contracts/:id", contractController.getContractById);
router.put("/contracts/:id", contractController.updateContract);
router.delete("/contracts/:id", contractController.deleteContract);

module.exports = router;
