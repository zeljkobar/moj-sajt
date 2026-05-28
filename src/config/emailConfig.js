// src/config/emailConfig.js
const nodemailer = require('nodemailer');

// Email konfiguracija za Gmail sa alias podrškom
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Tvoj Gmail
      pass: process.env.EMAIL_PASS, // App Password ili Gmail lozinka
    },
    // Dozvoli alias adrese u From header-u
    from: process.env.EMAIL_USER,
    // Pool konekcija - maxMessages: 0 = bez limita (ne zatvara konekciju i ne loguje se ponovo)
    pool: true,
    maxConnections: 3,
    maxMessages: 0,
    rateDelta: 1000,
    rateLimit: 2,
  });
};

// Singleton transporter za marketing kampanje (jedan login, jedna konekcija)
let _marketingTransporter = null;
const getMarketingTransporter = () => {
  if (!_marketingTransporter) {
    _marketingTransporter = createTransporter();
  }
  return _marketingTransporter;
};

// Reset singleton (koristiti kada dođe do auth greške)
const resetMarketingTransporter = () => {
  if (_marketingTransporter) {
    _marketingTransporter.close();
    _marketingTransporter = null;
  }
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
  getMarketingTransporter,
  resetMarketingTransporter,
  testConnection,
};
