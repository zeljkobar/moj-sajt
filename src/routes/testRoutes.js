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
  const mysql = require('mysql2/promise');
  
  // Pokušaj sa osnovnim podacima
  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  };

  res.json({
    message: "MySQL connection info za Plesk",
    config: {
      host: config.host,
      user: config.user,
      database: config.database, 
      port: config.port,
      password_set: !!config.password
    },
    plesk_help: {
      check_database_exists: `SHOW DATABASES LIKE '${config.database}';`,
      check_user_privileges: `SHOW GRANTS FOR '${config.user}'@'${config.host}';`,
      possible_database_names: [
        config.database,
        `${config.user}_${config.database}`,
        `${config.user}_${config.database.replace('_', '')}`
      ]
    },
    next_steps: [
      "1. Proveri da li baza stvarno postoji u Plesk-u",
      "2. Proveri da li korisnik ima privilegije na tu bazu", 
      "3. Resetuj lozinku u Plesk-u ako treba",
      "4. Možda je ime baze username_summasum_ umesto summasum_"
    ]
  });
});

module.exports = router;
