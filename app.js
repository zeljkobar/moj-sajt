require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = process.env.PORT || 3000;
const userRoutes = require("./src/routes/userRoutes");
const cors = require("cors");
const session = require("express-session");
const { firme0 } = require("./src/data/firme0");
const { aktivneFirme } = require("./src/data/firme");
// parsiranje JSON i form-data
app.use(
  cors({
    origin: "http://localhost:3000", // promeni ako koristiš drugi port
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
  session({
    secret: "vanesa3007", // promeni ovo u jaku vrednost
    resave: false,
    saveUninitialized: false,
  })
);
// Middleware za autentifikaciju
const authMiddleware = (req, res, next) => {
  if (req.session && req.session.user) {
    next(); // korisnik je autentifikovan
  } else {
    res.status(401).send("pristup zabranjen. ulogujte se");
  }
};

//dummy korisnici
const users = [{ id: 1, username: "admin", password: "12345" }];

app.post("/api/login", (req, res) => {
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
});

// Provera autentifikacije
app.get("/api/check-auth", (req, res) => {
  if (req.session && req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

// Odjava
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// zasticene rute
app.get("/protected.html", authMiddleware, (req, res) => {
  res.sendFile(__dirname + "/public/protected.html");
});

// Zaštićena ruta za PDV prijavu
app.get("/pdv_prijava/index.html", authMiddleware, (req, res) => {
  res.sendFile(__dirname + "/protected/pdv_prijava/index.html");
});

// Zaštićene rute za sve PDV prijava resurse
app.get("/pdv_prijava/:file", authMiddleware, (req, res) => {
  const fileName = req.params.file;
  res.sendFile(__dirname + "/protected/pdv_prijava/" + fileName);
});

// Zaštićena ruta za PDV0 (masovno preuzimanje)
app.get("/pdv0.html", authMiddleware, (req, res) => {
  res.sendFile(__dirname + "/public/pdv0.html");
});

// in-memory CRUD za “users”
app.use("/api/users", userRoutes);

// API za dobijanje podataka o firmama (zaštićeno)
app.get("/api/firme", authMiddleware, (req, res) => {
  // Kombinuje firme na nuli i aktivne firme
  const sveFirme = [...firme0, ...aktivneFirme];
  res.json(sveFirme);
});

// API za dobijanje firmi na nuli (zaštićeno)
app.get("/api/firme0", authMiddleware, (req, res) => {
  res.json(firme0);
});

// API za dobijanje aktivnih firmi (zaštićeno)
app.get("/api/aktivne-firme", authMiddleware, (req, res) => {
  res.json(aktivneFirme);
});

// API za dobijanje pojedinačne firme po PIB-u (zaštićeno)
app.get("/api/firme/:pib", authMiddleware, (req, res) => {
  const pib = req.params.pib;
  // Traži u obje grupe firmi
  const sveFirme = [...firme0, ...aktivneFirme];
  const firma = sveFirme.find((f) => f.pib === pib);

  if (firma) {
    res.json(firma);
  } else {
    res.status(404).json({ message: "Firma nije pronađena" });
  }
});

// fallback 404
app.use((req, res) => {
  res.status(404).json({ msg: "Ruta nije pronađena" });
});

// globalni error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ msg: "Server error" });
});

app.listen(port, () => {
  console.log(`🚀 Server radi na http://localhost:${port}`);
});
