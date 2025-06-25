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

// API za dodavanje nove aktivne firme (zaštićeno)
app.post("/api/firme", authMiddleware, (req, res) => {
  const { ime, pib, adresa, pdv } = req.body;

  // Validacija
  if (!ime || !pib || !adresa) {
    return res.status(400).json({ message: "Ime, PIB i adresa su obavezni" });
  }

  // Proveri da li PIB već postoji
  const sveFirme = [...firme0, ...aktivneFirme];
  if (sveFirme.find((f) => f.pib === pib)) {
    return res.status(400).json({ message: "Firma sa ovim PIB-om već postoji" });
  }

  const novaFirma = { ime, pib, adresa, pdv: pdv || "" };
  aktivneFirme.push(novaFirma);

  // Sačuvaj u fajl
  const aktivneFirmePath = path.join(__dirname, "src", "data", "firme.js");
  if (saveFirmeToFile(aktivneFirme, aktivneFirmePath)) {
    res.status(201).json({
      message: "Firma je uspešno dodana",
      firma: novaFirma,
    });
  } else {
    // Ukloni iz niza ako nije moguće sačuvati
    aktivneFirme.pop();
    res.status(500).json({ message: "Greška pri čuvanju firme" });
  }
});

// API za dodavanje nove firme na nuli (zaštićeno)
app.post("/api/firme0", authMiddleware, (req, res) => {
  const { ime, pib, adresa, pdv } = req.body;

  // Validacija
  if (!ime || !pib || !adresa) {
    return res.status(400).json({ message: "Ime, PIB i adresa su obavezni" });
  }

  // Proveri da li PIB već postoji
  const sveFirme = [...firme0, ...aktivneFirme];
  if (sveFirme.find((f) => f.pib === pib)) {
    return res.status(400).json({ message: "Firma sa ovim PIB-om već postoji" });
  }

  const novaFirma = { ime, pib, adresa, pdv: pdv || "" };
  firme0.push(novaFirma);

  // Sačuvaj u fajl
  if (saveFirme0ToFile(firme0)) {
    res.status(201).json({
      message: "Firma na nuli je uspešno dodana",
      firma: novaFirma,
    });
  } else {
    // Ukloni iz niza ako nije moguće sačuvati
    firme0.pop();
    res.status(500).json({ message: "Greška pri čuvanju firme" });
  }
});

// API za brisanje firme (zaštićeno)
app.delete("/api/firme/:pib", authMiddleware, (req, res) => {
  const pib = req.params.pib;

  // Traži u aktivnim firmama
  let indexAktivne = aktivneFirme.findIndex((f) => f.pib === pib);
  if (indexAktivne !== -1) {
    const obrisanaFirma = aktivneFirme.splice(indexAktivne, 1)[0];
    const aktivneFirmePath = path.join(__dirname, "src", "data", "firme.js");
    if (saveFirmeToFile(aktivneFirme, aktivneFirmePath)) {
      return res.json({
        message: "Aktivna firma je uspešno obrisana",
        firma: obrisanaFirma,
      });
    } else {
      // Vrati firmu u niz ako nije moguće sačuvati
      aktivneFirme.splice(indexAktivne, 0, obrisanaFirma);
      return res.status(500).json({ message: "Greška pri brisanju firme" });
    }
  }

  // Traži u firmama na nuli
  let indexFirme0 = firme0.findIndex((f) => f.pib === pib);
  if (indexFirme0 !== -1) {
    const obrisanaFirma = firme0.splice(indexFirme0, 1)[0];
    if (saveFirme0ToFile(firme0)) {
      return res.json({
        message: "Firma na nuli je uspešno obrisana",
        firma: obrisanaFirma,
      });
    } else {
      // Vrati firmu u niz ako nije moguće sačuvati
      firme0.splice(indexFirme0, 0, obrisanaFirma);
      return res.status(500).json({ message: "Greška pri brisanju firme" });
    }
  }

  res.status(404).json({ message: "Firma nije pronađena" });
});

