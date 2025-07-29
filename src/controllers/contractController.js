const { executeQuery } = require("../config/database");

// Dodaj novi ugovor
exports.addContract = async (req, res) => {
  const { firma_id, radnik_id, datum, tip_ugovora, sadrzaj } = req.body;
  try {
    const result = await executeQuery(
      "INSERT INTO ugovori (firma_id, radnik_id, datum, tip_ugovora, sadrzaj) VALUES (?, ?, ?, ?, ?)",
      [firma_id, radnik_id, datum, tip_ugovora, sadrzaj]
    );
    res.json({ success: true, contractId: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Greška na serveru" });
  }
};

// Dohvati sve ugovore
exports.getAllContracts = async (req, res) => {
  try {
    const contracts = await executeQuery(
      `SELECT u.*, 
              f.naziv as firma_naziv,
              r.ime as radnik_ime, r.prezime as radnik_prezime,
              p.naziv as pozicija_naziv
       FROM ugovori u
       LEFT JOIN firme f ON u.firma_id = f.id
       LEFT JOIN radnici r ON u.radnik_id = r.id  
       LEFT JOIN pozicije p ON r.pozicija_id = p.id
       ORDER BY u.datum DESC`
    );
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ message: "Greška na serveru" });
  }
};

// Dohvati ugovor po ID-u sa podacima o firmi i radniku
exports.getContractById = async (req, res) => {
  const { id } = req.params;
  try {
    const [contract] = await executeQuery(
      `SELECT u.*, 
              f.naziv as firma_naziv, f.adresa as firma_adresa, f.pib as firma_pib, f.direktor_ime_prezime,
              r.ime as radnik_ime, r.prezime as radnik_prezime, r.jmbg as radnik_jmbg,
              r.datum_zaposlenja, r.visina_zarade, r.tip_radnog_vremena, r.tip_ugovora as radnik_tip_ugovora, r.datum_prestanka,
              p.naziv as pozicija_naziv, p.opis_poslova
       FROM ugovori u
       LEFT JOIN firme f ON u.firma_id = f.id
       LEFT JOIN radnici r ON u.radnik_id = r.id  
       LEFT JOIN pozicije p ON r.pozicija_id = p.id
       WHERE u.id = ?`,
      [id]
    );
    if (!contract) {
      return res.status(404).json({ message: "Ugovor nije pronađen" });
    }
    res.json(contract);
  } catch (error) {
    res.status(500).json({ message: "Greška na serveru" });
  }
};

// Ažuriraj ugovor
exports.updateContract = async (req, res) => {
  const { id } = req.params;
  const { firma_id, radnik_id, datum, tip_ugovora, sadrzaj } = req.body;
  try {
    await executeQuery(
      "UPDATE ugovori SET firma_id = ?, radnik_id = ?, datum = ?, tip_ugovora = ?, sadrzaj = ? WHERE id = ?",
      [firma_id, radnik_id, datum, tip_ugovora, sadrzaj, id]
    );
    res.json({ success: true, message: "Ugovor je uspešno ažuriran" });
  } catch (error) {
    res.status(500).json({ message: "Greška na serveru" });
  }
};

// Obriši ugovor
exports.deleteContract = async (req, res) => {
  const { id } = req.params;
  try {
    await executeQuery("DELETE FROM ugovori WHERE id = ?", [id]);
    res.json({ success: true, message: "Ugovor je uspešno obrisan" });
  } catch (error) {
    res.status(500).json({ message: "Greška na serveru" });
  }
};

// Pretraži ugovore
exports.searchUgovori = async (req, res) => {
  try {
    const query = req.query.q;

    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    const searchTerm = `%${query.trim()}%`;
    const ugovori = await executeQuery(
      `SELECT u.id, u.firma_id, u.radnik_id, u.datum, u.tip_ugovora as tip,
              f.naziv as firma_naziv,
              CONCAT(r.ime, ' ', r.prezime) as radnik,
              DATE_FORMAT(u.datum, '%d.%m.%Y') as datum
       FROM ugovori u
       LEFT JOIN firme f ON u.firma_id = f.id
       LEFT JOIN radnici r ON u.radnik_id = r.id  
       WHERE u.tip_ugovora LIKE ? OR 
             f.naziv LIKE ? OR
             CONCAT(r.ime, ' ', r.prezime) LIKE ?
       ORDER BY u.datum DESC
       LIMIT 10`,
      [searchTerm, searchTerm, searchTerm]
    );
    res.json(ugovori);
  } catch (error) {
    console.error("Search ugovori error:", error);
    res.status(500).json({ message: "Greška na serveru" });
  }
};
