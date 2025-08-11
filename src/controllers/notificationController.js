const { executeQuery } = require('../config/database');

// Dobijanje obavještenja za dashboard
const getNotifications = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    const notifications = [];

    // UNIFIKOVANA LOGIKA - svi korisnici (admin, firma, agencija) vide samo svoje firme i podatke
    const firme = await executeQuery(
      'SELECT id, naziv, created_at FROM firme WHERE user_id = ?',
      [userId]
    );

    // Ako korisnik nema firme, nema obavještenja
    if (firme.length === 0) {
      return res.json({ notifications: [] });
    }

    const firmaIds = firme.map(f => f.id);
    const placeholders = firmaIds.map(() => '?').join(',');

    // 1. NOVE REGISTRACIJE - samo admin vidi ove
    if (userRole === 'admin') {
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
        sevenDaysAgo.toISOString().split('T')[0],
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
    }

    // 2. UGOVORI O RADU - radnici kojima ističu ugovori (za svoje firme)
    const ugovoriQuery = `
      SELECT r.id, r.ime, r.prezime, r.datum_prestanka, r.firma_id, f.naziv as firma_naziv,
             DATEDIFF(r.datum_prestanka, CURDATE()) as dana_do_isteka
      FROM radnici r 
      JOIN firme f ON r.firma_id = f.id 
      LEFT JOIN otkazi o ON r.id = o.radnik_id
      WHERE r.firma_id IN (${placeholders})
        AND r.datum_prestanka IS NOT NULL
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

    const ugovori = await executeQuery(ugovoriQuery, firmaIds);

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

    // 3. NOVE FIRME (za svoje firme)
    const noveFirmeQuery = `
      SELECT id, naziv, DATEDIFF(CURDATE(), created_at) as dana_od_kreiranja
      FROM firme 
      WHERE user_id = ? 
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      ORDER BY created_at DESC
      LIMIT 3
    `;

    const noveFirme = await executeQuery(noveFirmeQuery, [userId]);

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

    // 4. STARE POZAJMICE (za svoje firme)
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

    res.json({ notifications });
  } catch (error) {
    console.error('Error in getNotifications:', error);
    res.status(500).json({ error: 'Greška pri dohvatanju obavještenja' });
  }
};

module.exports = { getNotifications };