// API za ažuriranje firme (zaštićeno)
app.put("/api/firme/:pib", authMiddleware, (req, res) => {
  const pib = req.params.pib;
  const { ime, adresa, pdv, noviPib } = req.body;

  // Validacija
  if (!ime || !adresa) {
    return res.status(400).json({ message: "Ime i adresa su obavezni" });
  }

  // Ako se menja PIB, proveri da li novi PIB već postoji
  if (noviPib && noviPib !== pib) {
    const sveFirme = [...firme0, ...aktivneFirme];
    if (sveFirme.find((f) => f.pib === noviPib)) {
      return res.status(400).json({ message: "Firma sa novim PIB-om već postoji" });
    }
  }

  // Traži u aktivnim firmama
  let indexAktivne = aktivneFirme.findIndex((f) => f.pib === pib);
  if (indexAktivne !== -1) {
    const stareFirme = [...aktivneFirme];
    aktivneFirme[indexAktivne] = {
      ime,
      pib: noviPib || pib,
      adresa,
      pdv: pdv || "",
    };

    const aktivneFirmePath = path.join(__dirname, "src", "data", "firme.js");
    if (saveFirmeToFile(aktivneFirme, aktivneFirmePath)) {
      return res.json({
        message: "Aktivna firma je uspešno ažurirana",
        firma: aktivneFirme[indexAktivne],
      });
    } else {
      // Vrati stare podatke ako nije moguće sačuvati
      aktivneFirme.splice(0, aktivneFirme.length, ...stareFirme);
      return res.status(500).json({ message: "Greška pri ažuriranju firme" });
    }
  }

  // Traži u firmama na nuli
  let indexFirme0 = firme0.findIndex((f) => f.pib === pib);
  if (indexFirme0 !== -1) {
    const stareFirme = [...firme0];
    firme0[indexFirme0] = {
      ime,
      pib: noviPib || pib,
      adresa,
      pdv: pdv || "",
    };

    if (saveFirme0ToFile(firme0)) {
      return res.json({
        message: "Firma na nuli je uspešno ažurirana",
        firma: firme0[indexFirme0],
      });
    } else {
      // Vrati stare podatke ako nije moguće sačuvati
      firme0.splice(0, firme0.length, ...stareFirme);
      return res.status(500).json({ message: "Greška pri ažuriranju firme" });
    }
  }

  res.status(404).json({ message: "Firma nije pronađena" });
});

// Helper funkcije za čuvanje podataka u fajlove
const saveFirmeToFile = (firme, filePath) => {
  try {
    const data = `const aktivneFirme = ${JSON.stringify(firme, null, 2)};\n\nmodule.exports = { aktivneFirme };`;
    fs.writeFileSync(filePath, data, "utf8");
    return true;
  } catch (error) {
    console.error("Greška pri čuvanju aktivnih firmi:", error);
    return false;
  }
};

const saveFirme0ToFile = (firme) => {
  try {
    const firme0Path = path.join(__dirname, "src", "data", "firme0.js");
    let data = "";

    // Kreiraj individualne objekte kao što su bili
    firme.forEach((firma, index) => {
      const variableName = firma.ime
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .substring(0, 20);

      data += `const ${variableName}${index} = ${JSON.stringify(firma, null, 2)};\n\n`;
    });

    // Dodaj export
    data += `const firme0 = [\n`;
    firme.forEach((firma, index) => {
      const variableName = firma.ime
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .substring(0, 20);
      data += `  ${variableName}${index},\n`;
    });
    data += `];\n\nmodule.exports = { firme0 };`;

    fs.writeFileSync(firme0Path, data, "utf8");
    return true;
  } catch (error) {
    console.error("Greška pri čuvanju firmi na nuli:", error);
    return false;
  }
};

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
