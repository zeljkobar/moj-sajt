const { executeQuery } = require("../config/database");

// Dohvati PDV firme sa statusom prijava za trenutni mjesec
exports.getPDVOverview = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1; // JavaScript months are 0-indexed
    const currentDay = today.getDate();

    // Determine target month based on business logic:
    // If day <= 20: target = PREVIOUS month (PDV that should have been submitted)
    // If day > 20: target = CURRENT month (PDV that needs to be submitted)
    let targetMonth = currentMonthNum;
    let targetYear = currentYear;

    if (currentDay <= 20) {
      // We're in submission period for PREVIOUS month
      targetMonth = currentMonthNum - 1;
      if (targetMonth < 1) {
        targetMonth = 12;
        targetYear--;
      }
    }
    // If day > 20, we show CURRENT month (default values above)

    // Create target month string directly (avoid timezone issues)
    const targetMonthString = `${targetYear}-${targetMonth
      .toString()
      .padStart(2, "0")}-01`;

    // Kalkuliraj dane do roka za ciljni mjesec
    const danaDoRoka = () => {
      const danas = new Date();
      const currentDay = danas.getDate();

      // Rok za target mjesec je 15. dan sljedećeg mjeseca
      let rokMonth = targetMonth + 1;
      let rokYear = targetYear;

      if (rokMonth > 12) {
        rokMonth = 1;
        rokYear++;
      }

      const rok = new Date(rokYear, rokMonth - 1, 15); // month je 0-indexed u Date()
      const diff = Math.ceil((rok - danas) / (1000 * 60 * 60 * 24));
      return diff;
    };

    const daysToDeadline = danaDoRoka();

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
      dana_do_roka: danaDoRoka(),
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
    const { napomena } = req.body;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1;
    const currentDay = today.getDate();

    // Determine target month (same logic as getPDVOverview)
    let targetMonth = currentMonthNum;
    let targetYear = currentYear;

    if (currentDay <= 20) {
      // We're in submission period for PREVIOUS month
      targetMonth = currentMonthNum - 1;
      if (targetMonth < 1) {
        targetMonth = 12;
        targetYear--;
      }
    }
    // If day > 20, we show CURRENT month

    const targetMonthString = `${targetYear}-${targetMonth
      .toString()
      .padStart(2, "0")}-01`;

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

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1;
    const currentDay = today.getDate();

    // Determine target month (same logic as getPDVOverview)
    let targetMonth = currentMonthNum;
    let targetYear = currentYear;

    if (currentDay <= 20) {
      // We're in submission period for PREVIOUS month
      targetMonth = currentMonthNum - 1;
      if (targetMonth < 1) {
        targetMonth = 12;
        targetYear--;
      }
    }
    // If day > 20, we show CURRENT month

    const targetMonthString = `${targetYear}-${targetMonth
      .toString()
      .padStart(2, "0")}-01`;

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

    // Statistike za trenutnu godinu
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
      LEFT JOIN pdv_prijave pp ON f.id = pp.firma_id AND YEAR(pp.mjesec) = YEAR(CURDATE())
      WHERE f.user_id = ? 
        AND f.pdvBroj IS NOT NULL 
        AND f.pdvBroj != ''
        AND f.status = 'aktivan'
    `,
      [userId]
    );

    res.json({
      success: true,
      statistike: stats,
    });
  } catch (error) {
    res.status(500).json({ message: "Greška na serveru" });
  }
};
