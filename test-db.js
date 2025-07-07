const { executeQuery } = require("./src/config/database");

async function testDB() {
  try {
    console.log("🔍 Testiranje baze podataka...");

    // Test 1: Provjeri firme sa PDV brojem
    const pdvFirme = await executeQuery(`
      SELECT id, naziv, pdvBroj, user_id 
      FROM firme 
      WHERE pdvBroj IS NOT NULL AND pdvBroj != '' 
      LIMIT 5
    `);
    console.log("📋 PDV Firme:", pdvFirme);

    // Test 2: Provjeri korisnika
    const korisnici = await executeQuery(`
      SELECT id, username, role, password 
      FROM users 
      WHERE username = 'admin'
    `);
    console.log("👤 Admin korisnik:", korisnici);

    // Test 3: Provjeri pdv_prijave tabelu
    const pdvPrijave = await executeQuery(`
      SELECT * FROM pdv_prijave LIMIT 3
    `);
    console.log("📊 PDV Prijave:", pdvPrijave);
  } catch (error) {
    console.error("❌ Greška:", error.message);
  }

  process.exit(0);
}

testDB();
