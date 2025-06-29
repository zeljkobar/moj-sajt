const { testConnection, executeQuery } = require("../src/config/database");
const fs = require("fs").promises;
const path = require("path");
const bcrypt = require("bcrypt");

// Učitaj postojeće JSON podatke
async function loadJsonData() {
  try {
    const usersPath = path.join(__dirname, "../src/data/users.json");
    const usersArray = JSON.parse(await fs.readFile(usersPath, "utf8"));

    // Konvertuj array u object sa username kao key
    const usersData = {};
    usersArray.forEach((user) => {
      usersData[user.username] = user;
    });

    const firmeData = {};

    // Učitaj firme za svakog korisnika
    for (const username of Object.keys(usersData)) {
      try {
        const firmePath = path.join(
          __dirname,
          `../src/data/users/${username}_firme.json`
        );
        const firmeArray = JSON.parse(await fs.readFile(firmePath, "utf8"));
        firmeData[username] = firmeArray || [];
      } catch (error) {
        console.log(`Nema firmi za korisnika ${username}`);
        firmeData[username] = [];
      }
    }

    return { users: usersData, firme: firmeData };
  } catch (error) {
    console.error("Greška pri učitavanju JSON podataka:", error);
    return { users: {}, firme: {} };
  }
}

// Kreiraj tabele
async function createTables() {
  console.log("📋 Kreiranje tabela...");

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      phone VARCHAR(20),
      ime VARCHAR(50) NOT NULL,
      prezime VARCHAR(50) NOT NULL,
      jmbg VARCHAR(13) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_username (username),
      INDEX idx_email (email),
      INDEX idx_jmbg (jmbg)
    )
  `;

  const createFirmeTable = `
    CREATE TABLE IF NOT EXISTS firme (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      pib VARCHAR(20) NOT NULL,
      naziv VARCHAR(255) NOT NULL,
      adresa VARCHAR(255) NOT NULL,
      pdvBroj VARCHAR(30),
      direktor_ime_prezime VARCHAR(255),
      direktor_jmbg VARCHAR(13),
      status ENUM('aktivan', 'nula') DEFAULT 'aktivan',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_pib (pib),
      INDEX idx_status (status),
      INDEX idx_direktor_jmbg (direktor_jmbg),
      UNIQUE KEY unique_user_pib (user_id, pib)
    )
  `;

  await executeQuery(createUsersTable);
  console.log("✅ Tabela users kreirana");

  await executeQuery(createFirmeTable);
  console.log("✅ Tabela firme kreirana");
}

// Migriraj korisnike
async function migrateUsers(users) {
  console.log("👥 Migriranje korisnika...");

  for (const [username, userData] of Object.entries(users)) {
    try {
      // Hash password ako nije već hashovan
      let hashedPassword = userData.password;
      if (!hashedPassword.startsWith("$2b$")) {
        hashedPassword = await bcrypt.hash(userData.password, 10);
      }

      const insertUser = `
        INSERT INTO users (username, password, email, phone, ime, prezime, jmbg)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        email = VALUES(email),
        phone = VALUES(phone),
        ime = VALUES(ime),
        prezime = VALUES(prezime)
      `;

      await executeQuery(insertUser, [
        username,
        hashedPassword,
        userData.email || `${username}@example.com`,
        userData.phone || "067111111",
        userData.ime || "Ime",
        userData.prezime || "Prezime",
        userData.jmbg || `123456789012${Math.floor(Math.random() * 10)}`,
      ]);

      console.log(`✅ Korisnik ${username} migriran`);
    } catch (error) {
      console.error(
        `❌ Greška pri migraciji korisnika ${username}:`,
        error.message
      );
    }
  }
}

// Migriraj firme
async function migrateFirme(firmeData) {
  console.log("🏢 Migriranje firmi...");

  for (const [username, firme] of Object.entries(firmeData)) {
    if (!firme || firme.length === 0) continue;

    try {
      // Dobij user_id
      const userQuery = "SELECT id FROM users WHERE username = ?";
      const userResult = await executeQuery(userQuery, [username]);

      if (userResult.length === 0) {
        console.log(`❌ Korisnik ${username} nije pronađen`);
        continue;
      }

      const userId = userResult[0].id;

      for (const firma of firme) {
        try {
          const insertFirma = `
            INSERT INTO firme (user_id, pib, naziv, adresa, pdvBroj, direktor_ime_prezime, direktor_jmbg, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            naziv = VALUES(naziv),
            adresa = VALUES(adresa),
            pdvBroj = VALUES(pdvBroj),
            direktor_ime_prezime = VALUES(direktor_ime_prezime),
            direktor_jmbg = VALUES(direktor_jmbg),
            status = VALUES(status)
          `;

          // Mapiranje statusa
          let status = "aktivan";
          if (firma.status === "active") status = "aktivan";
          else if (firma.status === "zero" || firma.status === "nula")
            status = "nula";

          await executeQuery(insertFirma, [
            userId,
            firma.pib,
            firma.naziv,
            firma.adresa,
            firma.pdvBroj || "",
            firma.direktor_ime_prezime || "",
            firma.direktor_jmbg || "",
            status,
          ]);

          console.log(
            `✅ Firma ${firma.naziv} (${firma.pib}) za ${username} migrirane`
          );
        } catch (error) {
          console.error(
            `❌ Greška pri migraciji firme ${firma.pib}:`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error(
        `❌ Greška pri migraciji firmi za ${username}:`,
        error.message
      );
    }
  }
}

// Main migration function
async function runMigration() {
  console.log("🚀 Pokretanje migracije...");

  // Test konekcije
  const connected = await testConnection();
  if (!connected) {
    console.error(
      "❌ Nema konekcije sa bazom. Proverite MySQL/MariaDB da li radi."
    );
    process.exit(1);
  }

  try {
    // Učitaj postojeće podatke
    const { users, firme } = await loadJsonData();
    console.log(
      `📊 Učitano ${Object.keys(users).length} korisnika i ${
        Object.keys(firme).length
      } korisnika sa firmama`
    );

    // Kreiraj tabele
    await createTables();

    // Migriraj podatke
    await migrateUsers(users);
    await migrateFirme(firme);

    console.log("🎉 Migracija je uspešno završena!");
    console.log("💡 Možete sada testirati aplikaciju sa MySQL/MariaDB bazom.");
  } catch (error) {
    console.error("❌ Greška tokom migracije:", error);
    process.exit(1);
  }
}

// Pokreni migraciju ako je ovaj fajl pozvan direktno
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
