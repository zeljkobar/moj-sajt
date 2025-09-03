// email-campaign.js - Upravljanje marketing kampanjama

const MarketingEmailService = require('./marketing-email');
const fs = require('fs');
const path = require('path');

class EmailCampaignManager {
  constructor() {
    this.service = new MarketingEmailService();
    this.listsDir = path.join(__dirname, 'email-lists');
    this.resultsDir = path.join(__dirname, 'campaign-results');

    // Kreiraj direktorije ako ne postoje
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.listsDir, this.resultsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Kreiran direktorij: ${dir}`);
      }
    });
  }

  // Učitaj email listu iz CSV fajla
  loadEmailListFromCSV(filePath) {
    try {
      const csvContent = fs.readFileSync(filePath, 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      const header = lines[0].split(',').map(col => col.trim());

      const recipients = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(val => val.trim());
        const recipient = {};

        header.forEach((col, index) => {
          if (values[index]) {
            recipient[col.toLowerCase()] = values[index];
          }
        });

        if (recipient.email) {
          recipients.push(recipient);
        }
      }

      console.log(
        `📋 Učitano ${recipients.length} email adresa iz ${filePath}`
      );
      return recipients;
    } catch (error) {
      console.error('Greška pri učitavanju CSV:', error);
      throw error;
    }
  }

  // Sačuvaj email listu u CSV format
  saveEmailListToCSV(recipients, fileName) {
    try {
      const filePath = path.join(this.listsDir, fileName);

      // Kreiraj header
      const allKeys = [...new Set(recipients.flatMap(r => Object.keys(r)))];
      const header = allKeys.join(',');

      // Kreiraj redove
      const rows = recipients.map(recipient => {
        return allKeys.map(key => recipient[key] || '').join(',');
      });

      const csvContent = [header, ...rows].join('\n');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      console.log(`💾 Lista sačuvana: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('Greška pri čuvanju CSV:', error);
      throw error;
    }
  }

  // Kreiraj demo email listu
  createDemoList() {
    const demoRecipients = [
      {
        email: 'ana.petrovic@example.com',
        firstName: 'Ana',
        lastName: 'Petrović',
        companyName: 'Petrović Consulting d.o.o.',
        city: 'Podgorica',
        industry: 'Računovodstvo',
      },
      {
        email: 'marko.nikolic@example.com',
        firstName: 'Marko',
        lastName: 'Nikolić',
        companyName: 'Nikolić Finance',
        city: 'Nikšić',
        industry: 'Finansije',
      },
      {
        email: 'jelena.milic@example.com',
        firstName: 'Jelena',
        lastName: 'Milić',
        companyName: 'Milić Audit',
        city: 'Bar',
        industry: 'Revizija',
      },
      {
        email: 'stefan.popovic@example.com',
        firstName: 'Stefan',
        lastName: 'Popović',
        companyName: 'Popović Books d.o.o.',
        city: 'Cetinje',
        industry: 'Knjigovodstvo',
      },
      {
        email: 'milica.jovanovic@example.com',
        firstName: 'Milica',
        lastName: 'Jovanović',
        companyName: 'Jovanović Tax Solutions',
        city: 'Pljevlja',
        industry: 'Poreski savjeti',
      },
    ];

    return this.saveEmailListToCSV(demoRecipients, 'demo-list.csv');
  }

  // Pokreni marketing kampanju
  async runCampaign(listName, options = {}) {
    try {
      const listPath = path.join(this.listsDir, listName);

      if (!fs.existsSync(listPath)) {
        throw new Error(`Lista ${listName} ne postoji u ${this.listsDir}`);
      }

      console.log(`🚀 Pokretanje kampanje sa listom: ${listName}`);

      const recipients = this.loadEmailListFromCSV(listPath);

      // Opcije kampanje
      const campaignOptions = {
        delay: options.delay || 3000, // 3 sekunde između emailova
        batchSize: options.batchSize || 10, // 10 emailova po batch-u
        testMode: options.testMode || false,
        campaignName:
          options.campaignName ||
          `Kampanja ${listName} - ${new Date().toISOString().split('T')[0]}`,
        userId: options.userId || null,
      };

      if (campaignOptions.testMode) {
        console.log('🧪 TEST MOD - šalje se samo prvi email iz liste');
        const testRecipient = recipients[0];
        const result = await this.service.sendMarketingEmail(
          testRecipient.email,
          testRecipient
        );
        return { testMode: true, result };
      }

      // Podjeli u batch-ove
      const batches = [];
      for (let i = 0; i < recipients.length; i += campaignOptions.batchSize) {
        batches.push(recipients.slice(i, i + campaignOptions.batchSize));
      }

      console.log(
        `📦 Podijeljeno u ${batches.length} batch-a od ${campaignOptions.batchSize} emailova`
      );

      const allResults = [];

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        console.log(
          `\n📧 Batch ${batchIndex + 1}/${batches.length} (${
            batch.length
          } emailova)`
        );

        const batchResults = await this.service.sendBulkMarketingEmails(
          batch,
          campaignOptions.delay,
          `${campaignOptions.campaignName} - Batch ${batchIndex + 1}`,
          campaignOptions.userId
        );

        allResults.push(...batchResults.results);

        // Pauza između batch-a
        if (batchIndex < batches.length - 1) {
          console.log(`⏳ Pauza između batch-a: 30 sekundi...`);
          await this.service.sleep(30000);
        }
      }

      // Sačuvaj rezultate
      const campaignResult = {
        campaignName: listName,
        timestamp: new Date().toISOString(),
        totalEmails: recipients.length,
        successful: allResults.filter(r => r.success).length,
        failed: allResults.filter(r => !r.success).length,
        results: allResults,
        options: campaignOptions,
      };

      const resultFileName = `campaign-${Date.now()}.json`;
      const resultPath = path.join(this.resultsDir, resultFileName);
      fs.writeFileSync(resultPath, JSON.stringify(campaignResult, null, 2));

      console.log(`\n📊 Kampanja završena!`);
      console.log(`💾 Rezultati sačuvani: ${resultPath}`);

      return campaignResult;
    } catch (error) {
      console.error('❌ Greška u kampanji:', error);
      throw error;
    }
  }

  // Lista dostupnih email lista
  listAvailableLists() {
    try {
      const files = fs
        .readdirSync(this.listsDir)
        .filter(file => file.endsWith('.csv'));

      console.log('\n📋 Dostupne email liste:');
      files.forEach((file, index) => {
        const filePath = path.join(this.listsDir, file);
        const stats = fs.statSync(filePath);
        console.log(
          `${index + 1}. ${file} (${
            stats.size
          } bytes, ${stats.mtime.toLocaleDateString()})`
        );
      });

      return files;
    } catch (error) {
      console.error('Greška pri listanju fajlova:', error);
      return [];
    }
  }

  // Prikaži rezultate kampanje
  showCampaignResults(resultFileName) {
    try {
      const resultPath = path.join(this.resultsDir, resultFileName);
      const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));

      console.log(`\n📊 Rezultati kampanje: ${result.campaignName}`);
      console.log(`📅 Datum: ${new Date(result.timestamp).toLocaleString()}`);
      console.log(`📧 Ukupno emailova: ${result.totalEmails}`);
      console.log(`✅ Uspješno: ${result.successful}`);
      console.log(`❌ Neuspješno: ${result.failed}`);
      console.log(
        `📈 Success rate: ${(
          (result.successful / result.totalEmails) *
          100
        ).toFixed(1)}%`
      );

      // Prikaži greške ako postoje
      const errors = result.results.filter(r => !r.success);
      if (errors.length > 0) {
        console.log('\n❌ Greške:');
        errors.forEach(error => {
          console.log(`  - ${error.recipient}: ${error.error}`);
        });
      }

      return result;
    } catch (error) {
      console.error('Greška pri čitanju rezultata:', error);
      throw error;
    }
  }
}

