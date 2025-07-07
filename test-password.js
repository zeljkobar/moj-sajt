const bcrypt = require("bcrypt");

async function testPassword() {
  const providedPassword = "123456";
  const hashFromDB =
    "$2b$10$rBkIvpwPSASV0G1Xh2ugTOqwxWmxFtmJc2o6J.FDN0OG6gSgBtdKC";

  console.log("🔑 Testiram password...");
  console.log("Provided:", providedPassword);
  console.log("Hash:", hashFromDB);

  const isValid = await bcrypt.compare(providedPassword, hashFromDB);
  console.log("✅ Password valid:", isValid);

  // Test sa drugim šiframa
  const testPasswords = ["admin", "123456", "password", "1234"];

  for (const pass of testPasswords) {
    const valid = await bcrypt.compare(pass, hashFromDB);
    console.log(`${pass}: ${valid ? "✅" : "❌"}`);
  }
}

testPassword();
