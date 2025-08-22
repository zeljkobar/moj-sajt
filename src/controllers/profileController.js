const { executeQuery } = require('../config/database');

// GET /api/profile/stats - Get user profile stats
exports.getProfileStats = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: 'Nije autentifikovan' });
    }

    const username = req.session.user.username;

    // Dobij osnovne podatke korisnika
    const [user] = await executeQuery(
      `SELECT id, username, email, ime, prezime, phone, jmbg, role, created_at 
       FROM users WHERE username = ?`,
      [username]
    );

    if (!user) {
      return res.status(404).json({ message: 'Korisnik nije pronađen' });
    }

    // Dobij broj firmi
    const [firmeStats] = await executeQuery(
      'SELECT COUNT(*) as broj_firmi FROM firme WHERE user_id = ?',
      [user.id]
    );

    // Dobij broj radnika
    const [radniciStats] = await executeQuery(
      `SELECT COUNT(r.id) as broj_radnika 
       FROM radnici r 
       JOIN firme f ON r.firma_id = f.id 
       WHERE f.user_id = ?`,
      [user.id]
    );

    // Dobij broj pozajmnica
    const [pozajmniceStats] = await executeQuery(
      `SELECT COUNT(p.id) as broj_pozajmnica 
       FROM pozajmnice p 
       JOIN radnici r ON p.radnik_id = r.id 
       JOIN firme f ON r.firma_id = f.id 
       WHERE f.user_id = ?`,
      [user.id]
    );

    // Dobij broj pozicija
    const [pozicijeStats] = await executeQuery(
      'SELECT COUNT(*) as broj_pozicija FROM pozicije WHERE user_id = ?',
      [user.id]
    );

    // Dobij broj otkaznih lista
    const [otkaziStats] = await executeQuery(
      `SELECT COUNT(o.id) as broj_otkaza 
       FROM otkazi o 
       JOIN radnici r ON o.radnik_id = r.id 
       JOIN firme f ON r.firma_id = f.id 
       WHERE f.user_id = ?`,
      [user.id]
    );

    const stats = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        ime: user.ime,
        prezime: user.prezime,
        phone: user.phone,
        jmbg: user.jmbg,
        role: user.role,
        created_at: user.created_at,
      },
      statistics: {
        broj_firmi: firmeStats.broj_firmi || 0,
        broj_radnika: radniciStats.broj_radnika || 0,
        broj_pozajmnica: pozajmniceStats.broj_pozajmnica || 0,
        broj_pozicija: pozicijeStats.broj_pozicija || 0,
        broj_otkaza: otkaziStats.broj_otkaza || 0,
      },
    };

    res.json(stats);
  } catch (error) {
    console.error('Greška pri dobijanju profil statistika:', error);
    res.status(500).json({ message: 'Greška na serveru' });
  }
};
