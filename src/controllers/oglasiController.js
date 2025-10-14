const { executeQuery } = require('../config/database');

/**
 * Dobijanje svih aktivnih oglasa sa paginacijom i filtriranjem
 */
const getOglasi = async (req, res) => {
  try {
    const {
      lokacija,
      tip_posla,
      search,
      page = 1,
      limit = 10,
      obrazovanje,
      plata_min,
      plata_max,
    } = req.query;

    let whereConditions = [
      'o.status = "aktivan"',
      'o.datum_isteka >= CURDATE()',
    ];
    let queryParams = [];

    // Dodavanje filtera
    if (lokacija) {
      whereConditions.push('o.lokacija LIKE ?');
      queryParams.push(`%${lokacija}%`);
    }

    if (tip_posla) {
      whereConditions.push('o.tip_posla = ?');
      queryParams.push(tip_posla);
    }

    if (search) {
      whereConditions.push(
        '(o.naslov LIKE ? OR o.pozicija LIKE ? OR o.opis LIKE ?)'
      );
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (obrazovanje) {
      whereConditions.push('o.obrazovanje = ?');
      queryParams.push(obrazovanje);
    }

    if (plata_min) {
      whereConditions.push('(o.plata_od >= ? OR o.plata_do >= ?)');
      queryParams.push(plata_min, plata_min);
    }

    if (plata_max) {
      whereConditions.push('(o.plata_od <= ? OR o.plata_do <= ?)');
      queryParams.push(plata_max, plata_max);
    }

    const offset = (page - 1) * limit;

    // Glavni upit za oglase
    const query = `
            SELECT 
                o.*,
                f.naziv as firma_naziv,
                f.grad as firma_grad,
                f.adresa as firma_adresa
            FROM poslovi_oglasi o 
            JOIN firme f ON o.firma_id = f.id 
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY 
                CASE 
                    WHEN o.istaknut = 1 AND (o.istaknut_do IS NULL OR o.istaknut_do > NOW()) 
                    THEN 0 ELSE 1 
                END,
                o.datum_objave DESC 
            LIMIT ? OFFSET ?
        `;

    queryParams.push(parseInt(limit), parseInt(offset));

    // Upit za ukupan broj rezultata
    const countQuery = `
            SELECT COUNT(*) as total
            FROM poslovi_oglasi o 
            JOIN firme f ON o.firma_id = f.id 
            WHERE ${whereConditions.join(' AND ')}
        `;

    const countParams = queryParams.slice(0, -2); // Uklanjamo limit i offset

    const [oglasi, countResult] = await Promise.all([
      executeQuery(query, queryParams),
      executeQuery(countQuery, countParams),
    ]);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      oglasi,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Greška pri dobijanju oglasa:', error);
    res.status(500).json({ error: 'Greška pri dobijanju oglasa' });
  }
};

/**
 * Dobijanje detalja jednog oglasa
 */
const getOglasById = async (req, res) => {
  try {
    const { id } = req.params;

    // Povećanje broja pregleda
    await executeQuery(
      'UPDATE poslovi_oglasi SET broj_pregleda = broj_pregleda + 1 WHERE id = ?',
      [id]
    );

    // Dobijanje detalja oglasa
    const query = `
            SELECT 
                o.*,
                f.naziv as firma_naziv,
                f.grad as firma_grad,
                f.adresa as firma_adresa,
                f.telefon as firma_telefon,
                f.email as firma_email
            FROM poslovi_oglasi o 
            JOIN firme f ON o.firma_id = f.id 
            WHERE o.id = ?
        `;

    const result = await executeQuery(query, [id]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Oglas nije pronađen' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Greška pri dobijanju oglasa:', error);
    res.status(500).json({ error: 'Greška pri dobijanju oglasa' });
  }
};

/**
 * Kreiranje novog oglasa (samo za firme)
 */
const createOglas = async (req, res) => {
  try {
    const {
      naslov,
      opis,
      pozicija,
      lokacija,
      tip_posla,
      plata_od,
      plata_do,
      iskustvo_godine,
      obrazovanje,
      datum_isteka,
      kontakt_email,
      kontakt_telefon,
    } = req.body;

    // Dobij firma_id na osnovu user_id iz firme tabele
    const firmaQuery =
      'SELECT id FROM firme WHERE user_id = ? AND status = "aktivan" LIMIT 1';
    const firmaResult = await executeQuery(firmaQuery, [req.user.id]);

    if (!firmaResult || firmaResult.length === 0) {
      return res.status(400).json({
        error: 'Nema aktivne firme povezane sa vašim nalogom',
      });
    }

    const firma_id = firmaResult[0].id;

    // Validacija obaveznih polja
    if (!naslov || !opis || !pozicija) {
      return res.status(400).json({
        error: 'Naslov, opis i pozicija su obavezna polja',
      });
    }

    // Ako datum_isteka nije postavljen, postaviti na 30 dana od danas
    const finalDatumIsteka =
      datum_isteka ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

    const query = `
            INSERT INTO poslovi_oglasi 
            (firma_id, naslov, opis, pozicija, lokacija, tip_posla, 
             plata_od, plata_do, iskustvo_godine, obrazovanje, 
             datum_isteka, kontakt_email, kontakt_telefon)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    const params = [
      firma_id,
      naslov,
      opis,
      pozicija,
      lokacija,
      tip_posla,
      plata_od,
      plata_do,
      iskustvo_godine,
      obrazovanje,
      finalDatumIsteka,
      kontakt_email,
      kontakt_telefon,
    ];

    const result = await executeQuery(query, params);

    res.status(201).json({
      success: true,
      oglasId: result.insertId,
      message: 'Oglas je uspešno kreiran',
    });
  } catch (error) {
    console.error('Greška pri kreiranju oglasa:', error);
    res.status(500).json({ error: 'Greška pri kreiranju oglasa' });
  }
};

/**
 * Dobijanje oglasa za specifičnu firmu
 */
const getFirmaOglasi = async (req, res) => {
  try {
    // Dobij firma_id na osnovu user_id iz firme tabele
    const firmaQuery =
      'SELECT id FROM firme WHERE user_id = ? AND status = "aktivan" LIMIT 1';
    const firmaResult = await executeQuery(firmaQuery, [req.user.id]);

    if (!firmaResult || firmaResult.length === 0) {
      return res.status(400).json({
        error: 'Nema aktivne firme povezane sa vašim nalogom',
      });
    }

    const firma_id = firmaResult[0].id;
    const { status = 'all' } = req.query;

    let whereCondition = 'firma_id = ?';
    let params = [firma_id];

    if (status !== 'all') {
      whereCondition += ' AND status = ?';
      params.push(status);
    }

    const query = `
            SELECT * FROM poslovi_oglasi 
            WHERE ${whereCondition}
            ORDER BY datum_objave DESC
        `;

    const oglasi = await executeQuery(query, params);

    res.json(oglasi);
  } catch (error) {
    console.error('Greška pri dobijanju oglasa firme:', error);
    res.status(500).json({ error: 'Greška pri dobijanju oglasa firme' });
  }
};

/**
 * Ažuriranje oglasa
 */
const updateOglas = async (req, res) => {
  try {
    const { id } = req.params;

    // Dobij firma_id na osnovu user_id iz firme tabele
    const firmaQuery =
      'SELECT id FROM firme WHERE user_id = ? AND status = "aktivan" LIMIT 1';
    const firmaResult = await executeQuery(firmaQuery, [req.user.id]);

    if (!firmaResult || firmaResult.length === 0) {
      return res.status(400).json({
        error: 'Nema aktivne firme povezane sa vašim nalogom',
      });
    }

    const firma_id = firmaResult[0].id;
    const updateData = req.body;

    // Provera da li oglas pripada firmi
    const checkQuery =
      'SELECT id FROM poslovi_oglasi WHERE id = ? AND firma_id = ?';
    const checkResult = await executeQuery(checkQuery, [id, firma_id]);

    if (checkResult.length === 0) {
      return res
        .status(404)
        .json({ error: 'Oglas nije pronađen ili nemate dozvolu' });
    }

    // Kreiranje update query-ja dinamički
    const allowedFields = [
      'naslov',
      'opis',
      'pozicija',
      'lokacija',
      'tip_posla',
      'plata_od',
      'plata_do',
      'iskustvo_godine',
      'obrazovanje',
      'datum_isteka',
      'kontakt_email',
      'kontakt_telefon',
      'status',
    ];

    const updateFields = [];
    const updateParams = [];

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateParams.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      return res
        .status(400)
        .json({ error: 'Nema validnih polja za ažuriranje' });
    }

    updateParams.push(id, firma_id);

    const updateQuery = `
            UPDATE poslovi_oglasi 
            SET ${updateFields.join(', ')}
            WHERE id = ? AND firma_id = ?
        `;

    await executeQuery(updateQuery, updateParams);

    res.json({ success: true, message: 'Oglas je uspešno ažuriran' });
  } catch (error) {
    console.error('Greška pri ažuriranju oglasa:', error);
    res.status(500).json({ error: 'Greška pri ažuriranju oglasa' });
  }
};

/**
 * Brisanje oglasa
 */
const deleteOglas = async (req, res) => {
  try {
    const { id } = req.params;

    // Dobij firma_id na osnovu user_id iz firme tabele
    const firmaQuery =
      'SELECT id FROM firme WHERE user_id = ? AND status = "aktivan" LIMIT 1';
    const firmaResult = await executeQuery(firmaQuery, [req.user.id]);

    if (!firmaResult || firmaResult.length === 0) {
      return res.status(400).json({
        error: 'Nema aktivne firme povezane sa vašim nalogom',
      });
    }

    const firma_id = firmaResult[0].id;

    const result = await executeQuery(
      'DELETE FROM poslovi_oglasi WHERE id = ? AND firma_id = ?',
      [id, firma_id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: 'Oglas nije pronađen ili nemate dozvolu' });
    }

    res.json({ success: true, message: 'Oglas je uspešno obrisan' });
  } catch (error) {
    console.error('Greška pri brisanju oglasa:', error);
    res.status(500).json({ error: 'Greška pri brisanju oglasa' });
  }
};

/**
 * Dobijanje statistika za admin
 */
const getOglasiStats = async (req, res) => {
  try {
    const statsQuery = `
            SELECT 
                COUNT(*) as ukupno_oglasa,
                COUNT(CASE WHEN status = 'aktivan' THEN 1 END) as aktivni_oglasi,
                COUNT(CASE WHEN status = 'neaktivan' THEN 1 END) as neaktivni_oglasi,
                COUNT(CASE WHEN datum_isteka < CURDATE() THEN 1 END) as istekli_oglasi,
                AVG(broj_pregleda) as prosecni_pregledi,
                COUNT(DISTINCT firma_id) as firme_sa_oglasima
            FROM poslovi_oglasi
        `;

    const tipPoslaQuery = `
            SELECT tip_posla, COUNT(*) as broj
            FROM poslovi_oglasi 
            WHERE status = 'aktivan'
            GROUP BY tip_posla
        `;

    const lokacijeQuery = `
            SELECT lokacija, COUNT(*) as broj
            FROM poslovi_oglasi 
            WHERE status = 'aktivan' AND lokacija IS NOT NULL
            GROUP BY lokacija
            ORDER BY broj DESC
            LIMIT 10
        `;

    const [generalStats, tipPoslaStats, lokacijeStats] = await Promise.all([
      executeQuery(statsQuery),
      executeQuery(tipPoslaQuery),
      executeQuery(lokacijeQuery),
    ]);

    res.json({
      general: generalStats[0],
      tipPosla: tipPoslaStats,
      lokacije: lokacijeStats,
    });
  } catch (error) {
    console.error('Greška pri dobijanju statistika:', error);
    res.status(500).json({ error: 'Greška pri dobijanju statistika' });
  }
};

/**
 * Dobijanje svih oglasa za admin panel
 */
const getAllOglasiForAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, istaknut } = req.query;

    let whereConditions = ['1=1']; // Početni uslov
    let queryParams = [];

    // Filteri
    if (status) {
      whereConditions.push('o.status = ?');
      queryParams.push(status);
    }

    if (search) {
      whereConditions.push(
        '(o.naslov LIKE ? OR o.pozicija LIKE ? OR f.naziv LIKE ?)'
      );
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (istaknut !== undefined) {
      whereConditions.push('o.istaknut = ?');
      queryParams.push(istaknut === 'true' ? 1 : 0);
    }

    const offset = (page - 1) * limit;

    // Glavni upit
    const query = `
      SELECT 
        o.*,
        f.naziv as firma_naziv,
        f.email as firma_email,
        f.grad as firma_grad,
        u.username as firma_username,
        u.email as user_email
      FROM poslovi_oglasi o 
      JOIN firme f ON o.firma_id = f.id 
      JOIN users u ON f.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY 
        CASE WHEN o.istaknut = 1 THEN 0 ELSE 1 END,
        o.datum_objave DESC 
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), parseInt(offset));

    // Upit za ukupan broj
    const countQuery = `
      SELECT COUNT(*) as total
      FROM poslovi_oglasi o 
      JOIN firme f ON o.firma_id = f.id 
      JOIN users u ON f.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
    `;
    const countParams = queryParams.slice(0, -2);

    const [oglasi, countResult] = await Promise.all([
      executeQuery(query, queryParams),
      executeQuery(countQuery, countParams),
    ]);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      oglasi,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Greška pri dobijanju admin oglasa:', error);
    res.status(500).json({ error: 'Greška pri dobijanju oglasa' });
  }
};

