const { executeQuery } = require("../config/database");

// Dobijanje obavještenja za dashboard
const getNotifications = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    const notifications = [];

    // ADMIN OBAVJEŠTENJA - samo za admin korisnike
    if (userRole === "admin") {
      // Nove registracije u poslednjih 7 dana (koristimo JavaScript datume)
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const noveRegistracijeQuery = `
        SELECT id, username, ime, prezime, email, role, created_at
        FROM users 
        WHERE created_at >= ?
          AND role != 'admin'
        ORDER BY created_at DESC
        LIMIT 10
      `;

      const noveRegistracije = await executeQuery(noveRegistracijeQuery, [
        sevenDaysAgo.toISOString().split("T")[0],
      ]);

      // Manual calculation za dane od registracije
      noveRegistracije.forEach((user) => {
        const registrationDate = new Date(user.created_at);
        const diffTime = today.getTime() - registrationDate.getTime();
        user.dana_od_registracije = Math.floor(
          diffTime / (1000 * 60 * 60 * 24)
        );
      });

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
            } u poslednjih 7 dana. Kliknite da vidite sve.`,
            days: 0,
            action: `/admin-users.html`,
            timestamp: new Date(),
          });
        } else if (ukupnoNovih > 0) {
          // Ako nema novih danas, ali ima u poslednjih 7 dana
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
            description: `Registrovali su se u poslednjih 7 dana. Kliknite da upravljate njihovim dozvolama.`,
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

    // 1. UGOVORI O RADU - radnici kojima ističu ugovori (bez onih koji imaju otkaz)
    const ugovoriQuery = `
      SELECT r.id, r.ime, r.prezime, r.datum_prestanka, r.firma_id, f.naziv as firma_naziv,
             DATEDIFF(r.datum_prestanka, CURDATE()) as dana_do_isteka
      FROM radnici r 
      JOIN firme f ON r.firma_id = f.id 
      LEFT JOIN otkazi o ON r.id = o.radnik_id
      WHERE f.user_id = ? 
        AND r.datum_prestanka IS NOT NULL
        AND o.id IS NULL  -- Nema otkaz
        AND (r.datum_prestanka BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
             OR r.datum_prestanka < CURDATE())
      ORDER BY 
        CASE 
          WHEN r.datum_prestanka < CURDATE() THEN 0  -- Istekli prvi
          ELSE 1 
        END,
        r.datum_prestanka ASC
      LIMIT 10
    `;

    const ugovori = await executeQuery(ugovoriQuery, [userId]);

    ugovori.forEach((radnik) => {
      // Koristi JavaScript calculation za preciznost (umjesto SQL DATEDIFF zbog timezone)
      const prestanakDate = new Date(radnik.datum_prestanka);
      const currentDate = new Date();

      // Postavimo vreme na 00:00:00 za oba datuma za preciznu comparison
      prestanakDate.setHours(0, 0, 0, 0);
      currentDate.setHours(0, 0, 0, 0);
      const diffTime = prestanakDate.getTime() - currentDate.getTime();
      const finalDana = Math.round(diffTime / (1000 * 60 * 60 * 24));

      let type, icon, title;

      if (finalDana < 0) {
        // Ugovor je već istekao - NAJVIŠA PRIORITET
        type = "urgent";
        icon = "🚨";
        title = `Ugovor istekao prije ${Math.abs(finalDana)} ${
          Math.abs(finalDana) === 1 ? "dan" : "dana"
        }`;
      } else if (finalDana === 0) {
        // Ugovor ističe danas - HITNO
        type = "urgent";
        icon = "⚠️";
        title = `Ugovor ističe danas!`;
      } else if (finalDana <= 7) {
        // Ugovor ističe u sljedećih 7 dana - HITNO
        type = "urgent";
        icon = "⚠️";
        title = `Ugovor ističe za ${finalDana} ${
          finalDana === 1 ? "dan" : "dana"
        }`;
      } else if (finalDana <= 15) {
        // Ugovor ističe u sljedećih 15 dana - UPOZORENJE
        type = "warning";
        icon = "📋";
        title = `Ugovor ističe za ${finalDana} dana`;
      } else {
        // Ugovor ističe u sljedećih 30 dana - INFO
        type = "info";
        icon = "📅";
        title = `Ugovor ističe za ${finalDana} dana`;
      }

      notifications.push({
        id: `ugovor_${radnik.id}`,
        type,
        icon,
        title,
        description: `${radnik.ime} ${radnik.prezime} - ${radnik.firma_naziv}`,
        days: finalDana,
        action: `/firma-detalji.html?id=${radnik.firma_id}&radnikId=${radnik.id}`,
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

    // 4. PDV ROKOVI - koristi ispravljena business logic
    const today = new Date();
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1;

    // Determine target month (same logic as pdvController)
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

    // Calculate days to deadline
    let rokMonth = targetMonth + 1;
    let rokYear = targetYear;
    if (rokMonth > 12) {
      rokMonth = 1;
      rokYear++;
    }
    const rok = new Date(rokYear, rokMonth - 1, 15);
    const daysToDeadline = Math.ceil((rok - today) / (1000 * 60 * 60 * 24));

    const pdvRokoviQuery = `
      SELECT 
        f.id, 
        f.naziv,
        ? as dana_do_roka
      FROM firme f
      LEFT JOIN pdv_prijave pp ON f.id = pp.firma_id AND pp.mjesec = ?
      WHERE f.user_id = ? 
        AND f.pdvBroj IS NOT NULL 
        AND f.pdvBroj != ''
        AND f.status != 'nula'
        AND (pp.predano IS NULL OR pp.predano = 0)
        AND ? <= 7 AND ? >= -5
      ORDER BY f.naziv ASC
      LIMIT 10
    `;

    const pdvRokovi = await executeQuery(pdvRokoviQuery, [
      daysToDeadline,
      targetMonthString,
      userId,
      daysToDeadline,
      daysToDeadline,
    ]);

    pdvRokovi.forEach((firma) => {
      const dana = firma.dana_do_roka;
      let type, icon, title;

      if (dana < 0) {
        // Rok je prošao
        type = "urgent";
        icon = "🚨";
        title = `PDV rok prošao prije ${Math.abs(dana)} ${
          Math.abs(dana) === 1 ? "dan" : "dana"
        }!`;
      } else if (dana === 0) {
        // Rok je danas
        type = "urgent";
        icon = "🚨";
        title = "PDV rok DANAS!";
      } else if (dana <= 3) {
        // Rok je u sljedećih 3 dana
        type = "urgent";
        icon = "⚠️";
        title = `PDV rok za ${dana} ${dana === 1 ? "dan" : "dana"}`;
      } else {
        // Rok je u sljedećih 7 dana
        type = "warning";
        icon = "📊";
        title = `PDV rok za ${dana} dana`;
      }

      notifications.push({
        id: `pdv_${firma.id}`,
        type,
        icon,
        title,
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
         JOIN otkazi o ON r.id = o.radnik_id
         WHERE f.user_id = ?) as istekli_ugovori
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
    // 1. Istekli ugovori (negative days) - PRVI
    // 2. Urgent notifikacije (pozitivni ili 0 days)
    // 3. Warning notifikacije
    // 4. Info notifikacije
    const priorityOrder = { urgent: 1, warning: 2, info: 3 };
    notifications.sort((a, b) => {
      // Posebno sortiranje za istekle ugovore - oni su uvijek prvi
      const aIstekao = a.days < 0;
      const bIstekao = b.days < 0;

      if (aIstekao && !bIstekao) return -1; // a je istekao, b nije - a je prvi
      if (!aIstekao && bIstekao) return 1; // b je istekao, a nije - b je prvi

      // Ako su oba istekla ili oba nisu, sortiramo po prioritetu
      if (priorityOrder[a.type] !== priorityOrder[b.type]) {
        return priorityOrder[a.type] - priorityOrder[b.type];
      }

      // Ako su istog prioriteta, sortiramo po danima
      // Za istekle ugovore (negative), najstariji prvi
      if (aIstekao && bIstekao) {
        return a.days - b.days; // -5 će biti prije -2 (stariji prije)
      }

      // Za buduće datume, najbliži prvi
      return a.days - b.days;
    });

    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: "Greška pri dohvatanju obavještenja" });
  }
};

module.exports = { getNotifications };
