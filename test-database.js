const {
  testConnection,
  executeQuery,
  executeSQLScript,
} = require("./src/config/database");
const fs = require("fs");

async function testDatabaseConnection() {
  console.log("🔍 Testiranje konekcije sa bazom podataka...");

  // Test konekcije
  const isConnected = await testConnection();

  if (isConnected) {
    console.log("✅ Konekcija uspešna!");

    // Provjeri postojeće tabele
    try {
      const tables = await executeQuery("SHOW TABLES");
      console.log("📋 Postojeće tabele u bazi:");
      tables.forEach((table) => {
        console.log(`  - ${Object.values(table)[0]}`);
      });

      // Provjeri da li tabele 'radnici' i 'ugovori' postoje
      const tableNames = tables.map((table) => Object.values(table)[0]);
      const hasRadnici = tableNames.includes("radnici");
      const hasUgovori = tableNames.includes("ugovori");

      console.log(`\n🔍 Status tabela:`);
      console.log(`  radnici: ${hasRadnici ? "✅ Postoji" : "❌ Ne postoji"}`);
      console.log(`  ugovori: ${hasUgovori ? "✅ Postoji" : "❌ Ne postoji"}`);

      if (!hasRadnici || !hasUgovori) {
        console.log("\n📝 Kreiranje tabela...");
        await createTables();
      }
    } catch (error) {
      console.error("❌ Greška pri čitanju tabela:", error.message);
    }
  } else {
    console.log("❌ Konekcija neuspešna!");
  }
}

async function createTables() {
  try {
    // Kreiranje tabele radnici
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS radnici (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ime VARCHAR(255) NOT NULL,
        prezime VARCHAR(255) NOT NULL,
        jmbg VARCHAR(13) NOT NULL,
        pozicija VARCHAR(255) NOT NULL,
        firma_id INT NOT NULL,
        CONSTRAINT fk_firma_id FOREIGN KEY (firma_id) REFERENCES firme(id)
      )
    `);
    console.log('✅ Tabela "radnici" kreirana');

    // Kreiranje tabele ugovori
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ugovori (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firma_id INT NOT NULL,
        radnik_id INT NOT NULL,
        datum DATE NOT NULL,
        tip_ugovora VARCHAR(50) NOT NULL,
        sadrzaj TEXT NOT NULL,
        CONSTRAINT fk_firma FOREIGN KEY (firma_id) REFERENCES firme(id),
        CONSTRAINT fk_radnik FOREIGN KEY (radnik_id) REFERENCES radnici(id)
      )
    `);
    console.log('✅ Tabela "ugovori" kreirana');
  } catch (error) {
    console.error("❌ Greška pri kreiranju tabela:", error.message);
  }
}

// Pokreni test
testDatabaseConnection()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Greška:", error);
    process.exit(1);
  });
