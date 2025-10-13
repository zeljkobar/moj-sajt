// src/services/emailService.js
const { createTransporter } = require('../config/emailConfig');

class EmailService {
  constructor() {
    this.transporter = createTransporter();
  }

  // Get email address based on email type
  getEmailAddress(type, domain = 'summasummarum') {
    const domainSuffix = domain === 'mojradnik' ? '_MOJRADNIK' : '';

    switch (type) {
      case 'support':
        return (
          process.env[`EMAIL_SUPPORT${domainSuffix}`] || process.env.EMAIL_USER
        );
      case 'admin':
        return (
          process.env[`EMAIL_ADMIN${domainSuffix}`] || process.env.EMAIL_USER
        );
      case 'invoices':
        return (
          process.env[`EMAIL_INVOICES${domainSuffix}`] || process.env.EMAIL_USER
        );
      default:
        return process.env.EMAIL_USER;
    }
  }

  // Helper methods for specific domains
  getSummasummarumEmail(type) {
    return this.getEmailAddress(type, 'summasummarum');
  }

  getMojRadnikEmail(type) {
    return this.getEmailAddress(type, 'mojradnik');
  }

  // Osnovni template za email
  createEmailTemplate(title, content, additionalInfo = '') {
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
            : ''
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
        name: 'Firma',
        features: [
          'Kreiranje i upravljanje jednom firmom',
          'Evidencija radnika i pozicija',
          'Generiranje ugovora o radu',
          'Sistem pozajmnica',
          'Službene odluke i dokumenti',
        ],
      },
      agencija: {
        name: 'Agencija',
        features: [
          'Kreiranje neograničenog broja firmi',
          'Napredni izvještaji i analize',
          'PDV XML izvoz',
          'Automatske poreske prijave',
          'Upravljanje klijentima',
          'Sve funkcionalnosti firme i više',
        ],
      },
    };

    const role = roleInfo[userType] || roleInfo['firma'];

    const content = `
      <p style="font-size: 18px;"><strong>Dobrodošli, ${userName}!</strong></p>
      
      <p>Vaš račun je uspešno kreiran kao <strong>${
        role.name
      }</strong>. Sada imate pristup sledećim funkcionalnostima:</p>
      
      <ul style="background-color: #f8f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        ${role.features
          .map(
            feature => `<li style="margin: 8px 0; color: #333;">${feature}</li>`
          )
          .join('')}
      </ul>
      
      <p>Za početak rada, preporučujemo da:</p>
      <ol style="color: #555;">
        <li>Popunite svoj profil</li>
        <li>Kreirate prvu firmu</li>
        <li>Dodate osnovne podatke o radnicima</li>
      </ol>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${
          process.env.APP_URL || 'http://localhost:3000'
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
      from: this.getEmailAddress('support'), // Welcome emails from support
      to: userEmail,
      subject: 'Dobrodošli u SummaSummarum! 🎉',
      html: this.createEmailTemplate(
        'Dobrodošli u SummaSummarum!',
        content,
        additionalInfo
      ),
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email poslat za: ${userEmail}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Greška pri slanju welcome email-a:', error);
      return { success: false, error: error.message };
    }
  }

  // Password reset email
  async sendPasswordResetEmail(userEmail, userName, resetToken) {
    const resetUrl = `${
      process.env.APP_URL || 'http://localhost:3000'
    }/reset-password.html?token=${resetToken}`;

    const content = `
      <p style="font-size: 18px;"><strong>Zdravo, ${userName}!</strong></p>
      
      <p>Primili smo zahtev za reset vaše lozinke na SummaSummarum portalu.</p>
      
      <p>Da biste resetovali lozinku, kliknite na dugme ispod:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          🔒 Resetuj lozinku
        </a>
      </div>
      
      <p>Ili kopirajte sledeći link u vaš browser:</p>
      <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 14px;">
        ${resetUrl}
      </p>
      
      <p><strong>⚠️ Važne informacije:</strong></p>
      <ul style="color: #666;">
        <li>Ovaj link je valjan samo 2 sata</li>
        <li>Link možete koristiti samo jednom</li>
        <li>Ako niste tražili reset lozinke, ignorišite ovaj email</li>
      </ul>
    `;

    const additionalInfo = `
      <h4 style="color: #dc3545; margin-bottom: 10px;">🔐 Bezbednosne napomene:</h4>
      <p style="margin: 5px 0;">• Nikad ne delite vaš reset link sa drugim osobama</p>
      <p style="margin: 5px 0;">• Proverite da li je email adresa tačna: ${userEmail}</p>
      <p style="margin: 5px 0;">• Ako sumnjate na neovlašćen pristup, kontaktirajte podršku</p>
    `;

    const mailOptions = {
      from: this.getEmailAddress('support'), // Password reset from support
      to: userEmail,
      subject: 'SummaSummarum - Reset lozinke 🔒',
      html: this.createEmailTemplate(
        'Reset vaše lozinke',
        content,
        additionalInfo
      ),
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email poslat za: ${userEmail}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Greška pri slanju password reset email-a:', error);
      return { success: false, error: error.message };
    }
  }

  // Broadcast email - admin obaveštenje svim korisnicima
  async sendBroadcastEmail(userEmail, userName, subject, message) {
    console.log(`📢 Šaljem broadcast email za: ${userEmail}`);

    if (!this.transporter) {
      console.error('❌ Email transporter nije inicijalizovan');
      return { success: false, error: 'Email sistem nije konfigurisan' };
    }

    const content = `
      <h2 style="color: #667eea; margin-bottom: 20px;">📢 Obaveštenje za sve korisnike</h2>
      <p>Pozdrav <strong>${userName}</strong>,</p>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
        ${message}
      </div>
    `;

    const additionalInfo = `
      <p style="margin: 5px 0;">• Ovo je administratorsko obaveštenje</p>
      <p style="margin: 5px 0;">• Za pitanja kontaktirajte podršku</p>
      <p style="margin: 5px 0;">• Email adresa: ${process.env.EMAIL_USER}</p>
    `;

    const mailOptions = {
      from: this.getEmailAddress('admin'), // Broadcast emails from admin
      to: userEmail,
      subject: `[Summa Summarum] ${subject}`,
      html: this.createEmailTemplate(subject, content, additionalInfo),
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Broadcast email poslat za: ${userEmail}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Greška pri slanju broadcast email-a:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // SUBSCRIPTION EMAIL METHODS
  // ============================================================================

  // Obaveštenje o ažuriranju pretplate
  async sendSubscriptionUpdateNotification(email, data) {
    try {
      const { name, oldStatus, newStatus, reason } = data;

      const statusNames = {
        active: 'Aktivna',
        trial: 'Probni period',
        expired: 'Istekla',
        suspended: 'Suspendovana',
        gratis: 'Gratis',
      };

      const content = `
        <p>Poštovani/a ${name},</p>
        
        <p>Obaveštavamo Vas da je status Vaše pretplate ažuriran od strane administratora.</p>
        
        <p><strong>Detalji promene:</strong></p>
        <ul>
          <li>Prethodni status: <span style="color: #dc3545;">${
            statusNames[oldStatus] || oldStatus || 'Nepoznat'
          }</span></li>
          <li>Novi status: <span style="color: #28a745;">${
            statusNames[newStatus] || newStatus
          }</span></li>
          <li>Razlog: ${reason}</li>
        </ul>
        
        <p>Ukoliko imate pitanja u vezi sa ovom promenom, možete nas kontaktirati na email adresu podrška@summasummarum.me</p>
      `;

      const additionalInfo =
        newStatus === 'active'
          ? '<p style="color: #28a745; font-weight: bold;">✅ Vaša pretplata je sada aktivna i možete koristiti sve funkcionalnosti sistema.</p>'
          : newStatus === 'expired'
          ? '<p style="color: #dc3545; font-weight: bold;">⚠️ Vaša pretplata je istekla. Za nastavak korišćenja molimo obnovite pretplatu.</p>'
          : newStatus === 'suspended'
          ? '<p style="color: #ffc107; font-weight: bold;">⏸️ Vaš nalog je privremeno suspendovan. Kontaktirajte podršku za više informacija.</p>'
          : '';

      const htmlContent = this.createEmailTemplate(
        'Ažurirana pretplata',
        content,
        additionalInfo
      );

      const result = await this.transporter.sendMail({
        from: `"SummaSummarum Admin" <${this.getEmailAddress('admin')}>`,
        to: email,
        subject: '📋 Ažurirana pretplata - SummaSummarum',
        html: htmlContent,
      });

      console.log('✅ Email o ažuriranju pretplate poslat:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(
        '❌ Greška pri slanju email-a o ažuriranju pretplate:',
        error
      );
      return { success: false, error: error.message };
    }
  }

  // Podsetnik o pretplati
  async sendSubscriptionReminder(email, data) {
    try {
      const { name, status, trialEndDate, subscriptionEndDate } = data;

      const endDate = subscriptionEndDate || trialEndDate;
      const formattedEndDate = endDate
        ? new Date(endDate).toLocaleDateString('sr-RS')
        : 'Nepoznat';
      const daysLeft = endDate
        ? Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24))
        : 0;

      let content, additionalInfo;

      if (status === 'trial' || (trialEndDate && !subscriptionEndDate)) {
        content = `
          <p>Poštovani/a ${name},</p>
          
          <p>Ovo je podsetnik da Vam se probni period približava kraju.</p>
          
          <p><strong>Detalji Vašeg probnog perioda:</strong></p>
          <ul>
            <li>Datum isteka: <strong>${formattedEndDate}</strong></li>
            <li>Preostalo dana: <strong>${
              daysLeft > 0 ? daysLeft : 'Istekao'
            }</strong></li>
          </ul>
          
          <p>Da biste nastavili korišćenje svih funkcionalnosti, molimo vas da aktivirate pretplatu pre isteka probnog perioda.</p>
        `;

        additionalInfo =
          daysLeft <= 3
            ? '<p style="color: #dc3545; font-weight: bold;">⚠️ HITNO: Vaš probni period ističe za manje od 3 dana!</p>'
            : '<p style="color: #ffc107; font-weight: bold;">⏰ Probni period uskoro ističe. Aktivirajte pretplatu na vreme.</p>';
      } else {
        content = `
          <p>Poštovani/a ${name},</p>
          
          <p>Ovo je podsetnik u vezi sa Vašom pretplatom.</p>
          
          <p><strong>Detalji Vaše pretplate:</strong></p>
          <ul>
            <li>Status: <strong>${status}</strong></li>
            <li>Datum isteka: <strong>${formattedEndDate}</strong></li>
            <li>Preostalo dana: <strong>${
              daysLeft > 0 ? daysLeft : 'Istekla'
            }</strong></li>
          </ul>
          
          <p>Ukoliko imate pitanja, slobodno nas kontaktirajte.</p>
        `;

        additionalInfo =
          daysLeft <= 0
            ? '<p style="color: #dc3545; font-weight: bold;">🚫 Vaša pretplata je istekla. Molimo obnovite je za nastavak korišćenja.</p>'
            : daysLeft <= 7
            ? '<p style="color: #ffc107; font-weight: bold;">⚠️ Vaša pretplata ističe za manje od 7 dana!</p>'
            : '<p style="color: #17a2b8; font-weight: bold;">ℹ️ Ovo je podsetnik o statusu Vaše pretplate.</p>';
      }

      const htmlContent = this.createEmailTemplate(
        'Podsetnik o pretplati',
        content,
        additionalInfo
      );

      const result = await this.transporter.sendMail({
        from: `"SummaSummarum Podrška" <${this.getEmailAddress('support')}>`,
        to: email,
        subject: '⏰ Podsetnik o pretplati - SummaSummarum',
        html: htmlContent,
      });

      console.log('✅ Email podsetnik o pretplati poslat:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Greška pri slanju email podsetnika:', error);
      return { success: false, error: error.message };
    }
  }

  // Obaveštenje o isteku pretplate
  async sendSubscriptionExpiryNotification(email, data) {
    try {
      const { name, status, trialEndDate, subscriptionEndDate } = data;

      const endDate = subscriptionEndDate || trialEndDate;
      const formattedEndDate = endDate
        ? new Date(endDate).toLocaleDateString('sr-RS')
        : 'Nepoznat';
      const daysLeft = endDate
        ? Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24))
        : 0;

      const isTrialExpiring = trialEndDate && !subscriptionEndDate;

      const content = `
        <p>Poštovani/a ${name},</p>
        
        <p>Obaveštavamo Vas da ${
          isTrialExpiring ? 'Vaš probni period' : 'Vaša pretplata'
        } ${
        daysLeft === 0
          ? 'ističe danas'
          : `ističe za ${daysLeft} ${daysLeft === 1 ? 'dan' : 'dana'}`
      }.</p>
        
        <p><strong>Detalji:</strong></p>
        <ul>
          <li>Tip: <strong>${
            isTrialExpiring ? 'Probni period' : 'Pretplata'
          }</strong></li>
          <li>Datum isteka: <strong>${formattedEndDate}</strong></li>
          <li>Status: <strong>${
            daysLeft <= 0 ? 'Istekao' : `Ističe za ${daysLeft} dana`
          }</strong></li>
        </ul>
        
        ${
          isTrialExpiring
            ? '<p>Da biste nastavili korišćenje sistema, molimo aktivirajte pretplatu klikom na dugme ispod:</p>'
            : '<p>Da biste nastavili korišćenje sistema, molimo obnovite pretplatu:</p>'
        }
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${
            process.env.FRONTEND_URL || 'http://localhost:3000'
          }/pretplata" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            ${isTrialExpiring ? 'Aktiviraj pretplatu' : 'Obnovi pretplatu'}
          </a>
        </div>
      `;

      const additionalInfo =
        daysLeft <= 0
          ? '<p style="color: #dc3545; font-weight: bold;">🚫 HITNO: Pristup sistemu je blokiran do obnove pretplate!</p>'
          : daysLeft === 1
          ? '<p style="color: #dc3545; font-weight: bold;">⚠️ HITNO: Ostao je samo 1 dan!</p>'
          : '<p style="color: #ffc107; font-weight: bold;">⏰ Molimo obnovite na vreme da izbegnete prekid usluge.</p>';

      const htmlContent = this.createEmailTemplate(
        `${isTrialExpiring ? 'Probni period ističe' : 'Pretplata ističe'}`,
        content,
        additionalInfo
      );

      const result = await this.transporter.sendMail({
        from: `"SummaSummarum Sistem" <${this.getEmailAddress('support')}>`,
        to: email,
        subject: `🔔 ${
          isTrialExpiring ? 'Probni period ističe' : 'Pretplata ističe'
        } - SummaSummarum`,
        html: htmlContent,
      });

      console.log('✅ Email o isteku pretplate poslat:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Greška pri slanju email-a o isteku:', error);
      return { success: false, error: error.message };
    }
  }

  // Email notifikacija o brisanju oglasa od strane admin-a
  async sendOglasDeletedNotification(data) {
    try {
      const { toEmail, firmaNaziv, oglasNaslov, razlog, adminEmail } = data;

      const htmlContent = this.createEmailTemplate(
        'Obaveštenje o uklanjanju oglasa',
        `
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
          <p style="margin: 0; color: #856404;"><strong>⚠️ Vaš oglas je uklonjen sa platforme</strong></p>
        </div>

        <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">Poštovani,</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
          Obaveštavamo Vas da je Vaš oglas za posao uklonjen sa naše platforme od strane administratora.
        </p>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #495057; margin: 0 0 10px 0;">Detalji oglasa:</h3>
          <p style="margin: 5px 0; color: #6c757d;"><strong>Firma:</strong> ${firmaNaziv}</p>
          <p style="margin: 5px 0; color: #6c757d;"><strong>Naslov oglasa:</strong> ${oglasNaslov}</p>
          <p style="margin: 5px 0; color: #6c757d;"><strong>Razlog uklanjanja:</strong> ${razlog}</p>
        </div>

        <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
          Ukoliko smatrate da je oglas uklonjen greškom ili imate pitanja, molimo Vas da se obratite našoj podršci.
        </p>

        <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
          Hvala na razumevanju.
        </p>
        `,
        `
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            Za pitanja kontaktirajte: <a href="mailto:${adminEmail}" style="color: #007bff;">${adminEmail}</a>
          </p>
        </div>
        `
      );

      const result = await this.transporter.sendMail({
        from: `"Moj Radnik - Administracija" <admin@mojradnik.me>`,
        to: toEmail,
        subject: `⚠️ Obaveštenje o uklanjanju oglasa - ${oglasNaslov}`,
        html: htmlContent,
      });

      console.log('✅ Email o brisanju oglasa poslat:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Greška pri slanju email-a o brisanju oglasa:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
