// marketing-email.js - Funkcija za slanje marketing emaila

const fs = require('fs');
const path = require('path');
const { createTransporter } = require('./src/config/emailConfig');
const { executeQuery } = require('./src/config/database');

class MarketingEmailService {
  constructor() {
    this.transporter = createTransporter();
    this.templatePath = path.join(
      __dirname,
      'public',
      'email-marketing-template.html'
    );
  }

  // Učitaj HTML template
  loadTemplate() {
    try {
      return fs.readFileSync(this.templatePath, 'utf8');
    } catch (error) {
      console.error('Greška pri učitavanju template-a:', error);
      throw new Error('Template fajl nije pronađen');
    }
  }

  // Personalizuj template za korisnika
  personalizeTemplate(template, userData = {}) {
    let personalizedTemplate = template;

    // Zamijeni placeholder-e ako postoje
    if (userData.firstName) {
      personalizedTemplate = personalizedTemplate.replace(
        'Poštovane koleginice i kolege,',
        `Poštovani/a ${userData.firstName},`
      );
    }

    if (userData.companyName) {
      personalizedTemplate = personalizedTemplate.replace(
        'Predstavljam vam',
        `Kao partner vaše kompanije ${userData.companyName}, predstavljam vam`
      );
    }

    return personalizedTemplate;
  }

  // Pošalji marketing email jednom primaocu
  async sendMarketingEmail(recipientEmail, userData = {}, campaignId = null) {
    try {
      const template = this.loadTemplate();
      const personalizedTemplate = this.personalizeTemplate(template, userData);

      const mailOptions = {
        from: `"SummaSummarum Team" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: '📊 SummaSummarum.me - Revolucija u knjigovodstvu Crne Gore!',
        html: personalizedTemplate,
        // Dodaj text verziju za bolje deliverability
        text: this.createTextVersion(userData),
      };

      const result = await this.transporter.sendMail(mailOptions);

      console.log(`✅ Marketing email poslat na: ${recipientEmail}`);
      console.log(`Message ID: ${result.messageId}`);

      // Označi kao poslat u bazi ako je deo kampanje
      if (campaignId) {
        await this.markEmailAsSent(
          campaignId,
          recipientEmail,
          result.messageId
        );
      }

      return {
        success: true,
        messageId: result.messageId,
        recipient: recipientEmail,
      };
    } catch (error) {
      console.error(`❌ Greška pri slanju maila na ${recipientEmail}:`, error);

      // Označi kao neuspešan u bazi ako je deo kampanje
      if (campaignId) {
        await this.markEmailAsFailed(campaignId, recipientEmail, error.message);
      }

      return {
        success: false,
        error: error.message,
        recipient: recipientEmail,
      };
    }
  }

  // Masovno slanje emailova sa tracking-om
  async sendBulkMarketingEmails(
    recipients,
    delay = 2000,
    campaignName = null,
    userId = null
  ) {
    const results = [];
    let campaignId = null;

    try {
      // Kreiraj kampanju
      if (campaignName) {
        campaignId = await this.createCampaign(
          campaignName,
          '📊 SummaSummarum.me - Revolucija u knjigovodstvu Crne Gore!',
          recipients.length,
          userId
        );

        // Dodaj sve email adrese u kampanju
        for (const recipient of recipients) {
          const email =
            typeof recipient === 'string' ? recipient : recipient.email;
          const firstName =
            typeof recipient === 'object' ? recipient.firstName : null;
          const companyName =
            typeof recipient === 'object' ? recipient.companyName : null;

          await this.addEmailToCampaign(
            campaignId,
            email,
            firstName,
            companyName
          );
        }

        console.log(`📋 Kreirana kampanja #${campaignId}: ${campaignName}`);
      }

      console.log(
        `🚀 Započinje masovno slanje na ${recipients.length} adresa...`
      );

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        const email =
          typeof recipient === 'string' ? recipient : recipient.email;
        const userData = typeof recipient === 'object' ? recipient : {};

        console.log(`📧 Šalje ${i + 1}/${recipients.length}: ${email}`);

        const result = await this.sendMarketingEmail(
          email,
          userData,
          campaignId
        );
        results.push(result);

        // Pauza između mailova da ne opteretimo SMTP server
        if (i < recipients.length - 1) {
          console.log(`⏳ Pauza ${delay}ms...`);
          await this.sleep(delay);
        }
      }

      // Završi kampanju
      if (campaignId) {
        await this.completeCampaign(campaignId);
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      console.log(`\n📊 Rezultat masovnog slanja:`);
      console.log(`✅ Uspješno poslano: ${successful}`);
      console.log(`❌ Neuspješno: ${failed}`);
      console.log(`📈 Ukupno: ${results.length}`);

      if (campaignId) {
        console.log(`🎯 Kampanja ID: ${campaignId}`);
      }

      return {
        campaignId,
        total: results.length,
        successful,
        failed,
        results,
      };
    } catch (error) {
      console.error('Greška u bulk slanju:', error);
      throw error;
    }
  }

