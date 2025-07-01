const mysql = require("mysql2/promise");
require("dotenv").config();
const bcrypt = require("bcrypt");

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "summasum_local",
};

async function checkAdminUser() {
  let connection;

  try {
    console.log("🔄 Connecting to database...");
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database");

    // Get admin user details
    const [users] = await connection.execute(
      "SELECT username, password FROM users WHERE role = 'admin'"
    );

    if (users.length > 0) {
      console.log("Admin korisnik:", users[0].username);

      // Try to verify common passwords
      const commonPasswords = ["admin", "admin123", "password", "123456"];

      for (const pwd of commonPasswords) {
        const isMatch = await bcrypt.compare(pwd, users[0].password);
        if (isMatch) {
          console.log(`✅ Password je: ${pwd}`);
          return;
        }
      }

      console.log("❌ Nije pronađena password iz čestih opcija");
    } else {
      console.log("❌ Nema admin korisnika");
    }
  } catch (error) {
    console.error("❌ Greška:", error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAdminUser();
