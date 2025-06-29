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
    credentials: true, // Omogući slanje cookies/session
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

// Zaštićena ruta za pregled firmi
app.get("/firme.html", authMiddleware, (req, res) => {
  res.sendFile(__dirname + "/public/firme.html");
});

// Zaštićena ruta za dodavanje firmi
app.get("/dodaj-firmu.html", authMiddleware, (req, res) => {
  res.sendFile(__dirname + "/public/dodaj-firmu.html");
});

// Zaštićena ruta za editovanje firmi
app.get("/edit-firmu.html", authMiddleware, (req, res) => {
  res.sendFile(__dirname + "/public/edit-firmu.html");
});

// Zaštićena ruta za editovanje profila
app.get("/edit-profil.html", authMiddleware, (req, res) => {
  res.sendFile(__dirname + "/public/edit-profil.html");
});

// API ruta za dashboard statistike
app.get("/api/dashboard-stats", authMiddleware, async (req, res) => {
  try {
    const username = req.session.user.username;
    const firmeController = require("./src/controllers/firmeController");
    const allFirme = await firmeController.readUserFirme(username);

    const total = allFirme.length;
    const aktivneCount = allFirme.filter((f) => f.status === "aktivan").length;
    const naNuliCount = allFirme.filter((f) => f.status === "nula").length;
    const procenatNaNuli =
      total > 0 ? Math.round((naNuliCount / total) * 100) : 0;

    res.json({
      total: total,
      aktivne: aktivneCount,
      naNuli: naNuliCount,
      procenatNaNuli: procenatNaNuli,
    });
  } catch (error) {
    console.error("Greška pri učitavanju dashboard statistika:", error);
    res.status(500).json({ message: "Greška pri učitavanju statistika" });
  }
});

// API rute
app.use("/api/users", userRoutes);
app.use("/api", authRoutes);
app.use("/api/firme", firmeRoutes);

// Zaštićena ruta za prijavu poreza na dobit
app.get("/dobit_prijava/index.html", authMiddleware, (req, res) => {
  res.sendFile(__dirname + "/protected/dobit_prijava/index.html");
});

// Zaštićene rute za sve dobit prijava resurse
app.get("/dobit_prijava/:file", authMiddleware, (req, res) => {
  const fileName = req.params.file;

  // Dozvoljavamo pristup CSS, JS i ostalim statičkim fajlovima
  if (
    fileName.endsWith(".css") ||
    fileName.endsWith(".js") ||
    fileName.endsWith(".html")
  ) {
    res.sendFile(__dirname + `/protected/dobit_prijava/${fileName}`);
  } else {
    res.status(404).send("File not found");
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
