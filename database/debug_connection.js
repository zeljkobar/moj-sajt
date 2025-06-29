const mysql = require("mysql2/promise");
require("dotenv").config();

async function debugConnection() {
  console.log("\n🔍 === DEBUG MYSQL CONNECTION ===");

  // Debug environment variables
  console.log("\n📊 Environment Variables:");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("DB_HOST:", process.env.DB_HOST);
  console.log("DB_USER:", process.env.DB_USER);
  console.log("DB_NAME:", process.env.DB_NAME);
  console.log("DB_PORT:", process.env.DB_PORT);

  const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "summasum_local",
  };

  console.log("\n🔧 DB Config:", { ...dbConfig, password: "***" });

  try {
    console.log("\n🚀 Attempting connection...");
    const connection = await mysql.createConnection(dbConfig);

    console.log("✅ Connection successful!");

    // Query current user and connection info
    console.log("\n📋 MySQL Connection Info:");

    try {
      const [userResult] = await connection.execute(
        "SELECT USER() as current_user, CONNECTION_ID() as connection_id"
      );
      console.log("Current User:", userResult[0].current_user);
      console.log("Connection ID:", userResult[0].connection_id);
    } catch (err) {
      console.error("Error getting user info:", err.message);
      // Try alternative approach
      try {
        const [altResult] = await connection.execute("SELECT current_user() as current_user");
        console.log("Alternative Current User:", altResult[0].current_user);
      } catch (err2) {
        console.error("Alternative approach also failed:", err2.message);
      }
    }

    try {
      const [hostResult] = await connection.execute(
        "SELECT @@hostname as hostname, @@port as port"
      );
      console.log("MySQL Host:", hostResult[0].hostname);
      console.log("MySQL Port:", hostResult[0].port);
    } catch (err) {
      console.error("Error getting host info:", err.message);
    }

    try {
      const [processResult] = await connection.execute("SHOW PROCESSLIST");
      const myProcess = processResult.find(
        (p) => p.Id === userResult[0].connection_id
      );
      if (myProcess) {
        console.log("Host from processlist:", myProcess.Host);
      }
    } catch (err) {
      console.error("Error getting process info:", err.message);
    }

    // Test table access
    console.log("\n🔍 Testing table access:");
    try {
      const [tables] = await connection.execute("SHOW TABLES");
      console.log("✅ Tables accessible:", tables.length, "tables found");

      // Test users table specifically
      const [usersTest] = await connection.execute(
        "SELECT COUNT(*) as count FROM users"
      );
      console.log(
        "✅ Users table accessible, rows:",
        usersTest[0].count
      );
    } catch (err) {
      console.error("❌ Table access error:", err.message);
    }

    await connection.end();
    console.log("\n✅ Test completed successfully");
  } catch (error) {
    console.error("\n❌ Connection failed:");
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error sqlState:", error.sqlState);

    // Suggest fixes
    console.log("\n💡 Possible solutions:");
    console.log("1. Check user privileges in phpMyAdmin");
    console.log("2. Grant privileges for both localhost and 127.0.0.1");
    console.log("3. Use % wildcard for host");
    console.log(
      '4. Check if user exists: SELECT user, host FROM mysql.user WHERE user = "zeljko"'
    );
    console.log(
      '5. Grant privileges: GRANT ALL PRIVILEGES ON summasum_.* TO "zeljko"@"%" IDENTIFIED BY "password"'
    );
  }
}

// Run the debug
debugConnection();
