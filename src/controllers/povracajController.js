const { executeQuery } = require("../config/database");

// ============================================
// POZAJMICA POVRAĆAJI CONTROLLER
// ============================================

// Kreiraj novi povraćaj
exports.createPovracaj = async (req, res) => {
  const { pozajmica_id, iznos_povracaja, datum_povracaja, napomena } = req.body;

  try {
    // Proveri da li pozajmica postoji
    const [pozajmica] = await executeQuery(
      "SELECT id, iznos, ukupno_vraceno, preostalo_dugovanje FROM pozajmnice WHERE id = ?",
      [pozajmica_id]
    );

    if (!pozajmica) {
      return res.status(404).json({
        success: false,
        message: "Pozajmica nije pronađena",
      });
    }

    if (iznos_povracaja <= 0) {
      return res.status(400).json({
        success: false,
        message: "Iznos povraćaja mora biti veći od 0",
      });
    }

    if (iznos_povracaja > pozajmica.preostalo_dugovanje) {
      return res.status(400).json({
        success: false,
        message: `Iznos povraćaja (${iznos_povracaja}€) ne može biti veći od preostalog dugovanja (${pozajmica.preostalo_dugovanje}€)`,
      });
    }

    // Dodaj povraćaj
    const result = await executeQuery(
      `INSERT INTO pozajmica_povracaji (pozajmica_id, iznos_povracaja, datum_povracaja, napomena) 
       VALUES (?, ?, ?, ?)`,
      [pozajmica_id, iznos_povracaja, datum_povracaja, napomena || null]
    );

    res.json({
      success: true,
      povracajId: result.insertId,
      message: "Povraćaj je uspešno zabeležen",
    });
  } catch (error) {
    console.error("Error creating povracaj:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri kreiranju povraćaja",
    });
  }
};

// Dohvati sve povraćaje za pozajmnicu
exports.getPovracajeByPozajmica = async (req, res) => {
  const { pozajmicaId } = req.params;

  try {
    const povracaji = await executeQuery(
      `SELECT pp.*, p.broj_ugovora, p.iznos as iznos_pozajmice
       FROM pozajmica_povracaji pp
       JOIN pozajmnice p ON pp.pozajmica_id = p.id
       WHERE pp.pozajmica_id = ?
       ORDER BY pp.datum_povracaja DESC, pp.created_at DESC`,
      [pozajmicaId]
    );

    res.json({
      success: true,
      povracaji,
    });
  } catch (error) {
    console.error("Error fetching povracaji:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dohvaćanju povraćaja",
    });
  }
};

// Dohvati sve povraćaje za firmu
exports.getPovracajeByFirma = async (req, res) => {
  const { firmaId } = req.params;

  try {
    const povracaji = await executeQuery(
      `SELECT pp.*, p.broj_ugovora, p.iznos as iznos_pozajmice,
              f.naziv as firma_naziv,
              r.ime as radnik_ime, r.prezime as radnik_prezime
       FROM pozajmica_povracaji pp
       JOIN pozajmnice p ON pp.pozajmica_id = p.id
       LEFT JOIN firme f ON p.firma_id = f.id
       LEFT JOIN radnici r ON p.radnik_id = r.id
       WHERE p.firma_id = ?
       ORDER BY pp.datum_povracaja DESC, pp.created_at DESC`,
      [firmaId]
    );

    res.json({
      success: true,
      povracaji,
    });
  } catch (error) {
    console.error("Error fetching povracaji by firma:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dohvaćanju povraćaja",
    });
  }
};

// Ažuriraj povraćaj
exports.updatePovracaj = async (req, res) => {
  const { id } = req.params;
  const { iznos_povracaja, datum_povracaja, napomena } = req.body;

  try {
    // Prvo obriši stari povraćaj da se izračuna novo stanje
    const [oldPovracaj] = await executeQuery(
      "SELECT pozajmica_id, iznos_povracaja FROM pozajmica_povracaji WHERE id = ?",
      [id]
    );

    if (!oldPovracaj) {
      return res.status(404).json({
        success: false,
        message: "Povraćaj nije pronađen",
      });
    }

    // Proveri da li je novi iznos valjan
    const [pozajmica] = await executeQuery(
      "SELECT iznos, ukupno_vraceno FROM pozajmnice WHERE id = ?",
      [oldPovracaj.pozajmica_id]
    );

    const novoPreostaloDugovanje =
      pozajmica.iznos -
      (pozajmica.ukupno_vraceno -
        oldPovracaj.iznos_povracaja +
        parseFloat(iznos_povracaja));

    if (novoPreostaloDugovanje < 0) {
      return res.status(400).json({
        success: false,
        message: "Novi iznos povraćaja je prevelik",
      });
    }

    // Ažuriraj povraćaj
    await executeQuery(
      `UPDATE pozajmica_povracaji 
       SET iznos_povracaja = ?, datum_povracaja = ?, napomena = ?
       WHERE id = ?`,
      [iznos_povracaja, datum_povracaja, napomena || null, id]
    );

    res.json({
      success: true,
      message: "Povraćaj je uspešno ažuriran",
    });
  } catch (error) {
    console.error("Error updating povracaj:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri ažuriranju povraćaja",
    });
  }
};

// Obriši povraćaj
exports.deletePovracaj = async (req, res) => {
  const { id } = req.params;

  try {
    await executeQuery("DELETE FROM pozajmica_povracaji WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Povraćaj je uspešno obrisan",
    });
  } catch (error) {
    console.error("Error deleting povracaj:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri brisanju povraćaja",
    });
  }
};

// Dohvati statistike povraćaja za firmu
exports.getStatistikeByFirma = async (req, res) => {
  const { firmaId } = req.params;

  try {
    const [statistike] = await executeQuery(
      `SELECT 
         COUNT(p.id) as ukupno_pozajmica,
         COUNT(CASE WHEN p.status = 'aktivna' THEN 1 END) as aktivne_pozajmice,
         COUNT(CASE WHEN p.status = 'delimicno_vracena' THEN 1 END) as delimicno_vracene,
         COUNT(CASE WHEN p.status = 'potpuno_vracena' THEN 1 END) as potpuno_vracene,
         COALESCE(SUM(p.iznos), 0) as ukupno_pozajmljeno,
         COALESCE(SUM(p.ukupno_vraceno), 0) as ukupno_vraceno,
         COALESCE(SUM(p.preostalo_dugovanje), 0) as ukupno_preostalo,
         (SELECT COUNT(*) FROM pozajmica_povracaji pp2 WHERE pp2.pozajmica_id IN (SELECT id FROM pozajmnice WHERE firma_id = ?)) as ukupno_povracaja
       FROM pozajmnice p
       WHERE p.firma_id = ?`,
      [firmaId, firmaId]
    );

    res.json({
      success: true,
      statistike,
    });
  } catch (error) {
    console.error("Error fetching statistike:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dohvaćanju statistika",
    });
  }
};