/**
 * Admin brisanje oglasa
 */
const adminDeleteOglas = async (req, res) => {
  try {
    const { id } = req.params;
    const { razlog } = req.body;

    // Dobij podatke o oglasu i firmi pre brisanja
    const oglasQuery = `
      SELECT o.*, f.naziv as firma_naziv, f.email as firma_email, u.email as user_email
      FROM poslovi_oglasi o
      JOIN firme f ON o.firma_id = f.id
      JOIN users u ON f.user_id = u.id
      WHERE o.id = ?
    `;
    const oglasResult = await executeQuery(oglasQuery, [id]);

    if (oglasResult.length === 0) {
      return res.status(404).json({ error: 'Oglas nije pronađen' });
    }

    const oglas = oglasResult[0];

    // Obriši oglas
    const deleteResult = await executeQuery(
      'DELETE FROM poslovi_oglasi WHERE id = ?',
      [id]
    );

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Oglas nije pronađen' });
    }

    // Pošalji email firmi
    try {
      const emailService = require('../services/emailService');
      await emailService.sendOglasDeletedNotification({
        toEmail: oglas.user_email || oglas.firma_email,
        firmaNaziv: oglas.firma_naziv,
        oglasNaslov: oglas.naslov,
        razlog: razlog || 'Oglas je uklonjen zbog kršenja uslova korišćenja.',
        adminEmail: 'admin@mojradnik.me',
      });
    } catch (emailError) {
      console.error('Greška pri slanju email-a:', emailError);
      // Ne prekidamo proces zbog greške u email-u
    }

    // Logiraj admin akciju
    console.log(
      `Admin ${req.user.username} obrisao oglas ${id} - ${oglas.naslov} (${
        oglas.firma_naziv
      }). Razlog: ${razlog || 'Nije naveden'}`
    );

    res.json({
      success: true,
      message: 'Oglas je uspešno obrisan i firma je obaveštena',
    });
  } catch (error) {
    console.error('Greška pri admin brisanju oglasa:', error);
    res.status(500).json({ error: 'Greška pri brisanju oglasa' });
  }
};

