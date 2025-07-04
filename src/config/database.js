const mysql = require("mysql2/promise");
require("dotenv").config();
const fs = require("fs");

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "summasum_local",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Database connected successfully");
    console.log(
      `📊 Connected to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
    );
    connection.release();
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
}

// Execute query with error handling
async function executeQuery(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

// Get a single connection for transactions
async function getConnection() {
  return await pool.getConnection();
}

// Execute SQL script file
async function executeSQLScript(scriptPath) {
  try {
    const script = fs.readFileSync(scriptPath, "utf8");
    const connection = await pool.getConnection();
    await connection.query(script);
    console.log("✅ SQL script executed successfully");
    connection.release();
  } catch (error) {
    console.error("❌ Error executing SQL script:", error.message);
  }
}

// Test SQL script execution (uncomment to use)
// executeSQLScript("/Users/zeljkodjuranovic/Desktop/moj sajt/add_contract_tables.sql");

module.exports = {
  pool,
  testConnection,
  executeQuery,
  getConnection,
  executeSQLScript,
};
