const { executeQuery } = require("../config/database");

// Kreiranje novog otkaza
exports.createOtkaz = async (req, res) => {
  try {
    // Provjeri autentifikaciju
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Korisnik nije autentifikovan!",
      });
    }

    // Debugging - loguj šta je stiglo
    console.log("=== OTKAZ DEBUG ===");
    console.log("req.body:", req.body);
    console.log("req.session.user:", req.session.user);
    console.log("==================");

    const { radnik_id, tip_otkaza, datum_otkaza, razlog_otkaza } = req.body;
    const user_id = req.session.user.id;

    console.log("Extrahovani podaci:");
    console.log("radnik_id:", radnik_id);
    console.log("tip_otkaza:", tip_otkaza);
    console.log("datum_otkaza:", datum_otkaza);
    console.log("razlog_otkaza:", razlog_otkaza);
    console.log("user_id:", user_id);

    // Validacija
    if (!radnik_id || !tip_otkaza || !datum_otkaza) {
      return res.status(400).json({
        success: false,
        message: "Sva obavezna polja moraju biti popunjena!",
      });
    }

    // Proveri da li već postoji otkaz za ovog radnika
    const existingOtkaz = await executeQuery(
      "SELECT id FROM otkazi WHERE radnik_id = ?",
      [radnik_id]
    );

    if (existingOtkaz.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Otkaz za ovog radnika već postoji!",
      });
    }

    // Kreiraj novi otkaz
    const result = await executeQuery(
      `
            INSERT INTO otkazi (radnik_id, tip_otkaza, datum_otkaza, razlog_otkaza, user_id)
            VALUES (?, ?, ?, ?, ?)
        `,
      [radnik_id, tip_otkaza, datum_otkaza, razlog_otkaza, user_id]
    );

    // Ažuriraj status radnika na 'otkazan'
    await executeQuery(
      `
            UPDATE radnici SET status = 'otkazan'
            WHERE id = ?
        `,
      [radnik_id]
    );

    res.json({
      success: true,
      message: "Otkaz je uspešno kreiran!",
      otkaz_id: result.insertId,
    });
  } catch (error) {
    console.error("Greška pri kreiranju otkaza:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri kreiranju otkaza: " + error.message,
    });
  }
};

// Dobijanje svih otkaza
exports.getOtkazi = async (req, res) => {
  try {
    // Provjeri autentifikaciju
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Korisnik nije autentifikovan!",
      });
    }

    const user_id = req.session.user.id;
    const user_role = req.session.user.role;

    let query = `
            SELECT 
                o.*,
                r.ime,
                r.prezime,
                r.jmbg,
                r.firma_id,
                f.naziv as firma_naziv,
                p.naziv as pozicija_naziv
            FROM otkazi o
            JOIN radnici r ON o.radnik_id = r.id
            JOIN firme f ON r.firma_id = f.id
            LEFT JOIN pozicije p ON r.pozicija_id = p.id
        `;

    let params = [];

    // Ograniči pristup na osnovu role
    if (user_role !== "admin") {
      query += " WHERE o.user_id = ?";
      params.push(user_id);
    }

    query += " ORDER BY o.created_at DESC";

    const otkazi = await executeQuery(query, params);

    res.json({
      success: true,
      otkazi: otkazi,
    });
  } catch (error) {
    console.error("Greška pri dobijanju otkaza:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dobijanju otkaza: " + error.message,
    });
  }
};

// Dobijanje otkaza po ID-u
exports.getOtkazById = async (req, res) => {
  try {
    // Provjeri autentifikaciju
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Korisnik nije autentifikovan!",
      });
    }

    const { id } = req.params;
    const user_id = req.session.user.id;
    const user_role = req.session.user.role;

    let query = `
            SELECT 
                o.*,
                r.ime,
                r.prezime,
                r.jmbg,
                r.datum_zaposlenja,
                r.datum_prestanka,
                r.tip_ugovora,
                f.naziv as firma_naziv,
                f.adresa as firma_adresa,
                f.pib as firma_pib,
                f.pdvBroj as firma_pdv_broj,
                f.direktor_ime_prezime as firma_direktor,
                p.naziv as pozicija_naziv
            FROM otkazi o
            JOIN radnici r ON o.radnik_id = r.id
            JOIN firme f ON r.firma_id = f.id
            LEFT JOIN pozicije p ON r.pozicija_id = p.id
            WHERE o.id = ?
        `;

    let params = [id];

    // Ograniči pristup na osnovu role
    if (user_role !== "admin") {
      query += " AND o.user_id = ?";
      params.push(user_id);
    }

    const otkazi = await executeQuery(query, params);

    if (otkazi.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Otkaz nije pronađen!",
      });
    }

    res.json({
      success: true,
      otkaz: otkazi[0],
    });
  } catch (error) {
    console.error("Greška pri dobijanju otkaza:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dobijanju otkaza: " + error.message,
    });
  }
};

