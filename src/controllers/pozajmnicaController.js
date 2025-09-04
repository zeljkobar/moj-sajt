const { executeQuery } = require('../config/database');

// Kreiraj novu pozajmicu
exports.createPozajmica = async (req, res) => {
  console.log('=== CREATE POZAJMICA ===');
  console.log('Request body:', req.body);

  const {
    firma_id,
    radnik_id,
    zajmodavac_id,
    pozajmilac_tip,
    iznos,
    svrha,
    broj_ugovora,
    datum_izdavanja,
    datum_dospeća,
    napomene,
  } = req.body;

  console.log('Extracted values:', {
    firma_id,
    radnik_id,
    zajmodavac_id,
    pozajmilac_tip,
    iznos,
    svrha,
    broj_ugovora,
    datum_izdavanja,
    datum_dospeća,
    napomene,
  });

  try {
    // Validacija pozajmilac_tip
    if (pozajmilac_tip && !['radnik', 'zajmodavac'].includes(pozajmilac_tip)) {
      return res.status(400).json({
        success: false,
        message: 'Pozajmilac tip mora biti "radnik" ili "zajmodavac"',
      });
    }

    // Validacija na osnovu tipa pozajmioca
    if (pozajmilac_tip === 'radnik' && !radnik_id) {
      return res.status(400).json({
        success: false,
        message: 'Radnik ID je obavezan kada je pozajmilac tip "radnik"',
      });
    }

    if (pozajmilac_tip === 'zajmodavac' && !zajmodavac_id) {
      return res.status(400).json({
        success: false,
        message:
          'Zajmodavac ID je obavezan kada je pozajmilac tip "zajmodavac"',
      });
    }

    // Proveri da li broj ugovora već postoji
    const existingContract = await executeQuery(
      'SELECT id FROM pozajmnice WHERE broj_ugovora = ?',
      [broj_ugovora]
    );

    if (existingContract.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Broj ugovora već postoji',
      });
    }

    const result = await executeQuery(
      `INSERT INTO pozajmnice (firma_id, radnik_id, zajmodavac_id, pozajmilac_tip, iznos, svrha, broj_ugovora, 
       datum_izdavanja, datum_dospeća, napomene) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firma_id || null,
        pozajmilac_tip === 'radnik' ? radnik_id : null,
        pozajmilac_tip === 'zajmodavac' ? zajmodavac_id : null,
        pozajmilac_tip || 'radnik',
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
      message: 'Pozajmica je uspešno kreirana',
    });
  } catch (error) {
    console.error('=== ERROR CREATING POZAJMICA ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Greška pri kreiranju pozajmice',
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
        message: 'Nije autentifikovan',
      });
    }

    const username = req.session.user.username;
    const userRole = req.session.user.role;

    console.log('=== POZAJMICE DEBUG ===');
    console.log('Username:', username);
    console.log('User Role:', userRole);

    // Dobij user_id
    const users = await executeQuery(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Korisnik nije pronađen',
      });
    }

    const userId = users[0].id;
    console.log('User ID:', userId);
    let pozajmice = [];

    // UNIFIKOVANA LOGIKA - SVI korisnici (admin, firma, agencija) vide samo SVOJE firme
    const firme = await executeQuery('SELECT id FROM firme WHERE user_id = ?', [
      userId,
    ]);

    console.log('Firme za user_id', userId, ':', firme);

    if (firme.length === 0) {
      console.log('Nema firmi za korisnika');
      return res.json({
        success: true,
        pozajmice: [],
      });
    }

    // Kreiraj listu ID-jeva firmi
    const firmaIds = firme.map(f => f.id);
    const placeholders = firmaIds.map(() => '?').join(',');

    console.log("Filtering pozajmice for all user's firma_ids:", firmaIds);

    pozajmice = await executeQuery(
      `SELECT p.*, 
              f.naziv as firma_naziv,
              r.ime as radnik_ime, r.prezime as radnik_prezime,
              z.ime as zajmodavac_ime, z.prezime as zajmodavac_prezime,
              z.jmbg as zajmodavac_jmbg, z.ziro_racun as zajmodavac_ziro_racun
       FROM pozajmnice p
       LEFT JOIN firme f ON p.firma_id = f.id
       LEFT JOIN radnici r ON p.radnik_id = r.id  
       LEFT JOIN zajmodavci z ON p.zajmodavac_id = z.id
       WHERE p.firma_id IN (${placeholders})
       ORDER BY p.datum_izdavanja DESC`,
      firmaIds
    );

    console.log('Found pozajmice count:', pozajmice.length);

    res.json({
      success: true,
      pozajmice,
    });
  } catch (error) {
    console.error('Error fetching pozajmice:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju pozajmica',
    });
  }
};

// Dohvati pozajmice po firmi
exports.getPozajmiceByFirma = async (req, res) => {
  const { firmaId } = req.params;
  const userId = req.session.user.id;

  try {
    // Prvo proveri da li firma pripada korisniku
    const firma = await executeQuery(
      'SELECT id FROM firme WHERE id = ? AND user_id = ?',
      [firmaId, userId]
    );

    if (firma.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Firma nije pronađena',
      });
    }

    const pozajmice = await executeQuery(
      `SELECT p.*, 
              f.naziv as firma_naziv,
              r.ime as radnik_ime, r.prezime as radnik_prezime,
              z.ime as zajmodavac_ime, z.prezime as zajmodavac_prezime,
              z.jmbg as zajmodavac_jmbg, z.ziro_racun as zajmodavac_ziro_racun,
              COALESCE(SUM(pp.iznos), 0) as ukupno_vraceno,
              (p.iznos - COALESCE(SUM(pp.iznos), 0)) as preostalo_dugovanje
       FROM pozajmnice p
       LEFT JOIN firme f ON p.firma_id = f.id
       LEFT JOIN radnici r ON p.radnik_id = r.id  
       LEFT JOIN zajmodavci z ON p.zajmodavac_id = z.id
       LEFT JOIN pozajmica_povracaji pp ON p.id = pp.pozajmica_id
       WHERE p.firma_id = ?
       GROUP BY p.id
       ORDER BY p.datum_izdavanja DESC`,
      [firmaId]
    );

    res.json({
      success: true,
      pozajmice,
    });
  } catch (error) {
    console.error('Error fetching pozajmice by firma:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju pozajmica',
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
      message: 'Pozajmica je uspešno ažurirana',
    });
  } catch (error) {
    console.error('Error updating pozajmica:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri ažuriranju pozajmice',
    });
  }
};

// Obriši pozajmicu
exports.deletePozajmica = async (req, res) => {
  const { id } = req.params;

  try {
    await executeQuery('DELETE FROM pozajmnice WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Pozajmica je uspešno obrisana',
    });
  } catch (error) {
    console.error('Error deleting pozajmica:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri brisanju pozajmice',
    });
  }
};

// Dohvati sledeći broj ugovora za specifičnu firmu
exports.getNextBrojUgovora = async (req, res) => {
  try {
    const { firmaId } = req.params;
    const userId = req.session.user.id;
    const currentYear = new Date().getFullYear();

    console.log('=== GET NEXT BROJ UGOVORA DEBUG ===');
    console.log('Firma ID:', firmaId);
    console.log('User ID:', userId);
    console.log('Current Year:', currentYear);

    // Proveri da li firma pripada ovom korisniku
    const firmaCheck = await executeQuery(
      'SELECT id FROM firme WHERE id = ? AND user_id = ?',
      [firmaId, userId]
    );

    console.log('Firma check result:', firmaCheck);

    if (firmaCheck.length === 0) {
      console.log('Firma not found or no permission');
      return res.status(403).json({
        success: false,
        message: 'Nemate dozvolu za pristup ovoj firmi'
      });
    }

    // Pronađi najveći broj ugovora za ovu firmu u trenutnoj godini
    const result = await executeQuery(
      `SELECT MAX(CAST(SUBSTRING_INDEX(broj_ugovora, '/', 1) AS UNSIGNED)) as maxNumber 
       FROM pozajmnice 
       WHERE firma_id = ? AND broj_ugovora LIKE ?`,
      [firmaId, `%/${currentYear}`]
    );

    console.log('Max number query result:', result);

    const maxNumber = result[0]?.maxNumber || 0;
    const nextNumber = maxNumber + 1;
    const nextBrojUgovora = `${nextNumber.toString().padStart(3, '0')}/${currentYear}`;

    console.log('Next broj ugovora:', nextBrojUgovora);

    res.json({
      success: true,
      nextBrojUgovora: nextBrojUgovora,
    });
  } catch (error) {
    console.error('Error getting next broj ugovora:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri generisanju broja ugovora',
    });
  }
};

// Dohvati jednu pozajmicu po ID
exports.getPozajmicaById = async (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;

  try {
    console.log('=== GET POZAJMICA BY ID DEBUG ===');
    console.log('Pozajmica ID:', id);
    console.log('User ID:', userId);

    const pozajmice = await executeQuery(
      `SELECT p.*, 
              f.naziv as firma_naziv,
              f.adresa as firma_adresa,
              f.pib as firma_pib,
              f.ziro_racun as firma_ziro_racun,
              f.direktor_ime_prezime as direktor_ime_prezime,
              f.direktor_jmbg as direktor_jmbg,
              f.grad as firma_grad,
              r.ime as radnik_ime, r.prezime as radnik_prezime, r.jmbg as radnik_jmbg,
              z.ime as zajmodavac_ime, z.prezime as zajmodavac_prezime, 
              z.jmbg as zajmodavac_jmbg, z.ziro_racun as zajmodavac_ziro_racun
       FROM pozajmnice p
       LEFT JOIN firme f ON p.firma_id = f.id
       LEFT JOIN radnici r ON p.radnik_id = r.id  
       LEFT JOIN zajmodavci z ON p.zajmodavac_id = z.id
       WHERE p.id = ? AND f.user_id = ?`,
      [id, userId]
    );

    console.log('Found pozajmice:', pozajmice.length);
    if (pozajmice.length > 0) {
      const p = pozajmice[0];
      console.log('Pozajmica data:');
      console.log('- pozajmilac_tip:', p.pozajmilac_tip);
      console.log('- radnik_id:', p.radnik_id);
      console.log('- zajmodavac_id:', p.zajmodavac_id);
      console.log('- radnik_ime:', p.radnik_ime);
      console.log('- zajmodavac_ime:', p.zajmodavac_ime);
    }

    if (pozajmice.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pozajmica nije pronađena',
      });
    }

    res.json({
      success: true,
      pozajmica: pozajmice[0],
    });
  } catch (error) {
    console.error('Error fetching pozajmica by id:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju pozajmice',
    });
  }
};