  // Kreiraj text verziju emaila
  createTextVersion(userData = {}) {
    const greeting = userData.firstName
      ? `Poštovani/a ${userData.firstName},`
      : 'Poštovane koleginice i kolege,';

    return `
${greeting}

Predstavljam vam summasummarum.me — revolucionarni online alat koji drastično olakšava i ubrzava sve knjigovodstvene obaveze.

KLJUČNE FUNKCIONALNOSTI:
✓ Jedan unos → više dokumenata: ugovor o radu, djelu, dopunskom radu, otkaz, JPR obrazac, raspored smjena, godišnji odmori...
✓ Masovno kreiranje PDV 0 prijava: sve „mrtve" firme odjednom — bez gubljenja vremena
✓ Porez na dobit: automatski obračun i izvoz u XML format spreman za predaju
✓ PDV prijave: sistem generiše i izvozi XML bez ručnog popunjavanja
✓ Praćenje ugovora: automatski podsjetnici kad koji ugovor ističe
✓ Obračun zaliha: jednostavno, tačno i automatski

DEMONSTRACIJE:
- Izvoz PDV prijava za firme sa PDV 0: https://youtu.be/kgQcmPLgHqg
- Kreiranje otkaza i priprema JPR obrasca: https://youtu.be/DQvgirIUoNM

Sajt je trenutno POTPUNO BESPLATAN za korišćenje!

Pristupite sajtu: https://summasummarum.me

Za pitanja i pomoć:
Željko Barjaktarević
Email: admin@summasummarum.me
Telefon: +382 67 440 040

Srdačno,
SummaSummarum Team
    `.trim();
  }

  // Helper funkcija za pauzu
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Kreiranje nove kampanje
  async createCampaign(campaignName, subject, totalRecipients, userId = null) {
    try {
      const query = `
        INSERT INTO marketing_campaigns 
        (campaign_name, subject, total_recipients, created_by) 
        VALUES (?, ?, ?, ?)
      `;
      const result = await executeQuery(query, [
        campaignName,
        subject,
        totalRecipients,
        userId,
      ]);
      return result.insertId;
    } catch (error) {
      console.error('Greška pri kreiranju kampanje:', error);
      throw error;
    }
  }

  // Dodavanje email-a u kampanju
  async addEmailToCampaign(
    campaignId,
    emailAddress,
    recipientName = null,
    companyName = null
  ) {
    try {
      const query = `
        INSERT INTO marketing_emails 
        (campaign_id, email_address, recipient_name, company_name, status) 
        VALUES (?, ?, ?, ?, 'pending')
      `;
      await executeQuery(query, [
        campaignId,
        emailAddress,
        recipientName,
        companyName,
      ]);
    } catch (error) {
      console.error('Greška pri dodavanju email-a u kampanju:', error);
      throw error;
    }
  }

  // Označavanje email-a kao poslatog
  async markEmailAsSent(campaignId, emailAddress, messageId = null) {
    try {
      const query = `
        UPDATE marketing_emails 
        SET status = 'sent', sent_at = NOW() 
        WHERE campaign_id = ? AND email_address = ?
      `;
      await executeQuery(query, [campaignId, emailAddress]);

      // Ažuriraj kampanju statistike
      await this.updateCampaignStats(campaignId);
    } catch (error) {
      console.error('Greška pri označavanju email-a kao poslat:', error);
    }
  }

  // Označavanje email-a kao neuspešnog
  async markEmailAsFailed(campaignId, emailAddress, errorMessage) {
    try {
      const query = `
        UPDATE marketing_emails 
        SET status = 'failed', error_message = ? 
        WHERE campaign_id = ? AND email_address = ?
      `;
      await executeQuery(query, [errorMessage, campaignId, emailAddress]);

      // Ažuriraj kampanju statistike
      await this.updateCampaignStats(campaignId);
    } catch (error) {
      console.error('Greška pri označavanju email-a kao neuspešan:', error);
    }
  }

