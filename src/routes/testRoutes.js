const express = require("express");
const router = express.Router();
const db = require("../config/database");

// Test ruta za proveru baze podataka
router.get("/test-db", async (req, res) => {
  try {
    console.log("🔍 Test DB ruta pozvana...");

    const testResults = {
      timestamp: new Date().toISOString(),
      database: "summasum_",
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

    res.status(500).json({
      success: false,
      message: "❌ Greška pri testiranju baze podataka",
      error: {
        code: error.code,
        message: error.message,
        sqlMessage: error.sqlMessage || null,
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

module.exports = router;
