require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = process.env.PORT || 3000;
const userRoutes = require("./src/routes/userRoutes");
const authRoutes = require("./src/routes/authRoutes");
const firmeRoutes = require("./src/routes/firmeRoutes");
const contractRoutes = require("./src/routes/contractRoutes");
const radnikRoutes = require("./src/routes/radnikRoutes");
const pozicijeRoutes = require("./src/routes/pozicijeRoutes");
const { authMiddleware } = require("./src/middleware/auth");
const { requireRole, ROLES } = require("./src/middleware/roleAuth");
const cors = require("cors");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

// parsiranje JSON i form-data
app.use(
  cors({
    origin: "http://localhost:3000", // promeni ako koristiš drugi port
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
    credentials: true, // Omogući slanje cookies/session
  })
);

// Debug middleware - loguj sve zahteve
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log(`   Headers:`, {
    "user-agent": req.headers["user-agent"],
    accept: req.headers.accept,
    "content-type": req.headers["content-type"],
  });
  next();
});

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

// Zaštićena ruta za PDV prijavu - requires PDV or higher role
app.get(
  "/pdv_prijava/index.html",
  authMiddleware,
  requireRole([ROLES.PDV, ROLES.FULL, ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + "/protected/pdv_prijava/index.html");
  }
);

// Zaštićene rute za sve PDV prijava resurse - requires PDV or higher role
app.get(
  "/pdv_prijava/:file",
  authMiddleware,
  requireRole([ROLES.PDV, ROLES.FULL, ROLES.ADMIN]),
  (req, res) => {
    const fileName = req.params.file;
    res.sendFile(__dirname + "/protected/pdv_prijava/" + fileName);
  }
);

// Zaštićena ruta za PDV0 (masovno preuzimanje) - accessible to all authenticated users
app.get(
  "/pdv0.html",
  authMiddleware,
  requireRole([ROLES.PDV0, ROLES.PDV, ROLES.FULL, ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + "/public/pdv0.html");
  }
);

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
app.use("/api", contractRoutes);
app.use("/api/radnici", radnikRoutes);
app.use("/api/pozicije", pozicijeRoutes);

// Zaštićena ruta za prijavu poreza na dobit - requires FULL or ADMIN role
app.get(
  "/dobit_prijava/index.html",
  authMiddleware,
  requireRole([ROLES.FULL, ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + "/protected/dobit_prijava/index.html");
  }
);

// Zaštićene rute za sve dobit prijava resurse - requires FULL or ADMIN role
app.get(
  "/dobit_prijava/:file",
  authMiddleware,
  requireRole([ROLES.FULL, ROLES.ADMIN]),
  (req, res) => {
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
  }
);

// Admin routes - require ADMIN role
app.get(
  "/admin-users.html",
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + "/public/admin-users.html");
  }
);

// API rute za admin funkcionalnosti
app.get(
  "/api/admin/users",
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const { executeQuery } = require("./src/config/database");
      const users = await executeQuery(
        "SELECT id, username, email, ime, prezime, role, created_at FROM users ORDER BY created_at DESC"
      );
      res.json(users);
    } catch (error) {
      console.error("Greška pri učitavanju korisnika:", error);
      res.status(500).json({ msg: "Greška pri učitavanju korisnika" });
    }
  }
);

app.put(
  "/api/admin/users/:id/role",
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const { executeQuery } = require("./src/config/database");
      const { id } = req.params;
      const { role } = req.body;

      // Validate role
      const validRoles = ["pdv0", "pdv", "full", "admin"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ msg: "Neispravna rola" });
      }

      // Don't allow changing own role
      if (parseInt(id) === req.session.user.id) {
        return res.status(400).json({ msg: "Ne možete promeniti svoju rolu" });
      }

      await executeQuery("UPDATE users SET role = ? WHERE id = ?", [role, id]);
      res.json({ msg: "Rola je uspešno promenjena", role });
    } catch (error) {
      console.error("Greška pri promeni role:", error);
      res.status(500).json({ msg: "Greška pri promeni role" });
    }
  }
);

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
