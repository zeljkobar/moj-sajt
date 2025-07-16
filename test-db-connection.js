const mysql = require("mysql2/promise");
require("dotenv").config();

async function testDatabaseConnection() {
  console.log("🔍 Testiram direktnu konekciju sa bazom...");

  const config = {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "summasum_local",
    connectionLimit: 1,
  };

  console.log("📊 Config:", {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
  });

  try {
    // Test direct connection (no pool)
    const connection = await mysql.createConnection(config);
    console.log("✅ Direktna konekcija uspešna!");

    // Test simple query
    const [rows] = await connection.execute("SELECT 1 as test");
    console.log("✅ Test query uspešan:", rows);

    await connection.end();
    console.log("✅ Konekcija zatvorena");
  } catch (error) {
    console.error("❌ Greška:", error.message);
    console.error("❌ Code:", error.code);
    console.error("❌ Errno:", error.errno);
  }

  process.exit(0);
}

testDatabaseConnection();
