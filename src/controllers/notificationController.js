const { executeQuery } = require("../config/database");

// Dobijanje obavještenja za dashboard
const getNotifications = async (req, res) => {
  try {
    console.log("🔔 getNotifications pozvan za korisnika:", req.session.user);
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    const notifications = [];

    // ADMIN OBAVJEŠTENJA - samo za admin korisnike
    if (userRole === "admin") {
      console.log("Admin je ulogovan, proveravam nove registracije...");

      // Nove registracije u posledjih 7 dana (sve nove registracije osim admin)
      const noveRegistracijeQuery = `
        SELECT id, username, ime, prezime, email, role, created_at,
               DATEDIFF(CURDATE(), created_at) as dana_od_registracije
        FROM users 
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          AND role != 'admin'
        ORDER BY created_at DESC
        LIMIT 10
      `;

      const noveRegistracije = await executeQuery(noveRegistracijeQuery);
      console.log("Pronađene nove registracije:", noveRegistracije);

      // Dodaj sumarno obavještenje ako ima više novih korisnika
      if (noveRegistracije.length > 0) {
        const brojNovihDanas = noveRegistracije.filter(
          (u) => u.dana_od_registracije === 0
        ).length;
        const ukupnoNovih = noveRegistracije.length;

        // Ako ima novih korisnika danas
        if (brojNovihDanas > 0) {
          notifications.push({
            id: `nove_registracije_danas`,
            type: "urgent",
            icon: "🎉",
            title: `${brojNovihDanas} ${
              brojNovihDanas === 1
                ? "nova registracija"
                : brojNovihDanas < 5
                ? "nove registracije"
                : "novih registracija"
            } danas!`,
            description: `Ukupno ${ukupnoNovih} ${
              ukupnoNovih === 1
                ? "novi korisnik"
                : ukupnoNovih < 5
                ? "nova korisnika"
                : "novih korisnika"
            } u posledjih 7 dana. Kliknite da vidite sve.`,
            days: 0,
            action: `/admin-users.html`,
            timestamp: new Date(),
          });
        } else if (ukupnoNovih > 0) {
          // Ako nema novih danas, ali ima u posledjih 7 dana
          notifications.push({
            id: `nove_registracije_sedmica`,
            type: "info",
            icon: "👥",
            title: `${ukupnoNovih} ${
              ukupnoNovih === 1
                ? "novi korisnik"
                : ukupnoNovih < 5
                ? "nova korisnika"
                : "novih korisnika"
            } ove sedmice`,
            description: `Registrovali su se u posledjih 7 dana. Kliknite da upravljate njihovim dozvolama.`,
            days: 1,
            action: `/admin-users.html`,
            timestamp: new Date(),
          });
        }
      }

      // Individualne notifikacije za svaki novi korisnik (ograniči na 5)
      noveRegistracije.slice(0, 5).forEach((user) => {
        const danaOdRegistracije = user.dana_od_registracije;
        const imaUlogu = user.role && user.role !== "user";

        notifications.push({
          id: `nova_registracija_${user.id}`,
          type: danaOdRegistracije === 0 ? "urgent" : "info",
          icon: imaUlogu ? "✅" : "👤",
          title:
            danaOdRegistracije === 0
              ? "Nova registracija danas!"
              : `Nova registracija (${danaOdRegistracije} ${
                  danaOdRegistracije === 1 ? "dan" : "dana"
                })`,
          description: `${user.ime} ${user.prezime} (${user.username}) - ${
            user.email
          }${imaUlogu ? ` [${user.role.toUpperCase()}]` : " [ČEKA DOZVOLU]"}`,
          days: danaOdRegistracije,
          action: `/admin-users.html`,
          timestamp: new Date(),
        });
      });
    }

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
        title = `Ugovor istekao (${Math.abs(dana)} dana)`;
      } else if (dana <= 7) {
        type = "urgent";
        icon = "⚠️";
        title = `Ugovor ističe za ${dana} dana`;
      } else if (dana <= 15) {
        type = "warning";
        icon = "📋";
        title = `Ugovor ističe za ${dana} dana`;
      } else {
        type = "info";
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
        action: `/radnici.html?search=${encodeURIComponent(
          radnik.ime + " " + radnik.prezime
        )}`,
        timestamp: new Date(),
      });
    });

    // 2. NEAKTIVNE FIRME
    const neaktivneFirmeQuery = `
      SELECT id, naziv, DATEDIFF(CURDATE(), updated_at) as dana_neaktivne
      FROM firme 
      WHERE user_id = ? 
        AND updated_at < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      ORDER BY updated_at ASC
      LIMIT 3
    `;

    const neaktivneFirme = await executeQuery(neaktivneFirmeQuery, [userId]);

    neaktivneFirme.forEach((firma) => {
      notifications.push({
        id: `neaktivna_${firma.id}`,
        type: "warning",
        icon: "🏢",
        title: "Neaktivna firma",
        description: `${firma.naziv} - ${firma.dana_neaktivne} dana bez aktivnosti`,
        days: firma.dana_neaktivne,
        action: `/firme.html`,
        timestamp: new Date(),
      });
    });

    // 3. NOVE FIRME
    const noveFirmeQuery = `
      SELECT id, naziv, DATEDIFF(CURDATE(), created_at) as dana_od_kreiranja
      FROM firme 
      WHERE user_id = ? 
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      ORDER BY created_at DESC
      LIMIT 3
    `;

    const noveFirme = await executeQuery(noveFirmeQuery, [userId]);

    noveFirme.forEach((firma) => {
      notifications.push({
        id: `nova_firma_${firma.id}`,
        type: "info",
        icon: "🏭",
        title: "Nova firma dodana",
        description: `${firma.naziv} - kreirana ${
          firma.dana_od_kreiranja === 0
            ? "danas"
            : `pre ${firma.dana_od_kreiranja} dana`
        }`,
        days: firma.dana_od_kreiranja,
        action: `/firme.html`,
        timestamp: new Date(),
      });
    });

    // 4. PDV ROKOVI
    const pdvRokoviQuery = `
      SELECT 
        f.id, 
        f.naziv,
        CASE 
          WHEN DAY(CURDATE()) <= 15 THEN 
            DATEDIFF(
              DATE(CONCAT(YEAR(CURDATE()), '-', MONTH(CURDATE()), '-15')), 
              CURDATE()
            )
          ELSE 
            DATEDIFF(
              DATE(CONCAT(
                YEAR(DATE_ADD(CURDATE(), INTERVAL 1 MONTH)), '-', 
                MONTH(DATE_ADD(CURDATE(), INTERVAL 1 MONTH)), '-15'
              )), 
              CURDATE()
            )
        END as dana_do_roka
      FROM firme f
      WHERE f.user_id = ?
      HAVING dana_do_roka <= 7 AND dana_do_roka >= 0
      ORDER BY dana_do_roka ASC
      LIMIT 3
    `;

    const pdvRokovi = await executeQuery(pdvRokoviQuery, [userId]);

    pdvRokovi.forEach((firma) => {
      const dana = firma.dana_do_roka;
      let type, icon;

      if (dana === 0) {
        type = "urgent";
        icon = "🚨";
      } else if (dana <= 3) {
        type = "urgent";
        icon = "⚠️";
      } else {
        type = "warning";
        icon = "📊";
      }

      notifications.push({
        id: `pdv_${firma.id}`,
        type,
        icon,
        title: dana === 0 ? "PDV rok DANAS!" : `PDV rok za ${dana} dana`,
        description: `${firma.naziv} - prijava PDV-a`,
        days: dana,
        action: `/pdv_prijava/index.html`,
        timestamp: new Date(),
      });
    });

    // 5. STATISTIKE (informativno)
    const statistikeQuery = `
      SELECT 
        (SELECT COUNT(*) FROM firme WHERE user_id = ?) as ukupno_firmi,
        (SELECT COUNT(*) FROM radnici r JOIN firme f ON r.firma_id = f.id WHERE f.user_id = ?) as ukupno_radnika,
        (SELECT COUNT(*) FROM radnici r JOIN firme f ON r.firma_id = f.id 
         WHERE f.user_id = ? AND r.datum_prestanka IS NOT NULL AND r.datum_prestanka < CURDATE()) as istekli_ugovori
    `;

    const [statistike] = await executeQuery(statistikeQuery, [
      userId,
      userId,
      userId,
    ]);

    if (statistike.istekli_ugovori > 0) {
      notifications.push({
        id: "statistike_istekli",
        type: "info",
        icon: "📈",
        title: "Pregled sistema",
        description: `${statistike.ukupno_firmi} firmi, ${statistike.ukupno_radnika} radnika, ${statistike.istekli_ugovori} isteklih ugovora`,
        days: 0,
        action: `/dashboard.html`,
        timestamp: new Date(),
      });
    }

    // Sortiranje obavještenja po prioritetu
    const priorityOrder = { urgent: 1, warning: 2, info: 3 };
    notifications.sort((a, b) => {
      if (priorityOrder[a.type] !== priorityOrder[b.type]) {
        return priorityOrder[a.type] - priorityOrder[b.type];
      }
      return a.days - b.days;
    });

    console.log("📤 Šaljem obavještenja:", notifications.length);
    console.log(
      "📋 Lista obavještenja:",
      notifications.map((n) => ({ id: n.id, type: n.type, title: n.title }))
    );

    res.json({ notifications });
  } catch (error) {
    console.error("Greška pri dohvatanju obavještenja:", error);
    res.status(500).json({ error: "Greška pri dohvatanju obavještenja" });
  }
};

