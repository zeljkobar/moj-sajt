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
  connectionLimit: 5,
  queueLimit: 0,
  idleTimeout: 300000, // 5 minutes
  maxIdle: 2,
  // MySQL2 specific options
  charset: "utf8mb4",
  timezone: "+00:00",
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
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(sql, params);
    return rows;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Get a single connection for transactions
async function getConnection() {
  return await pool.getConnection();
}

// Execute SQL script file
async function executeSQLScript(scriptPath) {
  let connection;
  try {
    const script = fs.readFileSync(scriptPath, "utf8");
    connection = await pool.getConnection();
    await connection.query(script);
    console.log("✅ SQL script executed successfully");
  } catch (error) {
    console.error("❌ Error executing SQL script:", error.message);
  } finally {
    if (connection) {
      connection.release();
    }
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
