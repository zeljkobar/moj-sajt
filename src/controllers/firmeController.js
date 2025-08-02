const { executeQuery } = require("../config/database");
const { ROLES, canCreateMultipleFirms } = require("../middleware/roleAuth");

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
        SELECT id, pib, naziv, adresa, pdvBroj, direktor_ime_prezime, direktor_jmbg, status, created_at, updated_at
        FROM firme 
        WHERE user_id = ? 
        ORDER BY naziv
      `,
        [userId]
      );

      return firme;
    } catch (error) {
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
        SELECT id, pib, naziv, adresa, pdvBroj, direktor_ime_prezime, direktor_jmbg, status, created_at, updated_at
        FROM firme 
        WHERE user_id = ? AND status = 'aktivan'
        ORDER BY naziv
      `,
        [userId]
      );

      res.json(aktivneFirme);
    } catch (error) {
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
        SELECT id, pib, naziv, adresa, pdvBroj, direktor_ime_prezime, direktor_jmbg, status, created_at, updated_at
        FROM firme 
        WHERE user_id = ? AND status = 'nula'
        ORDER BY naziv
      `,
        [userId]
      );

      res.json(firmeNaNuli);
    } catch (error) {
      res.status(500).json({ message: "Greška pri dobijanju firmi na nuli" });
    }
  },

  // POST /api/firme - dodaj novu firmu
  addFirma: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const {
        naziv,
        pib,
        adresa,
        pdvBroj,
        status,
        direktor_ime_prezime,
        direktor_jmbg,
      } = req.body;
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

      // Provera limita firmi na osnovu role korisnika
      const userRole = req.session.user.role;

      if (userRole === ROLES.FIRMA) {
        // Korisnik tipa "firma" može imati samo jednu firmu
        const existingFirmsCount = await executeQuery(
          "SELECT COUNT(*) as count FROM firme WHERE user_id = ?",
          [userId]
        );

        if (existingFirmsCount[0].count >= 1) {
          return res.status(403).json({
            message:
              "Korisnici tipa 'Firma' mogu kreirati samo jednu firmu. Za upravljanje više firmi kontaktirajte administratora za promenu statusa na 'Knjigovodstvena agencija'.",
          });
        }
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
        INSERT INTO firme (user_id, pib, naziv, adresa, pdvBroj, direktor_ime_prezime, direktor_jmbg, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          userId,
          pib,
          naziv,
          adresa,
          pdvBroj || "",
          direktor_ime_prezime || "",
          direktor_jmbg || "",
          status || "aktivan",
        ]
      );

      res.json({
        success: true,
        message: "Firma je uspešno dodana",
        firmaId: result.insertId,
      });
    } catch (error) {
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
      const {
        naziv,
        adresa,
        pdvBroj,
        status,
        direktor_ime_prezime,
        direktor_jmbg,
      } = req.body;
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
        SET naziv = ?, adresa = ?, pdvBroj = ?, direktor_ime_prezime = ?, direktor_jmbg = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND pib = ?
      `,
        [
          naziv,
          adresa,
          pdvBroj || "",
          direktor_ime_prezime || "",
          direktor_jmbg || "",
          status || "aktivan",
          userId,
          pib,
        ]
      );

      res.json({
        success: true,
        message: "Firma je uspešno ažurirana",
      });
    } catch (error) {
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

      res.json({
        success: true,
        message: "Firma je uspešno obrisana",
      });
    } catch (error) {
      res.status(500).json({ message: "Greška pri brisanju firme" });
    }
  },

  // GET /api/firme/:pib - dobij firmu po PIB-u
  getFirmaByPib: async (req, res) => {
    try {
      console.log("getFirmaByPib pozvan");
      console.log("Session:", req.session);
      console.log("User:", req.session?.user);

      if (!req.session || !req.session.user) {
        console.log("Nema sesije ili korisnika");
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const { pib } = req.params;
      const username = req.session.user.username;

      console.log("PIB:", pib);
      console.log("Username:", username);

      const userId = await firmeController.getUserId(username);
      console.log("UserId:", userId);

      if (!userId) {
        console.log("UserId nije pronađen");
        return res.status(404).json({ message: "Korisnik nije pronađen" });
      }

      const firma = await executeQuery(
        `
        SELECT id, pib, naziv, adresa, pdvBroj, direktor_ime_prezime, direktor_jmbg, status, created_at, updated_at
        FROM firme 
        WHERE user_id = ? AND pib = ?
      `,
        [userId, pib]
      );

      console.log("Rezultat pretrage:", firma);

      if (firma.length === 0) {
        return res.status(404).json({
          message: "Firma nije pronađena",
        });
      }

      res.json(firma[0]);
    } catch (error) {
      console.error("Greška u getFirmaByPib:", error);
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

  // GET /api/firme/id/:id - dobij firmu po ID-u
  getFirmaById: async (req, res) => {
    const { id } = req.params;
    try {
      const [firma] = await executeQuery("SELECT * FROM firme WHERE id = ?", [
        id,
      ]);
      if (!firma) {
        return res.status(404).json({ message: "Firma nije pronađena" });
      }
      res.json(firma);
    } catch (error) {
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // GET /api/radnici/id/:id - dobij radnika po ID-u
  getRadnikById: async (req, res) => {
    const { id } = req.params;
    try {
      const [radnik] = await executeQuery(
        "SELECT * FROM radnici WHERE id = ?",
        [id]
      );
      if (!radnik) {
        return res.status(404).json({ message: "Radnik nije pronađen" });
      }
      res.json(radnik);
    } catch (error) {
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // GET /api/firme/search - pretraži firme
  searchFirme: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;
      const query = req.query.q;

      if (!query || query.trim().length < 2) {
        return res.json([]);
      }

      const userId = await firmeController.getUserId(username);
      if (!userId) {
        return res.status(404).json({ message: "Korisnik nije pronađen" });
      }

      // Pretraži firme sa svim potrebnim podacima
      const searchTerm = `%${query.trim()}%`;
      const firme = await executeQuery(
        `
        SELECT f.id, f.pib, f.naziv, f.adresa, f.pdvBroj, f.direktor_ime_prezime, 
               f.direktor_jmbg, f.status, f.created_at, f.updated_at, f.grad,
               CASE WHEN f.status = 'aktivna' THEN true ELSE false END as aktivna
        FROM firme f 
        WHERE f.user_id = ? AND (
          f.naziv LIKE ? OR 
          f.pib LIKE ? OR 
          f.direktor_ime_prezime LIKE ? OR
          f.adresa LIKE ? OR
          f.grad LIKE ?
        )
        ORDER BY f.naziv
        LIMIT 10
      `,
        [userId, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
      );

      res.json(firme);
    } catch (error) {
      console.error("Search firme error:", error);
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // GET /api/firme/my-company - dobija firmu trenutnog korisnika
  getMyCompany: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;
      const userId = await firmeController.getUserId(username);
      if (!userId) {
        return res.status(404).json({ message: "Korisnik nije pronađen" });
      }

      // Za korisnike tipa "firma" - trebaju da imaju tačno jednu firmu
      const userRole = req.session.user.role;

      if (userRole === ROLES.FIRMA) {
        // Korisnik tipa "firma" može imati samo jednu firmu
        const firme = await executeQuery(
          `SELECT id, pib, naziv, adresa, grad, pdvBroj, direktor_ime_prezime, direktor_jmbg, status, created_at, updated_at
           FROM firme 
           WHERE user_id = ? 
           LIMIT 1`,
          [userId]
        );

        if (firme.length === 0) {
          return res.status(404).json({ message: "Firma nije pronađena" });
        }

        return res.json(firme[0]);
      } else {
        // Za agencije i admin - vrati sve firme
        const firme = await executeQuery(
          `SELECT id, pib, naziv, adresa, grad, pdvBroj, direktor_ime_prezime, direktor_jmbg, status, created_at, updated_at
           FROM firme 
           WHERE user_id = ? 
           ORDER BY naziv`,
          [userId]
        );

        if (firme.length === 0) {
          return res.status(404).json({ message: "Nema firmi" });
        }

        return res.json({ firme });
      }
    } catch (error) {
      console.error("getMyCompany error:", error);
      res.status(500).json({ message: "Greška na serveru" });
    }
  },
};

module.exports = firmeController;
