const mysql = require("mysql2/promise");

// ✅ PLESK MariaDB KONFIGURACIJA - ovo su ispravni podaci!
// Podaci iz Plesk-a: Host: localhost:3306, User: zeljko, DB: summasum_

const serverConfig = {
  host: "localhost", // ✅ Ispravno za Plesk (localhost znači server kada aplikacija radi na serveru)
  user: "zeljko", // ✅ Ispravno iz Plesk-a
  password: "Vanesa3007#", // ✅ Ispravno (verovatno)
  database: "summasum_", // ✅ Ispravno iz Plesk-a
  port: 3306,
};

// ⚠️  NAPOMENA: Ovaj test NEĆE raditi sa vašeg računara!
// Razlog: 'localhost' znači "ovaj računar", a baza je na serveru.
// Test će raditi SAMO kada pokrenete aplikaciju na serveru.

// 💡 ALTERNATIVES ZA TESTIRANJE:
const alternativeConfigs = [
  {
    name: "cPanel MySQL",
    host: "localhost", // ili 'mysql.yourdomain.com'
    user: "username_zeljko", // možda ima prefix
    password: "Vanesa3007#",
    database: "username_summasum_", // možda ima prefix
    port: 3306,
  },
  {
    name: "Remote MySQL",
    host: "your-server-ip-or-domain.com", // ZAMENI OVO
    user: "zeljko",
    password: "Vanesa3007#",
    database: "summasum_",
    port: 3306,
  },
];

// 🚀 ZA PLESK KONFIGURACIJU:
// Podaci su ispravni, ali test raditi SAMO na serveru!
// Sa lokalnog računara 'localhost' pokazuje na vaš računar, ne na server.

async function testServerConnection() {
  console.log("🔍 Testiranje konekcije na server bazu...\n");

  let connection;

  try {
    console.log("📡 Pokušavam da se povežem sa:");
    console.log(`   Host: ${serverConfig.host}`);
    console.log(`   User: ${serverConfig.user}`);
    console.log(`   Database: ${serverConfig.database}`);
    console.log(`   Port: ${serverConfig.port}\n`);

    // Pokušaj konekcije
    connection = await mysql.createConnection(serverConfig);
    console.log("✅ Uspešno povezan na server bazu!\n");

    // Test osnovnih upita
    console.log("🔍 Testiram tabele...");

    // Proveri da li postoje tabele
    const [tables] = await connection.execute("SHOW TABLES");
    console.log(`📊 Broj tabela: ${tables.length}`);

    if (tables.length === 0) {
      console.log("⚠️  NEMA TABELA! Trebaš da importuješ schema_server.sql");
      return;
    }

    // Listaj tabele
    console.log("📋 Tabele u bazi:");
    tables.forEach((table) => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });

    // Proveri tabelu users
    try {
      const [users] = await connection.execute(
        "SELECT COUNT(*) as count FROM users"
      );
      console.log(`👥 Korisnika u bazi: ${users[0].count}`);

      if (users[0].count > 0) {
        const [userList] = await connection.execute(
          "SELECT id, username, email FROM users LIMIT 5"
        );
        console.log("📝 Korisnici:");
        userList.forEach((user) => {
          console.log(`   ${user.id}. ${user.username} (${user.email})`);
        });
      }
    } catch (err) {
      console.log("❌ Tabela users ne postoji ili je prazna");
    }

    // Proveri tabelu firme
    try {
      const [firme] = await connection.execute(
        "SELECT COUNT(*) as count FROM firme"
      );
      console.log(`🏢 Firmi u bazi: ${firme[0].count}`);

      if (firme[0].count > 0) {
        const [firmeList] = await connection.execute(
          "SELECT id, naziv, pib FROM firme LIMIT 3"
        );
        console.log("📝 Primer firmi:");
        firmeList.forEach((firma) => {
          console.log(`   ${firma.id}. ${firma.naziv} (PIB: ${firma.pib})`);
        });
      }
    } catch (err) {
      console.log("❌ Tabela firme ne postoji ili je prazna");
    }

    console.log("\n🎯 ZAKLJUČAK:");
    console.log("✅ Konekcija na bazu USPEŠNA!");

    if (
      tables.some((table) => Object.values(table)[0] === "users") &&
      tables.some((table) => Object.values(table)[0] === "firme")
    ) {
      console.log("✅ Tabele su kreane!");
    } else {
      console.log("⚠️  Tabele nisu kreane - importuj schema_server.sql");
    }
  } catch (error) {
    console.log("❌ GREŠKA PRI KONEKCIJI:\n");

    switch (error.code) {
      case "ECONNREFUSED":
        console.log("🔌 Server ne odgovara ili nije pokrenut");
        console.log("💡 Proveri:");
        console.log("   - Da li je MySQL server aktivan?");
        console.log("   - Da li je host adresa ispravna?");
        console.log("   - Da li je port 3306 otvoren?");
        break;

      case "ER_ACCESS_DENIED_ERROR":
        console.log("🔐 Neispravni credentials");
        console.log("💡 Proveri:");
        console.log("   - Username i password");
        console.log("   - Da li korisnik ima privilegije na ovu bazu?");
        break;

      case "ER_BAD_DB_ERROR":
        console.log("🗄️  Baza podataka ne postoji");
        console.log("💡 Proveri:");
        console.log('   - Da li je baza "summasum_" kreana na serveru?');
        console.log("   - Da li hosting provajder koristi drugi naziv?");
        break;

      case "ENOTFOUND":
        console.log("🌐 Host se ne može pronaći");
        console.log("💡 Proveri:");
        console.log("   - Da li je host adresa ispravna?");
        console.log("   - Da li imaš internet konekciju?");
        break;

      default:
        console.log(`❓ Nepoznata greška: ${error.code}`);
        console.log(`📝 Poruka: ${error.message}`);
    }

    console.log("\n🔧 SLEDEĆI KORACI:");
    console.log("1. Proveri podatke u .env.production");
    console.log("2. Kontaktiraj hosting support za MySQL podatke");
    console.log('3. Kreiraj bazu "summasum_" ako ne postoji');
    console.log("4. Importuj schema_server.sql");
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Pokretanje testa
testServerConnection();
