const { executeQuery } = require("../config/database");

const radniciController = {
  // GET /api/radnici - dobij radnike za firme ulogovanog korisnika
  getAllRadnici: async (req, res) => {
    try {
      console.log("🔴 DEBUG: getAllRadnici pozvan!");
      console.log("🔴 Session exists:", !!req.session);
      console.log("🔴 User exists:", !!req.session?.user);

      // Proveri autentifikaciju
      if (!req.session || !req.session.user) {
        console.log("🔴 Vraćam 401 - nije autentifikovan");
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;
      console.log("🔴 Username iz sesije:", username);

      // Dobij ID korisnika
      const [user] = await executeQuery(
        "SELECT id FROM users WHERE username = ?",
        [username]
      );

      if (!user) {
        console.log("🔴 Korisnik nije pronađen za username:", username);
        return res.status(404).json({ message: "Korisnik nije pronađen" });
      }

      console.log("🔴 User ID:", user.id);

      // Dobij radnike samo za firme koje pripadaju ovom korisniku
      const radnici = await executeQuery(
        `
        SELECT r.id, r.ime, r.prezime, r.jmbg, r.grad, r.adresa, 
               r.pozicija_id, r.firma_id, r.datum_zaposlenja, r.visina_zarade, 
               r.tip_radnog_vremena, r.tip_ugovora, r.datum_prestanka, r.napomene,
               p.naziv as pozicija_naziv, f.naziv as firma_naziv, u.vrsta_ugovora
        FROM radnici r 
        LEFT JOIN pozicije p ON r.pozicija_id = p.id 
        LEFT JOIN firme f ON r.firma_id = f.id 
        LEFT JOIN ugovori u ON r.id = u.radnik_id
        WHERE f.user_id = ?
        ORDER BY r.prezime, r.ime
      `,
        [user.id]
      );

      console.log("🔴 Broj pronađenih radnika:", radnici.length);
      console.log(
        "🔴 Radnici:",
        radnici.map((r) => ({
          id: r.id,
          ime: r.ime,
          prezime: r.prezime,
          firma: r.firma_naziv,
        }))
      );

      res.json(radnici);
    } catch (error) {
      console.error("Greška pri dobijanju radnika:", error);
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // GET /api/radnici/firma/:firmaId - dobij radnike po firmi
  getRadniciByFirma: async (req, res) => {
    const { firmaId } = req.params;
    try {
      const radnici = await executeQuery(
        `
        SELECT r.id, r.ime, r.prezime, r.jmbg, r.grad, r.adresa, 
               r.pozicija_id, r.firma_id, r.datum_zaposlenja, r.visina_zarade, 
               r.tip_radnog_vremena, r.tip_ugovora, r.datum_prestanka, r.napomene,
               p.naziv as pozicija_naziv, p.opis_poslova, u.vrsta_ugovora
        FROM radnici r 
        LEFT JOIN pozicije p ON r.pozicija_id = p.id 
        LEFT JOIN ugovori u ON r.id = u.radnik_id
        WHERE r.firma_id = ? 
        ORDER BY r.prezime, r.ime
      `,
        [firmaId]
      );
      res.json(radnici);
    } catch (error) {
      console.error("Greška pri dobijanju radnika po firmi:", error);
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // GET /api/radnici/:id - dobij radnika po ID-u (samo ako pripada korisniku)
  getRadnikById: async (req, res) => {
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

      // Dobij radnika samo ako pripada firmi ovog korisnika
      const [radnik] = await executeQuery(
        `
        SELECT r.id, r.ime, r.prezime, r.jmbg, r.grad, r.adresa, 
               r.pozicija_id, r.firma_id, r.datum_zaposlenja, r.visina_zarade, 
               r.tip_radnog_vremena, r.tip_ugovora, r.datum_prestanka, r.napomene,
               p.naziv as pozicija_naziv, p.opis_poslova, f.naziv as firma_naziv, u.vrsta_ugovora
        FROM radnici r 
        LEFT JOIN pozicije p ON r.pozicija_id = p.id 
        LEFT JOIN firme f ON r.firma_id = f.id 
        LEFT JOIN ugovori u ON r.id = u.radnik_id
        WHERE r.id = ? AND f.user_id = ?
      `,
        [id, user.id]
      );

      if (!radnik) {
        return res.status(404).json({
          message: "Radnik nije pronađen ili nemate dozvolu za pristup",
        });
      }
      res.json(radnik);
    } catch (error) {
      console.error("Greška pri dobijanju radnika:", error);
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // POST /api/radnici - dodaj novog radnika (samo u svoje firme)
  addRadnik: async (req, res) => {
    const {
      ime,
      prezime,
      jmbg,
      grad,
      adresa,
      pozicija_id,
      firma_id,
      datum_zaposlenja,
      visina_zarade,
      tip_radnog_vremena,
      tip_ugovora,
      vrsta_ugovora,
      datum_prestanka,
      napomene,
    } = req.body;

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

      // Proveri da li firma pripada korisniku
      const [firmaCheck] = await executeQuery(
        "SELECT id FROM firme WHERE id = ? AND user_id = ?",
        [firma_id, user.id]
      );

      if (!firmaCheck) {
        return res.status(403).json({
          message: "Nemate dozvolu da dodajete radnike u ovu firmu",
        });
      }

      if (
        !ime ||
        !prezime ||
        !jmbg ||
        !grad ||
        !adresa ||
        !pozicija_id ||
        !firma_id ||
        !datum_zaposlenja ||
        !visina_zarade ||
        !vrsta_ugovora
      ) {
        return res
          .status(400)
          .json({ message: "Sva obavezna polja moraju biti popunjena" });
      }

      // Validacija JMBG dužine
      if (jmbg.length !== 13) {
        return res
          .status(400)
          .json({ message: "JMBG mora imati tačno 13 cifara" });
      }

      // Dodaj radnika u bazu
      const result = await executeQuery(
        `INSERT INTO radnici (
          ime, prezime, jmbg, grad, adresa, pozicija_id, firma_id, 
          datum_zaposlenja, visina_zarade, tip_radnog_vremena, 
          tip_ugovora, datum_prestanka, napomene
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ime,
          prezime,
          jmbg,
          grad,
          adresa,
          pozicija_id,
          firma_id,
          datum_zaposlenja,
          visina_zarade,
          tip_radnog_vremena || "puno_8h",
          tip_ugovora || "na_neodredjeno",
          datum_prestanka || null,
          napomene || null,
        ]
      );

      const radnikId = result.insertId;

      // Automatski kreiraj ugovor za novog radnika
      const vrstaUgovoraText = {
        ugovor_o_radu: "Ugovor o radu",
        ugovor_o_djelu: "Ugovor o djelu",
        ugovor_o_dopunskom_radu: "Ugovor o dopunskom radu",
        autorski_ugovor: "Autorski ugovor",
        ugovor_o_pozajmnici: "Ugovor o pozajmnici",
      };

      await executeQuery(
        `INSERT INTO ugovori (
          firma_id, radnik_id, datum, tip_ugovora, 
          sadrzaj, vrsta_ugovora
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          firma_id,
          radnikId,
          datum_zaposlenja,
          tip_ugovora,
          vrstaUgovoraText[vrsta_ugovora] || "Ugovor",
          vrsta_ugovora,
        ]
      );

      res.json({ success: true, radnikId: radnikId });
    } catch (error) {
      console.error("Greška pri dodavanju radnika:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      res
        .status(500)
        .json({ message: "Greška na serveru", error: error.message });
    }
  },

  // PUT /api/radnici/:id - ažuriraj radnika (samo ako pripada korisniku)
  updateRadnik: async (req, res) => {
    const { id } = req.params;
    const {
      ime,
      prezime,
      jmbg,
      grad,
      adresa,
      pozicija_id,
      firma_id,
      datum_zaposlenja,
      visina_zarade,
      tip_radnog_vremena,
      tip_ugovora,
      datum_prestanka,
      napomene,
      vrsta_ugovora,
    } = req.body;

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

      // Proveri da li radnik pripada korisniku pre ažuriranja
      const [radnikCheck] = await executeQuery(
        `SELECT r.id FROM radnici r 
         LEFT JOIN firme f ON r.firma_id = f.id 
         WHERE r.id = ? AND f.user_id = ?`,
        [id, user.id]
      );

      if (!radnikCheck) {
        return res.status(403).json({
          message: "Nemate dozvolu da ažurirate ovog radnika",
        });
      }

      // Proveri da li nova firma pripada korisniku
      const [firmaCheck] = await executeQuery(
        "SELECT id FROM firme WHERE id = ? AND user_id = ?",
        [firma_id, user.id]
      );

      if (!firmaCheck) {
        return res.status(403).json({
          message: "Nemate dozvolu da dodelite radnika ovoj firmi",
        });
      }

      if (
        !ime ||
        !prezime ||
        !jmbg ||
        !pozicija_id ||
        !firma_id ||
        !datum_zaposlenja ||
        !visina_zarade
      ) {
        return res
          .status(400)
          .json({ message: "Sva obavezna polja moraju biti popunjena" });
      }

      // Ažuriraj radnika
      await executeQuery(
        `UPDATE radnici SET 
          ime = ?, prezime = ?, jmbg = ?, grad = ?, adresa = ?, pozicija_id = ?, firma_id = ?,
          datum_zaposlenja = ?, visina_zarade = ?, tip_radnog_vremena = ?,
          tip_ugovora = ?, datum_prestanka = ?, napomene = ?
        WHERE id = ?`,
        [
          ime,
          prezime,
          jmbg,
          grad || null,
          adresa || null,
          pozicija_id,
          firma_id,
          datum_zaposlenja,
          visina_zarade,
          tip_radnog_vremena || "puno_8h",
          tip_ugovora || "na_neodredjeno",
          datum_prestanka || null,
          napomene || null,
          id,
        ]
      );

      // Ažuriraj vrstu ugovora u tabeli ugovori ako postoji
      if (vrsta_ugovora) {
        await executeQuery(
          `UPDATE ugovori SET vrsta_ugovora = ? WHERE radnik_id = ?`,
          [vrsta_ugovora, id]
        );
      }

      res.json({ success: true, message: "Radnik je uspešno ažuriran" });
    } catch (error) {
      console.error("Greška pri ažuriranju radnika:", error);
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // DELETE /api/radnici/:id - obriši radnika (samo ako pripada korisniku)
  deleteRadnik: async (req, res) => {
    const { id } = req.params;
    const { force } = req.query; // Opcija za forsiranje brisanja

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

      // Proveri da li radnik pripada korisniku
      const [radnikCheck] = await executeQuery(
        `SELECT r.id FROM radnici r 
         LEFT JOIN firme f ON r.firma_id = f.id 
         WHERE r.id = ? AND f.user_id = ?`,
        [id, user.id]
      );

      if (!radnikCheck) {
        return res.status(403).json({
          success: false,
          message: "Nemate dozvolu da obrišete ovog radnika",
        });
      }

      // Prvo proveri da li radnik ima ugovore
      const ugovori = await executeQuery(
        "SELECT COUNT(*) as count FROM ugovori WHERE radnik_id = ?",
        [id]
      );

      if (ugovori[0].count > 0 && !force) {
        return res.status(400).json({
          success: false,
          message: `Radnik ima ${ugovori[0].count} povezan(ih) ugovor(a). Da li želite da obrišete radnika i sve povezane ugovore?`,
          hasContracts: true,
          contractCount: ugovori[0].count,
        });
      }

      // Ako je force=true, prvo obriši ugovore
      if (force === "true" && ugovori[0].count > 0) {
        await executeQuery("DELETE FROM ugovori WHERE radnik_id = ?", [id]);
      }

      await executeQuery("DELETE FROM radnici WHERE id = ?", [id]);
      res.json({
        success: true,
        message:
          force === "true" && ugovori[0].count > 0
            ? `Radnik i ${ugovori[0].count} povezan(ih) ugovor(a) su uspešno obrisani`
            : "Radnik je uspešno obrisan",
      });
    } catch (error) {
      console.error("Greška pri brisanju radnika:", error);

      // Specifično rukovanje foreign key greškom
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        res.status(400).json({
          success: false,
          message: "Ne možete obrisati radnika jer ima povezane ugovore.",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Greška na serveru",
          error: error.message,
        });
      }
    }
  },
};

module.exports = radniciController;
