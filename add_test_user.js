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

async function addTestUser() {
  let connection;
  
  try {
    console.log("🔄 Connecting to database...");
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database");

    // Hash password
    const hashedPassword = await bcrypt.hash("test123", 10);

    // Add test user with ugovori role
    const [result] = await connection.execute(
      "INSERT INTO users (username, email, password, ime, prezime, jmbg, role) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["test_ugovori", "ugovori@test.com", hashedPassword, "Test", "Ugovori", "9876543210987", "ugovori"]
    );

    console.log("✅ Test user with 'ugovori' role added successfully!");
    console.log(`User ID: ${result.insertId}`);

    // Show all users
    const [users] = await connection.execute(
      "SELECT id, username, role FROM users"
    );
    console.table(users);

  } catch (error) {
    console.error("❌ Failed to add test user:", error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 Database connection closed");
    }
  }
}

addTestUser();
