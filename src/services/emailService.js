// src/services/emailService.js
const { createTransporter } = require("../config/emailConfig");

class EmailService {
  constructor() {
    this.transporter = createTransporter();
  }

  // Osnovni template za email
  createEmailTemplate(title, content, additionalInfo = "") {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0; font-size: 28px;">SummaSummarum</h1>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Vaš partner za poslovanje</p>
        </div>
        
        <h2 style="color: #2c5aa0; margin-bottom: 20px; font-size: 24px;">${title}</h2>
        
        <div style="line-height: 1.6; color: #333; font-size: 16px;">
          ${content}
        </div>
        
        ${
          additionalInfo
            ? `
        <div style="background-color: #f8f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2c5aa0;">
          ${additionalInfo}
        </div>
        `
            : ""
        }
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px;">
          <p>Hvala što koristite SummaSummarum!</p>
          <p>Ukoliko imate pitanja, kontaktirajte nas na <a href="mailto:podrska@summasummarum.com" style="color: #2c5aa0;">podrska@summasummarum.com</a></p>
        </div>
      </div>
    </div>
    `;
  }

  // Dobrodošlica za nova korisnika
  async sendWelcomeEmail(userEmail, userName, userType) {
    const roleInfo = {
      firma: {
        name: "Firma",
        features: [
          "Kreiranje i upravljanje jednom firmom",
          "Evidencija radnika i pozicija",
          "Generiranje ugovora o radu",
          "Sistem pozajmnica",
          "Službene odluke i dokumenti",
        ],
      },
      agencija: {
        name: "Agencija",
        features: [
          "Kreiranje neograničenog broja firmi",
          "Napredni izvještaji i analize",
          "PDV XML izvoz",
          "Automatske poreske prijave",
          "Upravljanje klijentima",
          "Sve funkcionalnosti firme i više",
        ],
      },
    };

    const role = roleInfo[userType] || roleInfo["firma"];

    const content = `
      <p style="font-size: 18px;"><strong>Dobrodošli, ${userName}!</strong></p>
      
      <p>Vaš račun je uspešno kreiran kao <strong>${
        role.name
      }</strong>. Sada imate pristup sledećim funkcionalnostima:</p>
      
      <ul style="background-color: #f8f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        ${role.features
          .map(
            (feature) =>
              `<li style="margin: 8px 0; color: #333;">${feature}</li>`
          )
          .join("")}
      </ul>
      
      <p>Za početak rada, preporučujemo da:</p>
      <ol style="color: #555;">
        <li>Popunite svoj profil</li>
        <li>Kreirate prvu firmu</li>
        <li>Dodate osnovne podatke o radnicima</li>
      </ol>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${
          process.env.APP_URL || "http://localhost:3000"
        }/dashboard.html" 
           style="background-color: #2c5aa0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Idite na Dashboard
        </a>
      </div>
    `;

    const additionalInfo = `
      <h4 style="color: #2c5aa0; margin-bottom: 10px;">💡 Korisni saveti:</h4>
      <p style="margin: 5px 0;">• Koristite Chrome ili Firefox za najbolju performansu</p>
      <p style="margin: 5px 0;">• Sačuvajte ovu email adresu za buduće komunikacije</p>
      <p style="margin: 5px 0;">• Redovno proveravajte obaveštenja za nova ažuriranja</p>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "Dobrodošli u SummaSummarum! 🎉",
      html: this.createEmailTemplate(
        "Dobrodošli u SummaSummarum!",
        content,
        additionalInfo
      ),
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email poslat za: ${userEmail}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("❌ Greška pri slanju welcome email-a:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
