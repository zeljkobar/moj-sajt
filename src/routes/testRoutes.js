const express = require("express");
const router = express.Router();
const db = require("../config/database");

// Test ruta za proveru baze podataka
router.get("/test-db", async (req, res) => {
  try {
    console.log("🔍 Test DB ruta pozvana...");

    const testResults = {
      timestamp: new Date().toISOString(),
      database: process.env.DB_NAME || "not_configured",
      host: process.env.DB_HOST || "not_configured",
      user: process.env.DB_USER || "not_configured",
      status: "checking...",
      details: {},
    };

    // Test konekcije
    const connection = await db.getConnection();
    testResults.status = "connected";
    testResults.details.connection = "✅ Uspešno";

    // Test tabela
    const [tables] = await connection.execute("SHOW TABLES");
    testResults.details.tables = {
      count: tables.length,
      list: tables.map((table) => Object.values(table)[0]),
    };

    // Test korisnika
    try {
      const [users] = await connection.execute(
        "SELECT COUNT(*) as count FROM users"
      );
      const [userList] = await connection.execute(
        "SELECT id, username, email FROM users LIMIT 3"
      );
      testResults.details.users = {
        count: users[0].count,
        samples: userList,
      };
    } catch (err) {
      testResults.details.users = { error: err.message };
    }

    // Test firmi
    try {
      const [firme] = await connection.execute(
        "SELECT COUNT(*) as count FROM firme"
      );
      const [firmeList] = await connection.execute(
        "SELECT id, naziv, pib FROM firme LIMIT 3"
      );
      testResults.details.firme = {
        count: firme[0].count,
        samples: firmeList,
      };
    } catch (err) {
      testResults.details.firme = { error: err.message };
    }

    connection.release();

    // Vraćaj kao JSON
    res.json({
      success: true,
      message: "🎉 Baza podataka radi uspešno!",
      data: testResults,
    });
  } catch (error) {
    console.error("❌ Greška u test DB ruti:", error);

    res.status(200).json({
      success: false,
      message: "❌ Greška pri testiranju baze podataka",
      error: {
        code: error.code,
        message: error.message,
        sqlMessage: error.sqlMessage || null,
        stack: process.env.NODE_ENV === "development" ? error.stack : null,
      },
      config: {
        DB_HOST: process.env.DB_HOST || "not_set",
        DB_USER: process.env.DB_USER || "not_set",
        DB_NAME: process.env.DB_NAME || "not_set",
        DB_PORT: process.env.DB_PORT || "not_set",
        NODE_ENV: process.env.NODE_ENV || "not_set",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Test ruta za osnovnu proveru (bez baze)
router.get("/test-app", (req, res) => {
  res.json({
    success: true,
    message: "✅ Aplikacija radi!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    port: process.env.PORT || 3000,
    database: process.env.DB_NAME || "not configured",
  });
});

// Test ruta za session
router.get("/test-session", (req, res) => {
  if (!req.session.testCounter) {
    req.session.testCounter = 0;
  }
  req.session.testCounter++;

  res.json({
    success: true,
    message: "✅ Session radi!",
    sessionId: req.sessionID,
    testCounter: req.session.testCounter,
    user: req.session.user || null,
  });
});

// Debug ruta za env varijable (samo za development)
router.get("/test-env", (req, res) => {
  res.json({
    success: true,
    message: "Environment variables check",
    env: {
      NODE_ENV: process.env.NODE_ENV || "not_set",
      DB_HOST: process.env.DB_HOST || "not_set",
      DB_USER: process.env.DB_USER || "not_set",
      DB_NAME: process.env.DB_NAME || "not_set",
      DB_PORT: process.env.DB_PORT || "not_set",
      DB_PASSWORD: process.env.DB_PASSWORD ? "***SET***" : "not_set",
      SESSION_SECRET: process.env.SESSION_SECRET ? "***SET***" : "not_set",
    },
    timestamp: new Date().toISOString(),
  });
});

// Debug ruta za MySQL konekciju (za Plesk troubleshooting)
router.get("/test-mysql-info", (req, res) => {
  const mysql = require("mysql2/promise");

  // Pokušaj sa osnovnim podacima
  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
  };

  res.json({
    message: "MySQL connection info za Plesk",
    config: {
      host: config.host,
      user: config.user,
      database: config.database,
      port: config.port,
      password_set: !!config.password,
    },
    plesk_help: {
      check_database_exists: `SHOW DATABASES LIKE '${config.database}';`,
      check_user_privileges: `SHOW GRANTS FOR '${config.user}'@'${config.host}';`,
      possible_database_names: [
        config.database,
        `${config.user}_${config.database}`,
        `${config.user}_${config.database.replace("_", "")}`,
      ],
    },
    next_steps: [
      "1. Proveri da li baza stvarno postoji u Plesk-u",
      "2. Proveri da li korisnik ima privilegije na tu bazu",
      "3. Resetuj lozinku u Plesk-u ako treba",
      "4. Možda je ime baze username_summasum_ umesto summasum_",
    ],
  });
});

// Detaljni debug za MySQL konekciju
router.get("/debug-connection", async (req, res) => {
  const mysql = require("mysql2/promise");

  const config = {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "summasum_local",
  };

  const result = {
    config: { ...config, password: "***" },
    tests: {},
    timestamp: new Date().toISOString(),
  };

  try {
    console.log("🚀 Debug connection test starting...");
    const connection = await mysql.createConnection(config);

    result.tests.connection = {
      success: true,
      message: "Connection successful",
    };

    // Test 1: Get current user info
    try {
      const [userResult] = await connection.execute(
        "SELECT CURRENT_USER() as current_user, CONNECTION_ID() as connection_id"
      );
      result.tests.user_info = {
        success: true,
        current_user: userResult[0].current_user,
        connection_id: userResult[0].connection_id,
      };
    } catch (err) {
      result.tests.user_info = { success: false, error: err.message };
    }

    // Test 2: Get MySQL server info
    try {
      const [hostResult] = await connection.execute(
        "SELECT @@hostname as hostname, @@port as port, @@version as version"
      );
      result.tests.server_info = {
        success: true,
        hostname: hostResult[0].hostname,
        port: hostResult[0].port,
        version: hostResult[0].version,
      };
    } catch (err) {
      result.tests.server_info = { success: false, error: err.message };
    }

    // Test 3: Check process list to see how connection appears
    try {
      const [processResult] = await connection.execute("SHOW PROCESSLIST");
      const myProcess = processResult.find((p) => p.User === config.user);
      result.tests.process_info = {
        success: true,
        host_as_seen_by_mysql: myProcess ? myProcess.Host : "not found",
        total_connections: processResult.length,
      };
    } catch (err) {
      result.tests.process_info = { success: false, error: err.message };
    }

    // Test 4: Check database access
    try {
      const [dbResult] = await connection.execute(
        "SELECT DATABASE() as current_db"
      );
      result.tests.database_access = {
        success: true,
        current_database: dbResult[0].current_db,
      };
    } catch (err) {
      result.tests.database_access = { success: false, error: err.message };
    }

    // Test 5: Check table access
    try {
      const [tables] = await connection.execute("SHOW TABLES");
      result.tests.table_access = {
        success: true,
        tables_count: tables.length,
        tables: tables.map((t) => Object.values(t)[0]),
      };
    } catch (err) {
      result.tests.table_access = { success: false, error: err.message };
    }

    // Test 6: Test users table specifically
    try {
      const [usersTest] = await connection.execute(
        "SELECT COUNT(*) as count FROM users"
      );
      result.tests.users_table = {
        success: true,
        rows_count: usersTest[0].count,
      };
    } catch (err) {
      result.tests.users_table = { success: false, error: err.message };
    }

    await connection.end();

    result.overall_success = true;
  } catch (error) {
    result.tests.connection = {
      success: false,
      error_code: error.code,
      error_message: error.message,
      sql_state: error.sqlState,
    };
    result.overall_success = false;

    // Add troubleshooting suggestions
    result.troubleshooting = {
      error_analysis: {
        ER_ACCESS_DENIED_ERROR: "User/password/host privilege problem",
        ER_BAD_DB_ERROR: "Database does not exist",
        ECONNREFUSED: "MySQL server not running or wrong port",
        ENOTFOUND: "Wrong hostname/IP address",
      },
      suggested_fixes: [
        "Check user privileges in phpMyAdmin",
        "Verify database name in Plesk",
        "Grant privileges: GRANT ALL ON summasum_.* TO 'zeljko'@'%'",
        "Flush privileges: FLUSH PRIVILEGES",
        "Restart Node.js application after .env changes",
      ],
    };
  }

  res.json(result);
});

module.exports = router;
