const fs = require("fs");
const path = require("path");

// Putanja do fajla sa korisnicima
const usersFilePath = path.join(__dirname, "..", "data", "users.json");

// Funkcija za učitavanje korisnika iz fajla
function loadUsers() {
  try {
    if (fs.existsSync(usersFilePath)) {
      const data = fs.readFileSync(usersFilePath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Greška pri učitavanju korisnika:", error);
  }

  // Vraćamo default korisnike ako fajl ne postoji ili je oštećen
  return [
    {
      id: 1,
      username: "admin",
      password: "12345",
      email: "admin@summasummarum.me",
      phone: "+382 67 440 040",
      address: "Popa Dukljanina 2, Bar",
      ime: "Željko",
      prezime: "Đuranović",
      jmbg: "1606981220012",
    },
    {
      id: 2,
      username: "ana",
      password: "ana123",
      email: "ana@summasummarum.me",
      phone: "+382 67 111 111",
      address: "Ana adresa 1",
      ime: "Ana",
      prezime: "Marić",
      jmbg: "1234567890123",
    },
    {
      id: 3,
      username: "marko",
      password: "marko123",
      email: "marko@summasummarum.me",
      phone: "+382 67 222 222",
      address: "Marko adresa 1",
      ime: "Marko",
      prezime: "Petrović",
      jmbg: "2345678901234",
    },
  ];
}

// Funkcija za čuvanje korisnika u fajl
function saveUsers(users) {
  try {
    // Kreiraj direktorijum ako ne postoji
    const usersDir = path.dirname(usersFilePath);
    if (!fs.existsSync(usersDir)) {
      fs.mkdirSync(usersDir, { recursive: true });
    }

    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error("Greška pri čuvanju korisnika:", error);
    return false;
  }
}

// Učitaj korisnike pri pokretanju
let users = loadUsers();

const authController = {
  // Login
  login: (req, res) => {
    const { username, password } = req.body;
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      req.session.user = user; // čuvanje korisnika u sesiji
      res.json({ success: true });
    } else {
      res.status(401).json({ message: "Pogrešno korisničko ime ili lozinka" });
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
  register: (req, res) => {
    const { username, email, password, phone, address, ime, prezime, jmbg } = req.body;

    // Validacija obaveznih polja
    if (!username || !email || !password || !ime || !prezime || !jmbg) {
      return res.status(400).json({
        message: "Korisničko ime, email, lozinka, ime, prezime i JMBG su obavezni",
      });
    }

    // Proveri da li korisnik već postoji
    const existingUser = users.find(
      (u) => u.username === username || u.email === email || u.jmbg === jmbg
    );
    if (existingUser) {
      return res.status(400).json({
        message: "Korisnik sa ovim korisničkim imenom, email-om ili JMBG-om već postoji",
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

    // Kreiraj novog korisnika
    const newUser = {
      id: Math.max(0, ...users.map((u) => u.id)) + 1, // Sigurniji način za ID
      username,
      password, // U produkcioj bi ovo trebalo da bude hash-ovano
      email,
      phone: phone || "",
      address: address || "",
      ime: ime.trim(),
      prezime: prezime.trim(),
      jmbg,
    };

    users.push(newUser);

    // Sačuvaj korisnike u fajl
    if (!saveUsers(users)) {
      return res.status(500).json({
        message: "Greška pri čuvanju korisnika",
      });
    }

    // Kreiraj prazan JSON fajl za firme novog korisnika
    const userFilePath = path.join(
      __dirname,
      "..",
      "data",
      "users",
      `${username}_firme.json`
    );

    try {
      fs.writeFileSync(userFilePath, JSON.stringify([], null, 2));
    } catch (error) {
      console.error(
        `Greška pri kreiranju fajla za korisnika ${username}:`,
        error
      );
      return res.status(500).json({
        message: "Greška pri kreiranju korisničkih podataka",
      });
    }

    res.json({
      message: "Korisnik je uspešno registrovan",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        ime: newUser.ime,
        prezime: newUser.prezime,
      },
    });
  },
};

module.exports = authController;