  // Ažuriranje statistika kampanje
  async updateCampaignStats(campaignId) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM marketing_emails 
        WHERE campaign_id = ?
      `;
      const stats = await executeQuery(statsQuery, [campaignId]);
      const row = stats[0];

      const successRate =
        row.total > 0 ? ((row.sent / row.total) * 100).toFixed(2) : 0;

      const updateQuery = `
        UPDATE marketing_campaigns 
        SET emails_sent = ?, emails_failed = ?, success_rate = ?
        WHERE id = ?
      `;
      await executeQuery(updateQuery, [
        row.sent,
        row.failed,
        successRate,
        campaignId,
      ]);

      // Ažuriraj globalne statistike
      await this.updateGlobalStats();
    } catch (error) {
      console.error('Greška pri ažuriranju statistika kampanje:', error);
    }
  }

  // Završavanje kampanje
  async completeCampaign(campaignId) {
    try {
      const query = `
        UPDATE marketing_campaigns 
        SET status = 'completed', completed_at = NOW() 
        WHERE id = ?
      `;
      await executeQuery(query, [campaignId]);
    } catch (error) {
      console.error('Greška pri završavanju kampanje:', error);
    }
  }

  // Ažuriranje globalnih statistika
  async updateGlobalStats() {
    try {
      const statsQuery = `
        SELECT 
          COALESCE(SUM(emails_sent), 0) as total_sent,
          COUNT(*) as total_campaigns,
          COALESCE(AVG(success_rate), 0) as avg_success_rate
        FROM marketing_campaigns
      `;
      const stats = await executeQuery(statsQuery);
      const row = stats[0];

      const updateQuery = `
        UPDATE marketing_stats 
        SET 
          total_emails_sent = ?, 
          total_campaigns = ?, 
          overall_success_rate = ?,
          last_updated = NOW()
        WHERE id = 1
      `;
      await executeQuery(updateQuery, [
        row.total_sent,
        row.total_campaigns,
        row.avg_success_rate,
      ]);
    } catch (error) {
      console.error('Greška pri ažuriranju globalnih statistika:', error);
    }
  }

  // Dobijanje statistika
  async getStats() {
    try {
      const query = `SELECT * FROM marketing_stats WHERE id = 1`;
      const result = await executeQuery(query);
      return (
        result[0] || {
          total_emails_sent: 0,
          total_campaigns: 0,
          overall_success_rate: 0,
        }
      );
    } catch (error) {
      console.error('Greška pri dobijanju statistika:', error);
      return {
        total_emails_sent: 0,
        total_campaigns: 0,
        overall_success_rate: 0,
      };
    }
  }

  // Test funkcija
  async testEmail(testEmail = 'admin@summasummarum.me') {
    console.log(`🧪 Test slanje marketing emaila na: ${testEmail}`);

    const testData = {
      firstName: 'Testni Korisnik',
      companyName: 'Test d.o.o.',
    };

    return await this.sendMarketingEmail(testEmail, testData);
  }
}

module.exports = MarketingEmailService;

// CLI upotreba
if (require.main === module) {
  const service = new MarketingEmailService();

  // Izvršava se samo kad se direktno pozove fajl
  const command = process.argv[2];

  if (command === 'test') {
    const testEmail = process.argv[3] || 'admin@summasummarum.me';
    service
      .testEmail(testEmail)
      .then(result => {
        console.log('Test rezultat:', result);
        process.exit(0);
      })
      .catch(error => {
        console.error('Test greška:', error);
        process.exit(1);
      });
  } else if (command === 'bulk') {
    // Primjer bulk slanja
    const recipients = [
      {
        email: 'test1@example.com',
        firstName: 'Ana',
        companyName: 'Ana d.o.o.',
      },
      {
        email: 'test2@example.com',
        firstName: 'Marko',
        companyName: 'Marko Grupa',
      },
      'test3@example.com', // Samo email bez personalnih podataka
    ];

    service
      .sendBulkMarketingEmails(recipients, 3000)
      .then(result => {
        console.log('Bulk rezultat:', result);
        process.exit(0);
      })
      .catch(error => {
        console.error('Bulk greška:', error);
        process.exit(1);
      });
  } else {
    console.log(`
Upotreba:
  node marketing-email.js test [email]     - Test slanje
  node marketing-email.js bulk           - Bulk slanje (test lista)
    `);
  }
}
