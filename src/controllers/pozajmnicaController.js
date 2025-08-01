const { executeQuery } = require("../config/database");

// Kreiraj novu pozajmicu
exports.createPozajmica = async (req, res) => {
  console.log("=== CREATE POZAJMICA ===");
  console.log("Request body:", req.body);

  const {
    firma_id,
    radnik_id,
    iznos,
    svrha,
    broj_ugovora,
    datum_izdavanja,
    datum_dospeća,
    napomene,
  } = req.body;

  console.log("Extracted values:", {
    firma_id,
    radnik_id,
    iznos,
    svrha,
    broj_ugovora,
    datum_izdavanja,
    datum_dospeća,
    napomene,
  });

  try {
    // Proveri da li broj ugovora već postoji
    const existingContract = await executeQuery(
      "SELECT id FROM pozajmnice WHERE broj_ugovora = ?",
      [broj_ugovora]
    );

    if (existingContract.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Broj ugovora već postoji",
      });
    }

    const result = await executeQuery(
      `INSERT INTO pozajmnice (firma_id, radnik_id, iznos, svrha, broj_ugovora, 
       datum_izdavanja, datum_dospeća, napomene) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firma_id || null,
        radnik_id || null,
        iznos || null,
        svrha || null,
        broj_ugovora || null,
        datum_izdavanja || null,
        datum_dospeća || null,
        napomene || null,
      ]
    );

    res.json({
      success: true,
      pozajmnicaId: result.insertId,
      message: "Pozajmica je uspešno kreirana",
    });
  } catch (error) {
    console.error("=== ERROR CREATING POZAJMICA ===");
    console.error("Error details:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      message: "Greška pri kreiranju pozajmice",
      error: error.message,
    });
  }
};

// Dohvati sve pozajmice
exports.getAllPozajmice = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Nije autentifikovan",
      });
    }

    const username = req.session.user.username;
    const userRole = req.session.user.role;

    console.log("=== POZAJMICE DEBUG ===");
    console.log("Username:", username);
    console.log("User Role:", userRole);

    // Dobij user_id
    const users = await executeQuery(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Korisnik nije pronađen",
      });
    }

    const userId = users[0].id;
    console.log("User ID:", userId);
    let pozajmice = [];

    if (userRole === "firma") {
      // Za firmu korisnika - vrati pozajmice samo za njegovu firmu
      const firme = await executeQuery(
        "SELECT id FROM firme WHERE user_id = ?",
        [userId]
      );

      console.log("Firme za user_id", userId, ":", firme);

      if (firme.length === 0) {
        console.log("Nema firmi za korisnika");
        return res.json({
          success: true,
          pozajmice: [],
        });
      }

      const firmaId = firme[0].id;
      console.log("Filtering pozajmice for firma_id:", firmaId);

      pozajmice = await executeQuery(
        `SELECT p.*, 
                f.naziv as firma_naziv,
                r.ime as radnik_ime, r.prezime as radnik_prezime
         FROM pozajmnice p
         LEFT JOIN firme f ON p.firma_id = f.id
         LEFT JOIN radnici r ON p.radnik_id = r.id  
         WHERE p.firma_id = ?
         ORDER BY p.datum_izdavanja DESC`,
        [firmaId]
      );
    } else if (userRole === "admin") {
      // Za admina - vrati sve pozajmice
      pozajmice = await executeQuery(
        `SELECT p.*, 
                f.naziv as firma_naziv,
                r.ime as radnik_ime, r.prezime as radnik_prezime
         FROM pozajmnice p
         LEFT JOIN firme f ON p.firma_id = f.id
         LEFT JOIN radnici r ON p.radnik_id = r.id  
         ORDER BY p.datum_izdavanja DESC`
      );
    }

    res.json({
      success: true,
      pozajmice,
    });
  } catch (error) {
    console.error("Error fetching pozajmice:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dohvaćanju pozajmica",
    });
  }
};

// Dohvati pozajmice po firmi
exports.getPozajmiceByFirma = async (req, res) => {
  const { firmaId } = req.params;

  try {
    const pozajmice = await executeQuery(
      `SELECT p.*, 
              f.naziv as firma_naziv,
              r.ime as radnik_ime, r.prezime as radnik_prezime
       FROM pozajmnice p
       LEFT JOIN firme f ON p.firma_id = f.id
       LEFT JOIN radnici r ON p.radnik_id = r.id  
       WHERE p.firma_id = ?
       ORDER BY p.datum_izdavanja DESC`,
      [firmaId]
    );

    res.json({
      success: true,
      pozajmice,
    });
  } catch (error) {
    console.error("Error fetching pozajmice by firma:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dohvaćanju pozajmica",
    });
  }
};

// Ažuriraj pozajmicu
exports.updatePozajmica = async (req, res) => {
  const { id } = req.params;
  const {
    firma_id,
    radnik_id,
    iznos,
    svrha,
    broj_ugovora,
    datum_izdavanja,
    datum_dospeća,
    status,
    napomene,
  } = req.body;

  try {
    await executeQuery(
      `UPDATE pozajmnice SET 
       firma_id = ?, radnik_id = ?, iznos = ?, svrha = ?, broj_ugovora = ?, 
       datum_izdavanja = ?, datum_dospeća = ?, status = ?, napomene = ?
       WHERE id = ?`,
      [
        firma_id || null,
        radnik_id || null,
        iznos || null,
        svrha || null,
        broj_ugovora || null,
        datum_izdavanja || null,
        datum_dospeća || null,
        status || null,
        napomene || null,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Pozajmica je uspešno ažurirana",
    });
  } catch (error) {
    console.error("Error updating pozajmica:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri ažuriranju pozajmice",
    });
  }
};

// Obriši pozajmicu
exports.deletePozajmica = async (req, res) => {
  const { id } = req.params;

  try {
    await executeQuery("DELETE FROM pozajmnice WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Pozajmica je uspešno obrisana",
    });
  } catch (error) {
    console.error("Error deleting pozajmica:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri brisanju pozajmice",
    });
  }
};

// Dohvati sledeći broj ugovora
exports.getNextBrojUgovora = async (req, res) => {
  try {
    const result = await executeQuery(
      "SELECT MAX(CAST(broj_ugovora AS UNSIGNED)) as maxNumber FROM pozajmnice WHERE broj_ugovora REGEXP '^[0-9]+$'"
    );

    const maxNumber = result[0]?.maxNumber || 0;
    const nextNumber = maxNumber + 1;

    res.json({
      success: true,
      nextBrojUgovora: nextNumber.toString().padStart(3, "0"),
    });
  } catch (error) {
    console.error("Error getting next broj ugovora:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri generisanju broja ugovora",
    });
  }
};

// Dohvati jednu pozajmicu po ID
exports.getPozajmicaById = async (req, res) => {
  const { id } = req.params;

  try {
    const pozajmice = await executeQuery(
      `SELECT p.*, 
              f.naziv as firma_naziv,
              f.adresa as firma_adresa,
              f.pib as firma_pib,
              f.direktor_ime_prezime as direktor_ime_prezime,
              f.direktor_jmbg as direktor_jmbg,
              f.grad as firma_grad,
              r.ime as radnik_ime, r.prezime as radnik_prezime, r.jmbg as radnik_jmbg
       FROM pozajmnice p
       LEFT JOIN firme f ON p.firma_id = f.id
       LEFT JOIN radnici r ON p.radnik_id = r.id  
       WHERE p.id = ?`,
      [id]
    );

    if (pozajmice.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pozajmica nije pronađena",
      });
    }

    res.json({
      success: true,
      pozajmica: pozajmice[0],
    });
  } catch (error) {
    console.error("Error fetching pozajmica by id:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dohvaćanju pozajmice",
    });
  }
};
