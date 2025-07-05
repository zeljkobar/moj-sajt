const { executeQuery } = require("../config/database");

const radniciController = {
  // GET /api/radnici - dobij sve radnike
  getAllRadnici: async (req, res) => {
    try {
      const radnici = await executeQuery(`
        SELECT r.*, p.naziv as pozicija_naziv, f.naziv as firma_naziv, u.vrsta_ugovora
        FROM radnici r 
        LEFT JOIN pozicije p ON r.pozicija_id = p.id 
        LEFT JOIN firme f ON r.firma_id = f.id 
        LEFT JOIN ugovori u ON r.id = u.radnik_id
        ORDER BY r.prezime, r.ime
      `);

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
        SELECT r.*, p.naziv as pozicija_naziv, p.opis_poslova, u.vrsta_ugovora
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

  // GET /api/radnici/:id - dobij radnika po ID-u
  getRadnikById: async (req, res) => {
    const { id } = req.params;
    try {
      const [radnik] = await executeQuery(
        `
        SELECT r.*, p.naziv as pozicija_naziv, p.opis_poslova, f.naziv as firma_naziv, u.vrsta_ugovora
        FROM radnici r 
        LEFT JOIN pozicije p ON r.pozicija_id = p.id 
        LEFT JOIN firme f ON r.firma_id = f.id 
        LEFT JOIN ugovori u ON r.id = u.radnik_id
        WHERE r.id = ?
      `,
        [id]
      );
      if (!radnik) {
        return res.status(404).json({ message: "Radnik nije pronađen" });
      }
      res.json(radnik);
    } catch (error) {
      console.error("Greška pri dobijanju radnika:", error);
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // POST /api/radnici - dodaj novog radnika
  addRadnik: async (req, res) => {
    const {
      ime,
      prezime,
      jmbg,
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
      if (
        !ime ||
        !prezime ||
        !jmbg ||
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
          ime, prezime, jmbg, pozicija_id, firma_id, 
          datum_zaposlenja, visina_zarade, tip_radnog_vremena, 
          tip_ugovora, datum_prestanka, napomene
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ime,
          prezime,
          jmbg,
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

  // PUT /api/radnici/:id - ažuriraj radnika
  updateRadnik: async (req, res) => {
    const { id } = req.params;
    const {
      ime,
      prezime,
      jmbg,
      pozicija_id,
      firma_id,
      datum_zaposlenja,
      visina_zarade,
      tip_radnog_vremena,
      tip_ugovora,
      datum_prestanka,
      napomene,
    } = req.body;

    try {
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

      await executeQuery(
        `UPDATE radnici SET 
          ime = ?, prezime = ?, jmbg = ?, pozicija_id = ?, firma_id = ?,
          datum_zaposlenja = ?, visina_zarade = ?, tip_radnog_vremena = ?,
          tip_ugovora = ?, datum_prestanka = ?, napomene = ?
        WHERE id = ?`,
        [
          ime,
          prezime,
          jmbg,
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
      res.json({ success: true, message: "Radnik je uspešno ažuriran" });
    } catch (error) {
      console.error("Greška pri ažuriranju radnika:", error);
      res.status(500).json({ message: "Greška na serveru" });
    }
  },

  // DELETE /api/radnici/:id - obriši radnika
  deleteRadnik: async (req, res) => {
    const { id } = req.params;
    const { force } = req.query; // Opcija za forsiranje brisanja

    try {
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
