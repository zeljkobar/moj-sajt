const { executeQuery } = require('../config/database');

const TRACKED_FIELDS = [
  'dok_dobio',
  'dok_skenirao',
  'dok_proknjizio',
  'dok_vratio',
  'plate_obracunao',
  'plate_predao',
];

function normalizeMonth(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
      2,
      '0'
    )}-01`;
  }

  const normalized = String(value || '').slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(normalized)) {
    return `${normalized}-01`;
  }

  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS mjesecne_obaveze_status (
      id INT AUTO_INCREMENT PRIMARY KEY,
      firma_id INT NOT NULL,
      user_id INT NOT NULL,
      mjesec DATE NOT NULL,
      dok_dobio TINYINT(1) DEFAULT 0,
      dok_skenirao TINYINT(1) DEFAULT 0,
      dok_proknjizio TINYINT(1) DEFAULT 0,
      dok_vratio TINYINT(1) DEFAULT 0,
      plate_obracunao TINYINT(1) DEFAULT 0,
      plate_predao TINYINT(1) DEFAULT 0,
      napomena TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_firma_mjesec (firma_id, mjesec),
      INDEX idx_user_mjesec (user_id, mjesec)
    )
  `);
}

function getRowProgress(row) {
  const done = TRACKED_FIELDS.reduce((sum, field) => sum + (row[field] ? 1 : 0), 0);
  const pdvTotal = row.pdv_obveznik ? 1 : 0;
  const pdvDone = row.pdv_obveznik && row.pdv_predano ? 1 : 0;
  const total = TRACKED_FIELDS.length + pdvTotal;
  const completed = done + pdvDone;

  return {
    total,
    completed,
    zavrseno: total > 0 && completed === total,
    procenat: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

function buildStats(rows) {
  const total = rows.length;
  const pdvRows = rows.filter(row => row.pdv_obveznik);
  const finishedRows = rows.filter(row => getRowProgress(row).zavrseno);

  return {
    ukupno_firmi: total,
    zavrseno_firmi: finishedRows.length,
    procenat:
      total > 0 ? Math.round((finishedRows.length / total) * 100) : 0,
    dokumentacija: {
      dobio: rows.filter(row => row.dok_dobio).length,
      skenirao: rows.filter(row => row.dok_skenirao).length,
      proknjizio: rows.filter(row => row.dok_proknjizio).length,
      vratio: rows.filter(row => row.dok_vratio).length,
      ukupno: total,
    },
    plate: {
      obracunao: rows.filter(row => row.plate_obracunao).length,
      predao: rows.filter(row => row.plate_predao).length,
      ukupno: total,
    },
    pdv: {
      predato: pdvRows.filter(row => row.pdv_predano).length,
      ukupno: pdvRows.length,
    },
  };
}

async function getRows(userId, month) {
  const rows = await executeQuery(
    `
    SELECT
      f.id as firma_id,
      f.naziv,
      f.pib,
      f.pdvBroj,
      f.status as firma_status,
      COALESCE(m.dok_dobio, 0) as dok_dobio,
      COALESCE(m.dok_skenirao, 0) as dok_skenirao,
      COALESCE(m.dok_proknjizio, 0) as dok_proknjizio,
      COALESCE(m.dok_vratio, 0) as dok_vratio,
      COALESCE(m.plate_obracunao, 0) as plate_obracunao,
      COALESCE(m.plate_predao, 0) as plate_predao,
      m.napomena,
      CASE WHEN f.pdvBroj IS NOT NULL AND f.pdvBroj != '' THEN 1 ELSE 0 END as pdv_obveznik,
      COALESCE(pp.predano, 0) as pdv_predano,
      pp.datum_predanja as pdv_datum_predanja
    FROM firme f
    LEFT JOIN mjesecne_obaveze_status m
      ON m.firma_id = f.id AND m.mjesec = ?
    LEFT JOIN pdv_prijave pp
      ON pp.firma_id = f.id AND pp.mjesec = ?
    WHERE f.user_id = ?
    ORDER BY f.naziv ASC
  `,
    [month, month, userId]
  );

  return rows.map(row => ({
    ...row,
    progress: getRowProgress(row),
  }));
}

exports.listMonths = async (req, res) => {
  try {
    await ensureTable();

    const userId = req.session.user.id;
    const months = await executeQuery(
      `
      SELECT mjesec FROM mjesecne_obaveze_status WHERE user_id = ?
      UNION
      SELECT pp.mjesec
      FROM pdv_prijave pp
      JOIN firme f ON f.id = pp.firma_id
      WHERE f.user_id = ?
      ORDER BY mjesec DESC
    `,
      [userId, userId]
    );

    const uniqueMonths = [
      ...new Set(months.map(item => normalizeMonth(item.mjesec))),
    ].sort((a, b) => b.localeCompare(a));

    const monthCards = [];
    for (const month of uniqueMonths) {
      const rows = await getRows(userId, month);
      monthCards.push({
        mjesec: month,
        statistike: buildStats(rows),
      });
    }

    res.json({ success: true, mjeseci: monthCards });
  } catch (error) {
    console.error('Greška pri učitavanju mjesečnih obaveza:', error);
    res.status(500).json({ success: false, message: 'Greška na serveru' });
  }
};

exports.getOverview = async (req, res) => {
  try {
    await ensureTable();

    const userId = req.session.user.id;
    const month = normalizeMonth(req.query.mjesec);
    const rows = await getRows(userId, month);

    res.json({
      success: true,
      mjesec: month,
      firme: rows,
      statistike: buildStats(rows),
    });
  } catch (error) {
    console.error('Greška pri učitavanju mjesečne obaveze:', error);
    res.status(500).json({ success: false, message: 'Greška na serveru' });
  }
};

exports.getFirmOverview = async (req, res) => {
  try {
    await ensureTable();

    const userId = req.session.user.id;
    const firmaId = req.params.firmaId;

    const firmCheck = await executeQuery(
      'SELECT id FROM firme WHERE id = ? AND user_id = ?',
      [firmaId, userId]
    );

    if (firmCheck.length === 0) {
      return res
        .status(403)
        .json({ success: false, message: 'Nemate pristup ovoj firmi' });
    }

    const months = await executeQuery(
      `
      SELECT mjesec FROM mjesecne_obaveze_status WHERE user_id = ? AND firma_id = ?
      UNION
      SELECT mjesec FROM pdv_prijave WHERE user_id = ? AND firma_id = ?
      ORDER BY mjesec DESC
    `,
      [userId, firmaId, userId, firmaId]
    );

    const uniqueMonths = [
      ...new Set(months.map(item => normalizeMonth(item.mjesec))),
    ].sort((a, b) => b.localeCompare(a));

    const rows = [];
    for (const month of uniqueMonths) {
      const monthRows = await getRows(userId, month);
      const row = monthRows.find(item => Number(item.firma_id) === Number(firmaId));
      if (row) {
        rows.push({
          mjesec: month,
          ...row,
        });
      }
    }

    res.json({
      success: true,
      firmaId,
      obaveze: rows,
    });
  } catch (error) {
    console.error('Greška pri učitavanju mjesečnih obaveza firme:', error);
    res.status(500).json({ success: false, message: 'Greška na serveru' });
  }
};

exports.createMonth = async (req, res) => {
  try {
    await ensureTable();

    const userId = req.session.user.id;
    const month = normalizeMonth(req.body.mjesec);
    const firms = await executeQuery('SELECT id FROM firme WHERE user_id = ?', [
      userId,
    ]);

    for (const firma of firms) {
      await executeQuery(
        `
        INSERT IGNORE INTO mjesecne_obaveze_status (firma_id, user_id, mjesec)
        VALUES (?, ?, ?)
      `,
        [firma.id, userId, month]
      );
    }

    res.json({
      success: true,
      mjesec: month,
      firme_count: firms.length,
    });
  } catch (error) {
    console.error('Greška pri kreiranju mjesečne obaveze:', error);
    res.status(500).json({ success: false, message: 'Greška na serveru' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    await ensureTable();

    const userId = req.session.user.id;
    const { firmaId, field, value } = req.body;
    const month = normalizeMonth(req.body.mjesec);

    if (!TRACKED_FIELDS.includes(field) && field !== 'napomena') {
      return res
        .status(400)
        .json({ success: false, message: 'Nedozvoljeno polje' });
    }

    const firmCheck = await executeQuery(
      'SELECT id FROM firme WHERE id = ? AND user_id = ?',
      [firmaId, userId]
    );

    if (firmCheck.length === 0) {
      return res
        .status(403)
        .json({ success: false, message: 'Nemate pristup ovoj firmi' });
    }

    const dbValue = field === 'napomena' ? value || null : value ? 1 : 0;
    await executeQuery(
      `
      INSERT INTO mjesecne_obaveze_status (firma_id, user_id, mjesec, ${field})
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE ${field} = VALUES(${field})
    `,
      [firmaId, userId, month, dbValue]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Greška pri ažuriranju mjesečne obaveze:', error);
    res.status(500).json({ success: false, message: 'Greška na serveru' });
  }
};
