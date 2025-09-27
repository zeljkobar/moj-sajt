const { executeQuery } = require('../config/database');

const pozicijeController = {
  // GET /api/pozicije - dobij pozicije za ulogovanog korisnika
  getAllPozicije: async (req, res) => {
    try {
      // Proveri autentifikaciju
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Nije autentifikovan' });
      }

      const username = req.session.user.username;

      // Dobij ID korisnika
      const [user] = await executeQuery(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        return res.status(404).json({ message: 'Korisnik nije pronađen' });
      }

      // Dobij pozicije - kombinuj template pozicije i korisničke pozicije
      const pozicije = await executeQuery(
        `SELECT 
           CONCAT('template_', id) as id, 
           naziv, 
           opis_poslova, 
           'template' as tip,
           0 as user_id
         FROM pozicije_templates
         UNION ALL
         SELECT 
           CONCAT('custom_', id) as id, 
           naziv, 
           opis_poslova, 
           'custom' as tip,
           user_id
         FROM pozicije 
         WHERE user_id = ?
         ORDER BY naziv`,
        [user.id]
      );
      res.json(pozicije);
    } catch (error) {
      res.status(500).json({ message: 'Greška na serveru' });
    }
  },

  // GET /api/pozicije/:id - dobij poziciju po ID-u (samo ako pripada korisniku)
  getPozicijaById: async (req, res) => {
    const { id } = req.params;
    try {
      // Proveri autentifikaciju
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Nije autentifikovan' });
      }

      const username = req.session.user.username;

      // Dobij ID korisnika
      const [user] = await executeQuery(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        return res.status(404).json({ message: 'Korisnik nije pronađen' });
      }

      // Parsiraj ID da vidiš da li je template ili custom
      let pozicija = null;

      if (id.startsWith('template_')) {
        const templateId = id.replace('template_', '');
        [pozicija] = await executeQuery(
          "SELECT *, 'template' as tip FROM pozicije_templates WHERE id = ?",
          [templateId]
        );
      } else if (id.startsWith('custom_')) {
        const customId = id.replace('custom_', '');
        [pozicija] = await executeQuery(
          "SELECT *, 'custom' as tip FROM pozicije WHERE id = ? AND user_id = ?",
          [customId, user.id]
        );
      }

      if (!pozicija) {
        return res.status(404).json({
          message: 'Pozicija nije pronađena ili nemate dozvolu za pristup',
        });
      }

      // Dodaj prefix nazad u ID za odgovor
      pozicija.id = id;
      res.json(pozicija);
    } catch (error) {
      res.status(500).json({ message: 'Greška na serveru' });
    }
  },

  // POST /api/pozicije - dodaj novu poziciju (za ulogovanog korisnika)
  addPozicija: async (req, res) => {
    const { naziv, opis_poslova } = req.body;
    try {
      // Proveri autentifikaciju
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Nije autentifikovan' });
      }

      const username = req.session.user.username;

      // Dobij ID korisnika
      const [user] = await executeQuery(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        return res.status(404).json({ message: 'Korisnik nije pronađen' });
      }

      if (!naziv || !opis_poslova) {
        return res
          .status(400)
          .json({ message: 'Naziv i opis poslova su obavezni' });
      }

      const result = await executeQuery(
        'INSERT INTO pozicije (naziv, opis_poslova, user_id) VALUES (?, ?, ?)',
        [naziv, opis_poslova, user.id]
      );
      res.json({ success: true, pozicijaId: `custom_${result.insertId}` });
    } catch (error) {
      res.status(500).json({ message: 'Greška na serveru' });
    }
  },

  // PUT /api/pozicije/:id - ažuriraj poziciju (samo ako pripada korisniku)
  updatePozicija: async (req, res) => {
    const { id } = req.params;
    const { naziv, opis_poslova } = req.body;
    try {
      // Proveri autentifikaciju
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Nije autentifikovan' });
      }

      const username = req.session.user.username;

      // Dobij ID korisnika
      const [user] = await executeQuery(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        return res.status(404).json({ message: 'Korisnik nije pronađen' });
      }

      if (!naziv || !opis_poslova) {
        return res
          .status(400)
          .json({ message: 'Naziv i opis poslova su obavezni' });
      }

      // Rukovanje template pozicijama - kreiraj kopiju
      if (id.startsWith('template_')) {
        const templateId = id.replace('template_', '');

        // Uzmi podatke iz template-a
        const [template] = await executeQuery(
          'SELECT naziv, opis_poslova FROM pozicije_templates WHERE id = ?',
          [templateId]
        );

        if (!template) {
          return res
            .status(404)
            .json({ message: 'Template pozicija nije pronađena' });
        }

        // Kreiraj novu custom poziciju na osnovu template-a
        const result = await executeQuery(
          'INSERT INTO pozicije (naziv, opis_poslova, user_id) VALUES (?, ?, ?)',
          [naziv, opis_poslova, user.id]
        );

        res.json({
          success: true,
          message: 'Kreirana je vaša kopija pozicije',
          newId: `custom_${result.insertId}`,
        });
        return;
      }

      // Rukovanje custom pozicijama
      if (id.startsWith('custom_')) {
        const customId = id.replace('custom_', '');

        // Proveri da li pozicija pripada korisniku
        const [pozicijaCheck] = await executeQuery(
          'SELECT id FROM pozicije WHERE id = ? AND user_id = ?',
          [customId, user.id]
        );

        if (!pozicijaCheck) {
          return res.status(403).json({
            message: 'Nemate dozvolu da ažurirate ovu poziciju',
          });
        }

        await executeQuery(
          'UPDATE pozicije SET naziv = ?, opis_poslova = ? WHERE id = ? AND user_id = ?',
          [naziv, opis_poslova, customId, user.id]
        );
        res.json({ success: true, message: 'Pozicija je uspešno ažurirana' });
        return;
      }

      res.status(400).json({ message: 'Nevaljan ID pozicije' });
    } catch (error) {
      res.status(500).json({ message: 'Greška na serveru' });
    }
  },

  // DELETE /api/pozicije/:id - obriši poziciju (samo ako pripada korisniku)
  deletePozicija: async (req, res) => {
    const { id } = req.params;
    try {
      // Proveri autentifikaciju
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Nije autentifikovan' });
      }

      const username = req.session.user.username;

      // Dobij ID korisnika
      const [user] = await executeQuery(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        return res.status(404).json({ message: 'Korisnik nije pronađen' });
      }

      // Template pozicije se ne mogu brisati
      if (id.startsWith('template_')) {
        return res.status(403).json({
          message: 'Template pozicije se ne mogu brisati',
        });
      }

      // Rukovanje custom pozicijama
      if (id.startsWith('custom_')) {
        const customId = id.replace('custom_', '');

        // Proveri da li pozicija pripada korisniku
        const [pozicijaCheck] = await executeQuery(
          'SELECT id FROM pozicije WHERE id = ? AND user_id = ?',
          [customId, user.id]
        );

        if (!pozicijaCheck) {
          return res.status(403).json({
            message: 'Nemate dozvolu da obrišete ovu poziciju',
          });
        }

        await executeQuery(
          'DELETE FROM pozicije WHERE id = ? AND user_id = ?',
          [customId, user.id]
        );
        res.json({ success: true, message: 'Pozicija je uspešno obrisana' });
        return;
      }

      res.status(400).json({ message: 'Nevaljan ID pozicije' });
    } catch (error) {
      res.status(500).json({ message: 'Greška na serveru' });
    }
  },
};

module.exports = pozicijeController;
