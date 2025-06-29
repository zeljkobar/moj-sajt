const { executeQuery } = require("../config/database");

const firmeController = {
  // Helper funkcija za dobijanje user_id na osnovu username-a
  getUserId: async (username) => {
    try {
      const users = await executeQuery(
        "SELECT id FROM users WHERE username = ?",
        [username]
      );
      return users.length > 0 ? users[0].id : null;
    } catch (error) {
      console.error("Greška pri dobijanju user_id:", error);
      return null;
    }
  },

  // Helper funkcija za čitanje firmi korisnika iz baze
  readUserFirme: async (username) => {
    try {
      const userId = await firmeController.getUserId(username);
      if (!userId) return [];

      const firme = await executeQuery(
        `
        SELECT id, pib, naziv, adresa, pdvBroj, status, created_at, updated_at
        FROM firme 
        WHERE user_id = ? 
        ORDER BY naziv
      `,
        [userId]
      );

      return firme;
    } catch (error) {
      console.error(
        `Greška pri čitanju firmi za korisnika ${username}:`,
        error
      );
      return [];
    }
  },

  // GET /api/firme - vraća sve firme za ulogovanog korisnika
  getAllFirme: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;
      const firme = await firmeController.readUserFirme(username);

      res.json({ firme });
    } catch (error) {
      console.error("Greška pri dobijanju firmi:", error);
      res.status(500).json({ message: "Greška pri dobijanju firmi" });
    }
  },

  // GET /api/firme/aktivne - vraća samo aktivne firme
  getAktivneFirme: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;
      const userId = await firmeController.getUserId(username);
      if (!userId) {
        return res.status(404).json({ message: "Korisnik nije pronađen" });
      }

      const aktivneFirme = await executeQuery(
        `
        SELECT id, pib, naziv, adresa, pdvBroj, status, created_at, updated_at
        FROM firme 
        WHERE user_id = ? AND status = 'aktivan'
        ORDER BY naziv
      `,
        [userId]
      );

      res.json(aktivneFirme);
    } catch (error) {
      console.error("Greška pri dobijanju aktivnih firmi:", error);
      res.status(500).json({ message: "Greška pri dobijanju aktivnih firmi" });
    }
  },

  // GET /api/firme/nula - vraća firme na nuli
  getFirmeNaNuli: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;
      const userId = await firmeController.getUserId(username);
      if (!userId) {
        return res.status(404).json({ message: "Korisnik nije pronađen" });
      }

      const firmeNaNuli = await executeQuery(
        `
        SELECT id, pib, naziv, adresa, pdvBroj, status, created_at, updated_at
        FROM firme 
        WHERE user_id = ? AND status = 'nula'
        ORDER BY naziv
      `,
        [userId]
      );

      res.json(firmeNaNuli);
    } catch (error) {
      console.error("Greška pri dobijanju firmi na nuli:", error);
      res.status(500).json({ message: "Greška pri dobijanju firmi na nuli" });
    }
  },

  // POST /api/firme - dodaj novu firmu
  addFirma: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const { naziv, pib, adresa, pdvBroj, status } = req.body;
      const username = req.session.user.username;

      // Validacija
      if (!naziv || !pib || !adresa) {
        return res.status(400).json({
          message: "Naziv, PIB i adresa su obavezni",
        });
      }

      // PIB validacija
      if (!/^[0-9]{8,9}$/.test(pib)) {
        return res.status(400).json({
          message: "PIB mora imati 8 ili 9 cifara",
        });
      }

      const userId = await firmeController.getUserId(username);
      if (!userId) {
        return res.status(404).json({ message: "Korisnik nije pronađen" });
      }

      // Proveri da li firma već postoji za ovog korisnika
      const existingFirma = await executeQuery(
        `
        SELECT id FROM firme WHERE user_id = ? AND pib = ?
      `,
        [userId, pib]
      );

      if (existingFirma.length > 0) {
        return res.status(400).json({
          message: "Firma sa ovim PIB-om već postoji",
        });
      }

      // Dodaj firmu
      const result = await executeQuery(
        `
        INSERT INTO firme (user_id, pib, naziv, adresa, pdvBroj, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [userId, pib, naziv, adresa, pdvBroj || "", status || "aktivan"]
      );

      console.log(
        `✅ Nova firma dodana: ${naziv} (PIB: ${pib}) za korisnika ${username}`
      );

      res.json({
        success: true,
        message: "Firma je uspešno dodana",
        firmaId: result.insertId,
      });
    } catch (error) {
      console.error("Greška pri dodavanju firme:", error);

      if (error.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          message: "Firma sa ovim PIB-om već postoji",
        });
      }

      res.status(500).json({ message: "Greška pri dodavanju firme" });
    }
  },

  // PUT /api/firme/:pib - ažuriraj firmu
  updateFirma: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const { pib } = req.params;
      const { naziv, adresa, pdvBroj, status } = req.body;
      const username = req.session.user.username;

      // Validacija
      if (!naziv || !adresa) {
        return res.status(400).json({
          message: "Naziv i adresa su obavezni",
        });
      }

      const userId = await firmeController.getUserId(username);
      if (!userId) {
        return res.status(404).json({ message: "Korisnik nije pronađen" });
      }

      // Proveri da li firma postoji i pripada korisniku
      const existingFirma = await executeQuery(
        `
        SELECT id FROM firme WHERE user_id = ? AND pib = ?
      `,
        [userId, pib]
      );

      if (existingFirma.length === 0) {
        return res.status(404).json({
          message: "Firma nije pronađena",
        });
      }

      // Ažuriraj firmu
      await executeQuery(
        `
        UPDATE firme 
        SET naziv = ?, adresa = ?, pdvBroj = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND pib = ?
      `,
        [naziv, adresa, pdvBroj || "", status || "aktivan", userId, pib]
      );

      console.log(
        `✅ Firma ažurirana: ${naziv} (PIB: ${pib}) za korisnika ${username}`
      );

      res.json({
        success: true,
        message: "Firma je uspešno ažurirana",
      });
    } catch (error) {
      console.error("Greška pri ažuriranju firme:", error);
      res.status(500).json({ message: "Greška pri ažuriranju firme" });
    }
  },

  // DELETE /api/firme/:pib - obriši firmu
  deleteFirma: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const { pib } = req.params;
      const username = req.session.user.username;

      const userId = await firmeController.getUserId(username);
      if (!userId) {
        return res.status(404).json({ message: "Korisnik nije pronađen" });
      }

      // Proveri da li firma postoji i pripada korisniku
      const existingFirma = await executeQuery(
        `
        SELECT id, naziv FROM firme WHERE user_id = ? AND pib = ?
      `,
        [userId, pib]
      );

      if (existingFirma.length === 0) {
        return res.status(404).json({
          message: "Firma nije pronađena",
        });
      }

      // Obriši firmu
      await executeQuery(
        `
        DELETE FROM firme WHERE user_id = ? AND pib = ?
      `,
        [userId, pib]
      );

      console.log(
        `✅ Firma obrisana: ${existingFirma[0].naziv} (PIB: ${pib}) za korisnika ${username}`
      );

      res.json({
        success: true,
        message: "Firma je uspešno obrisana",
      });
    } catch (error) {
      console.error("Greška pri brisanju firme:", error);
      res.status(500).json({ message: "Greška pri brisanju firme" });
    }
  },

  // GET /api/firme/:pib - dobij firmu po PIB-u
  getFirmaByPib: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const { pib } = req.params;
      const username = req.session.user.username;

      const userId = await firmeController.getUserId(username);
      if (!userId) {
        return res.status(404).json({ message: "Korisnik nije pronađen" });
      }

      const firma = await executeQuery(
        `
        SELECT id, pib, naziv, adresa, pdvBroj, status, created_at, updated_at
        FROM firme 
        WHERE user_id = ? AND pib = ?
      `,
        [userId, pib]
      );

      if (firma.length === 0) {
        return res.status(404).json({
          message: "Firma nije pronađena",
        });
      }

      res.json(firma[0]);
    } catch (error) {
      console.error("Greška pri dobijanju firme:", error);
      res.status(500).json({ message: "Greška pri dobijanju firme" });
    }
  },

  // POST /api/firme/:pib/delete - fallback za brisanje (za hosting koji blokira DELETE)
  deleteFirmaFallback: async (req, res) => {
    return await firmeController.deleteFirma(req, res);
  },

  // POST /api/firme/:pib/edit - fallback za editovanje (za hosting koji blokira PUT)
  updateFirmaFallback: async (req, res) => {
    return await firmeController.updateFirma(req, res);
  },
};

module.exports = firmeController;
