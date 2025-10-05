const { executeQuery } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

// Učitaj novi CSV sa email podacima
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj;
  });
}

// Validacija email adrese
function isValidEmail(email) {
  if (!email || email === '') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Normalizuj PIB
function normalizePIB(pib) {
  if (!pib) return '';
  return pib
    .toString()
    .replace(/[\s\-]/g, '')
    .padStart(8, '0');
}

async function updateEmailData(csvFileName) {
  try {
    console.log('🔄 UPDATE EMAIL PODATAKA U TABELI emails\n');

    // Učitaj novi CSV fajl
    const csvPath = path.join(__dirname, '../email-lists', csvFileName);

    if (!fs.existsSync(csvPath)) {
      console.error(`❌ Fajl ne postoji: ${csvPath}`);
      return;
    }

    const csvData = parseCSV(csvPath);
    console.log(`📊 Učitano ${csvData.length} zapisa iz ${csvFileName}`);

    let updated = 0;
    let newRecords = 0;
    let validEmails = 0;
    let invalidEmails = 0;

    console.log('\n🚀 Počinje update...\n');

    for (const row of csvData) {
      const pib = normalizePIB(row.pib);
      const hasValidEmail = isValidEmail(row.email);

      if (hasValidEmail) validEmails++;
      else invalidEmails++;

      try {
        // Proveravamo da li PIB već postoji
        const existing = await executeQuery(
          'SELECT id FROM emails WHERE pib = ?',
          [pib]
        );

        if (existing.length > 0) {
          // UPDATE postojećeg zapisa
          await executeQuery(
            `
            UPDATE emails SET 
              naziv = ?,
              email = ?,
              telefon = ?, 
              web = ?,
              kd = ?,
              opted_in = ?,
              poslednja_aktivnost = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE pib = ?
          `,
            [
              row.naziv || null,
              row.email || null,
              row.telefon || null,
              row.web || null,
              row.kd || null,
              hasValidEmail ? 1 : 0,
              pib,
            ]
          );

          updated++;
        } else {
          // INSERT novog zapisa (ako neki novi PIB)
          // Ovo se neće desiti često jer imaš kompletnu bazu
          await executeQuery(
            `
            INSERT INTO emails (
              pib, naziv, grad, email, telefon, web, kd,
              opted_in, status, source
            ) VALUES (?, ?, '', ?, ?, ?, ?, ?, 'active', 'csv_update')
          `,
            [
              pib,
              row.naziv || 'Nova firma',
              row.email || null,
              row.telefon || null,
              row.web || null,
              row.kd || null,
              hasValidEmail ? 1 : 0,
            ]
          );

          newRecords++;
        }

        if ((updated + newRecords) % 50 === 0) {
          console.log(
            `📝 Procesuirano: ${updated + newRecords}/${csvData.length}`
          );
        }
      } catch (error) {
        console.error(`❌ Greška za PIB ${pib}:`, error.message);
      }
    }

    console.log('\n✅ UPDATE ZAVRŠEN!');
    console.log(`📊 Statistike:`);
    console.log(`   • Ažurirano zapisa: ${updated}`);
    console.log(`   • Novi zapisi: ${newRecords}`);
    console.log(`   • Validni email-ovi: ${validEmails}`);
    console.log(`   • Nevalidni email-ovi: ${invalidEmails}`);

    // Finalne statistike iz baze
    const stats = await executeQuery(`
      SELECT 
        COUNT(*) as ukupno,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as sa_email,
        COUNT(CASE WHEN opted_in = 1 THEN 1 END) as opted_in_count
      FROM emails
    `);

    console.log(`\n🎯 STANJE U BAZI:`);
    console.log(`   • Ukupno firmi: ${stats[0].ukupno}`);
    console.log(`   • Sa email adresom: ${stats[0].sa_email}`);
    console.log(`   • Opted-in za marketing: ${stats[0].opted_in_count}`);
  } catch (error) {
    console.error('❌ Glavna greška:', error);
  }
}

// Ako je pozvan direktno iz terminala
if (require.main === module) {
  const csvFileName = process.argv[2];

  if (!csvFileName) {
    console.log('📋 KORIŠĆENJE:');
    console.log('   node update-emails.js rezultati.csv');
    console.log('');
    console.log('📁 Stavi novi CSV u email-lists/ folder i pozovi skriptu');
    process.exit(1);
  }

  updateEmailData(csvFileName);
}

module.exports = { updateEmailData };