// Brisanje otkaza
exports.deleteOtkaz = async (req, res) => {
  try {
    // Provjeri autentifikaciju
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Korisnik nije autentifikovan!",
      });
    }

    const { id } = req.params;
    const user_id = req.session.user.id;
    const user_role = req.session.user.role;

    // Prvo pronađi otkaz da dobiješ radnik_id
    let checkQuery = `
            SELECT radnik_id FROM otkazi WHERE id = ?
        `;

    let checkParams = [id];

    if (user_role !== "admin") {
      checkQuery += " AND user_id = ?";
      checkParams.push(user_id);
    }

    const otkazi = await executeQuery(checkQuery, checkParams);

    if (otkazi.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Otkaz nije pronađen!",
      });
    }

    const otkaz = otkazi[0];

    // Obriši otkaz
    await executeQuery("DELETE FROM otkazi WHERE id = ?", [id]);

    // Vrati status radnika na 'aktivan' (bez updated_at jer kolona ne postoji)
    await executeQuery(
      `
            UPDATE radnici SET status = 'aktivan'
            WHERE id = ?
        `,
      [otkaz.radnik_id]
    );

    res.json({
      success: true,
      message: "Otkaz je uspešno obrisan!",
    });
  } catch (error) {
    console.error("Greška pri brisanju otkaza:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri brisanju otkaza: " + error.message,
    });
  }
};

// Dobavi sve otkaze za određenu firmu
exports.getOtkazByFirma = async (req, res) => {
  try {
    // Provjeri autentifikaciju
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Korisnik nije autentifikovan!",
      });
    }

    const { firmaId } = req.params;

    if (!firmaId) {
      return res.status(400).json({
        success: false,
        message: "ID firme je obavezan!",
      });
    }

    // Query koji dobavlja otkaze sa podacima o radniku i poziciji
    const query = `
      SELECT 
        o.id,
        o.radnik_id,
        o.tip_otkaza,
        o.datum_otkaza,
        o.razlog_otkaza,
        o.created_at,
        r.ime,
        r.prezime,
        r.jmbg,
        r.firma_id,
        p.naziv as pozicija_naziv
      FROM otkazi o
      JOIN radnici r ON o.radnik_id = r.id
      LEFT JOIN pozicije p ON r.pozicija_id = p.id
      WHERE r.firma_id = ?
      ORDER BY o.created_at DESC
    `;

    const otkazi = await executeQuery(query, [firmaId]);

    res.json({
      success: true,
      data: otkazi,
    });
  } catch (error) {
    console.error("Greška pri dobavljanju otkaza po firmi:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dobavljanju otkaza!",
      error: error.message,
    });
  }
};

// Dobavljanje otkaza po radniku
exports.getOtkazByRadnik = async (req, res) => {
  try {
    // Provjeri autentifikaciju
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Korisnik nije autentifikovan!",
      });
    }

    const { radnikId } = req.params;

    if (!radnikId) {
      return res.status(400).json({
        success: false,
        message: "ID radnika je obavezan!",
      });
    }

    // Query koji dobavlja otkaz sa podacima o radniku, firmi i poziciji
    const query = `
      SELECT 
        o.id,
        o.radnik_id,
        o.tip_otkaza,
        o.datum_otkaza,
        o.razlog_otkaza,
        o.created_at,
        r.ime,
        r.prezime,
        r.jmbg,
        r.firma_id,
        f.naziv as firma_naziv,
        p.naziv as pozicija_naziv
      FROM otkazi o
      JOIN radnici r ON o.radnik_id = r.id
      JOIN firme f ON r.firma_id = f.id
      LEFT JOIN pozicije p ON r.pozicija_id = p.id
      WHERE o.radnik_id = ?
      LIMIT 1
    `;

    const result = await executeQuery(query, [radnikId]);

    if (result.length === 0) {
      return res.json({
        success: true,
        otkaz: null,
        message: "Radnik nema otkaz",
      });
    }

    res.json({
      success: true,
      otkaz: result[0],
    });
  } catch (error) {
    console.error("Greška pri dobavljanju otkaza po radniku:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dobavljanju otkaza!",
      error: error.message,
    });
  }
};
