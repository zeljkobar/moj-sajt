// src/config/emailConfig.js
const nodemailer = require('nodemailer');

// Email konfiguracija za Gmail sa alias podrškom
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Tvoj Gmail
      pass: process.env.EMAIL_PASS, // App Password ili Gmail lozinka
    },
    // Dozvoli alias adrese u From header-u
    from: process.env.EMAIL_USER,
    // Opcije za bolje alias handling
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });
};

// Test konekcije
const testConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email konfiguracija je ispravna');
    return true;
  } catch (error) {
    console.error('❌ Greška u email konfiguraciji:', error);
    return false;
  }
};

module.exports = {
  createTransporter,
  testConnection,
};