/**
 * Admin označavanje/uklanjanje istaknutog oglasa
 */
const adminToggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const { istaknut, istaknut_do, napomena } = req.body;

    // Provjeri da li oglas postoji
    const checkQuery =
      'SELECT id, naslov, istaknut FROM poslovi_oglasi WHERE id = ?';
    const checkResult = await executeQuery(checkQuery, [id]);

    if (checkResult.length === 0) {
      return res.status(404).json({ error: 'Oglas nije pronađen' });
    }

    const currentOglas = checkResult[0];
    const newIstaknut =
      istaknut !== undefined ? istaknut : !currentOglas.istaknut;

    // Ažuriraj oglas
    const updateQuery = `
      UPDATE poslovi_oglasi 
      SET istaknut = ?, 
          istaknut_od = ?, 
          istaknut_do = ?, 
          admin_napomena = ?
      WHERE id = ?
    `;

    const istaknutOd = newIstaknut
      ? new Date().toISOString().slice(0, 19).replace('T', ' ')
      : null;
    const istaknutDo = newIstaknut && istaknut_do ? istaknut_do : null;

    await executeQuery(updateQuery, [
      newIstaknut ? 1 : 0,
      istaknutOd,
      istaknutDo,
      napomena || null,
      id,
    ]);

    // Logiraj admin akciju
    const action = newIstaknut ? 'označio kao istaknut' : 'uklonio istaknutost';
    console.log(
      `Admin ${req.user.username} ${action} oglas ${id} - ${currentOglas.naslov}`
    );

    res.json({
      success: true,
      message: newIstaknut
        ? 'Oglas je označen kao istaknut'
        : 'Uklonjena istaknutost oglasa',
      istaknut: newIstaknut,
    });
  } catch (error) {
    console.error('Greška pri označavanju istaknutog oglasa:', error);
    res.status(500).json({ error: 'Greška pri označavanju oglasa' });
  }
};

module.exports = {
  getOglasi,
  getOglasById,
  createOglas,
  getFirmaOglasi,
  updateOglas,
  deleteOglas,
  getOglasiStats,
  getAllOglasiForAdmin,
  adminDeleteOglas,
  adminToggleFeatured,
};
