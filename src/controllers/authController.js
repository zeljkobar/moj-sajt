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
    },
    {
      id: 2,
      username: "ana",
      password: "ana123",
      email: "ana@summasummarum.me",
      phone: "+382 67 111 111",
      address: "Ana adresa 1",
    },
    {
      id: 3,
      username: "marko",
      password: "marko123",
      email: "marko@summasummarum.me",
      phone: "+382 67 222 222",
      address: "Marko adresa 1",
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
    const { username, email, password, phone, address } = req.body;

    // Validacija
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Korisničko ime, email i lozinka su obavezni",
      });
    }

    // Proveri da li korisnik već postoji
    const existingUser = users.find(
      (u) => u.username === username || u.email === email
    );
    if (existingUser) {
      return res.status(400).json({
        message: "Korisnik sa ovim korisničkim imenom ili email-om već postoji",
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

    // Kreiraj novog korisnika
    const newUser = {
      id: Math.max(0, ...users.map((u) => u.id)) + 1, // Sigurniji način za ID
      username,
      password, // U produkcioj bi ovo trebalo da bude hash-ovano
      email,
      phone: phone || "",
      address: address || "",
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
      },
    });
  },
};

module.exports = authController;
