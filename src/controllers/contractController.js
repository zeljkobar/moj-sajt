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
    console.error("Greška pri dodavanju ugovora:", error);
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
    console.error("Greška pri dobijanju ugovora:", error);
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
    console.error("Greška pri dobijanju ugovora:", error);
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
    console.error("Greška pri ažuriranju ugovora:", error);
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
    console.error("Greška pri brisanju ugovora:", error);
    res.status(500).json({ message: "Greška na serveru" });
  }
};
