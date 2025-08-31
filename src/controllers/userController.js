// src/controllers/userController.js
const bcrypt = require('bcrypt');
const { executeQuery } = require('../config/database');

// Funkcija za kopiranje template pozicija novom korisniku
async function copyTemplatesToUser(userId) {
  try {
    // Uzmi sve template pozicije sa opis_poslova
    const templatesQuery =
      'SELECT naziv, opis_poslova FROM pozicije_templates ORDER BY id';
    const templates = await executeQuery(templatesQuery);

    if (templates.length === 0) {
      console.log('⚠️ Nema template pozicija za kopiranje');
      return false;
    }

    // Kopiraj svaku template poziciju sa opis_poslova
    const insertQuery =
      'INSERT INTO pozicije (naziv, opis_poslova, user_id) VALUES (?, ?, ?)';

    for (const template of templates) {
      const opisPoslova =
        template.opis_poslova || 'Opis poslova će biti definisan naknadno.';
      await executeQuery(insertQuery, [template.naziv, opisPoslova, userId]);
    }

    console.log(
      `✅ Uspešno kopirano ${templates.length} template pozicija za korisnika ID: ${userId}`
    );
    return true;
  } catch (error) {
    console.error('❌ Greška pri kopiranju template pozicija:', error);
    return false;
  }
}

