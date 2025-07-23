const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/database");
const { authMiddleware } = require("../middleware/auth");

// Všechny rute requirují autentifikaciju
router.use(authMiddleware);

// GET /api/zadaci/:firmaId - Učitaj zadatke za firmu
router.get("/:firmaId", async (req, res) => {
  try {
    const { firmaId } = req.params;
    const userId = req.session.user.id;

    // Proveri da li firma pripada trenutnom korisniku
    const firmaCheck = await executeQuery(
      "SELECT id FROM firme WHERE id = ? AND user_id = ?",
      [firmaId, userId]
    );

    if (firmaCheck.length === 0) {
      return res
        .status(403)
        .json({ error: "Nemate dozvolu za pristup ovoj firmi" });
    }

    // Učitaj zadatke za firmu
    const zadaci = await executeQuery(
      `SELECT id, firma_id, tekst_zadatka, je_zavrsen, datum_kreiran, datum_zavrsen, redosled 
       FROM firma_zadaci 
       WHERE firma_id = ? 
       ORDER BY redosled ASC, datum_kreiran DESC`,
      [firmaId]
    );

    res.json(zadaci);
  } catch (error) {
    console.error("Greška pri učitavanju zadataka:", error);
    res.status(500).json({ error: "Greška pri učitavanju zadataka" });
  }
});

// POST /api/zadaci - Dodaj novi zadatak
router.post("/", async (req, res) => {
  try {
    const { firma_id, tekst_zadatka } = req.body;
    const userId = req.session.user.id;

    if (!firma_id || !tekst_zadatka || !tekst_zadatka.trim()) {
      return res.status(400).json({ error: "Sva polja su obavezna" });
    }

    // Proveri da li firma pripada trenutnom korisniku
    const firmaCheck = await executeQuery(
      "SELECT id FROM firme WHERE id = ? AND user_id = ?",
      [firma_id, userId]
    );

    if (firmaCheck.length === 0) {
      return res
        .status(403)
        .json({ error: "Nemate dozvolu za pristup ovoj firmi" });
    }

    // Dodaj novi zadatak
    const result = await executeQuery(
      "INSERT INTO firma_zadaci (firma_id, tekst_zadatka, je_zavrsen, redosled) VALUES (?, ?, 0, 0)",
      [firma_id, tekst_zadatka.trim()]
    );

    // Vrati novi zadatak
    const noviZadatak = await executeQuery(
      "SELECT id, firma_id, tekst_zadatka, je_zavrsen, datum_kreiran, datum_zavrsen, redosled FROM firma_zadaci WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(noviZadatak[0]);
  } catch (error) {
    console.error("Greška pri dodavanju zadatka:", error);
    res.status(500).json({ error: "Greška pri dodavanju zadatka" });
  }
});

// PUT /api/zadaci/:id/toggle - Promeni status zadatka (završen/nezavršen)
router.put("/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    const { je_zavrsen } = req.body;
    const userId = req.session.user.id;

    if (typeof je_zavrsen !== "boolean") {
      return res.status(400).json({ error: "je_zavrsen mora biti boolean" });
    }

    // Proveri da li zadatak postoji i pripada firmi korisnika
    const zadatakCheck = await executeQuery(
      `SELECT fz.id, fz.firma_id 
       FROM firma_zadaci fz 
       JOIN firme f ON fz.firma_id = f.id 
       WHERE fz.id = ? AND f.user_id = ?`,
      [id, userId]
    );

    if (zadatakCheck.length === 0) {
      return res.status(404).json({ error: "Zadatak nije pronađen" });
    }

    // Ažuriraj status zadatka
    const datum_zavrsen = je_zavrsen ? new Date() : null;
    await executeQuery(
      "UPDATE firma_zadaci SET je_zavrsen = ?, datum_zavrsen = ? WHERE id = ?",
      [je_zavrsen ? 1 : 0, datum_zavrsen, id]
    );

    // Vrati ažurirani zadatak
    const ažuriraniZadatak = await executeQuery(
      "SELECT id, firma_id, tekst_zadatka, je_zavrsen, datum_kreiran, datum_zavrsen, redosled FROM firma_zadaci WHERE id = ?",
      [id]
    );

    res.json(ažuriraniZadatak[0]);
  } catch (error) {
    console.error("Greška pri ažuriranju zadatka:", error);
    res.status(500).json({ error: "Greška pri ažuriranju zadatka" });
  }
});

// DELETE /api/zadaci/:id - Obriši zadatak
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;

    // Proveri da li zadatak postoji i pripada firmi korisnika
    const zadatakCheck = await executeQuery(
      `SELECT fz.id, fz.firma_id 
       FROM firma_zadaci fz 
       JOIN firme f ON fz.firma_id = f.id 
       WHERE fz.id = ? AND f.user_id = ?`,
      [id, userId]
    );

    if (zadatakCheck.length === 0) {
      return res.status(404).json({ error: "Zadatak nije pronađen" });
    }

    // Obriši zadatak
    await executeQuery("DELETE FROM firma_zadaci WHERE id = ?", [id]);

    res.json({ message: "Zadatak je uspešno obrisan" });
  } catch (error) {
    console.error("Greška pri brisanju zadatka:", error);
    res.status(500).json({ error: "Greška pri brisanju zadatka" });
  }
});

module.exports = router;
