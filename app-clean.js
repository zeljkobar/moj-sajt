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
