const bcrypt = require("bcrypt");
const { executeQuery } = require("../config/database");

// Funkcija za dobijanje korisnika po username-u
async function getUserByUsername(username) {
  try {
    const query = "SELECT * FROM users WHERE username = ?";
    const users = await executeQuery(query, [username]);
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error("Greška pri dobijanju korisnika:", error);
    return null;
  }
}

// Funkcija za kreiranje novog korisnika
async function createUser(userData) {
  try {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const query = `
      INSERT INTO users (username, password, email, phone, ime, prezime, jmbg)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(query, [
      userData.username,
      hashedPassword,
      userData.email,
      userData.phone,
      userData.ime,
      userData.prezime,
      userData.jmbg,
    ]);

    return result.insertId;
  } catch (error) {
    console.error("Greška pri kreiranju korisnika:", error);
    throw error;
  }
}

const authController = {
  // Login
  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await getUserByUsername(username);

      if (!user) {
        return res
          .status(401)
          .json({ message: "Pogrešno korisničko ime ili lozinka" });
      }

      // Proveri password (hash ili plain text za stare korisnike)
      let passwordValid = false;
      if (user.password.startsWith("$2b$")) {
        // Hashed password
        passwordValid = await bcrypt.compare(password, user.password);
      } else {
        // Plain text password (za migraciju)
        passwordValid = password === user.password;
      }

      if (passwordValid) {
        // Ukloni password iz user objekta pre čuvanja u sesiju
        const { password: _, ...userForSession } = user;
        req.session.user = userForSession;
        res.json({ success: true });
      } else {
        res
          .status(401)
          .json({ message: "Pogrešno korisničko ime ili lozinka" });
      }
    } catch (error) {
      console.error("Greška pri login-u:", error);
      res.status(500).json({ message: "Greška servera" });
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
      const { username, email, password, phone, address, ime, prezime, jmbg } =
        req.body;

      // Validacija obaveznih polja
      if (!username || !email || !password || !ime || !prezime || !jmbg) {
        return res.status(400).json({
          message:
            "Korisničko ime, email, lozinka, ime, prezime i JMBG su obavezni",
        });
      }

      // Username validacija
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({
          message:
            "Korisničko ime može sadržavati samo slova, brojeve i _ (3-20 karaktera)",
        });
      }

      // Password validacija
      if (password.length < 6) {
        return res.status(400).json({
          message: "Lozinka mora imati najmanje 6 karaktera",
        });
      }

      // Email validacija
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          message: "Neispravna email adresa",
        });
      }

      // JMBG validacija
      if (!/^[0-9]{13}$/.test(jmbg)) {
        return res.status(400).json({
          message: "JMBG mora imati tačno 13 cifara",
        });
      }

      // Ime/prezime validacija
      if (ime.trim().length < 2 || ime.trim().length > 50) {
        return res.status(400).json({
          message: "Ime mora imati između 2 i 50 karaktera",
        });
      }

      if (prezime.trim().length < 2 || prezime.trim().length > 50) {
        return res.status(400).json({
          message: "Prezime mora imati između 2 i 50 karaktera",
        });
      }

      // Proveri da li korisnik već postoji
      const existingUserByUsername = await getUserByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({
          message: "Korisnik sa ovim korisničkim imenom već postoji",
        });
      }

      // Proveri email i JMBG
      const existingUserByEmail = await executeQuery(
        "SELECT id FROM users WHERE email = ?",
        [email]
      );
      if (existingUserByEmail.length > 0) {
        return res.status(400).json({
          message: "Korisnik sa ovim email-om već postoji",
        });
      }

      const existingUserByJmbg = await executeQuery(
        "SELECT id FROM users WHERE jmbg = ?",
        [jmbg]
      );
      if (existingUserByJmbg.length > 0) {
        return res.status(400).json({
          message: "Korisnik sa ovim JMBG-om već postoji",
        });
      }

      // Kreiraj novog korisnika
      const userId = await createUser({
        username,
        email,
        password,
        phone: phone || "",
        ime: ime.trim(),
        prezime: prezime.trim(),
        jmbg,
      });

      console.log(`✅ Novi korisnik registrovan: ${username} (ID: ${userId})`);

      res.json({
        success: true,
        message: "Registracija je uspešna! Možete se ulogovati.",
      });
    } catch (error) {
      console.error("Greška pri registraciji:", error);

      // Specifične MySQL greške
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          message: "Korisnik sa ovim podacima već postoji",
        });
      }

      res.status(500).json({
        message: "Greška servera pri registraciji",
      });
    }
  },
};

module.exports = authController;
