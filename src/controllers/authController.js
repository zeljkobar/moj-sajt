const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { executeQuery } = require('../config/database');
const emailService = require('../services/emailService');
const { checkSubscriptionStatus } = require('../middleware/subscription');

// Funkcija za kopiranje template pozicija novom korisniku
async function copyTemplatesToUser(userId) {
  try {
    // Uzmi sve template pozicije sa opis_poslova
    const templatesQuery =
      'SELECT naziv, opis_poslova FROM pozicije_templates ORDER BY id';
    const templates = await executeQuery(templatesQuery);

    if (templates.length === 0) {
      // No template pozicije to copy
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

    // Template pozicije kopirane uspešno
    return true;
  } catch (error) {
    console.error('❌ Greška pri kopiranju template pozicija:', error);
    return false;
  }
}

// Funkcija za dobijanje korisnika po username-u
async function getUserByUsername(username) {
  try {
    const query =
      'SELECT id, username, password, email, phone, ime, prezime, jmbg, role, created_at, subscription_status, trial_end_date, subscription_end_date, created_by_admin FROM users WHERE username = ?';
    const users = await executeQuery(query, [username]);
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    return null;
  }
}

// Funkcija za kreiranje novog korisnika
async function createUser(userData) {
  try {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const query = `
      INSERT INTO users (username, password, email, phone, ime, prezime, jmbg, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(query, [
      userData.username,
      hashedPassword,
      userData.email,
      userData.phone,
      userData.ime,
      userData.prezime,
      userData.jmbg,
      userData.role || 'firma', // default role
    ]);

    return result.insertId;
  } catch (error) {
    throw error;
  }
}

const authController = {
  // Login
  login: async (req, res) => {
    // Login request received
    
    try {
      const { username, password } = req.body;
      const user = await getUserByUsername(username);

      if (!user) {
        // User not found
        return res
          .status(401)
          .json({ message: 'Pogrešno korisničko ime ili lozinka' });
      }

      // Proveri password (hash ili plain text za stare korisnike)
      let passwordValid = false;
      if (user.password.startsWith('$2b$')) {
        // Hashed password
        passwordValid = await bcrypt.compare(password, user.password);
      } else {
        // Plain text password (za migraciju)
        passwordValid = password === user.password;
      }

      if (passwordValid) {
        // Proveri da li korisnik pokušava da se loguje na odgovarajući domen
        // Koristi req.domainType postavljen u middleware-u
        const domainType = req.domainType || 'summasummarum'; // default

        // Login validation passed        // Blokiraj login ako je korisnik na pogrešnom domenu (osim admin-a)
        if (user.role !== 'admin') {
          if (user.role === 'agencija' && domainType === 'mojradnik') {
            // Agencija blocked from mojradnik domain
            return res.status(403).json({
              message:
                'Korisnici tipa "agencija" se mogu logovati samo na summasummarum.me',
              action: 'wrong_domain',
            });
          }

          if (user.role === 'firma' && domainType === 'summasummarum') {
            // Firma blocked from summasummarum domain
            return res.status(403).json({
              message:
                'Korisnici tipa "firma" se mogu logovati samo na mojradnik.me',
              action: 'wrong_domain',
            });
          }
        }

        // Proveri subscription status pre uspešnog logina
        const subscriptionStatus = await checkSubscriptionStatus(user);

        // Blokiraj login za expired i suspended korisnike (osim admin-a)
        if (
          user.role !== 'admin' &&
          (subscriptionStatus === 'subscription_expired' ||
            subscriptionStatus === 'trial_expired' ||
            subscriptionStatus === 'suspended')
        ) {
          let message;
          let redirect = '/account-suspended';

          if (
            subscriptionStatus === 'subscription_expired' ||
            subscriptionStatus === 'trial_expired'
          ) {
            message =
              'Vaša pretplata je istekla. Molimo obnovite pretplatu da biste nastavili korišćenje.';
            redirect = `/account-suspended?reason=${
              subscriptionStatus === 'trial_expired'
                ? 'trial_expired'
                : 'subscription_expired'
            }`;
          } else if (subscriptionStatus === 'suspended') {
            message =
              'Vaš račun je suspendovan. Kontaktirajte podršku za više informacija.';
            redirect = '/account-suspended?reason=suspended';
          }

          return res.status(403).json({
            message: message,
            action: 'subscription_expired',
            redirect: redirect,
          });
        }

        // Ukloni password iz user objekta pre čuvanja u sesiju
        const { password: _, ...userForSession } = user;
        req.session.user = userForSession;
        res.json({ success: true, user: userForSession });
      } else {
        res
          .status(401)
          .json({ message: 'Pogrešno korisničko ime ili lozinka' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Greška servera' });
    }
  },

  // Provera autentifikacije
  checkAuth: (req, res) => {
    if (req.session && req.session.user) {
      res.json({ authenticated: true, user: req.session.user });
    } else {
      res.json({ authenticated: false });
    }
  },

  // Logout
  logout: (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  },

  // Registracija
  register: async (req, res) => {
    try {
      const {
        username,
        email,
        password,
        phone,
        address,
        ime,
        prezime,
        jmbg,
        userType,
      } = req.body;

      // Validacija obaveznih polja
      if (!username || !email || !password || !ime || !prezime || !jmbg) {
        return res.status(400).json({
          message:
            'Korisničko ime, email, lozinka, ime, prezime i JMBG su obavezni',
        });
      }

      // UserType validacija
      if (userType && !['firma', 'agencija'].includes(userType)) {
        return res.status(400).json({
          message: 'Neispravna vrijednost za tip korisnika',
        });
      }

      // Username validacija
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({
          message:
            'Korisničko ime može sadržavati samo slova, brojeve i _ (3-20 karaktera)',
        });
      }

      // Password validacija
      if (password.length < 6) {
        return res.status(400).json({
          message: 'Lozinka mora imati najmanje 6 karaktera',
        });
      }

      // Email validacija
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          message: 'Neispravna email adresa',
        });
      }

      // JMBG validacija
      if (!/^[0-9]{13}$/.test(jmbg)) {
        return res.status(400).json({
          message: 'JMBG mora imati tačno 13 cifara',
        });
      }

      // Ime/prezime validacija
      if (ime.trim().length < 2 || ime.trim().length > 50) {
        return res.status(400).json({
          message: 'Ime mora imati između 2 i 50 karaktera',
        });
      }

      if (prezime.trim().length < 2 || prezime.trim().length > 50) {
        return res.status(400).json({
          message: 'Prezime mora imati između 2 i 50 karaktera',
        });
      }

      // Proveri da li korisnik već postoji (optimizovano u jednom upitu)
      const existingUserQuery = await executeQuery(
        'SELECT username, email, jmbg FROM users WHERE username = ? OR email = ? OR jmbg = ?',
        [username, email, jmbg]
      );

      if (existingUserQuery.length > 0) {
        const existing = existingUserQuery[0];
        if (existing.username === username) {
          return res.status(400).json({
            message: 'Korisnik sa ovim korisničkim imenom već postoji',
          });
        }
        if (existing.email === email) {
          return res.status(400).json({
            message: 'Korisnik sa ovim email-om već postoji',
          });
        }
        if (existing.jmbg === jmbg) {
          return res.status(400).json({
            message: 'Korisnik sa ovim JMBG-om već postoji',
          });
        }
      }

      // Kreiraj novog korisnika
      const userId = await createUser({
        username,
        email,
        password,
        phone: phone || '',
        ime: ime.trim(),
        prezime: prezime.trim(),
        jmbg,
        role: userType || 'firma', // default role je 'firma'
      });

      // Kopiraj template pozicije za novog korisnika (ne blokiramo registraciju ako ne uspe)
      copyTemplatesToUser(userId).catch(error => {
        console.error(
          `❌ Greška pri kopiranju template pozicija za korisnika ${username}:`,
          error
        );
      });

      // Pošalji welcome email (ne čekamo rezultat da ne sporimo registraciju)
      const userName = `${ime.trim()} ${prezime.trim()}`;
      emailService
        .sendWelcomeEmail(email, userName, userType || 'firma')
        .then(result => {
          if (result.success) {
            // Welcome email sent
          } else {
            console.error(
              `❌ Neuspešno slanje welcome email-a za: ${username}`,
              result.error
            );
          }
        })
        .catch(error => {
          console.error(
            `❌ Greška pri slanju welcome email-a za: ${username}`,
            error
          );
        });

      res.json({
        success: true,
        message: 'Registracija je uspešna! Možete se ulogovati.',
      });
    } catch (error) {
      // Specifične MySQL greške
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          message: 'Korisnik sa ovim podacima već postoji',
        });
      }

      res.status(500).json({
        message: 'Greška servera pri registraciji',
      });
    }
  },

  // Request password reset
  requestPasswordReset: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          message: 'Email adresa je obavezna',
        });
      }

      // Email validacija
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          message: 'Neispravna email adresa',
        });
      }

      // Pronađi korisnika po email-u
      const users = await executeQuery(
        'SELECT id, username, email, ime, prezime FROM users WHERE email = ?',
        [email]
      );

      // Uvek vraćamo isti odgovor iz bezbednosnih razloga (ne otkrivamo da li email postoji)
      if (users.length === 0) {
        return res.json({
          success: true,
          message:
            'Ako email postoji u našoj bazi, poslat je link za reset lozinke.',
        });
      }

      const user = users[0];

      // Generiši token
      const resetToken = crypto.randomUUID();
      const tokenExpires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 sata

      // Sačuvaj token u bazu
      await executeQuery(
        'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
        [resetToken, tokenExpires, user.id]
      );

      // Logiraj zahtev
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      await executeQuery(
        'INSERT INTO password_reset_logs (user_id, email, token, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
        [user.id, email, resetToken, clientIp, userAgent]
      );

      // Pošalji email
      const userName = `${user.ime} ${user.prezime}`;
      const emailResult = await emailService.sendPasswordResetEmail(
        email,
        userName,
        resetToken
      );

      if (emailResult.success) {
        // Password reset email sent
      } else {
        console.error(
          `❌ Neuspešno slanje reset email-a za: ${email}`,
          emailResult.error
        );
      }

      res.json({
        success: true,
        message:
          'Ako email postoji u našoj bazi, poslat je link za reset lozinke.',
      });
    } catch (error) {
      console.error('❌ Greška pri request password reset:', error);
      res.status(500).json({
        message: 'Greška servera pri zahtеvu za reset lozinke',
      });
    }
  },

  // Reset password
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({
          message: 'Token, nova lozinka i potvrda su obavezni',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          message: 'Lozinka mora imati najmanje 6 karaktera',
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          message: 'Lozinke se ne poklapaju',
        });
      }

      // Pronađi korisnika sa validnim tokenom
      const users = await executeQuery(
        'SELECT id, username, email, ime, prezime FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
        [token]
      );

      if (users.length === 0) {
        return res.status(400).json({
          message: 'Nevalidan ili istek token za reset lozinke',
        });
      }

      const user = users[0];

      // Hash nova lozinka
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Ažuriraj lozinku i ukloni token
      await executeQuery(
        'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
        [hashedPassword, user.id]
      );

      // Označi token kao iskorišćen u logovima
      await executeQuery(
        "UPDATE password_reset_logs SET used_at = NOW(), status = 'used' WHERE token = ?",
        [token]
      );

      // Password reset successful

      res.json({
        success: true,
        message:
          'Lozinka je uspešno promenjena. Možete se prijaviti sa novom lozinkom.',
      });
    } catch (error) {
      console.error('❌ Greška pri reset password:', error);
      res.status(500).json({
        message: 'Greška servera pri resetovanju lozinke',
      });
    }
  },

  // Registracija agencije
  registerAgencija: async (req, res) => {
    try {
      const { ime, prezime, email, telefon, jmbg, password, termsAccepted } =
        req.body;

      // Validation
      if (!ime || !prezime || !email || !password || !termsAccepted) {
        return res.status(400).json({
          message: 'Sva obavezna polja moraju biti popunjena',
        });
      }

      // Check if email already exists
      const existingUser = await executeQuery(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUser.length > 0) {
        return res.status(409).json({
          message: 'Korisnik sa ovom email adresom već postoji',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user with agencija role
      const userResult = await executeQuery(
        `INSERT INTO users (
          username, password, email, phone, ime, prezime, jmbg, role
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          email, // username = email
          hashedPassword,
          email,
          telefon,
          ime,
          prezime,
          jmbg,
          'agencija',
        ]
      );

      const userId = userResult.insertId;

      // Copy template positions
      await copyTemplatesToUser(userId);

      // Agencija registered successfully

      res.status(201).json({
        success: true,
        message: 'Agencija je uspješno registrirana!',
        userId: userId,
      });
    } catch (error) {
      console.error('❌ Greška pri registraciji agencije:', error);
      res.status(500).json({
        message: 'Greška servera pri registraciji',
      });
    }
  },

  // Registracija kompanije
  registerKompanija: async (req, res) => {
    try {
      const { ime, prezime, email, telefon, password, termsAccepted } =
        req.body;

      // Validation
      if (!ime || !prezime || !email || !password || !termsAccepted) {
        return res.status(400).json({
          message: 'Sva obavezna polja moraju biti popunjena',
        });
      }

      // Check if email already exists
      const existingUser = await executeQuery(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUser.length > 0) {
        return res.status(409).json({
          message: 'Korisnik sa ovom email adresom već postoji',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user with firma role (kompanija će biti firma u ovom sistemu)
      const userResult = await executeQuery(
        `INSERT INTO users (
          username, password, email, phone, ime, prezime, role
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          email, // username = email
          hashedPassword,
          email,
          telefon,
          ime,
          prezime,
          'firma',
        ]
      );

      const userId = userResult.insertId;

      // Copy template positions
      await copyTemplatesToUser(userId);

      // Kompanija registered successfully

      res.status(201).json({
        success: true,
        message: 'Kompanija je uspješno registrirana!',
        userId: userId,
      });
    } catch (error) {
      console.error('❌ Greška pri registraciji kompanije:', error);
      res.status(500).json({
        message: 'Greška servera pri registraciji',
      });
    }
  },
};

module.exports = authController;
