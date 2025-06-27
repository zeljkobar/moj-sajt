const fs = require("fs");
const path = require("path");

// Učitaj postojeće podatke
const { aktivneFirme } = require("./src/data/firme");
const { firme0 } = require("./src/data/firme0");

// Kreiraj jedinstvenu listu firmi sa status svojstvom
const allFirme = [];

// Dodaj aktivne firme sa status: "active"
aktivneFirme.forEach((firma) => {
  allFirme.push({
    naziv: firma.ime,
    pib: firma.pib,
    adresa: firma.adresa,
    pdvBroj: firma.pdv,
    status: "active",
  });
});

// Dodaj firme na nuli sa status: "zero"
firme0.forEach((firma) => {
  allFirme.push({
    naziv: firma.ime,
    pib: firma.pib,
    adresa: firma.adresa,
    pdvBroj: firma.pdv,
    status: "zero",
  });
});

// Kreiraj JSON fajl za admin korisnika
const adminFirme = JSON.stringify(allFirme, null, 2);
fs.writeFileSync("./src/data/users/admin_firme.json", adminFirme);

// Kreiraj JSON fajlove za ostale korisnike (sa istim podacima za početak)
const users = ["marko", "ana", "test"];
users.forEach((user) => {
  fs.writeFileSync(`./src/data/users/${user}_firme.json`, adminFirme);
});

console.log("✅ Migracija završena!");
console.log(`📁 Kreirani fajlovi:`);
console.log(`   - admin_firme.json (${allFirme.length} firmi)`);
users.forEach((user) => {
  console.log(`   - ${user}_firme.json (${allFirme.length} firmi)`);
});
