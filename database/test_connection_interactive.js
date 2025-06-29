const mysql = require("mysql2/promise");

// ⚙️ KONFIGURACIJE ZA TESTIRANJE
// Kopiraj pravo ime host-a, user-a i password-a od hosting provajdera

const testConfigs = [
  {
    name: "Localhost (testing)",
    host: "localhost",
    user: "zeljko",
    password: "Vanesa3007#",
    database: "summasum_",
    port: 3306,
  },
  {
    name: "Remote server (update me)",
    host: "your-server-hostname.com", // ZAMENI SA PRAVIM HOST-om
    user: "zeljko", // možda je drugačiji na serveru
    password: "Vanesa3007#",
    database: "summasum_", // možda je username_summasum ili slično
    port: 3306,
  },
];

async function testConnection(config) {
  console.log(`\n🔍 Testiram: ${config.name}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📡 Host: ${config.host}`);
  console.log(`👤 User: ${config.user}`);
  console.log(`🗄️  Database: ${config.database}`);
  console.log(`🔌 Port: ${config.port}`);

  let connection;

  try {
    connection = await mysql.createConnection(config);
    console.log("✅ KONEKCIJA USPEŠNA!");

    // Test tabela
    const [tables] = await connection.execute("SHOW TABLES");
    console.log(`📊 Tabela u bazi: ${tables.length}`);

    if (tables.length > 0) {
      console.log("📋 Lista tabela:");
      tables.forEach((table) => {
        console.log(`   ✓ ${Object.values(table)[0]}`);
      });

      // Proveri podatke
      try {
        const [users] = await connection.execute(
          "SELECT COUNT(*) as count FROM users"
        );
        const [firme] = await connection.execute(
          "SELECT COUNT(*) as count FROM firme"
        );
        console.log(`👥 Korisnika: ${users[0].count}`);
        console.log(`🏢 Firmi: ${firme[0].count}`);
      } catch (e) {
        console.log("⚠️  Tabele postoje ali možda su prazne");
      }
    } else {
      console.log("⚠️  Nema tabela - potreban je import schema_server.sql");
    }

    return true;
  } catch (error) {
    console.log(`❌ GREŠKA: ${error.message}`);
    console.log(`🔍 Kod greške: ${error.code}`);

    // Specifični saveti
    if (error.code === "ECONNREFUSED") {
      console.log("💡 Server ne odgovara - proveri host adresu");
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.log("💡 Neispravni credentials - proveri username/password");
    } else if (error.code === "ER_BAD_DB_ERROR") {
      console.log('💡 Baza ne postoji - kreiraj "summasum_" na serveru');
    } else if (error.code === "ENOTFOUND") {
      console.log("💡 Host se ne može pronaći - proveri adresu");
    }

    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function runAllTests() {
  console.log("🚀 MYSQL SERVER CONNECTION TEST");
  console.log("═══════════════════════════════════════════════");

  let successCount = 0;

  for (const config of testConfigs) {
    const success = await testConnection(config);
    if (success) successCount++;
  }

  console.log("\n🎯 SAŽETAK TESTOVA");
  console.log("═══════════════════════════════════════════════");
  console.log(`✅ Uspešnih konekcija: ${successCount}/${testConfigs.length}`);

  if (successCount === 0) {
    console.log("\n🔧 ŠTAT TREBA DA RADIŠ:");
    console.log("1. Kontaktiraj hosting provajdera za MySQL podatke:");
    console.log("   - Host adresa (npr. mysql.yourdomain.com)");
    console.log('   - Username (možda nije "zeljko")');
    console.log("   - Password");
    console.log('   - Ime baze (možda nije "summasum_")');
    console.log("");
    console.log("2. Uredi test_server_connection.js sa pravim podacima");
    console.log('3. Kreiraj bazu "summasum_" ako ne postoji');
    console.log("4. Import schema_server.sql u bazu");
    console.log("5. Import data_export.sql za podatke");
  } else {
    console.log("\n🎉 Uspešna konekcija! Možeš da deploy-uješ aplikaciju.");
  }
}

// Pokretanje testova
runAllTests();
