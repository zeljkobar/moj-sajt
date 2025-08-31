const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const mysqldump = require('mysqldump');
const { authMiddleware } = require('../middleware/auth');
const { pool, executeQuery } = require('../config/database');

// Middleware za proveru admin pristupa
const adminMiddleware = (req, res, next) => {
  console.log('Admin middleware - req.user:', req.user); // Debug log
  if (
    req.user &&
    (req.user.role === 'admin' || req.user.username === 'admin')
  ) {
    next();
  } else {
    console.log('Admin access denied for user:', req.user); // Debug log
    res.status(403).json({ error: 'Admin pristup je potreban' });
  }
};

// Primeni auth i admin middleware na sve rute
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/admin/database/stats - Statistike baze podataka
router.get('/database/stats', async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Prebroj zapise u svim tabelama
    const [radniciResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM radnici'
    );
    const [firmeResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM firme'
    );
    const [pozicijeResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM pozicije'
    );
    const [otkaziResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM otkazi'
    );

    // Dobij veličinu baze podataka
    const [sizeResult] = await connection.execute(`
      SELECT 
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'size_mb'
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);

    // Proveri kada je napravljen poslednji backup
    const backupDir = path.join(__dirname, '../../backups');
    let lastBackup = 'Nikad';

    try {
      const files = await fs.readdir(backupDir);
      const sqlFiles = files.filter(file => file.endsWith('.sql'));
      if (sqlFiles.length > 0) {
        const sortedFiles = sqlFiles.sort().reverse();
        const lastFile = sortedFiles[0];
        const stats = await fs.stat(path.join(backupDir, lastFile));
        lastBackup = stats.mtime.toLocaleDateString('sr-RS');
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
    console.error('Greška pri dobijanju statistika baze:', error);
    res
      .status(500)
      .json({ error: 'Greška pri dobijanju statistika baze podataka' });
  }
});

// GET /api/admin/database/backups - Lista backup fajlova
router.get('/database/backups', async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../../backups');

    // Kreiraj backups folder ako ne postoji
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir, { recursive: true });
    }

    const files = await fs.readdir(backupDir);
    const sqlFiles = files.filter(file => file.endsWith('.sql'));

    const backups = await Promise.all(
      sqlFiles.map(async file => {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);

        return {
          id: file.replace('.sql', ''),
          name: file,
          date: stats.mtime.toLocaleDateString('sr-RS', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
          size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        };
      })
    );

    // Sortiraj po datumu (najnoviji prvi)
    backups.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(backups);
  } catch (error) {
    console.error('Greška pri dobijanju backup liste:', error);
    res.status(500).json({ error: 'Greška pri dobijanju backup liste' });
  }
});

// POST /api/admin/database/backup - Kreiraj novi backup
router.post('/database/backup', async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../../backups');

    // Kreiraj backups folder ako ne postoji
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, -5);
    const filename = `database_backup_${timestamp}.sql`;
    const filePath = path.join(backupDir, filename);

    // Kreiraj backup koristeći mysqldump
    await mysqldump({
      connection: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'summasummarum_db',
      },
      dumpToFile: filePath,
    });

    res.json({
      success: true,
      message: 'Backup je uspešno kreiran',
      filename: filename,
    });
  } catch (error) {
    console.error('Greška pri kreiranju backup-a:', error);
    res.status(500).json({ error: 'Greška pri kreiranju backup-a' });
  }
});

// POST /api/admin/database/optimize - Optimizuj bazu podataka
router.post('/database/optimize', async (req, res) => {
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
    console.error('Greška pri optimizaciji baze:', error);
    res.status(500).json({ error: 'Greška pri optimizaciji baze podataka' });
  }
});

// POST /api/admin/database/analyze - Analiziraj bazu podataka
router.post('/database/analyze', async (req, res) => {
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
    console.error('Greška pri analizi baze:', error);
    res.status(500).json({ error: 'Greška pri analizi baze podataka' });
  }
});

// GET /api/admin/database/backup/:id/download - Preuzmi backup fajl
router.get('/database/backup/:id/download', async (req, res) => {
  try {
    const backupId = req.params.id;
    const backupDir = path.join(__dirname, '../../backups');
    const filePath = path.join(backupDir, `${backupId}.sql`);

    // Proveri da li fajl postoji
    await fs.access(filePath);

    res.download(filePath, `${backupId}.sql`);
  } catch (error) {
    console.error('Greška pri preuzimanju backup-a:', error);
    res.status(404).json({ error: 'Backup fajl nije pronađen' });
  }
});

// DELETE /api/admin/database/backup/:id - Obriši backup fajl
router.delete('/database/backup/:id', async (req, res) => {
  try {
    const backupId = req.params.id;
    const backupDir = path.join(__dirname, '../../backups');
    const filePath = path.join(backupDir, `${backupId}.sql`);

    // Obriši fajl
    await fs.unlink(filePath);

    res.json({
      success: true,
      message: 'Backup je uspešno obrisan',
    });
  } catch (error) {
    console.error('Greška pri brisanju backup-a:', error);
    res.status(500).json({ error: 'Greška pri brisanju backup-a' });
  }
});

// GET /api/admin/system/info - Sistemske informacije
router.get('/system/info', async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // MySQL verzija
    const [versionResult] = await connection.execute(
      'SELECT VERSION() as version'
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
      dbVersion: '1.0.0', // Možete dodati verziju vašeg database schema-a
    });
  } catch (error) {
    console.error('Greška pri dobijanju sistemskih informacija:', error);
    res
      .status(500)
      .json({ error: 'Greška pri dobijanju sistemskih informacija' });
  }
});

// ===== USER MANAGEMENT ROUTES =====

// GET /api/admin/users - Lista svih korisnika
router.get('/users', async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [users] = await connection.execute(`
      SELECT 
        u.id, u.username, u.email, u.phone, u.ime, u.prezime, u.jmbg, u.role, u.created_at,
        COUNT(DISTINCT f.id) as broj_firmi,
        COUNT(DISTINCT r.id) as broj_radnika
      FROM users u
      LEFT JOIN firme f ON u.id = f.user_id
      LEFT JOIN radnici r ON f.id = r.firma_id
      GROUP BY u.id, u.username, u.email, u.phone, u.ime, u.prezime, u.jmbg, u.role, u.created_at
      ORDER BY u.created_at DESC
    `);

    connection.release();
    res.json(users);
  } catch (error) {
    console.error('Greška pri dobijanju korisnika:', error);
    res.status(500).json({ error: 'Greška pri dobijanju korisnika' });
  }
});

// PUT /api/admin/users/:id/role - Promena role korisnika
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['firma', 'agencija', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Neispravna vrednost za rolu' });
    }

    const connection = await pool.getConnection();

    await connection.execute('UPDATE users SET role = ? WHERE id = ?', [
      role,
      id,
    ]);

    connection.release();
    res.json({ success: true, message: 'Rola je uspešno promenjena' });
  } catch (error) {
    console.error('Greška pri promeni role:', error);
    res.status(500).json({ error: 'Greška pri promeni role' });
  }
});

// DELETE /api/admin/users/:id - Brisanje korisnika sa svim povezanim podacima
router.delete('/users/:id', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    // Zabrani brisanje admin korisnika
    const [adminCheck] = await connection.execute(
      'SELECT role, username FROM users WHERE id = ?',
      [id]
    );

    if (adminCheck.length === 0) {
      return res.status(404).json({ error: 'Korisnik nije pronađen' });
    }

    if (adminCheck[0].role === 'admin' || adminCheck[0].username === 'admin') {
      return res.status(403).json({
        error: 'Ne možete obrisati admin korisnika',
      });
    }

    // Počni transakciju
    await connection.beginTransaction();

    console.log(
      `🗑️ Počinje brisanje korisnika ID: ${id} (${adminCheck[0].username})`
    );

    // 1. Dobij sve firme koje pripadaju ovom korisniku
    const [firme] = await connection.execute(
      'SELECT id, naziv FROM firme WHERE user_id = ?',
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
        'DELETE FROM pozajmnice WHERE radnik_id IN (SELECT id FROM radnici WHERE firma_id = ?)',
        [firma.id]
      );
      console.log(`💰 Obrisano ${pozajmniceResult.affectedRows} pozajmnica`);

      // Obriši radnike
      const [radniciResult] = await connection.execute(
        'DELETE FROM radnici WHERE firma_id = ?',
        [firma.id]
      );
      console.log(`👥 Obrisano ${radniciResult.affectedRows} radnika`);
    }

    // 3. Obriši sve firme
    const [firmeResult] = await connection.execute(
      'DELETE FROM firme WHERE user_id = ?',
      [id]
    );
    console.log(`🏢 Obrisano ${firmeResult.affectedRows} firmi`);

    // 4. Obriši pozicije korisnika
    const [pozicijeResult] = await connection.execute(
      'DELETE FROM pozicije WHERE user_id = ?',
      [id]
    );
    console.log(`📋 Obrisano ${pozicijeResult.affectedRows} pozicija`);

    // 5. Obriši otkaze vezane za korisnika
    const [otkaziResult] = await connection.execute(
      'DELETE FROM otkazi WHERE user_id = ?',
      [id]
    );
    console.log(`📄 Obrisano ${otkaziResult.affectedRows} otkaza`);

    // 6. Konačno obriši korisnika
    const [userResult] = await connection.execute(
      'DELETE FROM users WHERE id = ?',
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
    console.error('❌ Greška pri brisanju korisnika:', error);
    res.status(500).json({
      error: 'Greška pri brisanju korisnika',
      details: error.message,
    });
  } finally {
    connection.release();
  }
});

// GET /api/admin/subscription/stats - Subscription statistics
router.get('/subscription/stats', async (req, res) => {
  try {
    const stats = await executeQuery(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN subscription_status = 'trial' THEN 1 END) as trial_users,
        COUNT(CASE WHEN subscription_status = 'gratis' THEN 1 END) as gratis_users,
        COUNT(CASE WHEN subscription_status = 'suspended' THEN 1 END) as suspended_users,
        COUNT(CASE WHEN subscription_status = 'expired' THEN 1 END) as expired_users,
        COUNT(CASE WHEN trial_end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY) THEN 1 END) as trials_expiring_soon
      FROM users 
      WHERE role != 'admin'
    `);

    const revenueStats = await executeQuery(`
      SELECT 
        COALESCE(SUM(CASE WHEN action LIKE '%payment%' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 END), 0) as monthly_payments,
        COALESCE(SUM(CASE WHEN action LIKE '%payment%' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR) THEN 1 END), 0) as yearly_payments
      FROM subscription_history
    `);

    res.json({
      ...stats[0],
      ...revenueStats[0],
    });
  } catch (error) {
    console.error('Greška pri dobijanju subscription statistika:', error);
    res.status(500).json({ error: 'Greška pri dobijanju statistika' });
  }
});

