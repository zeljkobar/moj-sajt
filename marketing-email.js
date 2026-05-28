// marketing-email.js - Funkcija za slanje marketing emaila

const fs = require('fs');
const path = require('path');
const { createTransporter } = require('./src/config/emailConfig');
const { executeQuery } = require('./src/config/database');

class MarketingEmailService {
  constructor() {
    this.transporter = createTransporter();
    this.templatesPath = path.join(__dirname, 'email-templates');
    this.templatePath = path.join(this.templatesPath, 'izvodi-automatizacija.html'); // default template
  }

  // Postavi template za slanje
  setTemplate(templateName) {
    this.templatePath = path.join(this.templatesPath, templateName);
    console.log('📧 Template postavljen na:', this.templatePath);
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
  personalizeTemplate(
    template,
    userData = {},
    emailId = null,
    campaignId = null
  ) {
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

    // NOVO: Personalizovani linkovi umesto tracking pixela
    if (userData.pib && campaignId) {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const personalizedUrl = `${baseUrl}/visit/${userData.pib}/campaign-${campaignId}`;

      console.log(
        `� Personalizovani URL za PIB ${userData.pib}: ${personalizedUrl}`
      );

      // Zameni sve instance osnovnih linkova sa personalizovanim
      personalizedTemplate = personalizedTemplate.replace(
        /href="https:\/\/www\.summasummarum\.me"/g,
        `href="${personalizedUrl}"`
      );

      personalizedTemplate = personalizedTemplate.replace(
        /href="http:\/\/localhost:3000"/g,
        `href="${personalizedUrl}"`
      );

      // Ukloni tracking pixel - više ne treba
      personalizedTemplate = personalizedTemplate.replace(
        '{{TRACKING_PIXEL_URL}}',
        ''
      );

      // Ukloni <img> tag tracking pixela
      personalizedTemplate = personalizedTemplate.replace(
        /<img[^>]*src="{{TRACKING_PIXEL_URL}}"[^>]*>/g,
        ''
      );
    } else {
      console.log(
        '⚠️ PIB ili campaignId nije prosleđen - koristiću osnovne linkove'
      );

      // Fallback na osnovne linkove
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      personalizedTemplate = personalizedTemplate.replace(
        '{{TRACKING_PIXEL_URL}}',
        ''
      );
    }

    // Finalna zamena placeholdera
    personalizedTemplate = personalizedTemplate.replace(
      /{{PERSONALIZED_URL}}/g,
      userData.pib && campaignId
        ? `${process.env.BASE_URL || 'https://www.summasummarum.me'}/visit/${
            userData.pib
          }/campaign-${campaignId}`
        : process.env.BASE_URL || 'https://www.summasummarum.me'
    );

    personalizedTemplate = personalizedTemplate.replace(
      /{{TRACKING_PIXEL_URL}}/g,
      ''
    );

    return personalizedTemplate;
  }

  // Pošalji marketing email jednom primaocu
  async sendMarketingEmail(
    recipientEmail,
    userData = {},
    campaignId = null,
    senderConfig = null
  ) {
    try {
      // Prvo dobijemo emailId iz baze ako je deo kampanje
      let emailId = null;
      console.log(
        `🔍 sendMarketingEmail pozvan za: ${recipientEmail}, campaignId: ${campaignId}`
      );

      if (campaignId) {
        const emailQuery = `SELECT id FROM marketing_emails WHERE campaign_id = ? AND email_address = ?`;
        console.log(
          `🔍 Tražim emailId u bazi: campaignId=${campaignId}, email=${recipientEmail}`
        );
        const emailResult = await executeQuery(emailQuery, [
          campaignId,
          recipientEmail,
        ]);
        console.log(`🔍 Rezultat pretrage emailId:`, emailResult);
        if (emailResult.length > 0) {
          emailId = emailResult[0].id;
          console.log(`✅ Pronašao emailId: ${emailId}`);
        } else {
          console.log(`❌ EmailId NIJE pronađen u bazi!`);
        }
      } else {
        console.log(`⚠️ CampaignId nije prosleđen`);
      }

      const template = this.loadTemplate();
      const personalizedTemplate = this.personalizeTemplate(
        template,
        userData,
        emailId,
        campaignId
      );

      // Konfiguracija pošaljioca
      let senderEmail = process.env.EMAIL_USER;
      let senderName = 'SummaSummarum Team';
      let subject =
        '📊 SummaSummarum.me - Revolucija u knjigovodstvu Crne Gore!';

      if (senderConfig) {
        senderEmail = senderConfig.email || senderEmail;
        senderName = senderConfig.name || senderName;
        subject = senderConfig.subject || subject;
      }

      const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: recipientEmail,
        subject: subject,
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

      // Ažuriraj per-firma statistike u emails tabeli
      if (userData && userData.pib) {
        try {
          await executeQuery(
            `UPDATE emails
             SET ukupno_poslato = ukupno_poslato + 1,
                 poslednji_email = NOW()
             WHERE TRIM(pib) = ?`,
            [String(userData.pib).trim()]
          );
        } catch (trackErr) {
          console.error('Greška pri ažuriranju email statistike za PIB:', userData.pib, trackErr);
        }
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
    delay = 500,
    campaignName = null,
    userId = null,
    senderConfig = null
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
        // Check if campaign was cancelled
        if (campaignId) {
          const cancelCheck = await this.checkCampaignCancelled(campaignId);
          if (cancelCheck) {
            console.log('⚠️ Kampanja prekinuta od strane korisnika');
            await this.setCampaignCancelled(campaignId);
            break;
          }
        }

        const recipient = recipients[i];
        const email =
          typeof recipient === 'string' ? recipient : recipient.email;
        const userData = typeof recipient === 'object' ? recipient : {};

        console.log(`📧 Šalje ${i + 1}/${recipients.length}: ${email}`);

        // Update current email being sent
        if (campaignId) {
          await this.updateCurrentEmail(campaignId, email);
        }

        const result = await this.sendMarketingEmail(
          email,
          userData,
          campaignId,
          senderConfig
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
        const cancelCheck = await this.checkCampaignCancelled(campaignId);
        if (cancelCheck) {
          await this.setCampaignCancelled(campaignId);
        } else {
          await this.completeCampaign(campaignId);
        }
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

  // NOVO: Slanje emailova u pozadini (kampanja već kreirana)
  async sendBulkMarketingEmailsBackground(
    recipients,
    delay = 500,
    campaignId,
    senderConfig = null
  ) {
    const results = [];

    try {
      console.log(
        `🚀 Započinje pozadinsko slanje za kampanju #${campaignId} na ${recipients.length} adresa...`
      );

      for (let i = 0; i < recipients.length; i++) {
        // Check if campaign was cancelled
        const cancelCheck = await this.checkCampaignCancelled(campaignId);
        if (cancelCheck) {
          console.log('⚠️ Kampanja prekinuta od strane korisnika');
          await this.setCampaignCancelled(campaignId);
          break;
        }

        const recipient = recipients[i];
        const email =
          typeof recipient === 'string' ? recipient : recipient.email;
        const userData = typeof recipient === 'object' ? recipient : {};

        console.log(`📧 Šalje ${i + 1}/${recipients.length}: ${email}`);

        // Update current email being sent
        await this.updateCurrentEmail(campaignId, email);

        const result = await this.sendMarketingEmail(
          email,
          userData,
          campaignId,
          senderConfig
        );
        results.push(result);

        // Pauza između mailova da ne opteretimo SMTP server
        if (i < recipients.length - 1) {
          console.log(`⏳ Pauza ${delay}ms...`);
          await this.sleep(delay);
        }
      }

      // Završi kampanju
      const cancelCheck = await this.checkCampaignCancelled(campaignId);
      if (cancelCheck) {
        await this.setCampaignCancelled(campaignId);
      } else {
        await this.completeCampaign(campaignId);
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      console.log(`\n📊 Rezultat pozadinskog slanja za kampanju #${campaignId}:`);
      console.log(`✅ Uspješno poslano: ${successful}`);
      console.log(`❌ Neuspješno: ${failed}`);
      console.log(`📈 Ukupno: ${results.length}`);

      return {
        campaignId,
        total: results.length,
        successful,
        failed,
        results,
      };
    } catch (error) {
      console.error('Greška u pozadinskom slanju:', error);
      // Ne bacaj error jer je ovo background proces
      // Umjesto toga, označi kampanju kao failed
      try {
        await this.setCampaignFailed(campaignId);
      } catch (dbError) {
        console.error('Greška pri označavanju kampanje kao neuspešne:', dbError);
      }
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
        SET status = 'completed', completed_at = NOW(), current_email = NULL 
        WHERE id = ?
      `;
      await executeQuery(query, [campaignId]);
    } catch (error) {
      console.error('Greška pri završavanju kampanje:', error);
    }
  }

  // Postavi kampanju kao neuspešnu
  async setCampaignFailed(campaignId) {
    try {
      const query = `
        UPDATE marketing_campaigns 
        SET status = 'failed', completed_at = NOW(), current_email = NULL 
        WHERE id = ?
      `;
      await executeQuery(query, [campaignId]);
      console.log(`❌ Kampanja #${campaignId} označena kao neuspješna`);
    } catch (error) {
      console.error('Greška pri postavljanju kampanje kao neuspešne:', error);
    }
  }

  // NEW: Check if campaign was cancelled
  async checkCampaignCancelled(campaignId) {
    try {
      const query = `SELECT cancel_requested FROM marketing_campaigns WHERE id = ?`;
      const result = await executeQuery(query, [campaignId]);
      return result[0]?.cancel_requested === 1;
    } catch (error) {
      console.error('Greška pri provjeri prekida kampanje:', error);
      return false;
    }
  }

  // NEW: Set campaign as cancelled
  async setCampaignCancelled(campaignId) {
    try {
      const query = `
        UPDATE marketing_campaigns 
        SET status = 'cancelled', completed_at = NOW(), current_email = NULL 
        WHERE id = ?
      `;
      await executeQuery(query, [campaignId]);
    } catch (error) {
      console.error('Greška pri postavljanju kampanje kao prekinute:', error);
    }
  }

  // NEW: Update current email being sent
  async updateCurrentEmail(campaignId, email) {
    try {
      const query = `
        UPDATE marketing_campaigns 
        SET current_email = ?, status = 'running'
        WHERE id = ?
      `;
      await executeQuery(query, [email, campaignId]);
    } catch (error) {
      console.error('Greška pri ažuriranju trenutnog emaila:', error);
    }
  }

  // NEW: Get campaign progress
  async getCampaignProgress(campaignId) {
    try {
      const campaignQuery = `
        SELECT 
          status,
          total_recipients,
          emails_sent,
          emails_failed,
          current_email,
          cancel_requested
        FROM marketing_campaigns 
        WHERE id = ?
      `;
      const result = await executeQuery(campaignQuery, [campaignId]);
      
      if (result.length === 0) {
        throw new Error('Kampanja nije pronađena');
      }

      const campaign = result[0];
      const total = campaign.total_recipients;
      const sent = campaign.emails_sent || 0;
      const failed = campaign.emails_failed || 0;
      const remaining = total - sent - failed;
      const percentage = total > 0 ? ((sent + failed) / total) * 100 : 0;

      return {
        total,
        sent,
        failed,
        remaining,
        percentage: Math.min(percentage, 100),
        current_email: campaign.current_email,
        status: campaign.cancel_requested ? 'cancelled' : campaign.status,
      };
    } catch (error) {
      console.error('Greška pri dobijanju progresa kampanje:', error);
      throw error;
    }
  }

  // NEW: Request campaign cancellation
  async requestCampaignCancellation(campaignId) {
    try {
      const query = `
        UPDATE marketing_campaigns 
        SET cancel_requested = 1 
        WHERE id = ? AND status = 'running'
      `;
      const result = await executeQuery(query, [campaignId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Greška pri zahtjevu za prekid kampanje:', error);
      throw error;
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
  async testEmail(testEmail = 'admin@summasummarum.me', senderConfig = null) {
    console.log(`🧪 Test slanje marketing emaila na: ${testEmail}`);

    const testData = {
      firstName: 'Testni Korisnik',
      companyName: 'Test d.o.o.',
    };

    return await this.sendMarketingEmail(
      testEmail,
      testData,
      null,
      senderConfig
    );
  }

  // Učitaj email listu iz CSV fajla
  loadEmailListFromCSV(csvFilePath) {
    try {
      const csvContent = fs.readFileSync(csvFilePath, 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());

      // Preskoči header liniju
      const dataLines = lines.slice(1);

      const recipients = dataLines
        .map(line => {
          const [email, firstName, lastName, companyName, position] = line
            .split(',')
            .map(field => field.trim().replace(/"/g, ''));
          return {
            email,
            firstName,
            lastName,
            companyName,
            position,
          };
        })
        .filter(recipient => recipient.email && recipient.email.includes('@'));

      return recipients;
    } catch (error) {
      console.error('Greška pri čitanju CSV fajla:', error);
      throw new Error('CSV fajl nije moguće učitati');
    }
  }

  // Lista dostupnih email listi (za sada vraća samo osnovne info)
  listAvailableLists() {
    return [
      {
        id: 'csv_upload',
        name: 'CSV Upload',
        description: 'Učitavanje email liste iz CSV fajla',
        format: 'email,firstName,lastName,companyName,position',
      },
    ];
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