// DEBUG endpoint za SQL testiranje
const debugSQL = async (req, res) => {
  try {
    console.log("=== DEBUG SQL TESTIRANJE ===");

    // Proveri sve korisnike
    const sviKorisnici = await executeQuery(`
      SELECT id, username, ime, prezime, email, role, created_at,
             DATEDIFF(CURDATE(), created_at) as dana_od_registracije
      FROM users 
      ORDER BY created_at DESC
    `);
    console.log("SVI KORISNICI:", sviKorisnici);

    // Proveri nove registracije (novi upit)
    const noveRegistracije = await executeQuery(`
      SELECT id, username, ime, prezime, email, role, created_at,
             DATEDIFF(CURDATE(), created_at) as dana_od_registracije
      FROM users 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND role != 'admin'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log("NOVE REGISTRACIJE (7 dana):", noveRegistracije);

    // Proveri današnji datum
    const trenutniDatum = await executeQuery(
      "SELECT CURDATE() as danas, NOW() as sada"
    );
    console.log("TRENUTNI DATUM:", trenutniDatum);

    res.json({
      message: "Debug podaci su ispisani u konzoli",
      sviKorisnici,
      noveRegistracije,
      trenutniDatum,
    });
  } catch (error) {
    console.error("Debug SQL greška:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getNotifications, debugSQL };
