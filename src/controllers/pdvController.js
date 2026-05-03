const { executeQuery } = require("../config/database");

function resolveTargetMonth(inputMonth) {
  if (inputMonth) {
    const normalizedMonth = String(inputMonth).slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(normalizedMonth)) {
      const [year, month] = normalizedMonth.split("-").map(Number);
      return {
        targetYear: year,
        targetMonth: month,
        targetMonthString: `${normalizedMonth}-01`,
      };
    }
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1;
  const currentDay = today.getDate();

  let targetMonth = currentMonthNum;
  let targetYear = currentYear;

  if (currentDay <= 20) {
    targetMonth = currentMonthNum - 1;
    if (targetMonth < 1) {
      targetMonth = 12;
      targetYear--;
    }
  }

  return {
    targetYear,
    targetMonth,
    targetMonthString: `${targetYear}-${targetMonth
      .toString()
      .padStart(2, "0")}-01`,
  };
}

function calculateDaysToDeadline(targetYear, targetMonth) {
  let rokMonth = targetMonth + 1;
  let rokYear = targetYear;

  if (rokMonth > 12) {
    rokMonth = 1;
    rokYear++;
  }

  const danas = new Date();
  const rok = new Date(rokYear, rokMonth - 1, 15);
  return Math.ceil((rok - danas) / (1000 * 60 * 60 * 24));
}

// Dohvati PDV firme sa statusom prijava za trenutni mjesec
exports.getPDVOverview = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { targetYear, targetMonth, targetMonthString } = resolveTargetMonth(
      req.query.mjesec
    );
    const daysToDeadline = calculateDaysToDeadline(targetYear, targetMonth);

    // Dohvati sve PDV firme korisnika sa statusom prijava
    const pdvData = await executeQuery(
      `
      SELECT 
        f.id,
        f.naziv,
        f.pdvBroj,
        f.adresa,
        f.pib,
        f.status,
        pp.predano,
        pp.datum_predanja,
        pp.napomena,
        CASE 
          WHEN pp.predano = 1 THEN 'predano'
          WHEN ? < 0 THEN 'kasni'
          WHEN ? <= 3 THEN 'uskoro'
          ELSE 'nepredano'
        END as status,
        CASE 
          WHEN f.status = 'nula' THEN 1
          ELSE 0
        END as neaktivna
      FROM firme f
      LEFT JOIN pdv_prijave pp ON f.id = pp.firma_id AND pp.mjesec = ?
      WHERE f.user_id = ? 
        AND f.pdvBroj IS NOT NULL 
        AND f.pdvBroj != ''
      ORDER BY 
        CASE 
          WHEN f.status = 'nula' THEN 5
          WHEN pp.predano = 1 THEN 4
          WHEN ? < 0 THEN 1
          WHEN ? <= 3 THEN 2
          ELSE 3
        END,
        f.naziv ASC
    `,
      [
        daysToDeadline,
        daysToDeadline,
        targetMonthString,
        userId,
        daysToDeadline,
        daysToDeadline,
      ]
    );

    const rokInfo = {
      dana_do_roka: daysToDeadline,
      rok_datum: `${targetYear}-${targetMonth.toString().padStart(2, "0")}-15`,
      trenutni_mjesec: `${targetYear}-${targetMonth
        .toString()
        .padStart(2, "0")}`,
      target_month: targetMonthString,
    };

    res.json({
      success: true,
      firme: pdvData,
      rok_info: rokInfo,
    });
  } catch (error) {
    res.status(500).json({ message: "Greška na serveru" });
  }
};

