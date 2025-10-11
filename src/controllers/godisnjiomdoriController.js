const { executeQuery } = require('../config/database');

/**
 * Računa broj radnih dana između dva datuma
 * @param {string} datum_od - početni datum (YYYY-MM-DD)
 * @param {string} datum_do - završni datum (YYYY-MM-DD)
 * @param {number} radi_subotom - da li radnik radi subotom (1 = da, 0 = ne)
 * @returns {number} broj radnih dana
 */
function calculateWorkingDays(datum_od, datum_do, radi_subotom) {
  const startDate = new Date(datum_od);
  const endDate = new Date(datum_do);

  let workingDays = 0;
  let currentDate = new Date(startDate);

  // Ide kroz svaki dan u rasponu
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay(); // 0 = nedelja, 1 = ponedeljak, ..., 6 = subota

    // Nedelja (0) se nikad ne broji kao radni dan
    if (dayOfWeek === 0) {
      // preskačemo nedelju
    }
    // Subota (6) se broji samo ako radnik radi subotom
    else if (dayOfWeek === 6) {
      if (radi_subotom) {
        workingDays++;
      }
    }
    // Ponedeljak-petak (1-5) se uvek broje kao radni dani
    else {
      workingDays++;
    }

    // Idi na sledeći dan
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

module.exports = {
  // GET /api/godisnji-odmori/:firma_id - svi odmori za firmu
  getOdmoriByFirma: async (req, res) => {
    const { firma_id } = req.params;
    console.log('🏖️ API poziv za odmor podatke firme:', firma_id);

    try {
      if (!req.session || !req.session.user) {
        console.log('❌ Korisnik nije autentifikovan');
        return res.status(401).json({ message: 'Nije autentifikovan' });
      }

      const username = req.session.user.username;
      console.log('👤 Korisnik:', username);

      const [user] = await executeQuery(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        console.log('❌ Korisnik nije pronađen u bazi');
        return res.status(404).json({ message: 'Korisnik nije pronađen' });
      }

      console.log('✅ Korisnik ID:', user.id);

      // Provjeri da li firma pripada korisniku
      const [firmaCheck] = await executeQuery(
        'SELECT id FROM firme WHERE id = ? AND user_id = ?',
        [firma_id, user.id]
      );

      if (!firmaCheck) {
        console.log('❌ Korisnik nema pristup firmi', firma_id);
        return res.status(403).json({ message: 'Nemate pristup ovoj firmi' });
      }

      console.log('✅ Korisnik ima pristup firmi');

      // Učitaj sve odmore za radnike u firmi
      const odmori = await executeQuery(
        `
        SELECT 
          go.id, go.radnik_id, go.datum_od, go.datum_do, go.broj_dana,
          go.tip_odmora, go.status, go.napomena, go.created_at, go.updated_at,
          r.ime, r.prezime, r.pozicija_id,
          p.naziv as pozicija_naziv,
          u.username as odobrio_username
        FROM godisnji_odmori go
        LEFT JOIN radnici r ON go.radnik_id = r.id
        LEFT JOIN pozicije p ON r.pozicija_id = p.id
        LEFT JOIN users u ON go.odobrio_user_id = u.id
        WHERE r.firma_id = ?
        ORDER BY go.datum_od DESC
      `,
        [firma_id]
      );

      console.log('📊 Pronađeno odmora:', odmori.length);
      res.json(odmori);
    } catch (error) {
      console.error('Greška pri učitavanju odmora:', error);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  },

  // GET /api/odmori/:id - pojedinačni odmor po ID-u
  getOdmorById: async (req, res) => {
    const { id } = req.params;
    console.log('🏖️ API poziv za odmor:', id);

    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Neautorizovan pristup' });
      }

      const odmorResult = await executeQuery(
        `SELECT 
          go.id,
          go.radnik_id,
          go.datum_od,
          go.datum_do,
          go.broj_dana,
          go.tip_odmora,
          go.status,
          go.napomena,
          go.created_at,
          go.updated_at,
          r.ime,
          r.prezime,
          r.subota,
          f.naziv as firma_naziv,
          f.adresa as firma_adresa,
          f.grad as firma_grad,
          f.pib as firma_pib,
          f.pdvBroj as firma_pdv_broj,
          gp.ukupno_dana
        FROM godisnji_odmori go
        LEFT JOIN radnici r ON go.radnik_id = r.id
        LEFT JOIN firme f ON r.firma_id = f.id
        LEFT JOIN godisnji_plan gp ON r.id = gp.radnik_id AND gp.godina = YEAR(go.datum_od)
        WHERE go.id = ?`,
        [id]
      );

      if (odmorResult.length === 0) {
        return res.status(404).json({ message: 'Odmor nije pronađen' });
      }

      const odmorData = odmorResult[0];

      // Izračunaj ukupno iskorišćene dane za tu godinu
      const godina = new Date(odmorData.datum_od).getFullYear();
      const iskorisceniDaniResult = await executeQuery(
        `SELECT COALESCE(SUM(broj_dana), 0) as ukupno_iskorisceno
         FROM godisnji_odmori 
         WHERE radnik_id = ? 
         AND status = 'odobren' 
         AND YEAR(datum_od) = ?`,
        [odmorData.radnik_id, godina]
      );

      odmorData.ukupno_iskorisceno =
        iskorisceniDaniResult[0].ukupno_iskorisceno;

      console.log('📊 Pronađen odmor:', odmorData);
      res.json(odmorData);
    } catch (error) {
      console.error('Greška pri učitavanju odmora:', error);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  },

  // GET /api/godisnji-plan/:firma_id - planovi za firmu
  getPlanByFirma: async (req, res) => {
    const { firma_id } = req.params;
    const { godina = new Date().getFullYear() } = req.query;

    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Nije autentifikovan' });
      }

      const username = req.session.user.username;
      const [user] = await executeQuery(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        return res.status(404).json({ message: 'Korisnik nije pronađen' });
      }

      // Učitaj planove za sve radnike u firmi
      const planovi = await executeQuery(
        `
        SELECT 
          gp.id, gp.radnik_id, gp.godina, gp.ukupno_dana, gp.iskorisceno_dana, gp.preostalo_dana,
          r.ime, r.prezime, r.subota,
          COALESCE(
            CASE 
              WHEN r.pozicija_id LIKE 'template_%' THEN pt.naziv
              WHEN r.pozicija_id LIKE 'custom_%' THEN p.naziv
              ELSE 'Nespecifikovano'
            END
          ) as pozicija_naziv
        FROM godisnji_plan gp
        LEFT JOIN radnici r ON gp.radnik_id = r.id
        LEFT JOIN pozicije p ON r.pozicija_id = CONCAT('custom_', p.id)
        LEFT JOIN pozicije_templates pt ON r.pozicija_id = CONCAT('template_', pt.id)
        WHERE r.firma_id = ? AND gp.godina = ?
        ORDER BY r.ime, r.prezime
      `,
        [firma_id, godina]
      );

      res.json(planovi);
    } catch (error) {
      console.error('Greška pri učitavanju planova:', error);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  },

  // POST /api/godisnji-odmori - novi zahtjev za odmor
  createZahtjev: async (req, res) => {
    const { radnik_id, datum_od, datum_do, tip_odmora, napomena } = req.body;
    console.log('🏖️ POST /api/godisnji-odmori called with:', {
      radnik_id,
      datum_od,
      datum_do,
      tip_odmora,
      napomena,
    });

    try {
      if (!req.session || !req.session.user) {
        console.log('❌ Session or user missing');
        return res.status(401).json({ message: 'Nije autentifikovan' });
      }

      const username = req.session.user.username;
      console.log('👤 Username:', username);

      const [user] = await executeQuery(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        console.log('❌ User not found in database');
        return res.status(404).json({ message: 'Korisnik nije pronađen' });
      }

      console.log('✅ User ID:', user.id);

      // Provjeri da li radnik pripada korisniku
      const [radnikCheck] = await executeQuery(
        `
        SELECT r.id, r.firma_id FROM radnici r 
        LEFT JOIN firme f ON r.firma_id = f.id 
        WHERE r.id = ? AND f.user_id = ?
      `,
        [radnik_id, user.id]
      );

      console.log('🔍 Radnik check result:', radnikCheck);

      if (!radnikCheck) {
        console.log('❌ Access denied - radnik does not belong to user');
        console.log('  Radnik ID:', radnik_id);
        console.log('  User ID:', user.id);
        return res.status(403).json({ message: 'Nemate pristup ovom radniku' });
      }

      if (!datum_od || !datum_do || !tip_odmora) {
        return res
          .status(400)
          .json({ message: 'Sva obavezna polja moraju biti popunjena' });
      }

      // Učitaj podatke o radniku da bismo znali da li radi subotom
      const [radnikInfo] = await executeQuery(
        'SELECT subota FROM radnici WHERE id = ?',
        [radnik_id]
      );

      if (!radnikInfo) {
        return res.status(404).json({ message: 'Radnik nije pronađen' });
      }

      // Izračunaj broj radnih dana na osnovu da li radnik radi subotom
      const broj_dana = calculateWorkingDays(
        datum_od,
        datum_do,
        radnikInfo.subota
      );

      // Dodaj novi zahtjev
      const result = await executeQuery(
        `
        INSERT INTO godisnji_odmori 
        (radnik_id, datum_od, datum_do, broj_dana, tip_odmora, napomena, status)
        VALUES (?, ?, ?, ?, ?, ?, 'na_cekanju')
      `,
        [radnik_id, datum_od, datum_do, broj_dana, tip_odmora, napomena || null]
      );

      res.json({
        success: true,
        message: 'Zahtjev je uspješno poslat',
        id: result.insertId,
      });
    } catch (error) {
      console.error('Greška pri kreiranju zahtjeva:', error);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  },

  // PUT /api/godisnji-odmori/:id/approve - odobri zahtjev
  approveZahtjev: async (req, res) => {
    const { id } = req.params;

    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Nije autentifikovan' });
      }

      const username = req.session.user.username;
      const [user] = await executeQuery(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        return res.status(404).json({ message: 'Korisnik nije pronađen' });
      }

      // Provjeri da li odmor postoji i pripada korisniku
      const [odmorCheck] = await executeQuery(
        `
        SELECT go.id, go.radnik_id, go.broj_dana, go.tip_odmora
        FROM godisnji_odmori go
        LEFT JOIN radnici r ON go.radnik_id = r.id
        LEFT JOIN firme f ON r.firma_id = f.id
        WHERE go.id = ? AND f.user_id = ? AND go.status = 'na_cekanju'
      `,
        [id, user.id]
      );

      if (!odmorCheck) {
        return res
          .status(404)
          .json({ message: 'Zahtjev nije pronađen ili već je obrađen' });
      }

      // Odobri zahtjev
      await executeQuery(
        `
        UPDATE godisnji_odmori 
        SET status = 'odobren', odobrio_user_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [user.id, id]
      );

      // Ažuriraj godišnji plan ako je tip odmora 'godisnji'
      if (odmorCheck.tip_odmora === 'godisnji') {
        const godina = new Date().getFullYear();

        await executeQuery(
          `
          UPDATE godisnji_plan 
          SET iskorisceno_dana = iskorisceno_dana + ?
          WHERE radnik_id = ? AND godina = ?
        `,
          [odmorCheck.broj_dana, odmorCheck.radnik_id, godina]
        );
      }

      res.json({ success: true, message: 'Zahtjev je odobren' });
    } catch (error) {
      console.error('Greška pri odobravanju zahtjeva:', error);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  },

  // PUT /api/godisnji-odmori/:id/reject - odbaci zahtjev
  rejectZahtjev: async (req, res) => {
    const { id } = req.params;
    const { razlog } = req.body;

    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Nije autentifikovan' });
      }

      const username = req.session.user.username;
      const [user] = await executeQuery(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        return res.status(404).json({ message: 'Korisnik nije pronađen' });
      }

      // Provjeri da li odmor postoji i pripada korisniku
      const [odmorCheck] = await executeQuery(
        `
        SELECT go.id
        FROM godisnji_odmori go
        LEFT JOIN radnici r ON go.radnik_id = r.id
        LEFT JOIN firme f ON r.firma_id = f.id
        WHERE go.id = ? AND f.user_id = ? AND go.status = 'na_cekanju'
      `,
        [id, user.id]
      );

      if (!odmorCheck) {
        return res
          .status(404)
          .json({ message: 'Zahtjev nije pronađen ili već je obrađen' });
      }

      // Odbaci zahtjev
      await executeQuery(
        `
        UPDATE godisnji_odmori 
        SET status = 'odbacen', odobrio_user_id = ?, napomena = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [user.id, razlog || 'Odbačen bez objašnjenja', id]
      );

      res.json({ success: true, message: 'Zahtjev je odbačen' });
    } catch (error) {
      console.error('Greška pri odbacivanju zahtjeva:', error);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  },

  // GET /api/godisnji-odmori/praznici - praznici za godinu
  getPraznici: async (req, res) => {
    const { godina = new Date().getFullYear() } = req.query;

    try {
      const praznici = await executeQuery(
        `
        SELECT id, naziv, datum_od, datum_do, godina, aktivan
        FROM praznici 
        WHERE godina = ? AND aktivan = 1
        ORDER BY datum_od
      `,
        [godina]
      );

      res.json({
        success: true,
        data: praznici,
      });
    } catch (error) {
      console.error('Greška pri učitavanju praznika:', error);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  },

  // Funkcija za kalkulaciju proporcionalnih dana
  calculateProporcionalniDani: (radnik, godina) => {
    const baseRadni = radnik.subota ? 24 : 20; // Bazni broj dana (rad subotom ili ne)

    if (!radnik.datum_zaposlenja) {
      return baseRadni; // Ako nema datum zaposlenja, vrati pun broj
    }

    const datumZaposlenja = new Date(radnik.datum_zaposlenja);
    const godinaZaposlenja = datumZaposlenja.getFullYear();

    // Ako je zaposlen pre trenutne godine, ima pun broj dana
    if (godinaZaposlenja < godina) {
      return baseRadni;
    }

    // Ako je zaposlen u trenutnoj godini, kalkuliši proporcionalno
    if (godinaZaposlenja === godina) {
      const mesecZaposlenja = datumZaposlenja.getMonth() + 1; // 1-12
      const mesecaDoKrajaGodine = 12 - mesecZaposlenja + 1; // Uključi mesec zaposlenja

      let proporcionalni;
      if (radnik.subota) {
        // 2 dana po mesecu za rad subotom
        proporcionalni = mesecaDoKrajaGodine * 2;
      } else {
        // 1.666 dana po mesecu, zaokruži na najbliži ceo broj
        proporcionalni = Math.round(mesecaDoKrajaGodine * 1.666);
      }

      return Math.min(proporcionalni, baseRadni); // Ne može više od maksimuma
    }

    // Ako je zaposlen u budućnosti, nema pravo na odmor
    return 0;
  },

  // POST /api/godisnji-plan/sync - sinhronizacija planova za sve radnike
  syncPlanovi: async (req, res) => {
    const { firma_id } = req.body;
    const godina = new Date().getFullYear();

    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Nije autentifikovan' });
      }

      const username = req.session.user.username;
      const [user] = await executeQuery(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        return res.status(404).json({ message: 'Korisnik nije pronađen' });
      }

      // Učitaj sve radnike u firmi
      const radnici = await executeQuery(
        `
        SELECT id, subota, datum_zaposlenja FROM radnici WHERE firma_id = ?
      `,
        [firma_id]
      );

      for (const radnik of radnici) {
        const ukupnoDana = module.exports.calculateProporcionalniDani(
          radnik,
          godina
        );

        // Provjeri da li plan već postoji
        const [postojiPlan] = await executeQuery(
          `
          SELECT id FROM godisnji_plan WHERE radnik_id = ? AND godina = ?
        `,
          [radnik.id, godina]
        );

        if (!postojiPlan) {
          // Kreiraj novi plan
          await executeQuery(
            `
            INSERT INTO godisnji_plan (radnik_id, godina, ukupno_dana, iskorisceno_dana)
            VALUES (?, ?, ?, 0)
          `,
            [radnik.id, godina, ukupnoDana]
          );
        } else {
          // Ažuriraj ukupno dana ako se promijenio subota status
          await executeQuery(
            `
            UPDATE godisnji_plan SET ukupno_dana = ? 
            WHERE radnik_id = ? AND godina = ?
          `,
            [ukupnoDana, radnik.id, godina]
          );
        }
      }

      res.json({ success: true, message: 'Planovi su sinhronizovani' });
    } catch (error) {
      console.error('Greška pri sinhronizaciji planova:', error);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  },

  // DELETE /api/godisnji-odmori/:id - obriši zahtjev
  deleteZahtjev: async (req, res) => {
    const { id } = req.params;

    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Nije autentifikovan' });
      }

      const username = req.session.user.username;
      const [user] = await executeQuery(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        return res.status(404).json({ message: 'Korisnik nije pronađen' });
      }

      // Provjeri da li zahtev postoji i pripada korisniku
      const [zahtevCheck] = await executeQuery(
        `
        SELECT go.id, go.radnik_id, go.broj_dana, go.tip_odmora, go.status
        FROM godisnji_odmori go
        LEFT JOIN radnici r ON go.radnik_id = r.id
        LEFT JOIN firme f ON r.firma_id = f.id
        WHERE go.id = ? AND f.user_id = ?
      `,
        [id, user.id]
      );

      if (!zahtevCheck) {
        return res
          .status(404)
          .json({ message: 'Zahtjev nije pronađen ili nemate pristup' });
      }

      // Ako je zahtev bio odobren, treba da se vrati broj dana u plan
      if (
        zahtevCheck.status === 'odobren' &&
        zahtevCheck.tip_odmora === 'godisnji'
      ) {
        const godina = new Date().getFullYear();

        await executeQuery(
          `
          UPDATE godisnji_plan 
          SET iskorisceno_dana = iskorisceno_dana - ?
          WHERE radnik_id = ? AND godina = ?
        `,
          [zahtevCheck.broj_dana, zahtevCheck.radnik_id, godina]
        );
      }

      // Obriši zahtev
      await executeQuery('DELETE FROM godisnji_odmori WHERE id = ?', [id]);

      res.json({ success: true, message: 'Zahtjev je uspješno obrisan' });
    } catch (error) {
      console.error('Greška pri brisanju zahtjeva:', error);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  },
};
