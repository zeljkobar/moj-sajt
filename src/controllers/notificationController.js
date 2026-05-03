const { executeQuery } = require('../config/database');

const notificationCache = new Map();
const NOTIFICATION_CACHE_TTL_MS = 60 * 1000;

// Dobijanje obavještenja za dashboard
const getNotifications = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    const cacheKey = `${userId}:${userRole}`;
    const cached = notificationCache.get(cacheKey);

    if (
      req.query.refresh !== '1' &&
      cached &&
      Date.now() - cached.createdAt < NOTIFICATION_CACHE_TTL_MS
    ) {
      res.set('X-Notifications-Cache', 'HIT');
      return res.json(cached.payload);
    }

    const notifications = [];

    // 1. NOVE REGISTRACIJE - samo admin vidi ove
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const noveRegistracijePromise =
      userRole === 'admin'
        ? executeQuery(
            `
        SELECT id, username, ime, prezime, email, role, created_at
        FROM users 
        WHERE created_at >= ?
          AND role != 'admin'
        ORDER BY created_at DESC
        LIMIT 10
      `,
            [sevenDaysAgo.toISOString().split('T')[0]]
          )
        : Promise.resolve([]);

    // 2. UGOVORI O RADU - radnici kojima ističu ugovori (za svoje firme)
    const ugovoriQuery = `
      SELECT r.id, r.ime, r.prezime, r.datum_prestanka, r.firma_id, f.naziv as firma_naziv,
             DATEDIFF(r.datum_prestanka, CURDATE()) as dana_do_isteka
      FROM radnici r 
      JOIN firme f ON r.firma_id = f.id AND f.user_id = ?
      LEFT JOIN otkazi o ON r.id = o.radnik_id
      WHERE r.datum_prestanka IS NOT NULL
        AND o.id IS NULL
        AND (r.datum_prestanka BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
             OR r.datum_prestanka < CURDATE())
      ORDER BY 
        CASE 
          WHEN r.datum_prestanka < CURDATE() THEN 0
          ELSE 1 
        END,
        r.datum_prestanka ASC
      LIMIT 10
    `;

    // 3. NOVE FIRME (za svoje firme)
    const noveFirmeQuery = `
      SELECT id, naziv, DATEDIFF(CURDATE(), created_at) as dana_od_kreiranja
      FROM firme 
      WHERE user_id = ? 
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      ORDER BY created_at DESC
      LIMIT 3
    `;

    // 4. PDV OBAVEŠTENJA - za firme koje zahtevaju pažnju
    // Kopirana logika iz pdvController.js
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1;
    const currentDay = today.getDate();

    // Određuj ciljni mjesec
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
      .padStart(2, '0')}-01`;

    // Kalkuliraj dane do roka
    const danaDoRoka = () => {
      const danas = new Date();
      let rokMonth = targetMonth + 1;
      let rokYear = targetYear;

      if (rokMonth > 12) {
        rokMonth = 1;
        rokYear++;
      }

      const rok = new Date(rokYear, rokMonth - 1, 15);
      const diff = Math.ceil((rok - danas) / (1000 * 60 * 60 * 24));
      return diff;
    };

    const daysToDeadline = danaDoRoka();

    // Dohvati PDV firme koje zahtevaju pažnju
    const pdvQuery = `
      SELECT 
        f.id,
        f.naziv,
        f.pdvBroj,
        pp.predano,
        pp.datum_predanja,
        CASE 
          WHEN pp.predano = 1 THEN 'predano'
          WHEN ? < 0 THEN 'kasni'
          WHEN ? <= 3 THEN 'uskoro'
          ELSE 'nepredano'
        END as status
      FROM firme f
      LEFT JOIN pdv_prijave pp ON f.id = pp.firma_id AND pp.mjesec = ?
      WHERE f.user_id = ? 
        AND f.pdvBroj IS NOT NULL 
        AND f.pdvBroj != ''
        AND f.status = 'aktivan'
        AND (pp.predano IS NULL OR pp.predano = 0)
      ORDER BY 
        CASE 
          WHEN ? < 0 THEN 1
          WHEN ? <= 3 THEN 2
          ELSE 3
        END,
        f.naziv ASC
      LIMIT 10
    `;

    const [noveRegistracije, ugovori, noveFirme, pdvFirme] = await Promise.all([
      noveRegistracijePromise,
      executeQuery(ugovoriQuery, [userId]),
      executeQuery(noveFirmeQuery, [userId]),
      executeQuery(pdvQuery, [
        daysToDeadline,
        daysToDeadline,
        targetMonthString,
        userId,
        daysToDeadline,
        daysToDeadline,
      ]),
    ]);

    // Manual calculation za dane od registracije
    noveRegistracije.forEach(user => {
      const registrationDate = new Date(user.created_at);
      const diffTime = today.getTime() - registrationDate.getTime();
      user.dana_od_registracije = Math.floor(
        diffTime / (1000 * 60 * 60 * 24)
      );
    });

    // Individualne notifikacije za svaki novi korisnik (ograniči na 5)
    noveRegistracije.slice(0, 5).forEach(user => {
      const danaOdRegistracije = user.dana_od_registracije;
      const imaUlogu = user.role && user.role !== 'user';

      notifications.push({
        id: `nova_registracija_${user.id}`,
        type: danaOdRegistracije === 0 ? 'urgent' : 'info',
        icon: imaUlogu ? '✅' : '👤',
        title:
          danaOdRegistracije === 0
            ? 'Nova registracija danas!'
            : `Nova registracija (${danaOdRegistracije} ${
                danaOdRegistracije === 1 ? 'dan' : 'dana'
              })`,
        description: `${user.ime} ${user.prezime} (${user.username}) - ${
          user.email
        }${imaUlogu ? ` [${user.role.toUpperCase()}]` : ' [ČEKA DOZVOLU]'}`,
        days: danaOdRegistracije,
        action: `/admin-users.html`,
        timestamp: new Date(),
      });
    });

    ugovori.forEach(radnik => {
      const prestanakDate = new Date(radnik.datum_prestanka);
      const currentDate = new Date();
      prestanakDate.setHours(0, 0, 0, 0);
      currentDate.setHours(0, 0, 0, 0);
      const diffTime = prestanakDate.getTime() - currentDate.getTime();
      const finalDana = Math.round(diffTime / (1000 * 60 * 60 * 24));

      let type, icon, title;

      if (finalDana < 0) {
        type = 'urgent';
        icon = '🚨';
        title = `Ugovor istekao prije ${Math.abs(finalDana)} ${
          Math.abs(finalDana) === 1 ? 'dan' : 'dana'
        }`;
      } else if (finalDana === 0) {
        type = 'urgent';
        icon = '⚠️';
        title = `Ugovor ističe danas!`;
      } else if (finalDana <= 7) {
        type = 'urgent';
        icon = '⚠️';
        title = `Ugovor ističe za ${finalDana} ${
          finalDana === 1 ? 'dan' : 'dana'
        }`;
      } else if (finalDana <= 15) {
        type = 'warning';
        icon = '📋';
        title = `Ugovor ističe za ${finalDana} dana`;
      } else {
        type = 'info';
        icon = '📅';
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

    noveFirme.forEach(firma => {
      notifications.push({
        id: `nova_firma_${firma.id}`,
        type: 'info',
        icon: '🏭',
        title: 'Nova firma dodana',
        description: `${firma.naziv} - kreirana ${
          firma.dana_od_kreiranja === 0
            ? 'danas'
            : `pre ${firma.dana_od_kreiranja} dana`
        }`,
        days: firma.dana_od_kreiranja,
        action: `/firme.html`,
        timestamp: new Date(),
      });
    });

    pdvFirme.forEach(firma => {
      let type, icon, title;

      // Prikaži samo ako je zakasnjelo ili ako je 5 dana ili manje do roka
      if (daysToDeadline < 0 || daysToDeadline <= 5) {
        if (daysToDeadline < 0) {
          type = 'urgent';
          icon = '🚨';
          title = `PDV prijava zakasnjela ${Math.abs(daysToDeadline)} ${
            Math.abs(daysToDeadline) === 1 ? 'dan' : 'dana'
          }`;
        } else if (daysToDeadline <= 3) {
          type = 'urgent';
          icon = '⏰';
          title = `PDV prijava ističe za ${daysToDeadline} ${
            daysToDeadline === 1 ? 'dan' : 'dana'
          }`;
        } else if (daysToDeadline <= 5) {
          type = 'warning';
          icon = '📋';
          title = `PDV prijava ističe za ${daysToDeadline} dana`;
        }

        notifications.push({
          id: `pdv_${firma.id}`,
          type,
          icon,
          title,
          description: `${firma.naziv} - PDV ${firma.pdvBroj}`,
          days: daysToDeadline,
          action: `/pdv-pregled.html`,
          timestamp: new Date(),
        });
      }
    });

    // 5. STARE POZAJMICE (za svoje firme)
    // PRIVREMENO ISKLJUČENO - tabela 'pozajmice' ne postoji u bazi
    /*
    const starePozajmiceQuery = `
      SELECT 
        p.id,
        p.iznos,
        p.datum_izdavanja,
        r.ime,
        r.prezime,
        f.naziv as firma_naziv,
        r.firma_id,
        DATEDIFF(CURDATE(), p.datum_izdavanja) as dani_od_izdavanja
      FROM pozajmice p
      JOIN radnici r ON p.radnik_id = r.id
      JOIN firme f ON r.firma_id = f.id
      WHERE r.firma_id IN (${placeholders})
        AND p.status = 'aktivna'
        AND p.datum_izdavanja <= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
      ORDER BY p.datum_izdavanja ASC
    `;

    const starePozajmice = await executeQuery(starePozajmiceQuery, firmaIds);

    starePozajmice.forEach(pozajmica => {
      const meseci = Math.floor(pozajmica.dani_od_izdavanja / 30);

      notifications.push({
        id: `stara_pozajmica_${pozajmica.id}`,
        type: 'warning',
        icon: '💰',
        title: 'Stara pozajmica',
        description: `${pozajmica.ime} ${pozajmica.prezime} - ${pozajmica.firma_naziv} - ${pozajmica.iznos}€ (${meseci} meseci)`,
        days: pozajmica.dani_od_izdavanja,
        action: `firma-detalji.html?id=${pozajmica.firma_id}#pozajmice`,
        timestamp: new Date(),
      });
    });
    */

    // Sortiranje obavještenja po prioritetu
    const priorityOrder = { urgent: 1, warning: 2, info: 3 };
    notifications.sort((a, b) => {
      const aIstekao = a.days < 0;
      const bIstekao = b.days < 0;

      if (aIstekao && !bIstekao) return -1;
      if (!aIstekao && bIstekao) return 1;

      if (priorityOrder[a.type] !== priorityOrder[b.type]) {
        return priorityOrder[a.type] - priorityOrder[b.type];
      }

      if (aIstekao && bIstekao) {
        return a.days - b.days;
      }

      return a.days - b.days;
    });

    const payload = { notifications };
    notificationCache.set(cacheKey, {
      createdAt: Date.now(),
      payload,
    });
    res.set('X-Notifications-Cache', 'MISS');
    res.json(payload);
  } catch (error) {
    console.error('Error in getNotifications:', error);
    res.status(500).json({ error: 'Greška pri dohvatanju obavještenja' });
  }
};

module.exports = { getNotifications };
