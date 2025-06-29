const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

// Konfiguracija za lokalnu bazu
const localConfig = {
  host: "localhost",
  user: "root",
  password: "Vanesa3007", // Lokalna MySQL lozinka
  database: "summasum_local",
};

async function exportData() {
  let connection;

  try {
    console.log("🔗 Povezivanje sa lokalnom bazom...");
    connection = await mysql.createConnection(localConfig);

    // Eksport korisnika
    console.log("📥 Eksportovanje korisnika...");
    const [users] = await connection.execute("SELECT * FROM users ORDER BY id");

    // Eksport firmi
    console.log("📥 Eksportovanje firmi...");
    const [firme] = await connection.execute("SELECT * FROM firme ORDER BY id");

    // Kreiranje SQL fajla
    let sqlContent = `-- Export podataka iz lokalne baze summasum_local\n`;
    sqlContent += `-- Kreiran: ${new Date().toISOString()}\n\n`;
    sqlContent += `USE summasum_;\n\n`;

    // Dodavanje korisnika
    if (users.length > 0) {
      sqlContent += `-- Brisanje postojećih podataka (opciono)\n`;
      sqlContent += `-- DELETE FROM firme; -- Prvo firme zbog foreign key\n`;
      sqlContent += `-- DELETE FROM users;\n\n`;

      sqlContent += `-- Ubacivanje korisnika\n`;
      sqlContent += `INSERT INTO users (id, username, password, email, phone, ime, prezime, jmbg, created_at, updated_at) VALUES\n`;

      const userValues = users.map((user) => {
        const createdAt = user.created_at
          ? user.created_at.toISOString().slice(0, 19).replace("T", " ")
          : "NOW()";
        const updatedAt = user.updated_at
          ? user.updated_at.toISOString().slice(0, 19).replace("T", " ")
          : "NOW()";

        return `(${user.id}, ${mysql.escape(user.username)}, ${mysql.escape(
          user.password
        )}, ${mysql.escape(user.email)}, ${mysql.escape(
          user.phone
        )}, ${mysql.escape(user.ime)}, ${mysql.escape(
          user.prezime
        )}, ${mysql.escape(user.jmbg)}, '${createdAt}', '${updatedAt}')`;
      });

      sqlContent += userValues.join(",\n") + ";\n\n";
    }

    // Dodavanje firmi
    if (firme.length > 0) {
      sqlContent += `-- Ubacivanje firmi\n`;
      sqlContent += `INSERT INTO firme (id, user_id, pib, naziv, adresa, pdvBroj, direktor_ime_prezime, direktor_jmbg, status, created_at, updated_at) VALUES\n`;

      const firmeValues = firme.map((firma) => {
        const createdAt = firma.created_at
          ? firma.created_at.toISOString().slice(0, 19).replace("T", " ")
          : "NOW()";
        const updatedAt = firma.updated_at
          ? firma.updated_at.toISOString().slice(0, 19).replace("T", " ")
          : "NOW()";

        return `(${firma.id}, ${firma.user_id}, ${mysql.escape(
          firma.pib
        )}, ${mysql.escape(firma.naziv)}, ${mysql.escape(
          firma.adresa
        )}, ${mysql.escape(firma.pdvBroj)}, ${mysql.escape(
          firma.direktor_ime_prezime
        )}, ${mysql.escape(firma.direktor_jmbg)}, ${mysql.escape(
          firma.status
        )}, '${createdAt}', '${updatedAt}')`;
      });

      sqlContent += firmeValues.join(",\n") + ";\n\n";
    }

    // Resetovanje AUTO_INCREMENT
    sqlContent += `-- Resetovanje AUTO_INCREMENT brojača\n`;
    sqlContent += `ALTER TABLE users AUTO_INCREMENT = ${users.length + 1};\n`;
    sqlContent += `ALTER TABLE firme AUTO_INCREMENT = ${firme.length + 1};\n\n`;

    sqlContent += `-- Export završen uspešno!\n`;
    sqlContent += `-- Korisnici: ${users.length}\n`;
    sqlContent += `-- Firme: ${firme.length}\n`;

    // Snimanje fajla
    const outputPath = path.join(__dirname, "data_export.sql");
    fs.writeFileSync(outputPath, sqlContent, "utf8");

    console.log("✅ Export uspešno završen!");
    console.log(`📄 Fajl kreiran: ${outputPath}`);
    console.log(`👥 Eksportovano korisnika: ${users.length}`);
    console.log(`🏢 Eksportovano firmi: ${firme.length}`);
    console.log("");
    console.log("🚀 Sledeći koraci:");
    console.log("1. Upload data_export.sql na server");
    console.log("2. Import kroz phpMyAdmin ili MySQL command line");
    console.log("3. Test login sa postojećim korisnicima");
  } catch (error) {
    console.error("❌ Greška pri eksportu:", error.message);

    if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.log("💡 Promenite lozinku u localConfig objektu na vrhu fajla");
    }
    if (error.code === "ECONNREFUSED") {
      console.log("💡 Proverite da li je MySQL server pokrenuti lokalno");
    }
    if (error.code === "ER_BAD_DB_ERROR") {
      console.log("💡 Proverite da li postoji baza summasum_local");
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Pokretanje exporta
exportData();
