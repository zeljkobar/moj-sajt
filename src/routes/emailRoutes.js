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

module.exports = router;
