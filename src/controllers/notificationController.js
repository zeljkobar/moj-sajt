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

      // Nove registracije u poslednjih 7 dana (sve nove registracije osim admin)
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
      ORDER BY 
        CASE 
          WHEN r.datum_prestanka < CURDATE() THEN 0  -- Istekli prvi
          ELSE 1 
        END,
        r.datum_prestanka ASC
      LIMIT 10
    `;

    const ugovori = await executeQuery(ugovoriQuery, [userId]);

    // Dodatni debugging za server environment
    console.log("🌐 SERVER DEBUGGING - Environment info:");
    console.log("  Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log("  Current Date (JS):", new Date().toISOString());
    console.log("  Current Date (Local):", new Date().toLocaleDateString('sr-RS'));
    
    // DEBUG: Dodaj detaljne informacije za svaki ugovor
    console.log("🔍 DEBUG UGOVORI - ukupno pronađeno:", ugovori.length);
    
    ugovori.forEach((radnik, index) => {
      const dana = radnik.dana_do_isteka;

      // Manual re-calculation za sigurnost
      const prestanakDate = new Date(radnik.datum_prestanka);
      const currentDate = new Date();
      
      // DEBUG: Ispiši originalne datume
      console.log(`📅 RADNIK ${index + 1} (${radnik.ime} ${radnik.prezime}):`);
      console.log(`   - datum_prestanka iz DB: ${radnik.datum_prestanka}`);
      console.log(`   - prestanakDate object: ${prestanakDate}`);
      console.log(`   - currentDate object: ${currentDate}`);
      console.log(`   - SQL dana_do_isteka: ${dana}`);
      
      // Postavimo vreme na 00:00:00 za oba datuma za preciznu comparison
      prestanakDate.setHours(0, 0, 0, 0);
      currentDate.setHours(0, 0, 0, 0);
      const diffTime = prestanakDate.getTime() - currentDate.getTime();
      const manualDiffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      console.log(`   - Manual calculation: ${manualDiffDays} dana`);
      console.log(`   - Timezone offset: ${prestanakDate.getTimezoneOffset()} min`);
      
      // Koristi manual calculation ako se razlikuje od SQL-a
      const finalDana = dana !== manualDiffDays ? manualDiffDays : dana;
      
      console.log(`   - Final dana: ${finalDana}`);
      console.log(`   - SQL vs Manual razlika: ${dana !== manualDiffDays ? 'DA' : 'NE'}`);

      let type, icon, title;

      if (finalDana < 0) {
        // Ugovor je već istekao - NAJVIŠA PRIORITET
        type = "urgent";
        icon = "🚨";
        title = `Ugovor istekao prije ${Math.abs(finalDana)} ${
          Math.abs(finalDana) === 1 ? "dan" : "dana"
        }`;
        console.log(`   ❌ EXPIRED: ${Math.abs(finalDana)} dana prije`);
      } else if (finalDana === 0) {
        // Ugovor ističe danas - HITNO
        type = "urgent";
        icon = "⚠️";
        title = `Ugovor ističe danas!`;
        console.log(`   ⚠️ TODAY: Ističe danas`);
      } else if (finalDana <= 7) {
        // Ugovor ističe u sljedećih 7 dana - HITNO
        type = "urgent";
        icon = "⚠️";
        title = `Ugovor ističe za ${finalDana} ${
          finalDana === 1 ? "dan" : "dana"
        }`;
        console.log(`   ⚠️ URGENT: ${finalDana} dana`);
      } else if (finalDana <= 15) {
        // Ugovor ističe u sljedećih 15 dana - UPOZORENJE
        type = "warning";
        icon = "📋";
        title = `Ugovor ističe za ${finalDana} dana`;
        console.log(`   ⚠️ WARNING: ${finalDana} dana`);
      } else {
        // Ugovor ističe u sljedećih 30 dana - INFO
        type = "info";
        icon = "📅";
        title = `Ugovor ističe za ${finalDana} dana`;
        console.log(`   ℹ️ INFO: ${finalDana} dana`);
      }

      notifications.push({
        id: `ugovor_${radnik.id}`,
        type,
        icon,
        title,
        description: `${radnik.ime} ${radnik.prezime} - ${radnik.firma_naziv}`,
        days: finalDana, // Koristi ispravljen broj dana
        action: `/radnici.html?search=${encodeURIComponent(
          radnik.ime + " " + radnik.prezime
        )}`,
        timestamp: new Date(),
      });
      
      console.log(`   ✅ DODANO: ${title} (type: ${type})`);
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

// DEBUG endpoint za ugovore
const debugUgovori = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("=== DEBUG UGOVORI ZA KORISNIKA ===", userId);

    // Proveri sve ugovore
    const sviUgovori = await executeQuery(`
      SELECT 
        r.id, r.ime, r.prezime, r.datum_pocetka, r.datum_prestanka,
        f.naziv as firma_naziv,
        DATEDIFF(r.datum_prestanka, CURDATE()) as dana_do_isteka,
        CURDATE() as danas,
        r.datum_prestanka < CURDATE() as je_istekao
      FROM radnici r
      JOIN firme f ON r.firma_id = f.id
      WHERE f.user_id = ? 
        AND r.datum_prestanka IS NOT NULL
      ORDER BY r.datum_prestanka ASC
    `, [userId]);
    
    console.log("SVI UGOVORI:", sviUgovori);

    // Proveri timezone info
    const timezoneInfo = await executeQuery(`
      SELECT 
        @@session.time_zone as session_timezone,
        @@system_time_zone as system_timezone,
        CURDATE() as current_date,
        NOW() as current_datetime
    `);
    
    console.log("TIMEZONE INFO:", timezoneInfo);

    res.json({
      message: "Debug ugovori ispisani u konzoli",
      ugovori: sviUgovori,
      timezoneInfo,
      serverTime: new Date(),
      serverUTCTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Debug ugovori greška:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getNotifications, debugSQL, debugUgovori };
