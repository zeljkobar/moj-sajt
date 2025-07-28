// src/config/emailConfig.js
const nodemailer = require("nodemailer");

// Email konfiguracija za Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // Tvoj Gmail
      pass: process.env.EMAIL_PASS, // App Password ili Gmail lozinka
    },
  });
};

// Test konekcije
const testConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log("✅ Email konfiguracija je ispravna");
    return true;
  } catch (error) {
    console.error("❌ Greška u email konfiguraciji:", error);
    return false;
  }
};

module.exports = {
  createTransporter,
  testConnection,
};
