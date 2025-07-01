const { executeQuery } = require("../config/database");

const pozicijeController = {
  // GET /api/pozicije - dobij sve pozicije
  getAllPozicije: async (req, res) => {
    try {
      const pozicije = await executeQuery(
        "SELECT * FROM pozicije ORDER BY naziv"
      );
      res.json(pozicije);
    } catch (error) {
      console.error("Greška pri dobijanju pozicija:", error);
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // GET /api/pozicije/:id - dobij poziciju po ID-u
  getPozicijaById: async (req, res) => {
    const { id } = req.params;
    try {
      const [pozicija] = await executeQuery(
        "SELECT * FROM pozicije WHERE id = ?",
        [id]
      );
      if (!pozicija) {
        return res.status(404).json({ message: "Pozicija nije pronađena" });
      }
      res.json(pozicija);
    } catch (error) {
      console.error("Greška pri dobijanju pozicije:", error);
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // POST /api/pozicije - dodaj novu poziciju
  addPozicija: async (req, res) => {
    const { naziv, opis_poslova } = req.body;
    try {
      if (!naziv || !opis_poslova) {
        return res
          .status(400)
          .json({ message: "Naziv i opis poslova su obavezni" });
      }

      const result = await executeQuery(
        "INSERT INTO pozicije (naziv, opis_poslova) VALUES (?, ?)",
        [naziv, opis_poslova]
      );
      res.json({ success: true, pozicijaId: result.insertId });
    } catch (error) {
      console.error("Greška pri dodavanju pozicije:", error);
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // PUT /api/pozicije/:id - ažuriraj poziciju
  updatePozicija: async (req, res) => {
    const { id } = req.params;
    const { naziv, opis_poslova } = req.body;
    try {
      if (!naziv || !opis_poslova) {
        return res
          .status(400)
          .json({ message: "Naziv i opis poslova su obavezni" });
      }

      await executeQuery(
        "UPDATE pozicije SET naziv = ?, opis_poslova = ? WHERE id = ?",
        [naziv, opis_poslova, id]
      );
      res.json({ success: true, message: "Pozicija je uspešno ažurirana" });
    } catch (error) {
      console.error("Greška pri ažuriranju pozicije:", error);
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // DELETE /api/pozicije/:id - obriši poziciju
  deletePozicija: async (req, res) => {
    const { id } = req.params;
    try {
      await executeQuery("DELETE FROM pozicije WHERE id = ?", [id]);
      res.json({ success: true, message: "Pozicija je uspešno obrisana" });
    } catch (error) {
      console.error("Greška pri brisanju pozicije:", error);
      res.status(500).json({ message: "Greška na serveru" });
    }
  },
};

module.exports = pozicijeController;