module.exports = EmailCampaignManager;

// CLI upotreba
if (require.main === module) {
  const manager = new EmailCampaignManager();
  const command = process.argv[2];

  switch (command) {
    case 'demo':
      console.log('🎯 Kreiranje demo liste...');
      manager.createDemoList();
      break;

    case 'list':
      manager.listAvailableLists();
      break;

    case 'test':
      const testList = process.argv[3] || 'demo-list.csv';
      manager
        .runCampaign(testList, { testMode: true })
        .then(result => console.log('Test završen:', result))
        .catch(error => console.error('Test greška:', error));
      break;

    case 'run':
      const listName = process.argv[3];
      if (!listName) {
        console.log(
          '❌ Specifikuj naziv liste: node email-campaign.js run lista.csv'
        );
        break;
      }

      manager
        .runCampaign(listName)
        .then(result => console.log('Kampanja završena!'))
        .catch(error => console.error('Kampanja greška:', error));
      break;

    case 'results':
      const resultFile = process.argv[3];
      if (!resultFile) {
        console.log(
          '❌ Specifikuj rezultat fajl: node email-campaign.js results campaign-123456.json'
        );
        break;
      }
      manager.showCampaignResults(resultFile);
      break;

    default:
      console.log(`
📧 Email Campaign Manager

Upotreba:
  node email-campaign.js demo                    - Kreiraj demo listu
  node email-campaign.js list                    - Prikaži dostupne liste  
  node email-campaign.js test [lista.csv]        - Test kampanja (1 email)
  node email-campaign.js run lista.csv           - Pokreni kampanju
  node email-campaign.js results result.json     - Prikaži rezultate

Primjeri:
  node email-campaign.js demo
  node email-campaign.js test demo-list.csv
  node email-campaign.js run demo-list.csv
      `);
  }
}
