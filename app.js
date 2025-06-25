require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = process.env.PORT || 3000;
const userRoutes = require("./src/routes/userRoutes");
const authRoutes = require("./src/routes/authRoutes");
const firmeRoutes = require("./src/routes/firmeRoutes");
const { authMiddleware } = require("./src/middleware/auth");
const cors = require("cors");
const session = require("express-session");

// parsiranje JSON i form-data
app.use(
  cors({
    origin: "http://localhost:3000", // promeni ako koristiš drugi port
    methods: ["GET", "POST", "PUT", "DELETE"],
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

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// zasticene rute za static fajlove
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

// Zaštićena ruta za dashboard
app.get("/dashboard.html", authMiddleware, (req, res) => {
  res.sendFile(__dirname + "/public/dashboard.html");
});

// API ruta za dashboard statistike
app.get("/api/dashboard-stats", authMiddleware, (req, res) => {
  const { aktivneFirme } = require("./src/data/firme");
  const { firme0 } = require("./src/data/firme0");

  const aktivneCount = aktivneFirme.length;
  const naNuliCount = firme0.length;
  const total = aktivneCount + naNuliCount;
  const procenatNaNuli =
    total > 0 ? Math.round((naNuliCount / total) * 100) : 0;

  res.json({
    total: total,
    aktivne: aktivneCount,
    naNuli: naNuliCount,
    procenatNaNuli: procenatNaNuli,
  });
});

// API rute
app.use("/api/users", userRoutes);
app.use("/api", authRoutes);
app.use("/api/firme", firmeRoutes);

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