// Označi PDV prijavu kao predanu
exports.markAsSubmitted = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { firmaId } = req.params;
    const { napomena, mjesec } = req.body;
    const { targetYear, targetMonth, targetMonthString } =
      resolveTargetMonth(mjesec);

    // Provjeri da li firma pripada korisniku
    const [firma] = await executeQuery(
      "SELECT id FROM firme WHERE id = ? AND user_id = ?",
      [firmaId, userId]
    );

    if (!firma) {
      return res.status(404).json({ message: "Firma nije pronađena" });
    }

    // Insert ili update PDV prijave
    await executeQuery(
      `
      INSERT INTO pdv_prijave (firma_id, mjesec, predano, datum_predanja, napomena, user_id)
      VALUES (?, ?, 1, NOW(), ?, ?)
      ON DUPLICATE KEY UPDATE
        predano = 1,
        datum_predanja = NOW(),
        napomena = VALUES(napomena),
        updated_at = CURRENT_TIMESTAMP
    `,
      [firmaId, targetMonthString, napomena || null, userId]
    );

    // Provjeri da li su sve PDV prijave predane za trenutni mjesec
    const [stats] = await executeQuery(
      `
      SELECT 
        COUNT(*) as ukupno_firmi,
        SUM(CASE WHEN pp.predano = 1 THEN 1 ELSE 0 END) as predano_firmi
      FROM firme f
      LEFT JOIN pdv_prijave pp ON f.id = pp.firma_id AND pp.mjesec = ?
      WHERE f.user_id = ? 
        AND f.pdvBroj IS NOT NULL 
        AND f.pdvBroj != ''
        AND f.status = 'aktivan'
    `,
      [targetMonthString, userId]
    );

    let autoCreatedNextMonth = false;

    // Ako su sve prijave predane, automatski kreiraj novi mjesec
    if (stats.ukupno_firmi > 0 && stats.predano_firmi === stats.ukupno_firmi) {
      // Kreiraj novi mjesec (sljedeći mjesec)
      let nextMonth = targetMonth + 1;
      let nextYear = targetYear;

      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear++;
      }

      const nextMonthString = `${nextYear}-${nextMonth
        .toString()
        .padStart(2, "0")}-01`;

      // Provjeri da li novi mjesec već postoji
      const [existingEntries] = await executeQuery(
        `
        SELECT COUNT(*) as count 
        FROM pdv_prijave pp
        JOIN firme f ON pp.firma_id = f.id
        WHERE f.user_id = ? AND pp.mjesec = ?
      `,
        [userId, nextMonthString]
      );

      // Kreiraj entries samo ako ne postoje
      if (existingEntries.count === 0) {
        const pdvFirme = await executeQuery(
          `
          SELECT id FROM firme 
          WHERE user_id = ? 
            AND pdvBroj IS NOT NULL 
            AND pdvBroj != ''
            AND status = 'aktivan'
        `,
          [userId]
        );

        for (const firma of pdvFirme) {
          await executeQuery(
            `
            INSERT IGNORE INTO pdv_prijave (firma_id, mjesec, predano, user_id)
            VALUES (?, ?, 0, ?)
          `,
            [firma.id, nextMonthString, userId]
          );
        }

        autoCreatedNextMonth = true;
      }
    }

    res.json({
      success: true,
      message: "PDV prijava je označena kao predana",
      autoCreatedNextMonth: autoCreatedNextMonth,
      allSubmitted: stats.predano_firmi === stats.ukupno_firmi,
    });
  } catch (error) {
    res.status(500).json({ message: "Greška na serveru" });
  }
};

// Ukloni oznaku predano
exports.unmarkSubmitted = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { firmaId } = req.params;
    const { targetMonthString } = resolveTargetMonth(req.body?.mjesec);

    // Provjeri da li firma pripada korisniku
    const [firma] = await executeQuery(
      "SELECT id FROM firme WHERE id = ? AND user_id = ?",
      [firmaId, userId]
    );

    if (!firma) {
      return res.status(404).json({ message: "Firma nije pronađena" });
    }

    // Update PDV prijave - ukloni predano
    await executeQuery(
      `
      UPDATE pdv_prijave 
      SET predano = 0, datum_predanja = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE firma_id = ? AND mjesec = ?
    `,
      [firmaId, targetMonthString]
    );

    res.json({
      success: true,
      message: "Oznaka predano je uklonjena",
    });
  } catch (error) {
    res.status(500).json({ message: "Greška na serveru" });
  }
};

