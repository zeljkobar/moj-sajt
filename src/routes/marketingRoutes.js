const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { executeQuery } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/roleAuth');
const MarketingEmailService = require('../../marketing-email');

const router = express.Router();
const ROOT_DIR = path.join(__dirname, '..', '..');

// Marketing Email API endpoints (samo za administratore)
const upload = multer({
  dest: 'email-lists/uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Dozvoljena su samo .xlsx i .csv fajlovi'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Email Admin API Endpoints
require('../../email-lists/check-new-pibs');
require('../../email-lists/join-excel-csv');
require('../../email-lists/check-duplicates');
require('../../email-lists/remove-duplicates');
require('../../email-lists/insert-new-companies');
require('../../email-lists/update-emails');
require('../../email-lists/read-emails');

// Test marketing email
router.post(
  '/api/marketing/test',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      const {
        email,
        firstName,
        companyName,
        senderEmail,
        senderName,
        subject,
      } = req.body;

      if (!email) {
        return res
          .status(400)
          .json({ success: false, error: 'Email je obavezan' });
      }

      const service = new MarketingEmailService();

      // Konfiguracija pošaljioca
      let senderConfig = null;
      if (senderEmail || senderName || subject) {
        senderConfig = {
          email: senderEmail,
          name: senderName,
          subject: subject,
        };
      }

      const result = await service.sendMarketingEmail(
        email,
        {
          firstName,
          companyName,
        },
        null,
        senderConfig
      );

      res.json(result);
    } catch (error) {
      console.error('Marketing test email error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Upload i pokreni marketing kampanju
router.post(
  '/api/marketing/campaign',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  upload.single('csvFile'),
  async (req, res) => {
    // Marketing campaign endpoint called

    try {
      const { testMode, campaignName, senderEmail, senderName, subject, template } =
        req.body;

      if (!req.file) {
        // No CSV file provided
        return res
          .status(400)
          .json({ success: false, error: 'CSV fajl je obavezan' });
      }

      const MarketingEmailService = require('../../marketing-email');
      const manager = new MarketingEmailService();
      
      // Postavi template ako je prosleđen
      if (template) {
        manager.setTemplate(template);
        console.log('📧 Koristi template:', template);
      }

      // Konfiguracija pošaljioca
      let senderConfig = null;
      if (senderEmail || senderName || subject) {
        senderConfig = {
          email: senderEmail,
          name: senderName,
          subject: subject,
        };
      }

      // Učitaj CSV fajl
      const recipients = manager.loadEmailListFromCSV(req.file.path);
      if (testMode === 'true') {
        // Test mod - šalje samo prvi email
        const service = new MarketingEmailService();
        const testRecipient = recipients[0];
        const result = await service.sendMarketingEmail(
          testRecipient.email,
          testRecipient,
          null,
          senderConfig
        );

        // Obriši privremeni fajl
        fs.unlinkSync(req.file.path);

        return res.json({
          success: true,
          testMode: true,
          recipient: testRecipient.email,
          result,
        });
      }

      // Kompletna kampanja sa tracking-om
      const service = new MarketingEmailService();
      const campaignTitle =
        campaignName || `Kampanja ${new Date().toISOString().split('T')[0]}`;
      
      // Kreiraj kampanju ID ODMAH i vrati odgovor
      const campaignId = await service.createCampaign(
        campaignTitle,
        '📊 SummaSummarum.me - Revolucija u knjigovodstvu Crne Gore!',
        recipients.length,
        req.user.id
      );

      // Dodaj sve email adrese u kampanju
      for (const recipient of recipients) {
        const email = typeof recipient === 'string' ? recipient : recipient.email;
        const firstName = typeof recipient === 'object' ? recipient.firstName : null;
        const companyName = typeof recipient === 'object' ? recipient.companyName : null;

        await service.addEmailToCampaign(
          campaignId,
          email,
          firstName,
          companyName
        );
      }

      console.log(`📋 Kampanja kreirana #${campaignId}, pokreće se u pozadini...`);

      // Obriši privremeni fajl
      fs.unlinkSync(req.file.path);

      // Vrati ODMAH odgovor sa campaignId
      res.json({
        success: true,
        campaign: {
          id: campaignId,
          name: campaignTitle,
          total: recipients.length,
          recipients: recipients.length,
        },
      });

      // Pokreni slanje emailova U POZADINI (ne čekaj rezultat)
      service.sendBulkMarketingEmailsBackground(
        recipients,
        2000,
        campaignId,
        senderConfig
      ).catch(error => {
        console.error('❌ Greška u pozadinskom slanju:', error);
      });

    } catch (error) {
      console.error('Marketing campaign error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Dobij dostupne email liste
router.get(
  '/api/marketing/lists',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  (req, res) => {
    try {
      const MarketingEmailService = require('../../marketing-email');
      const manager = new MarketingEmailService();
      const lists = manager.listAvailableLists();
      res.json({ success: true, lists });
    } catch (error) {
      console.error('Marketing lists error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Sačuvaj novi email template
router.post(
  '/api/marketing/save-template',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { fileName, content } = req.body;

      if (!fileName || !content) {
        return res.status(400).json({
          success: false,
          error: 'Naziv fajla i sadržaj su obavezni',
        });
      }

      // Validacija imena fajla - mora biti bezbedno
      const safeFileName = fileName.replace(/[^a-z0-9\-_.]/gi, '-');
      if (!safeFileName.endsWith('.html')) {
        return res.status(400).json({
          success: false,
          error: 'Fajl mora imati .html ekstenziju',
        });
      }

      const templatePath = path.join(
        ROOT_DIR,
        'email-templates',
        safeFileName
      );

      // Provjeri da li fajl već postoji
      if (fs.existsSync(templatePath)) {
        return res.status(400).json({
          success: false,
          error: 'Template sa tim imenom već postoji',
        });
      }

      // Sačuvaj fajl
      fs.writeFileSync(templatePath, content, 'utf8');

      res.json({
        success: true,
        fileName: safeFileName,
        message: 'Template uspješno sačuvan',
      });
    } catch (error) {
      console.error('Save template error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// NEW: Get campaign progress
router.get(
  '/api/marketing/campaign-progress/:campaignId',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      const MarketingEmailService = require('../../marketing-email');
      const service = new MarketingEmailService();
      
      const progress = await service.getCampaignProgress(campaignId);
      res.json(progress);
    } catch (error) {
      console.error('Campaign progress error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// NEW: Cancel campaign
router.post(
  '/api/marketing/cancel-campaign/:campaignId',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      const MarketingEmailService = require('../../marketing-email');
      const service = new MarketingEmailService();
      
      const cancelled = await service.requestCampaignCancellation(campaignId);
      
      if (cancelled) {
        res.json({ 
          success: true, 
          message: 'Kampanja će biti prekinuta nakon trenutnog emaila' 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: 'Kampanja nije pronađena ili nije aktivna' 
        });
      }
    } catch (error) {
      console.error('Cancel campaign error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// 📧 EMAIL ADMIN API ENDPOINTS
// Get email database statistics
router.get(
  '/api/email-admin/stats',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      const statsQuery = `
      SELECT 
        COUNT(*) as totalCompanies,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as validEmails,
        COUNT(CASE WHEN opted_in = 1 THEN 1 END) as optedIn,
        MAX(updated_at) as lastUpdate
      FROM emails
    `;

      const [stats] = await executeQuery(statsQuery);
      const emailCoverage = (
        (stats.validEmails / stats.totalCompanies) *
        100
      ).toFixed(1);

      res.json({
        success: true,
        stats: {
          totalCompanies: stats.totalCompanies,
          validEmails: stats.validEmails,
          emailCoverage: emailCoverage + '%',
          optedIn: stats.optedIn,
          lastUpdate: stats.lastUpdate
            ? new Date(stats.lastUpdate).toLocaleDateString('sr-RS')
            : 'N/A',
        },
      });
    } catch (error) {
      console.error('Email stats error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Check new PIBs against database
router.post(
  '/api/email-admin/check-new-pibs',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  upload.single('excelFile'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: 'Excel fajl je obavezan' });
      }

      // Require and use the check-new-pibs module function
      const { checkNewPibs } = require('../../email-lists/check-new-pibs');
      const result = await checkNewPibs(req.file.path);

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      // If there are new PIBs, provide download link for the clean file
      let downloadUrl = null;

      console.log('🔍 DEBUG - Result from check-new-pibs:', result);

      if (result && result.outputFile && fs.existsSync(result.outputFile)) {
        console.log('✅ Found outputFile:', result.outputFile);
        const filename = path.basename(result.outputFile);
        downloadUrl = `/api/email-admin/download-clean-file/${encodeURIComponent(
          filename
        )}`;
        console.log('✅ Generated downloadUrl:', downloadUrl);
      } else if (result && result.newPibs > 0) {
        console.log('🔄 Trying fallback method - looking for _NOVI file');
        // Try to find the file in uploads directory with _NOVI suffix
        const originalName = path.basename(req.file.path);
        const noviFileName = `${originalName}_NOVI.xlsx`;
        const uploadsPath = path.join(
          ROOT_DIR,
          'email-lists',
          'uploads',
          noviFileName
        );

        console.log('🔍 Looking for file at:', uploadsPath);

        if (fs.existsSync(uploadsPath)) {
          console.log('✅ Found file in uploads, moving to email-lists');
          // Move file to email-lists directory for download
          const emailListsPath = path.join(
            ROOT_DIR,
            'email-lists',
            noviFileName
          );
          fs.renameSync(uploadsPath, emailListsPath);
          downloadUrl = `/api/email-admin/download-clean-file/${encodeURIComponent(
            noviFileName
          )}`;
          console.log('✅ Generated downloadUrl (fallback):', downloadUrl);
        } else {
          console.log('❌ File not found at expected path');
        }
      } else {
        console.log('❌ No new PIBs or no result');
      }

      res.json({
        success: true,
        message: 'PIB provera završena',
        stats: result,
        downloadUrl: downloadUrl,
      });
    } catch (error) {
      console.error('Check PIBs error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Join Excel and CSV files
router.post(
  '/api/email-admin/join-files',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  upload.fields([{ name: 'excelFile' }, { name: 'csvFile' }]),
  async (req, res) => {
    try {
      if (!req.files || !req.files.excelFile || !req.files.csvFile) {
        return res
          .status(400)
          .json({ success: false, message: 'Potrebni su i Excel i CSV fajl' });
      }

      const { joinExcelCsv } = require('../../email-lists/join-excel-csv');
      const result = await joinExcelCsv(
        req.files.excelFile[0].path,
        req.files.csvFile[0].path
      );

      // Clean up uploaded files
      fs.unlinkSync(req.files.excelFile[0].path);
      fs.unlinkSync(req.files.csvFile[0].path);

      // Check if joined file was created and provide download link
      let downloadUrl = null;
      const joinedFilePath = path.join(
        ROOT_DIR,
        'email-lists',
        'KOMPLETNI_SPOJENI_PODACI.csv'
      );
      if (fs.existsSync(joinedFilePath)) {
        downloadUrl =
          '/api/email-admin/download-clean-file/KOMPLETNI_SPOJENI_PODACI.csv';
      }

      res.json({
        success: true,
        message: 'Fajlovi spojeni',
        stats: result,
        downloadUrl: downloadUrl,
      });
    } catch (error) {
      console.error('Join files error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Remove duplicates from processed data
router.post(
  '/api/email-admin/remove-duplicates',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { removeDuplicates } = require('../../email-lists/remove-duplicates');
      const result = await removeDuplicates();

      // Check for clean file
      let downloadUrl = null;
      const cleanFilePath = path.join(
        ROOT_DIR,
        'email-lists',
        'KOMPLETNI_SPOJENI_PODACI_CLEAN.csv'
      );
      if (fs.existsSync(cleanFilePath)) {
        downloadUrl =
          '/api/email-admin/download-clean-file/KOMPLETNI_SPOJENI_PODACI_CLEAN.csv';
      }

      res.json({
        success: true,
        message: 'Duplikati uklonjeni',
        stats: result,
        downloadUrl: downloadUrl,
      });
    } catch (error) {
      console.error('Remove duplicates error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Insert new companies into database
router.post(
  '/api/email-admin/insert-companies',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  upload.single('dataFile'),
  async (req, res) => {
    try {
      console.log('🔍 DEBUG insert-companies endpoint:');
      console.log('   req.file:', req.file);
      console.log('   req.body:', req.body);

      if (!req.file) {
        console.log('❌ No file received!');
        return res.status(400).json({
          success: false,
          message: 'Fajl je obavezan za dodavanje u bazu',
        });
      }

      console.log('✅ File received:', req.file.path);

      const {
        insertNewCompanies,
      } = require('../../email-lists/insert-new-companies');
      const result = await insertNewCompanies(req.file.path);

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        message: 'Firme dodane u bazu',
        stats: result,
      });
    } catch (error) {
      console.error('Insert companies error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Update existing email records
router.post(
  '/api/email-admin/update-emails',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  upload.single('csvFile'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: 'CSV fajl je obavezan' });
      }

      const { updateEmailData } = require('../../email-lists/update-emails');
      const result = await updateEmailData(req.file.path);

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        message: 'Email-ovi ažurirani',
        stats: result,
      });
    } catch (error) {
      console.error('Update emails error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Download clean Excel file (only new PIBs)
router.get(
  '/api/email-admin/download-clean-file/:filename',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  (req, res) => {
    try {
      const filename = decodeURIComponent(req.params.filename);

      // Try email-lists folder first, then uploads folder
      let filePath = path.join(ROOT_DIR, 'email-lists', filename);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(ROOT_DIR, 'email-lists', 'uploads', filename);
      }

      // Security check - make sure file is in email-lists directory tree
      const emailListsDir = path.join(ROOT_DIR, 'email-lists');
      if (!filePath.startsWith(emailListsDir)) {
        return res
          .status(400)
          .json({ success: false, message: 'Neispravna putanja fajla' });
      }

      if (!fs.existsSync(filePath)) {
        return res
          .status(404)
          .json({ success: false, message: 'Fajl nije pronađen' });
      }

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      // Clean up file after download
      fileStream.on('end', () => {
        setTimeout(() => {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.log('Could not delete temp file:', err.message);
          }
        }, 5000); // Delete after 5 seconds
      });
    } catch (error) {
      console.error('Download clean file error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Export email database to CSV
router.get(
  '/api/email-admin/export-csv',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      const emails = await executeQuery(`
        SELECT pib, naziv, grad, email, telefon, web, kd, tip_firme, kategorija_prihoda, 
               opted_in, created_at, updated_at 
        FROM emails 
        ORDER BY naziv
      `);

      // Generate CSV content
      const csvHeader =
        'PIB,Naziv,Grad,Email,Telefon,Web,KD,Tip Firme,Kategorija Prihoda,Opted In,Kreiran,Ažuriran\n';
      const csvContent = emails
        .map(
          row =>
            `"${row.pib}","${row.naziv || ''}","${row.grad || ''}","${
              row.email || ''
            }","${row.telefon || ''}","${row.web || ''}","${row.kd || ''}","${
              row.tip_firme || ''
            }","${row.kategorija_prihoda || ''}","${row.opted_in}","${
              row.created_at || ''
            }","${row.updated_at || ''}"`
        )
        .join('\n');

      const csv = csvHeader + csvContent;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="email_baza_${
          new Date().toISOString().split('T')[0]
        }.csv"`
      );
      res.send(csv);
    } catch (error) {
      console.error('Export CSV error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Dobij marketing statistike (javno dostupno za sada)
router.get('/api/marketing/stats', async (req, res) => {
  try {
    const service = new MarketingEmailService();
    const stats = await service.getStats();

    res.json({
      totalSent: stats.total_emails_sent || 0,
      successRate: `${stats.overall_success_rate || 0}%`,
      totalCampaigns: stats.total_campaigns || 0,
      lastUpdated: stats.last_updated,
    });
  } catch (error) {
    console.error('Marketing stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dobij trenutnu aktivnu kampanju (running status)
router.get(
  '/api/marketing/campaigns/running',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { executeQuery } = require('../config/database');
      const query = `
        SELECT id, campaign_name, total_recipients, emails_sent, emails_failed, created_at, status
        FROM marketing_campaigns 
        WHERE status = 'running'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const campaigns = await executeQuery(query);
      
      if (campaigns.length > 0) {
        res.json({ success: true, campaign: campaigns[0] });
      } else {
        res.json({ success: true, campaign: null });
      }
    } catch (error) {
      console.error('Running campaign check error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Dobij listu svih kampanja
router.get(
  '/api/marketing/campaigns',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { executeQuery } = require('../config/database');
      const query = `
        SELECT 
          c.id, c.campaign_name, c.subject, c.total_recipients, c.emails_sent, 
          c.emails_failed, c.success_rate, c.created_at, c.completed_at, c.status,
          COUNT(e.opened_at) as emails_opened
        FROM marketing_campaigns c
        LEFT JOIN marketing_emails e ON c.id = e.campaign_id AND e.opened_at IS NOT NULL
        GROUP BY c.id
        ORDER BY c.created_at DESC 
        LIMIT 50
      `;
      const campaigns = await executeQuery(query);
      res.json({ success: true, campaigns });
    } catch (error) {
      console.error('Campaigns list error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Dobij detalje kampanje
router.get(
  '/api/marketing/campaigns/:id',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { executeQuery } = require('../config/database');
      const campaignId = req.params.id;

      // Osnovni podaci kampanje
      const campaignQuery = `
        SELECT * FROM marketing_campaigns WHERE id = ?
      `;
      const campaign = await executeQuery(campaignQuery, [campaignId]);

      if (campaign.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: 'Kampanja nije pronađena' });
      }

      // Email lista kampanje
      const emailsQuery = `
        SELECT id, email_address, recipient_name, company_name, status, 
               error_message, sent_at, created_at,
               opened_at, open_count, user_agent, ip_address
        FROM marketing_emails 
        WHERE campaign_id = ? 
        ORDER BY created_at DESC
      `;
      const emails = await executeQuery(emailsQuery, [campaignId]);

      res.json({
        success: true,
        campaign: campaign[0],
        emails,
      });
    } catch (error) {
      console.error('Campaign details error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Email tracking endpoint - tracking pixel
router.get('/api/marketing/track/open/:emailId', async (req, res) => {
  try {
    const emailId = req.params.emailId;
    const userAgent = req.get('User-Agent') || '';
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    // Ažuriraj email kao otvoren
    const updateQuery = `
      UPDATE marketing_emails 
      SET 
        opened_at = COALESCE(opened_at, NOW()), 
        open_count = open_count + 1,
        user_agent = ?,
        ip_address = ?
      WHERE id = ?
    `;
    await executeQuery(updateQuery, [userAgent, ipAddress, emailId]);

    // Ažuriraj statistike kampanje
    const campaignQuery = `
      SELECT campaign_id FROM marketing_emails WHERE id = ?
    `;
    const campaignResult = await executeQuery(campaignQuery, [emailId]);

    if (campaignResult.length > 0) {
      const marketingService = new MarketingEmailService();
      await marketingService.updateCampaignStats(campaignResult[0].campaign_id);
    }

    // Vrati 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    res.set({
      'Content-Type': 'image/png',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    res.end(pixel);

    // Email tracking recorded
  } catch (error) {
    console.error('Email tracking error:', error);
    // I u slučaju greške vrati pixel da ne pokvarimo email
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': pixel.length,
    });
    res.end(pixel);
  }
});

// Personalizovano tracking sa PIB-om - /visit/{PIB}/{campaign}
router.get('/visit/:pib/:campaign', async (req, res) => {
  try {
    const { pib, campaign } = req.params;
    const userAgent = req.get('User-Agent') || '';
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    console.log(`🔍 Personalized visit: PIB ${pib} from campaign ${campaign}`);

    // 1. Pronađi firmu po PIB-u
    const firma = await executeQuery(
      `
      SELECT id, naziv, email, grad 
      FROM emails 
      WHERE pib = ? 
      LIMIT 1
    `,
      [pib]
    );

    // 2. Logiraj klik u marketing_emails tabelu
    if (campaign.startsWith('campaign-')) {
      const campaignId = campaign.replace('campaign-', '');
      await executeQuery(
        `
        UPDATE marketing_emails 
        SET 
          clicked_at = COALESCE(clicked_at, NOW()),
          click_count = click_count + 1,
          last_click_url = ?,
          user_agent = ?,
          ip_address = ?
        WHERE campaign_id = ? AND email_address IN (
          SELECT email FROM emails WHERE pib = ?
        )
      `,
        [req.url, userAgent, ipAddress, campaignId, pib]
      );

      console.log(`✅ PIB ${pib} click logged for campaign ${campaignId}`);
    }

    // 3. Redirect na glavnu stranicu
    const firmaNaziv = firma.length > 0 ? firma[0].naziv : 'Unknown';
    console.log(`🎯 PIB ${pib} (${firmaNaziv}) redirecting to homepage`);

    res.redirect('/?from=email&pib=' + pib);
  } catch (error) {
    console.error('Personalized tracking error:', error);
    res.redirect('/');
  }
});


module.exports = router;
