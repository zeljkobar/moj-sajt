const { executeQuery } = require("../config/database");

const pozicijeController = {
  // GET /api/pozicije - dobij pozicije za ulogovanog korisnika
  getAllPozicije: async (req, res) => {
    try {
      // Proveri autentifikaciju
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;

      // Dobij ID korisnika
      const [user] = await executeQuery(
        "SELECT id FROM users WHERE username = ?",
        [username]
      );

      if (!user) {
        return res.status(404).json({ message: "Korisnik nije pronađen" });
      }

      // Dobij pozicije samo za ovog korisnika
      const pozicije = await executeQuery(
        "SELECT id, naziv, opis_poslova FROM pozicije WHERE user_id = ? ORDER BY naziv",
        [user.id]
      );
      res.json(pozicije);
    } catch (error) {
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // GET /api/pozicije/:id - dobij poziciju po ID-u (samo ako pripada korisniku)
  getPozicijaById: async (req, res) => {
    const { id } = req.params;
    try {
      // Proveri autentifikaciju
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;

      // Dobij ID korisnika
      const [user] = await executeQuery(
        "SELECT id FROM users WHERE username = ?",
        [username]
      );

      if (!user) {
        return res.status(404).json({ message: "Korisnik nije pronađen" });
      }

      // Dobij poziciju samo ako pripada korisniku
      const [pozicija] = await executeQuery(
        "SELECT * FROM pozicije WHERE id = ? AND user_id = ?",
        [id, user.id]
      );
      if (!pozicija) {
        return res.status(404).json({
          message: "Pozicija nije pronađena ili nemate dozvolu za pristup",
        });
      }
      res.json(pozicija);
    } catch (error) {
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // POST /api/pozicije - dodaj novu poziciju (za ulogovanog korisnika)
  addPozicija: async (req, res) => {
    const { naziv, opis_poslova } = req.body;
    try {
      // Proveri autentifikaciju
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;

      // Dobij ID korisnika
      const [user] = await executeQuery(
        "SELECT id FROM users WHERE username = ?",
        [username]
      );

      if (!user) {
        return res.status(404).json({ message: "Korisnik nije pronađen" });
      }

      if (!naziv || !opis_poslova) {
        return res
          .status(400)
          .json({ message: "Naziv i opis poslova su obavezni" });
      }

      const result = await executeQuery(
        "INSERT INTO pozicije (naziv, opis_poslova, user_id) VALUES (?, ?, ?)",
        [naziv, opis_poslova, user.id]
      );
      res.json({ success: true, pozicijaId: result.insertId });
    } catch (error) {
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // PUT /api/pozicije/:id - ažuriraj poziciju (samo ako pripada korisniku)
  updatePozicija: async (req, res) => {
    const { id } = req.params;
    const { naziv, opis_poslova } = req.body;
    try {
      // Proveri autentifikaciju
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;

      // Dobij ID korisnika
      const [user] = await executeQuery(
        "SELECT id FROM users WHERE username = ?",
        [username]
      );

      if (!user) {
        return res.status(404).json({ message: "Korisnik nije pronađen" });
      }

      if (!naziv || !opis_poslova) {
        return res
          .status(400)
          .json({ message: "Naziv i opis poslova su obavezni" });
      }

      // Proveri da li pozicija pripada korisniku
      const [pozicijaCheck] = await executeQuery(
        "SELECT id FROM pozicije WHERE id = ? AND user_id = ?",
        [id, user.id]
      );

      if (!pozicijaCheck) {
        return res.status(403).json({
          message: "Nemate dozvolu da ažurirate ovu poziciju",
        });
      }

      await executeQuery(
        "UPDATE pozicije SET naziv = ?, opis_poslova = ? WHERE id = ? AND user_id = ?",
        [naziv, opis_poslova, id, user.id]
      );
      res.json({ success: true, message: "Pozicija je uspešno ažurirana" });
    } catch (error) {
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // DELETE /api/pozicije/:id - obriši poziciju (samo ako pripada korisniku)
  deletePozicija: async (req, res) => {
    const { id } = req.params;
    try {
      // Proveri autentifikaciju
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;

      // Dobij ID korisnika
      const [user] = await executeQuery(
        "SELECT id FROM users WHERE username = ?",
        [username]
      );

      if (!user) {
        return res.status(404).json({ message: "Korisnik nije pronađen" });
      }

      // Proveri da li pozicija pripada korisniku
      const [pozicijaCheck] = await executeQuery(
        "SELECT id FROM pozicije WHERE id = ? AND user_id = ?",
        [id, user.id]
      );

      if (!pozicijaCheck) {
        return res.status(403).json({
          message: "Nemate dozvolu da obrišete ovu poziciju",
        });
      }

      await executeQuery("DELETE FROM pozicije WHERE id = ? AND user_id = ?", [
        id,
        user.id,
      ]);
      res.json({ success: true, message: "Pozicija je uspešno obrisana" });
    } catch (error) {
      res.status(500).json({ message: "Greška na serveru" });
    }
  },
};

module.exports = pozicijeController;