// GET /api/users
exports.getUsers = async (req, res) => {
  try {
    const users = await executeQuery(
      'SELECT id, username, email, ime, prezime, phone, jmbg, created_at FROM users'
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// POST /api/users
exports.createUser = async (req, res) => {
  try {
    const { username, password, email, phone, ime, prezime, jmbg } = req.body;

    if (!username || !password || !email || !ime || !prezime || !jmbg) {
      return res.status(400).json({ msg: 'Sva obavezna polja su potrebna' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await executeQuery(
      'INSERT INTO users (username, password, email, phone, ime, prezime, jmbg) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, email, phone, ime, prezime, jmbg]
    );

    // AUTOMATSKI KOPIRAJ TEMPLATE POZICIJE
    try {
      await copyTemplatesToUser(result.insertId);
    } catch (templateError) {
      console.error(
        `⚠️ Greška pri kopiranju template pozicija za korisnika ${result.insertId}:`,
        templateError
      );
      // Ne prekidamo kreiranje korisnika zbog template grešaka
    }

    res
      .status(201)
      .json({ msg: 'Korisnik kreiran uspešno', id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res
        .status(400)
        .json({ msg: 'Korisničko ime, email ili JMBG već postoji' });
    }

    res.status(500).json({ msg: 'Server error' });
  }
};

// GET /api/user/current - Get current logged in user data
exports.getCurrentUser = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ msg: 'Nema validne sesije' });
    }

    const username = req.session.user.username;

    const users = await executeQuery(
      'SELECT id, username, email, ime, prezime, phone, jmbg, role, created_at FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({ msg: 'Korisnik nije pronađen' });
    }

    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// PUT /api/user/profile - Update current user's profile
exports.updateProfile = async (req, res) => {
  try {
    const username = req.session.user.username;
    const { ime, prezime, email, phone, currentPassword } = req.body;

    if (!ime || !prezime || !email || !currentPassword) {
      return res
        .status(400)
        .json({ msg: 'Ime, prezime, email i trenutna lozinka su obavezni' });
    }

    // First verify current password
    const users = await executeQuery(
      'SELECT password FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({ msg: 'Korisnik nije pronađen' });
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      users[0].password
    );

    if (!isValidPassword) {
      return res.status(400).json({ msg: 'Trenutna lozinka nije ispravna' });
    }

    // Check if email is already taken by another user
    const emailCheck = await executeQuery(
      'SELECT id FROM users WHERE email = ? AND username != ?',
      [email, username]
    );

    if (emailCheck.length > 0) {
      return res
        .status(400)
        .json({ msg: 'Email već postoji kod drugog korisnika' });
    }

    // Update user profile
    await executeQuery(
      'UPDATE users SET ime = ?, prezime = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
      [ime, prezime, email, phone || null, username]
    );

    res.json({ msg: 'Profil je uspešno ažuriran' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ msg: 'Email već postoji' });
    }

    res.status(500).json({ msg: 'Server error' });
  }
};

// PUT /api/users/change-password - Change current user's password
exports.changePassword = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ msg: 'Korisnik nije autentifikovan' });
    }

    const username = req.session.user.username;

    if (!username) {
      return res.status(400).json({ msg: 'Username nije pronađen u sesiji' });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ msg: 'Sva polja su obavezna' });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ msg: 'Nova lozinka mora imati najmanje 6 karaktera' });
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ msg: 'Nova lozinka i potvrda se ne poklapaju' });
    }

    // Get current user's password
    const users = await executeQuery(
      'SELECT password FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({ msg: 'Korisnik nije pronađen' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      users[0].password
    );

    if (!isValidPassword) {
      return res.status(400).json({ msg: 'Trenutna lozinka nije ispravna' });
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, users[0].password);

    if (isSamePassword) {
      return res
        .status(400)
        .json({ msg: 'Nova lozinka mora biti različita od trenutne' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await executeQuery(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
      [hashedNewPassword, username]
    );

    res.json({ msg: 'Lozinka je uspešno promenjena' });
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// GET /api/users/:id
exports.getUserById = async (req, res) => {
  try {
    const users = await executeQuery(
      'SELECT id, username, email, ime, prezime, phone, jmbg, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// PUT /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { username, email, ime, prezime, phone } = req.body;

    if (!username || !email || !ime || !prezime) {
      return res.status(400).json({ msg: 'Obavezna polja su potrebna' });
    }

    await executeQuery(
      'UPDATE users SET username = ?, email = ?, ime = ?, prezime = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [username, email, ime, prezime, phone || null, req.params.id]
    );

    res.json({ msg: 'Korisnik ažuriran uspešno' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res
        .status(400)
        .json({ msg: 'Korisničko ime ili email već postoji' });
    }

    res.status(500).json({ msg: 'Server error' });
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const result = await executeQuery('DELETE FROM users WHERE id = ?', [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json({ msg: 'Korisnik obrisan uspešno' });
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// GET /api/user/subscription-status
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const userQuery = `
      SELECT
        id,
        username,
        ime,
        prezime,
        email,
        role,
        subscription_status,
        trial_start_date,
        trial_end_date,
        subscription_end_date,
        last_payment_date,
        payment_amount,
        payment_currency,
        auto_renewal,
        created_by_admin
      FROM users
      WHERE id = ?
    `;

    const users = await executeQuery(userQuery, [userId]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        msg: 'Korisnik nije pronađen',
      });
    }

    const user = users[0];

    // Izračunaj dane do isteka
    let daysLeft = null;
    let statusMessage = '';

    switch (user.subscription_status) {
      case 'trial':
        if (user.trial_end_date) {
          const endDate = new Date(user.trial_end_date);
          const now = new Date();
          const diffTime = endDate - now;
          daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          statusMessage = `Probni period: ${Math.max(
            0,
            daysLeft
          )} dana preostalo`;
        }
        break;

      case 'active':
        if (user.subscription_end_date) {
          const endDate = new Date(user.subscription_end_date);
          const now = new Date();
          const diffTime = endDate - now;
          daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          statusMessage = `Aktivno do: ${endDate.toLocaleDateString('sr-RS')}`;
        }
        break;

      case 'expired':
        statusMessage = 'Pretplata je istekla';
        break;

      case 'suspended':
        statusMessage = 'Račun je suspendovan';
        break;

      case 'gratis':
        statusMessage = 'Besplatna pretplata - neograničeno';
        break;

      default:
        statusMessage = 'Nepoznat status';
    }

    res.json({
      success: true,
      user: {
        ...user,
        days_left: daysLeft,
        status_message: statusMessage,
      },
    });
  } catch (error) {
    console.error('Greška pri dobijanju statusa pretplate:', error);
    res.status(500).json({
      success: false,
      msg: 'Greška pri dobijanju statusa pretplate',
    });
  }
};
