const express = require("express");
const router = express.Router();
const radniciController = require("../controllers/radniciController");

// GET rute za radnike
router.get("/", radniciController.getAllRadnici);
router.get("/search", radniciController.searchRadnici); // Dodano
router.get("/firma/:firmaId", radniciController.getRadniciByFirma);
router.get("/id/:id", radniciController.getRadnikById);
router.post("/", radniciController.addRadnik);
router.put("/:id", radniciController.updateRadnik);
router.delete("/:id", radniciController.deleteRadnik);

module.exports = router;
