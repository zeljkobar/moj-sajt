// src/routes/emailRoutes.js
const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const { testConnection } = require('../config/emailConfig');
const { requireRole, ROLES } = require('../middleware/roleAuth');

// Test email konfiguracije
router.get('/test-config', requireRole([ROLES.ADMIN]), async (req, res) => {
  try {
    const isConnected = await testConnection();

    res.json({
      success: isConnected,
      message: isConnected
        ? 'Email konfiguracija je ispravna'
        : 'Greška u email konfiguraciji',
      config: {
        emailUser: process.env.EMAIL_USER || 'nije definisano',
        hasPassword: !!process.env.EMAIL_PASS,
        appUrl: process.env.APP_URL || 'nije definisano',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Greška pri testiranju email konfiguracije',
      error: error.message,
    });
  }
});

// Test welcome email
router.post('/test-welcome', requireRole([ROLES.ADMIN]), async (req, res) => {
  try {
    const { email, name, userType } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email i ime su obavezni',
      });
    }

    const result = await emailService.sendWelcomeEmail(
      email,
      name,
      userType || 'firma'
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Greška pri slanju test email-a',
      error: error.message,
    });
  }
});

// Test password reset email
router.post(
  '/test-password-reset',
  requireRole([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const { email, name, testToken } = req.body;

      if (!email || !name) {
        return res.status(400).json({
          success: false,
          message: 'Email i ime su obavezni',
        });
      }

      const token = testToken || 'test-token-123456';
      const result = await emailService.sendPasswordResetEmail(
        email,
        name,
        token
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Greška pri slanju test password reset email-a',
        error: error.message,
      });
    }
  }
);

