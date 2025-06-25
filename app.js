require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = process.env.PORT || 3000;
const userRoutes = require("./src/routes/userRoutes");
const cors = require("cors");
const session = require("express-session");
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

app.get("/protected.html", authMiddleware, (req, res) => {
  res.sendFile(__dirname + "/public/protected.html");
});

app.get("/pdv_prijava/index.html", authMiddleware, (req, res) => {
  res.sendFile(__dirname + "/public/pdv_prijava/index.html");
});

// in-memory CRUD za “users”
app.use("/api/users", userRoutes);

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
