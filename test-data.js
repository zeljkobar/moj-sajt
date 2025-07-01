const { executeQuery } = require("./src/config/database");

async function insertTestData() {
  try {
    console.log("📊 Dodavanje test podataka...");

    // Dodaj test firmu (ako ne postoji)
    const existingFirma = await executeQuery(
      'SELECT * FROM firme WHERE pib = "12345678"'
    );
    let firmaId;

    if (existingFirma.length === 0) {
      const firmaResult = await executeQuery(
        `
        INSERT INTO firme (pib, naziv, adresa, direktor_ime_prezime, direktor_jmbg, status, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          "12345678",
          "Test Firma d.o.o.",
          "Test Adresa 123",
          "Marko Petrović",
          "1234567890123",
          "aktivan",
          13,
        ]
      );
      firmaId = firmaResult.insertId;
      console.log("✅ Test firma dodana");
    } else {
      firmaId = existingFirma[0].id;
      console.log("ℹ️ Test firma već postoji");
    }

    // Dodaj test radnika
    const existingRadnik = await executeQuery(
      'SELECT * FROM radnici WHERE jmbg = "9876543210987"'
    );
    let radnikId;

    if (existingRadnik.length === 0) {
      const radnikResult = await executeQuery(
        `
        INSERT INTO radnici (ime, prezime, jmbg, pozicija, firma_id)
        VALUES (?, ?, ?, ?, ?)
      `,
        ["Ana", "Marković", "9876543210987", "Prodavac", firmaId]
      );
      radnikId = radnikResult.insertId;
      console.log("✅ Test radnik dodan");
    } else {
      radnikId = existingRadnik[0].id;
      console.log("ℹ️ Test radnik već postoji");
    }

    // Dodaj test ugovor
    const existingUgovor = await executeQuery(
      "SELECT * FROM ugovori WHERE firma_id = ? AND radnik_id = ?",
      [firmaId, radnikId]
    );

    if (existingUgovor.length === 0) {
      await executeQuery(
        `
        INSERT INTO ugovori (firma_id, radnik_id, datum, tip_ugovora, sadrzaj)
        VALUES (?, ?, ?, ?, ?)
      `,
        [
          firmaId,
          radnikId,
          "2024-01-01",
          "ugovor_o_radu",
          "Test sadržaj ugovora",
        ]
      );
      console.log("✅ Test ugovor dodan");
    } else {
      console.log("ℹ️ Test ugovor već postoji");
    }

    console.log("\n📋 Test podaci:");
    console.log(`Firma ID: ${firmaId}`);
    console.log(`Radnik ID: ${radnikId}`);

    return { firmaId, radnikId };
  } catch (error) {
    console.error("❌ Greška pri dodavanju test podataka:", error.message);
    throw error;
  }
}

insertTestData()
  .then(({ firmaId, radnikId }) => {
    console.log("\n🎯 Test podaci su spremni za testiranje API-ja");
    console.log(
      `Možete testirati sa: firmaId=${firmaId}, radnikId=${radnikId}`
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Greška:", error);
    process.exit(1);
  });