// Pošalji email svim korisnicima - SAMO ADMIN
router.post('/broadcast', requireRole([ROLES.ADMIN]), async (req, res) => {
  try {
    const { subject, message, userType } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Naslov i poruka su obavezni',
      });
    }

    const { executeQuery } = require('../config/database');

    // Filtriraj korisnike po tipu ako je specificirano
    let whereClause = '';
    const params = [];

    if (userType && userType !== 'all') {
      whereClause = 'WHERE role = ?';
      params.push(userType);
    }

    // Dobij sve korisnike
    const users = await executeQuery(
      `SELECT email, ime, prezime, role FROM users ${whereClause}`,
      params
    );

    if (users.length === 0) {
      return res.json({
        success: false,
        message: 'Nema korisnika za slanje email-a',
      });
    }

    // Šalji email svakom korisniku
    const results = [];
    for (const user of users) {
      try {
        const result = await emailService.sendBroadcastEmail(
          user.email,
          `${user.ime} ${user.prezime}`,
          subject,
          message
        );
        results.push({
          email: user.email,
          success: result.success,
          message: result.message,
        });
      } catch (error) {
        results.push({
          email: user.email,
          success: false,
          message: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    res.json({
      success: true,
      message: `Email poslat ${successCount} korisnicima. ${failCount} neuspešno.`,
      totalUsers: users.length,
      successCount,
      failCount,
      details: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Greška pri slanju broadcast email-a',
      error: error.message,
    });
  }
});

// Get email filter data (cities, business codes, etc.)
router.get('/filters', requireRole([ROLES.ADMIN]), async (req, res) => {
  try {
    const { executeQuery } = require('../config/database');

    // Get unique cities
    const citiesQuery = `
      SELECT DISTINCT grad as city, COUNT(*) as count 
      FROM emails 
      WHERE grad IS NOT NULL AND grad != '' 
      GROUP BY grad 
      ORDER BY count DESC, grad ASC
    `;

    // Get unique business codes (kd)
    const businessCodesQuery = `
      SELECT DISTINCT kd as code, COUNT(*) as count 
      FROM emails 
      WHERE kd IS NOT NULL AND kd != '' 
      GROUP BY kd 
      ORDER BY count DESC
    `;

    // Get statistics for ranges
    const statsQuery = `
      SELECT 
        MIN(CAST(broj_zaposlenih AS UNSIGNED)) as minEmployees,
        MAX(CAST(broj_zaposlenih AS UNSIGNED)) as maxEmployees,
        MIN(CAST(prihod AS DECIMAL(15,2))) as minRevenue,
        MAX(CAST(prihod AS DECIMAL(15,2))) as maxRevenue,
        COUNT(*) as totalEmails
      FROM emails 
      WHERE broj_zaposlenih IS NOT NULL 
        AND prihod IS NOT NULL
        AND broj_zaposlenih != ''
        AND prihod != ''
    `;

    const [cities, businessCodes, stats] = await Promise.all([
      executeQuery(citiesQuery),
      executeQuery(businessCodesQuery),
      executeQuery(statsQuery),
    ]);

    res.json({
      success: true,
      data: {
        cities: cities || [],
        businessCodes: businessCodes || [],
        stats: stats[0] || {
          minEmployees: 0,
          maxEmployees: 1000,
          minRevenue: 0,
          maxRevenue: 100000000,
          totalEmails: 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching filter data:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri učitavanju podataka za filtere',
      error: error.message,
    });
  }
});

// Search emails with filters
router.post('/search', requireRole([ROLES.ADMIN]), async (req, res) => {
  try {
    const { executeQuery } = require('../config/database');
    const {
      cities = [],
      businessCodes = [],
      employeeRange = [0, 1000],
      revenueRange = [0, 100000000],
      onlyNeverEmailed = false,
      onlyWithEmail = true,
    } = req.body;

    let whereConditions = [];
    let queryParams = [];

    // Filter by cities
    if (cities.length > 0) {
      const cityPlaceholders = cities.map(() => '?').join(',');
      whereConditions.push(`grad IN (${cityPlaceholders})`);
      queryParams.push(...cities);
    }

    // Filter by business codes
    if (businessCodes.length > 0) {
      const codePlaceholders = businessCodes.map(() => '?').join(',');
      whereConditions.push(`kd IN (${codePlaceholders})`);
      queryParams.push(...businessCodes);
    }

    // Filter by employee range
    if (employeeRange && employeeRange.length === 2) {
      whereConditions.push(`CAST(broj_zaposlenih AS UNSIGNED) BETWEEN ? AND ?`);
      queryParams.push(employeeRange[0], employeeRange[1]);
    }

    // Filter by revenue range
    if (revenueRange && revenueRange.length === 2) {
      whereConditions.push(`CAST(prihod AS DECIMAL(15,2)) BETWEEN ? AND ?`);
      queryParams.push(revenueRange[0], revenueRange[1]);
    }

    // Only companies with valid email addresses
    if (onlyWithEmail) {
      whereConditions.push(
        `email IS NOT NULL AND email != '' AND email LIKE '%@%'`
      );
    }

    // Filter by email send history
    if (onlyNeverEmailed) {
      whereConditions.push(
        `id NOT IN (SELECT DISTINCT emails_id FROM marketing_emails WHERE emails_id IS NOT NULL)`
      );
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM emails 
      ${whereClause}
    `;

    // Sample or full query based on request
    const { getAllResults = false } = req.body;
    const limitClause = getAllResults ? '' : 'LIMIT 5';

    const resultQuery = `
      SELECT id, naziv as companyName, email, grad as city, 
             kd as businessCode, broj_zaposlenih as employees, 
             prihod as revenue
      FROM emails 
      ${whereClause}
      ORDER BY prihod DESC
      ${limitClause}
    `;

    const [countResult, emailResults] = await Promise.all([
      executeQuery(countQuery, queryParams),
      executeQuery(resultQuery, queryParams),
    ]);

    const totalCount = countResult[0].total;

    const responseData = {
      totalCount,
      filters: {
        cities,
        businessCodes,
        employeeRange,
        revenueRange,
        onlyNeverEmailed,
        onlyWithEmail,
      },
    };

    if (getAllResults) {
      responseData.allEmails = emailResults || [];
    } else {
      responseData.sampleEmails = emailResults || [];
    }

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Error searching emails:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri pretraživanju email adresa',
      error: error.message,
    });
  }
});

module.exports = router;
