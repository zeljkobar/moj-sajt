const { executeQuery } = require("./src/config/database");

async function checkRadnikStatus() {
  try {
    console.log("🔍 Proverava status radnika...\n");

    // Pronađi Željka Đuranović
    const radnici = await executeQuery(
      "SELECT id, ime, prezime, status FROM radnici WHERE ime LIKE '%eljko%' OR prezime LIKE '%uranovi%'",
      []
    );

    console.log("📋 Pronađeni radnici:");
    radnici.forEach((radnik) => {
      console.log(
        `   ID: ${radnik.id}, ${radnik.ime} ${radnik.prezime}, Status: ${
          radnik.status || "NULL"
        }`
      );
    });

    // Proverava otkaze
    console.log("\n🚪 Provera otkaza:");
    const otkazi = await executeQuery(
      `SELECT o.*, r.ime, r.prezime 
       FROM otkazi o 
       JOIN radnici r ON o.radnik_id = r.id 
       ORDER BY o.created_at DESC`,
      []
    );

    if (otkazi.length > 0) {
      console.log("📝 Postojeći otkazi:");
      otkazi.forEach((otkaz) => {
        console.log(
          `   Radnik: ${otkaz.ime} ${otkaz.prezime} (ID: ${otkaz.radnik_id})`
        );
        console.log(
          `   Tip: ${otkaz.tip_otkaza}, Datum: ${otkaz.datum_otkaza}`
        );
        console.log(`   Kreiran: ${otkaz.created_at}\n`);
      });
    } else {
      console.log("   Nema pronađenih otkaza.");
    }

    // Ažuriraj status za radnike koji imaju otkaz
    if (otkazi.length > 0) {
      console.log("🔧 Ažuriram status radnika koji imaju otkaz...");

      for (const otkaz of otkazi) {
        await executeQuery(
          "UPDATE radnici SET status = 'otkazan' WHERE id = ?",
          [otkaz.radnik_id]
        );
        console.log(`   ✅ Ažuriran status za ${otkaz.ime} ${otkaz.prezime}`);
      }
    }

    // Proveri ponovo status
    console.log("\n📋 Status nakon ažuriranja:");
    const radniciNakon = await executeQuery(
      "SELECT id, ime, prezime, status FROM radnici WHERE ime LIKE '%eljko%' OR prezime LIKE '%uranovi%'",
      []
    );

    radniciNakon.forEach((radnik) => {
      console.log(
        `   ID: ${radnik.id}, ${radnik.ime} ${radnik.prezime}, Status: ${
          radnik.status || "NULL"
        }`
      );
    });
  } catch (error) {
    console.error("❌ Greška:", error.message);
  } finally {
    process.exit(0);
  }
}

// Pokreni script
checkRadnikStatus();
