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

module.exports = router;
