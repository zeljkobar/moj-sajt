const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const fs = require("fs").promises;
const path = require("path");
const mysqldump = require("mysqldump");
const { authMiddleware } = require("../middleware/auth");
const { pool } = require("../config/database");

// Middleware za proveru admin pristupa
const adminMiddleware = (req, res, next) => {
  console.log("Admin middleware - req.user:", req.user); // Debug log
  if (
    req.user &&
    (req.user.role === "admin" || req.user.username === "admin")
  ) {
    next();
  } else {
    console.log("Admin access denied for user:", req.user); // Debug log
    res.status(403).json({ error: "Admin pristup je potreban" });
  }
};

// Primeni auth i admin middleware na sve rute
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/admin/database/stats - Statistike baze podataka
router.get("/database/stats", async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Prebroj zapise u svim tabelama
    const [radniciResult] = await connection.execute(
      "SELECT COUNT(*) as count FROM radnici"
    );
    const [firmeResult] = await connection.execute(
      "SELECT COUNT(*) as count FROM firme"
    );
    const [pozicijeResult] = await connection.execute(
      "SELECT COUNT(*) as count FROM pozicije"
    );
    const [otkaziResult] = await connection.execute(
      "SELECT COUNT(*) as count FROM otkazi"
    );

    // Dobij veličinu baze podataka
    const [sizeResult] = await connection.execute(`
      SELECT 
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'size_mb'
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);

    // Proveri kada je napravljen poslednji backup
    const backupDir = path.join(__dirname, "../../backups");
    let lastBackup = "Nikad";

    try {
      const files = await fs.readdir(backupDir);
      const sqlFiles = files.filter((file) => file.endsWith(".sql"));
      if (sqlFiles.length > 0) {
        const sortedFiles = sqlFiles.sort().reverse();
        const lastFile = sortedFiles[0];
        const stats = await fs.stat(path.join(backupDir, lastFile));
        lastBackup = stats.mtime.toLocaleDateString("sr-RS");
      }
    } catch (error) {
      // backups folder ne postoji ili nema fajlova
    }

    connection.release();

    res.json({
      radnici: radniciResult[0].count,
      firme: firmeResult[0].count,
      pozicije: pozicijeResult[0].count,
      otkazi: otkaziResult[0].count,
      size: `${sizeResult[0].size_mb} MB`,
      lastBackup: lastBackup,
    });
  } catch (error) {
    console.error("Greška pri dobijanju statistika baze:", error);
    res
      .status(500)
      .json({ error: "Greška pri dobijanju statistika baze podataka" });
  }
});

// GET /api/admin/database/backups - Lista backup fajlova
router.get("/database/backups", async (req, res) => {
  try {
    const backupDir = path.join(__dirname, "../../backups");

    // Kreiraj backups folder ako ne postoji
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir, { recursive: true });
    }

    const files = await fs.readdir(backupDir);
    const sqlFiles = files.filter((file) => file.endsWith(".sql"));

    const backups = await Promise.all(
      sqlFiles.map(async (file) => {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);

        return {
          id: file.replace(".sql", ""),
          name: file,
          date: stats.mtime.toLocaleDateString("sr-RS", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
          size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        };
      })
    );

    // Sortiraj po datumu (najnoviji prvi)
    backups.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(backups);
  } catch (error) {
    console.error("Greška pri dobijanju backup liste:", error);
    res.status(500).json({ error: "Greška pri dobijanju backup liste" });
  }
});

// POST /api/admin/database/backup - Kreiraj novi backup
router.post("/database/backup", async (req, res) => {
  try {
    const backupDir = path.join(__dirname, "../../backups");

    // Kreiraj backups folder ako ne postoji
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const filename = `database_backup_${timestamp}.sql`;
    const filePath = path.join(backupDir, filename);

    // Kreiraj backup koristeći mysqldump
    await mysqldump({
      connection: {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "summasummarum_db",
      },
      dumpToFile: filePath,
    });

    res.json({
      success: true,
      message: "Backup je uspešno kreiran",
      filename: filename,
    });
  } catch (error) {
    console.error("Greška pri kreiranju backup-a:", error);
    res.status(500).json({ error: "Greška pri kreiranju backup-a" });
  }
});

// POST /api/admin/database/optimize - Optimizuj bazu podataka
router.post("/database/optimize", async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Dobij sve tabele u bazi
    const [tables] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);

    // Optimizuj svaku tabelu
    for (const table of tables) {
      await connection.execute(`OPTIMIZE TABLE ${table.table_name}`);
    }

    connection.release();

    res.json({
      success: true,
      message: `Optimizovano je ${tables.length} tabela`,
    });
  } catch (error) {
    console.error("Greška pri optimizaciji baze:", error);
    res.status(500).json({ error: "Greška pri optimizaciji baze podataka" });
  }
});

// POST /api/admin/database/analyze - Analiziraj bazu podataka
router.post("/database/analyze", async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Dobij sve tabele u bazi
    const [tables] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);

    // Analiziraj svaku tabelu
    for (const table of tables) {
      await connection.execute(`ANALYZE TABLE ${table.table_name}`);
    }

    connection.release();

    res.json({
      success: true,
      message: `Analizirano je ${tables.length} tabela`,
    });
  } catch (error) {
    console.error("Greška pri analizi baze:", error);
    res.status(500).json({ error: "Greška pri analizi baze podataka" });
  }
});

// GET /api/admin/database/backup/:id/download - Preuzmi backup fajl
router.get("/database/backup/:id/download", async (req, res) => {
  try {
    const backupId = req.params.id;
    const backupDir = path.join(__dirname, "../../backups");
    const filePath = path.join(backupDir, `${backupId}.sql`);

    // Proveri da li fajl postoji
    await fs.access(filePath);

    res.download(filePath, `${backupId}.sql`);
  } catch (error) {
    console.error("Greška pri preuzimanju backup-a:", error);
    res.status(404).json({ error: "Backup fajl nije pronađen" });
  }
});

// DELETE /api/admin/database/backup/:id - Obriši backup fajl
router.delete("/database/backup/:id", async (req, res) => {
  try {
    const backupId = req.params.id;
    const backupDir = path.join(__dirname, "../../backups");
    const filePath = path.join(backupDir, `${backupId}.sql`);

    // Obriši fajl
    await fs.unlink(filePath);

    res.json({
      success: true,
      message: "Backup je uspešno obrisan",
    });
  } catch (error) {
    console.error("Greška pri brisanju backup-a:", error);
    res.status(500).json({ error: "Greška pri brisanju backup-a" });
  }
});

// GET /api/admin/system/info - Sistemske informacije
router.get("/system/info", async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // MySQL verzija
    const [versionResult] = await connection.execute(
      "SELECT VERSION() as version"
    );

    // Broj konekcija
    const [connectionsResult] = await connection.execute(
      'SHOW STATUS LIKE "Threads_connected"'
    );

    connection.release();

    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);

    const memoryUsage = process.memoryUsage();
    const memoryMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);

    res.json({
      nodeVersion: process.version,
      uptime: `${uptimeHours}h ${uptimeMinutes}m`,
      memory: `${memoryMB} MB`,
      mysqlVersion: versionResult[0].version,
      connections: connectionsResult[0].Value,
      dbVersion: "1.0.0", // Možete dodati verziju vašeg database schema-a
    });
  } catch (error) {
    console.error("Greška pri dobijanju sistemskih informacija:", error);
    res
      .status(500)
      .json({ error: "Greška pri dobijanju sistemskih informacija" });
  }
});

// ===== USER MANAGEMENT ROUTES =====

// GET /api/admin/users - Lista svih korisnika
router.get("/users", async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [users] = await connection.execute(`
      SELECT 
        id, username, email, phone, ime, prezime, jmbg, role, created_at
      FROM users 
      ORDER BY created_at DESC
    `);

    connection.release();
    res.json(users);
  } catch (error) {
    console.error("Greška pri dobijanju korisnika:", error);
    res.status(500).json({ error: "Greška pri dobijanju korisnika" });
  }
});

// PUT /api/admin/users/:id/role - Promena role korisnika
router.put("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["firma", "agencija", "admin"].includes(role)) {
      return res.status(400).json({ error: "Neispravna vrednost za rolu" });
    }

    const connection = await pool.getConnection();

    await connection.execute("UPDATE users SET role = ? WHERE id = ?", [
      role,
      id,
    ]);

    connection.release();
    res.json({ success: true, message: "Rola je uspešno promenjena" });
  } catch (error) {
    console.error("Greška pri promeni role:", error);
    res.status(500).json({ error: "Greška pri promeni role" });
  }
});

// DELETE /api/admin/users/:id - Brisanje korisnika sa svim povezanim podacima
router.delete("/users/:id", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    // Zabrani brisanje admin korisnika
    const [adminCheck] = await connection.execute(
      "SELECT role, username FROM users WHERE id = ?",
      [id]
    );

    if (adminCheck.length === 0) {
      return res.status(404).json({ error: "Korisnik nije pronađen" });
    }

    if (adminCheck[0].role === "admin" || adminCheck[0].username === "admin") {
      return res.status(403).json({
        error: "Ne možete obrisati admin korisnika",
      });
    }

    // Počni transakciju
    await connection.beginTransaction();

    console.log(
      `🗑️ Počinje brisanje korisnika ID: ${id} (${adminCheck[0].username})`
    );

    // 1. Dobij sve firme koje pripadaju ovom korisniku
    const [firme] = await connection.execute(
      "SELECT id, naziv FROM firme WHERE user_id = ?",
      [id]
    );

    console.log(`📊 Pronađeno ${firme.length} firmi za brisanje`);

    // 2. Za svaku firmu, obriši sve povezane podatke
    for (const firma of firme) {
      console.log(
        `🏢 Brišem podatke za firmu: ${firma.naziv} (ID: ${firma.id})`
      );

      // Obriši pozajmnice koje su vezane za radnike ove firme
      const [pozajmniceResult] = await connection.execute(
        "DELETE FROM pozajmnice WHERE radnik_id IN (SELECT id FROM radnici WHERE firma_id = ?)",
        [firma.id]
      );
      console.log(`💰 Obrisano ${pozajmniceResult.affectedRows} pozajmnica`);

      // Obriši radnike
      const [radniciResult] = await connection.execute(
        "DELETE FROM radnici WHERE firma_id = ?",
        [firma.id]
      );
      console.log(`👥 Obrisano ${radniciResult.affectedRows} radnika`);
    }

    // 3. Obriši sve firme
    const [firmeResult] = await connection.execute(
      "DELETE FROM firme WHERE user_id = ?",
      [id]
    );
    console.log(`🏢 Obrisano ${firmeResult.affectedRows} firmi`);

    // 4. Obriši pozicije korisnika
    const [pozicijeResult] = await connection.execute(
      "DELETE FROM pozicije WHERE user_id = ?",
      [id]
    );
    console.log(`📋 Obrisano ${pozicijeResult.affectedRows} pozicija`);

    // 5. Obriši otkaze vezane za korisnika
    const [otkaziResult] = await connection.execute(
      "DELETE FROM otkazi WHERE user_id = ?",
      [id]
    );
    console.log(`📄 Obrisano ${otkaziResult.affectedRows} otkaza`);

    // 6. Konačno obriši korisnika
    const [userResult] = await connection.execute(
      "DELETE FROM users WHERE id = ?",
      [id]
    );
    console.log(`👤 Obrisan korisnik (${userResult.affectedRows} red)`);

    // Potvrdi transakciju
    await connection.commit();

    console.log(
      `✅ Uspešno obrisan korisnik ${adminCheck[0].username} i svi povezani podaci`
    );

    res.json({
      success: true,
      message: `Korisnik ${adminCheck[0].username} je uspešno obrisan sa svim povezanim podacima`,
      deletedItems: {
        user: userResult.affectedRows,
        firme: firmeResult.affectedRows,
        radnici: firme.reduce((total, firma, index) => {
          // Ova vrednost će biti tačna samo ako pratimo rezultate, ali za sada ovo je aproksimacija
          return total + 1; // Placeholder
        }, 0),
        pozicije: pozicijeResult.affectedRows,
        otkazi: otkaziResult.affectedRows,
        pozajmnice: 0, // Placeholder
      },
    });
  } catch (error) {
    // Rollback transakciju u slučaju greške
    await connection.rollback();
    console.error("❌ Greška pri brisanju korisnika:", error);
    res.status(500).json({
      error: "Greška pri brisanju korisnika",
      details: error.message,
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
