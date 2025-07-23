// Patch za activities endpoint da filtrira po user_id
//
// Ova funkcija zamenjuje postojeći /api/activities endpoint
// da prikazuje aktivnosti samo trenutno ulogovanog korisnika

const express = require("express");
const { executeQuery } = require("./src/config/database");

function setupActivitiesWithUserFilter(app, authMiddleware) {
  // Jednostavno dodaj novi endpoint - postojeći će biti pregazen
  app.get("/api/activities", authMiddleware, async (req, res) => {
    try {
      const activities = [];
      const userId = req.user.id; // ID trenutno ulogovanog korisnika

      // Poslednji kreirani radnici (ugovori) - koristimo datum_zaposlenja
      // Filtriramo po user_id preko firme
      const recentRadnici = await executeQuery(
        `
        SELECT r.ime, r.prezime, f.naziv as firma_naziv, r.datum_zaposlenja as created_at, 'radnik' as tip
        FROM radnici r 
        LEFT JOIN firme f ON r.firma_id = f.id 
        WHERE r.datum_zaposlenja IS NOT NULL 
          AND f.user_id = ?
        ORDER BY r.datum_zaposlenja DESC 
        LIMIT 3
      `,
        [userId]
      );

      recentRadnici.forEach((radnik) => {
        activities.push({
          tip: "ugovor",
          title: "Kreiran ugovor o radu",
          description: `${radnik.ime} ${radnik.prezime} - ${
            radnik.firma_naziv || "Nepoznata firma"
          }`,
          created_at: radnik.created_at,
          icon: "fas fa-file-contract",
          iconClass: "text-primary",
        });
      });

      // Poslednje kreirane pozajmnice - proveravamo da li ima created_at
      // Filtriramo po user_id preko firme
      try {
        const recentPozajmnice = await executeQuery(
          `
          SELECT p.iznos, r.ime, r.prezime, f.naziv as firma_naziv, p.created_at, 'pozajmica' as tip
          FROM pozajmnice p 
          LEFT JOIN radnici r ON p.radnik_id = r.id 
          LEFT JOIN firme f ON p.firma_id = f.id 
          WHERE p.created_at IS NOT NULL 
            AND f.user_id = ?
          ORDER BY p.created_at DESC 
          LIMIT 2
        `,
          [userId]
        );

        recentPozajmnice.forEach((pozajmica) => {
          activities.push({
            tip: "pozajmica",
            title: "Odobrena pozajmica",
            description: `${pozajmica.ime} ${pozajmica.prezime} - ${pozajmica.iznos}€`,
            created_at: pozajmica.created_at,
            icon: "fas fa-money-bill-wave",
            iconClass: "text-warning",
          });
        });
      } catch (pozajmniceError) {
        console.log(
          "Pozajmnice tabela možda nema created_at kolonu:",
          pozajmniceError.message
        );
        // Ako nema created_at, koristimo datum_izdavanja
        const recentPozajmniceAlt = await executeQuery(
          `
          SELECT p.iznos, r.ime, r.prezime, f.naziv as firma_naziv, p.datum_izdavanja as created_at, 'pozajmica' as tip
          FROM pozajmnice p 
          LEFT JOIN radnici r ON p.radnik_id = r.id 
          LEFT JOIN firme f ON p.firma_id = f.id 
          WHERE p.datum_izdavanja IS NOT NULL 
            AND f.user_id = ?
          ORDER BY p.datum_izdavanja DESC 
          LIMIT 2
        `,
          [userId]
        );

        recentPozajmniceAlt.forEach((pozajmica) => {
          activities.push({
            tip: "pozajmica",
            title: "Odobrena pozajmica",
            description: `${pozajmica.ime} ${pozajmica.prezime} - ${pozajmica.iznos}€`,
            created_at: pozajmica.created_at,
            icon: "fas fa-money-bill-wave",
            iconClass: "text-warning",
          });
        });
      }

      // Poslednje kreirane firme - proveravamo da li ima created_at
      // Filtriramo direktno po user_id
      try {
        const recentFirme = await executeQuery(
          `
          SELECT naziv, created_at, 'firma' as tip
          FROM firme 
          WHERE created_at IS NOT NULL 
            AND user_id = ?
          ORDER BY created_at DESC 
          LIMIT 2
        `,
          [userId]
        );

        recentFirme.forEach((firma) => {
          activities.push({
            tip: "firma",
            title: "Dodana nova firma",
            description: `${firma.naziv}`,
            created_at: firma.created_at,
            icon: "fas fa-building",
            iconClass: "text-success",
          });
        });
      } catch (firmeError) {
        console.log(
          "Firme tabela možda nema created_at kolonu:",
          firmeError.message
        );
        // Ako firme nemaju created_at, možemo preskočiti ili koristiti neki drugi datum
      }

      // Sortiraj sve aktivnosti po datumu
      activities.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      // Vrati samo prvih 5
      res.json({
        success: true,
        activities: activities.slice(0, 5),
      });
    } catch (error) {
      console.error("Error fetching user activities:", error);
      res.status(500).json({
        success: false,
        message: "Greška pri dohvaćanju korisničkih aktivnosti",
      });
    }
  });
}

module.exports = { setupActivitiesWithUserFilter };