// Kreiraj novi mjesec za sve PDV firme
exports.createNewMonth = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { mjesec } = req.body; // Format: 2025-08-01

    if (!mjesec) {
      return res.status(400).json({ message: "Mjesec je obavezan" });
    }

    // Dohvati sve aktivne PDV firme korisnika
    const pdvFirme = await executeQuery(
      `
      SELECT id FROM firme 
      WHERE user_id = ? 
        AND pdvBroj IS NOT NULL 
        AND pdvBroj != ''
        AND status = 'aktivan'
    `,
      [userId]
    );

    // Kreiraj entry za svaku firmu za novi mjesec
    for (const firma of pdvFirme) {
      await executeQuery(
        `
        INSERT IGNORE INTO pdv_prijave (firma_id, mjesec, predano, user_id)
        VALUES (?, ?, 0, ?)
      `,
        [firma.id, mjesec, userId]
      );
    }

    res.json({
      success: true,
      message: `Kreiran novi mjesec za ${pdvFirme.length} PDV firmi`,
      firme_count: pdvFirme.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Greška na serveru" });
  }
};

// Dohvati istoriju PDV prijava
exports.getPDVHistory = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { godina } = req.query; // Opcionalno filtriranje po godini

    let whereClause = "WHERE f.user_id = ? AND f.status = 'aktivan'";
    let queryParams = [userId];

    if (godina) {
      whereClause += " AND YEAR(pp.mjesec) = ?";
      queryParams.push(godina);
    }

    const istorija = await executeQuery(
      `
      SELECT 
        pp.mjesec,
        COUNT(*) as ukupno_firmi,
        SUM(CASE WHEN pp.predano = 1 THEN 1 ELSE 0 END) as predano_firmi,
        SUM(CASE WHEN pp.predano = 0 THEN 1 ELSE 0 END) as nepredano_firmi,
        GROUP_CONCAT(
          CASE WHEN pp.predano = 0 
          THEN f.naziv 
          ELSE NULL END
          SEPARATOR ', '
        ) as nepredane_firme
      FROM pdv_prijave pp
      JOIN firme f ON pp.firma_id = f.id
      ${whereClause}
      GROUP BY pp.mjesec
      ORDER BY pp.mjesec DESC
    `,
      queryParams
    );

    res.json({
      success: true,
      istorija: istorija,
    });
  } catch (error) {
    res.status(500).json({ message: "Greška na serveru" });
  }
};

// Dohvati statistike PDV prijava
exports.getPDVStatistics = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1;
    const currentDay = today.getDate();

    // Koristi istu logiku kao getPDVOverview za određivanje cilj meseca
    let targetMonth = currentMonthNum;
    let targetYear = currentYear;

    if (currentDay <= 20) {
      targetMonth = currentMonthNum - 1;
      if (targetMonth < 1) {
        targetMonth = 12;
        targetYear--;
      }
    }

    const targetMonthString = `${targetYear}-${targetMonth
      .toString()
      .padStart(2, "0")}-01`;

    // Statistike za trenutni cilj mesec (ne celu godinu)
    const [stats] = await executeQuery(
      `
      SELECT 
        COUNT(DISTINCT f.id) as ukupno_pdv_firmi,
        COUNT(DISTINCT pp.firma_id) as firme_sa_prijavama,
        COUNT(*) as ukupno_prijava,
        SUM(CASE WHEN pp.predano = 1 THEN 1 ELSE 0 END) as predane_prijave,
        ROUND(
          (SUM(CASE WHEN pp.predano = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2
        ) as procenat_predanih
      FROM firme f
      LEFT JOIN pdv_prijave pp ON f.id = pp.firma_id AND pp.mjesec = ?
      WHERE f.user_id = ? 
        AND f.pdvBroj IS NOT NULL 
        AND f.pdvBroj != ''
        AND f.status = 'aktivan'
    `,
      [targetMonthString, userId]
    );

    res.json({
      success: true,
      statistike: stats,
    });
  } catch (error) {
    res.status(500).json({ message: "Greška na serveru" });
  }
};
