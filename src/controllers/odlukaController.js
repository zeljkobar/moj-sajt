const { executeQuery } = require("../config/database");

// GET /api/odluka/povracaj/:povracajId
const getOdlukaPovracaj = async (req, res) => {
  try {
    const povracajId = req.params.povracajId;

    // Query koji JOIN-uje sve potrebne tabele
    const query = `
      SELECT 
        pov.id as povracaj_id,
        pov.iznos_povracaja,
        pov.datum_povracaja,
        pov.napomena as povracaj_napomena,
        
        poz.id as pozajmica_id,
        poz.broj_ugovora,
        poz.datum_izdavanja,
        poz.iznos as ukupan_iznos_pozajmice,
        poz.svrha,
        
        f.naziv as firma_naziv,
        f.pib as firma_pib,
        f.adresa as firma_adresa,
        f.grad as firma_grad,
        f.direktor_ime_prezime,
        f.direktor_jmbg,
        
        r.ime as radnik_ime,
        r.prezime as radnik_prezime,
        r.jmbg as radnik_jmbg,
        
        -- Kalkulacija ukupno vraćeno i preostalo
        COALESCE((
          SELECT SUM(p2.iznos_povracaja) 
          FROM pozajmica_povracaji p2 
          WHERE p2.pozajmica_id = poz.id
        ), 0) as ukupno_vraceno,
        
        (poz.iznos - COALESCE((
          SELECT SUM(p2.iznos_povracaja) 
          FROM pozajmica_povracaji p2 
          WHERE p2.pozajmica_id = poz.id
        ), 0)) as preostalo_dugovanje
        
      FROM pozajmica_povracaji pov
      JOIN pozajmnice poz ON pov.pozajmica_id = poz.id
      JOIN firme f ON poz.firma_id = f.id
      JOIN radnici r ON poz.radnik_id = r.id
      WHERE pov.id = ?
    `;

    const rows = await executeQuery(query, [povracajId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Povraćaj nije pronađen",
      });
    }

    const data = rows[0];

    // Dobij sve prethodne povraćaje za ovu pozajmicu (osim trenutnog)
    const prethodniPovracajiQuery = `
      SELECT 
        datum_povracaja,
        iznos_povracaja,
        napomena
      FROM pozajmica_povracaji 
      WHERE pozajmica_id = ? AND id != ?
      ORDER BY datum_povracaja ASC
    `;

    const prethodniPovracaji = await executeQuery(prethodniPovracajiQuery, [
      data.pozajmica_id,
      povracajId,
    ]);

    // Generiši broj odluke - jednostavan pristup bez tabele
    const trenutniDatum = new Date();
    const mesec = String(trenutniDatum.getMonth() + 1).padStart(2, "0");
    const dan = String(trenutniDatum.getDate()).padStart(2, "0");
    const godina = trenutniDatum.getFullYear();

    // Format: OD-001/07/2025 (OD = Odluka, broj/mesec/godina)
    const brojOdluke = `OD-${povracajId}/${mesec}/${godina}`;

    const odlukaData = {
      // Osnovni podaci
      broj_odluke: brojOdluke,
      datum_odluke: new Date().toISOString().split("T")[0],

      // Podaci o firmi
      firma_naziv: data.firma_naziv,
      firma_pib: data.firma_pib,
      firma_adresa: data.firma_adresa,
      firma_grad: data.firma_grad || "Baru",
      direktor_ime_prezime: data.direktor_ime_prezime,

      // Podaci o pozajmici
      broj_ugovora: data.broj_ugovora,
      datum_pozajmice: data.datum_izdavanja,
      ukupan_iznos_pozajmice: data.ukupan_iznos_pozajmice,
      svrha_pozajmice: data.svrha,

      // Podaci o radniku (zajmodavcu)
      radnik_ime_prezime: `${data.radnik_ime} ${data.radnik_prezime}`,
      radnik_jmbg: data.radnik_jmbg,

      // Podaci o povraćaju
      iznos_povracaja: data.iznos_povracaja,
      datum_povracaja: data.datum_povracaja,
      povracaj_napomena: data.povracaj_napomena,

      // Kalkulisani podaci
      ukupno_vraceno: data.ukupno_vraceno,
      preostalo_dugovanje: data.preostalo_dugovanje,

      // Prethodni povraćaji
      prethodni_povracaji: prethodniPovracaji,
    };

    res.json({
      success: true,
      odluka: odlukaData,
    });
  } catch (error) {
    console.error("Greška pri generisanju odluke:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri generisanju odluke",
      error: error.message,
    });
  }
};

module.exports = {
  getOdlukaPovracaj,
};
