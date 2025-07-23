const { executeQuery } = require("./src/config/database");

async function testDbStructure() {
  try {
    console.log("Testing database structure...");

    // Test which tables exist
    console.log("\n=== LISTING ALL TABLES ===");
    try {
      const tables = await executeQuery("SHOW TABLES");
      console.log("Existing tables:", tables);
    } catch (err) {
      console.log("Error listing tables:", err.message);
    }

    // Test firme table
    console.log("\n=== FIRME TABLE ===");
    try {
      const firmeColumns = await executeQuery("DESCRIBE firme");
      console.log(
        "Firme columns:",
        firmeColumns.map((col) => col.Field)
      );
    } catch (err) {
      console.log("Error with firme table:", err.message);
    }

    // Test radnici table
    console.log("\n=== RADNICI TABLE ===");
    try {
      const radniciColumns = await executeQuery("DESCRIBE radnici");
      console.log(
        "Radnici columns:",
        radniciColumns.map((col) => col.Field)
      );
    } catch (err) {
      console.log("Error with radnici table:", err.message);
    }

    // Test pozajmnice table
    console.log("\n=== POZAJMICE TABLE ===");
    try {
      const pozajmiceColumns = await executeQuery("DESCRIBE pozajmnice");
      console.log(
        "Pozajmice columns:",
        pozajmiceColumns.map((col) => col.Field)
      );
    } catch (err) {
      console.log("Error with pozajmice table:", err.message);
    }

    // Test users table
    console.log("\n=== USERS TABLE ===");
    try {
      const usersColumns = await executeQuery("DESCRIBE users");
      console.log(
        "Users columns:",
        usersColumns.map((col) => col.Field)
      );
    } catch (err) {
      console.log("Error with users table:", err.message);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testDbStructure();
