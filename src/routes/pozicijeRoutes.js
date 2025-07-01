const express = require("express");
const router = express.Router();
const pozicijeController = require("../controllers/pozicijeController");

router.get("/", pozicijeController.getAllPozicije);
router.get("/:id", pozicijeController.getPozicijaById);
router.post("/", pozicijeController.addPozicija);
router.put("/:id", pozicijeController.updatePozicija);
router.delete("/:id", pozicijeController.deletePozicija);

// POST fallback routes za IIS kompatibilnost
router.post("/:id/update", pozicijeController.updatePozicija);
router.post("/:id/delete", pozicijeController.deletePozicija);

module.exports = router;