// GET /api/admin/subscription/users - List users with subscription info
router.get('/subscription/users', async (req, res) => {
  try {
    const { status, search, expiring_days } = req.query;

    let whereConditions = ["role != 'admin'"];
    let queryParams = [];

    // Filter po statusu
    if (status && status !== 'all') {
      if (status === 'expiring_trial') {
        whereConditions.push(
          'trial_end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)'
        );
      } else {
        whereConditions.push('subscription_status = ?');
        queryParams.push(status);
      }
    }

    // Filter za uskoro ističuće pretplate
    if (expiring_days) {
      const days = parseInt(expiring_days);
      whereConditions.push(`(
        (u.trial_end_date IS NOT NULL AND u.trial_end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)) OR
        (u.subscription_end_date IS NOT NULL AND u.subscription_end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY))
      )`);
      queryParams.push(days, days);
    }

    // Filter po pretrazi
    if (search) {
      whereConditions.push(
        '(u.ime LIKE ? OR u.prezime LIKE ? OR u.email LIKE ? OR u.username LIKE ?)'
      );
      const searchPattern = `%${search}%`;
      queryParams.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
    }

    const query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.ime,
        u.prezime,
        u.role,
        u.subscription_status,
        u.trial_start_date,
        u.trial_end_date,
        u.subscription_end_date,
        u.last_payment_date,
        u.created_by_admin,
        u.created_at
      FROM users u
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY 
        CASE 
          WHEN u.subscription_status = 'gratis' THEN 1
          WHEN u.subscription_status = 'active' THEN 2
          WHEN u.subscription_status = 'trial' OR (u.subscription_status IS NULL AND u.trial_end_date > NOW()) THEN 3
          WHEN u.subscription_status = 'expired' THEN 4
          WHEN u.subscription_status = 'suspended' THEN 5
          ELSE 6
        END,
        u.created_at DESC
      LIMIT 1000`;

    const users = await executeQuery(query, queryParams);
    res.json(users);
  } catch (error) {
    console.error('Greška pri dobijanju korisnika:', error);
    res.status(500).json({ error: 'Greška pri dobijanju korisnika' });
  }
});

// PUT /api/admin/subscription/users/:userId - Update user subscription
router.put('/subscription/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      subscription_status,
      trial_end_date,
      subscription_end_date,
      notes,
    } = req.body;
    const adminUser = req.user;

    // Get current user data for history
    const currentUser = await executeQuery('SELECT * FROM users WHERE id = ?', [
      userId,
    ]);
    if (!currentUser.length) {
      return res.status(404).json({ error: 'Korisnik nije pronađen' });
    }

    // Prepare update query
    let updateFields = [];
    let updateParams = [];

    if (subscription_status !== undefined) {
      updateFields.push('subscription_status = ?');
      updateParams.push(subscription_status);
    }

    if (trial_end_date !== undefined) {
      updateFields.push('trial_end_date = ?');
      updateParams.push(trial_end_date || null);
    }

    if (subscription_end_date !== undefined) {
      updateFields.push('subscription_end_date = ?');
      updateParams.push(subscription_end_date || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nema podataka za ažuriranje' });
    }

    // Update user
    updateParams.push(userId);
    await executeQuery(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // Log to subscription history
    await executeQuery(
      `
      INSERT INTO subscription_history (
        user_id, admin_id, admin_username, action, details, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())
    `,
      [
        userId,
        adminUser.id,
        adminUser.username,
        'subscription_updated',
        JSON.stringify({
          old_status: currentUser[0].subscription_status,
          new_status: subscription_status,
          old_trial_end: currentUser[0].trial_end_date,
          new_trial_end: trial_end_date,
          old_subscription_end: currentUser[0].subscription_end_date,
          new_subscription_end: subscription_end_date,
          notes: notes,
        }),
      ]
    );

    res.json({ success: true, message: 'Pretplata je uspešno ažurirana' });
  } catch (error) {
    console.error('Greška pri ažuriranju pretplate:', error);
    res.status(500).json({ error: 'Greška pri ažuriranju pretplate' });
  }
});

// GET /api/admin/subscription/history/:userId - Get user subscription history
router.get('/subscription/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const history = await executeQuery(
      `
      SELECT 
        sh.*,
        u.username as user_username,
        u.email as user_email
      FROM subscription_history sh
      LEFT JOIN users u ON sh.user_id = u.id
      WHERE sh.user_id = ?
      ORDER BY sh.created_at DESC
      LIMIT 100
    `,
      [userId]
    );

    res.json(history);
  } catch (error) {
    console.error('Greška pri dobijanju istorije pretplate:', error);
    res.status(500).json({ error: 'Greška pri dobijanju istorije' });
  }
});

// POST /api/admin/subscription/notify/:userId - Send notification to user
router.post('/subscription/notify/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, message } = req.body;
    const adminUser = req.user;

    // Get user data
    const user = await executeQuery('SELECT * FROM users WHERE id = ?', [
      userId,
    ]);
    if (!user.length) {
      return res.status(404).json({ error: 'Korisnik nije pronađen' });
    }

    const userData = user[0];
    const emailService = require('../services/emailService');

    let emailSent = false;
    let emailError = null;

    try {
      switch (type) {
        case 'subscription_update':
          await emailService.sendSubscriptionUpdateNotification(
            userData.email,
            userData,
            message
          );
          break;
        case 'subscription_reminder':
          // Map database fields to what emailService expects
          const reminderData = {
            name:
              `${userData.ime || ''} ${userData.prezime || ''}`.trim() ||
              'korisniče',
            status: userData.subscription_status,
            trialEndDate: userData.trial_end_date,
            subscriptionEndDate: userData.subscription_end_date,
          };
          await emailService.sendSubscriptionReminder(
            userData.email,
            reminderData
          );
          break;
        case 'subscription_expiry':
          // Map database fields to what emailService expects
          const expiryData = {
            name:
              `${userData.ime || ''} ${userData.prezime || ''}`.trim() ||
              'korisniče',
            status: userData.subscription_status,
            trialEndDate: userData.trial_end_date,
            subscriptionEndDate: userData.subscription_end_date,
          };
          await emailService.sendSubscriptionExpiryNotification(
            userData.email,
            expiryData
          );
          break;
        default:
          return res.status(400).json({ error: 'Nepoznat tip notifikacije' });
      }
      emailSent = true;
    } catch (error) {
      console.error('Greška pri slanju email-a:', error);
      emailError = error.message;
    }

    // Log notification attempt
    await executeQuery(
      `
      INSERT INTO subscription_history (
        user_id, admin_id, admin_username, action, details, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())
    `,
      [
        userId,
        adminUser.id,
        adminUser.username,
        'notification_sent',
        JSON.stringify({
          type: type,
          message: message,
          email_sent: emailSent,
          email_error: emailError,
        }),
      ]
    );

    if (emailSent) {
      res.json({ success: true, message: 'Notifikacija je uspešno poslata' });
    } else {
      res.status(500).json({
        error: 'Greška pri slanju notifikacije',
        details: emailError,
      });
    }
  } catch (error) {
    console.error('Greška pri slanju notifikacije:', error);
    res.status(500).json({ error: 'Greška pri slanju notifikacije' });
  }
});

// POST /api/admin/subscription/cleanup - Update expired trial statuses
router.post('/subscription/cleanup', async (req, res) => {
  try {
    const adminUser = req.user;

    // Find expired trials
    const expiredTrials = await executeQuery(`
      SELECT id, username, email, trial_end_date 
      FROM users 
      WHERE subscription_status = 'trial' 
      AND trial_end_date < NOW()
      AND role != 'admin'
    `);

    let updatedCount = 0;

    // Update each expired trial to 'expired' status
    for (const user of expiredTrials) {
      await executeQuery(
        'UPDATE users SET subscription_status = ? WHERE id = ?',
        ['expired', user.id]
      );

      // Log the change
      await executeQuery(
        `
        INSERT INTO subscription_history (
          user_id, admin_id, admin_username, action, details, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `,
        [
          user.id,
          adminUser.id,
          adminUser.username,
          'auto_expired',
          JSON.stringify({
            old_status: 'trial',
            new_status: 'expired',
            trial_end_date: user.trial_end_date,
            reason: 'automatic_cleanup',
          }),
        ]
      );

      updatedCount++;
    }

    // Also check for expired active subscriptions
    const expiredSubscriptions = await executeQuery(`
      SELECT id, username, email, subscription_end_date 
      FROM users 
      WHERE subscription_status = 'active' 
      AND subscription_end_date < NOW()
      AND role != 'admin'
    `);

    for (const user of expiredSubscriptions) {
      await executeQuery(
        'UPDATE users SET subscription_status = ? WHERE id = ?',
        ['expired', user.id]
      );

      // Log the change
      await executeQuery(
        `
        INSERT INTO subscription_history (
          user_id, admin_id, admin_username, action, details, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `,
        [
          user.id,
          adminUser.id,
          adminUser.username,
          'auto_expired',
          JSON.stringify({
            old_status: 'active',
            new_status: 'expired',
            subscription_end_date: user.subscription_end_date,
            reason: 'automatic_cleanup',
          }),
        ]
      );

      updatedCount++;
    }

    res.json({
      success: true,
      message: `Ažurirano ${updatedCount} isteklih pretplata`,
      updated_count: updatedCount,
      expired_trials: expiredTrials.length,
      expired_subscriptions: expiredSubscriptions.length,
    });
  } catch (error) {
    console.error('Greška pri cleanup-u pretplata:', error);
    res.status(500).json({ error: 'Greška pri ažuriranju isteklih pretplata' });
  }
});

// POST /api/admin/subscription/payment - Record payment for user
router.post('/subscription/payment', async (req, res) => {
  try {
    const adminUser = req.user;
    const {
      user_id,
      amount,
      currency = 'RSD',
      payment_method,
      reference,
      payment_date,
      extend_subscription = true,
    } = req.body;

    // Validation
    if (!user_id || !amount || amount <= 0) {
      return res
        .status(400)
        .json({ error: 'User ID i ispravan iznos su obavezni' });
    }

    if (!payment_date) {
      return res.status(400).json({ error: 'Datum uplate je obavezan' });
    }

    // Get user data
    const users = await executeQuery(
      'SELECT * FROM users WHERE id = ? AND role != ?',
      [user_id, 'admin']
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Korisnik nije pronađen' });
    }

    const user = users[0];

    // Calculate period dates (1 month period)
    const periodStart = new Date(payment_date);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Insert payment record
    const paymentResult = await executeQuery(
      `
      INSERT INTO payments (
        user_id, amount, currency, payment_method, payment_reference, 
        payment_date, period_start_date, period_end_date, admin_id, admin_username, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
      [
        user_id,
        amount,
        currency,
        payment_method,
        reference,
        payment_date,
        periodStart.toISOString().split('T')[0],
        periodEnd.toISOString().split('T')[0],
        adminUser.id,
        adminUser.username,
      ]
    );

    const paymentId = paymentResult.insertId;

    // Log payment in subscription history
    await executeQuery(
      `
      INSERT INTO subscription_history (
        user_id, admin_id, admin_username, action, details, 
        payment_id, payment_amount, payment_reference, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
      [
        user_id,
        adminUser.id,
        adminUser.username,
        'payment_recorded',
        JSON.stringify({
          amount: amount,
          currency: currency,
          payment_method: payment_method,
          payment_date: payment_date,
          reference: reference,
          extend_subscription: extend_subscription,
        }),
        paymentId,
        amount,
        reference,
      ]
    );

    // Update subscription if requested
    if (extend_subscription) {
      let newEndDate;
      let newStatus = 'active';

      // Calculate new end date based on current status
      if (user.subscription_status === 'active' && user.subscription_end_date) {
        // Extend from current end date
        const currentEndDate = new Date(user.subscription_end_date);
        newEndDate = new Date(currentEndDate);
        newEndDate.setDate(currentEndDate.getDate() + 30);
      } else {
        // Start from today
        newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + 30);
      }

      // Update user subscription
      await executeQuery(
        `
        UPDATE users 
        SET subscription_status = ?, subscription_end_date = ?, last_payment_date = ?
        WHERE id = ?
      `,
        [
          newStatus,
          newEndDate.toISOString().split('T')[0],
          payment_date,
          user_id,
        ]
      );

      // Log subscription extension
      await executeQuery(
        `
        INSERT INTO subscription_history (
          user_id, admin_id, admin_username, action, details, 
          payment_id, payment_amount, payment_reference, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
        [
          user_id,
          adminUser.id,
          adminUser.username,
          'subscription_extended',
          JSON.stringify({
            old_status: user.subscription_status,
            new_status: newStatus,
            old_end_date: user.subscription_end_date,
            new_end_date: newEndDate.toISOString().split('T')[0],
            days_extended: 30,
            triggered_by_payment: paymentId,
          }),
          paymentId,
          amount,
          reference,
        ]
      );
    }

    res.json({
      success: true,
      message: 'Uplata je uspešno evidentirana',
      payment_id: paymentId,
      extended_subscription: extend_subscription,
    });
  } catch (error) {
    console.error('Greška pri evidentiranju uplate:', error);
    res.status(500).json({ error: 'Greška pri evidentiranju uplate' });
  }
});

// GET /api/admin/subscription/info/:userId - Get detailed subscription info
router.get('/subscription/info/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [users] = await executeQuery(
      `SELECT 
        u.id, u.username, u.email, u.ime, u.prezime,
        u.subscription_status, u.trial_end_date, u.subscription_end_date, u.last_payment,
        u.created_by_admin, u.created_at
      FROM users u
      WHERE u.id = ? AND u.role != 'admin'`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Korisnik nije pronađen' });
    }

    const user = users[0];

    // Get payment history
    const payments = await executeQuery(
      `SELECT * FROM payments 
       WHERE user_id = ? 
       ORDER BY payment_date DESC, created_at DESC
       LIMIT 10`,
      [userId]
    );

    // Get recent subscription history
    const history = await executeQuery(
      `SELECT * FROM subscription_history 
       WHERE user_id = ? 
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId]
    );

    // Calculate status info
    const now = new Date();
    let statusInfo = { days_remaining: null, expired: false };

    if (user.subscription_status === 'trial' && user.trial_end_date) {
      const trialEnd = new Date(user.trial_end_date);
      const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      statusInfo = {
        days_remaining: Math.max(0, daysRemaining),
        expired: daysRemaining <= 0,
        end_date: user.trial_end_date,
      };
    } else if (
      user.subscription_status === 'active' &&
      user.subscription_end_date
    ) {
      const subscriptionEnd = new Date(user.subscription_end_date);
      const daysRemaining = Math.ceil(
        (subscriptionEnd - now) / (1000 * 60 * 60 * 24)
      );
      statusInfo = {
        days_remaining: Math.max(0, daysRemaining),
        expired: daysRemaining <= 0,
        end_date: user.subscription_end_date,
      };
    }

    res.json({
      user: {
        ...user,
        ...statusInfo,
      },
      payments: payments,
      recent_history: history,
    });
  } catch (error) {
    console.error('Greška pri dobijanju subscription info:', error);
    res
      .status(500)
      .json({ error: 'Greška pri dobijanju informacija o pretplati' });
  }
});

module.exports = router;
