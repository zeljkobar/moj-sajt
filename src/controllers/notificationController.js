const { executeQuery } = require("../config/database");

// Dobijanje obavještenja za dashboard
const getNotifications = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const notifications = [];

    // 1. UGOVORI O RADU - radnici kojima ističu ugovori
    const ugovoriQuery = `
      SELECT r.id, r.ime, r.prezime, r.datum_prestanka, f.naziv as firma_naziv,
             DATEDIFF(r.datum_prestanka, CURDATE()) as dana_do_isteka
      FROM radnici r 
      JOIN firme f ON r.firma_id = f.id 
      WHERE f.user_id = ? 
        AND r.datum_prestanka IS NOT NULL
        AND (r.datum_prestanka BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
             OR r.datum_prestanka < CURDATE())
      ORDER BY r.datum_prestanka ASC
      LIMIT 5
    `;

    const ugovori = await executeQuery(ugovoriQuery, [userId]);

    ugovori.forEach((radnik) => {
      const dana = radnik.dana_do_isteka;
      let type, icon, title;

      if (dana < 0) {
        type = "urgent";
        icon = "🚨";
        title = "Ugovor istekao";
      } else if (dana <= 7) {
        type = "urgent";
        icon = "⚠️";
        title = `Ugovor ističe za ${dana} dana`;
      } else {
        type = "warning";
        icon = "📅";
        title = `Ugovor ističe za ${dana} dana`;
      }

      notifications.push({
        id: `ugovor_${radnik.id}`,
        type,
        icon,
        title,
        description: `${radnik.ime} ${radnik.prezime} - ${radnik.firma_naziv}`,
        days: dana,
        action: `/radnici.html`,
        timestamp: new Date(),
      });
    });

    // 2. NEAKTIVNE FIRME (više od 6 meseci bez aktivnosti)
    const neaktivneFirmeQuery = `
      SELECT f.id, f.naziv, f.created_at,
             DATEDIFF(CURDATE(), f.created_at) as dana_od_kreiranja
      FROM firme f 
      WHERE f.user_id = ? 
        AND f.status = 'neaktivan'
        AND DATEDIFF(CURDATE(), f.created_at) > 180
      ORDER BY f.created_at ASC
      LIMIT 3
    `;

    const neaktivneFirme = await executeQuery(neaktivneFirmeQuery, [userId]);

    neaktivneFirme.forEach((firma) => {
      notifications.push({
        id: `neaktivna_${firma.id}`,
        type: "info",
        icon: "💼",
        title: "Neaktivna firma",
        description: `${firma.naziv} - neaktivna ${Math.floor(
          firma.dana_od_kreiranja / 30
        )} meseci`,
        days: firma.dana_od_kreiranja,
        action: `/firme.html`,
        timestamp: new Date(),
      });
    });

    // 3. STATISTIČKE INFORMACIJE
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM firme WHERE user_id = ? AND status = 'aktivan') as aktivne_firme,
        (SELECT COUNT(*) FROM radnici r JOIN firme f ON r.firma_id = f.id WHERE f.user_id = ?) as ukupno_radnika,
        (SELECT COUNT(*) FROM firme WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) as nove_firme_nedelja
    `;

    const stats = await executeQuery(statsQuery, [userId, userId, userId]);

    if (stats[0]?.nove_firme_nedelja > 0) {
      notifications.push({
        id: "nove_firme",
        type: "info",
        icon: "🎉",
        title: "Nove firme",
        description: `${stats[0].nove_firme_nedelja} novih firmi u poslednih 7 dana`,
        days: 0,
        action: `/firme.html`,
        timestamp: new Date(),
      });
    }

    // 4. OPŠTI ROKOVI (PDV, Porez na dobit)
    const danas = new Date();
    const mesec = danas.getMonth() + 1;
    const dan = danas.getDate();

    // PDV rok (15. u mesecu)
    if (dan <= 15) {
      const danaDoPDV = 15 - dan;
      notifications.push({
        id: "pdv_rok",
        type: danaDoPDV <= 3 ? "warning" : "info",
        icon: "📊",
        title: `PDV prijava - rok za ${danaDoPDV} dana`,
        description: `Rok za podnošenje: 15. ${
          [
            "januar",
            "februar",
            "mart",
            "april",
            "maj",
            "jun",
            "jul",
            "avgust",
            "septembar",
            "oktobar",
            "novembar",
            "decembar",
          ][mesec - 1]
        }`,
        days: danaDoPDV,
        action: `/pdv_prijava/index.html`,
        timestamp: new Date(),
      });
    }

    // Sortiranje po prioritetu
    notifications.sort((a, b) => {
      const prioritet = { urgent: 0, warning: 1, info: 2 };
      if (prioritet[a.type] !== prioritet[b.type]) {
        return prioritet[a.type] - prioritet[b.type];
      }
      return a.days - b.days;
    });

    res.json({
      success: true,
      notifications: notifications.slice(0, 8), // Maksimalno 8 obavještenja
    });
  } catch (error) {
    console.error("Greška pri dobijanju obavještenja:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dobijanju obavještenja",
    });
  }
};

module.exports = {
  getNotifications,
};
