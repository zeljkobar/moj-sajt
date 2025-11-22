const { executeQuery } = require('../config/database');

exports.getZavrsniRacuni = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    const godina = parseInt(req.params.godina) || new Date().getFullYear();

    // Svaki korisnik vidi samo svoje firme
    const whereClause = 'WHERE f.user_id = ?';
    const queryParams = [godina, userId];

    // Dohvati sve firme (ili samo korisnikove) i spoji sa statusom za traženu godinu
    const query = `
      SELECT 
        f.id as firma_id, 
        f.naziv, 
        f.pib,
        z.id as status_id,
        z.godina,
        COALESCE(z.izvodi_gotovi, 0) as izvodi_gotovi,
        z.izvodi_napomena,
        COALESCE(z.kupci_slozeni, 0) as kupci_slozeni,
        z.kupci_todo,
        COALESCE(z.dobavljaci_slozeni, 0) as dobavljaci_slozeni,
        z.dobavljaci_todo,
        COALESCE(z.plate_proknjizene, 0) as plate_proknjizene,
        z.plate_napomena,
        COALESCE(z.amortizacija_gotova, 0) as amortizacija_gotova,
        COALESCE(z.pdv_nula_provera, 0) as pdv_nula_provera,
        COALESCE(z.obracunata_dobit, 0) as obracunata_dobit,
        COALESCE(z.kreiran_zavrsni_racun, 0) as kreiran_zavrsni_racun,
        COALESCE(z.predat_zavrsni_racun, 0) as predat_zavrsni_racun,
        COALESCE(z.predata_dobit, 0) as predata_dobit,
        COALESCE(z.status_zavrsen, 0) as status_zavrsen
      FROM firme f
      LEFT JOIN zavrsni_racuni_status z ON f.id = z.firma_id AND z.godina = ?
      ${whereClause}
      ORDER BY f.naziv ASC
    `;

    const results = await executeQuery(query, queryParams);

    // Parsiraj JSON polja jer MySQL driver nekad vraća string
    const parsedResults = results.map(row => ({
      ...row,
      kupci_todo:
        typeof row.kupci_todo === 'string'
          ? JSON.parse(row.kupci_todo || '[]')
          : row.kupci_todo || [],
      dobavljaci_todo:
        typeof row.dobavljaci_todo === 'string'
          ? JSON.parse(row.dobavljaci_todo || '[]')
          : row.dobavljaci_todo || [],
    }));

    res.json({ success: true, data: parsedResults });
  } catch (error) {
    console.error('Greška pri dohvatanju završnih računa:', error);
    res.status(500).json({ success: false, message: 'Greška na serveru' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { firmaId, godina, field, value } = req.body;
    const userId = req.session.user.id;

    // Validacija polja da sprečimo SQL injection
    const allowedFields = [
      'izvodi_gotovi',
      'izvodi_napomena',
      'kupci_slozeni',
      'kupci_todo',
      'dobavljaci_slozeni',
      'dobavljaci_todo',
      'plate_proknjizene',
      'plate_napomena',
      'amortizacija_gotova',
      'pdv_nula_provera',
      'obracunata_dobit',
      'kreiran_zavrsni_racun',
      'predat_zavrsni_racun',
      'predata_dobit',
      'status_zavrsen',
    ];

    if (!allowedFields.includes(field)) {
      return res
        .status(400)
        .json({ success: false, message: 'Nedozvoljeno polje' });
    }

    // Provera vlasništva firme
    const firmaCheck = await executeQuery(
      'SELECT id FROM firme WHERE id = ? AND user_id = ?',
      [firmaId, userId]
    );
    if (firmaCheck.length === 0) {
      return res
        .status(403)
        .json({ success: false, message: 'Nemate pristup ovoj firmi' });
    }

    // Upsert logika (Insert or Update)
    // Koristimo dinamički query pažljivo
    const query = `
      INSERT INTO zavrsni_racuni_status (firma_id, godina, ${field})
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE ${field} = VALUES(${field})
    `;

    // Ako je value objekat/niz (za JSON polja), stringify ga
    const dbValue =
      typeof value === 'object' && value !== null
        ? JSON.stringify(value)
        : value;

    await executeQuery(query, [firmaId, godina, dbValue]);

    res.json({ success: true });
  } catch (error) {
    console.error('Greška pri ažuriranju statusa:', error);
    res.status(500).json({ success: false, message: 'Greška na serveru' });
  }
};
