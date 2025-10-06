const mysql = require('mysql2/promise');
const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');

// Učitaj .env fajl
require('dotenv').config({ path: '../.env' });

// Database konfiguracija direktno iz .env
const dbConfig = {
  host: process.env.DB_HOST || '185.102.78.178',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'zeljko',
  password: process.env.DB_PASSWORD || '_3r05o1Ot',
  database: process.env.DB_NAME || 'summasum_',
};

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] || '';
    });
    return obj;
  });
}

function isValidEmail(email) {
  if (!email || email === '') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function categorizeFirma(brojZaposlenih, prihod) {
  // Tip firme na osnovu broja zaposlenih
  let tipFirme = 'micro';
  const zaposleni = parseInt(brojZaposlenih) || 0;

  if (zaposleni >= 250) tipFirme = 'large';
  else if (zaposleni >= 50) tipFirme = 'medium';
  else if (zaposleni >= 10) tipFirme = 'small';

  // Kategorija prihoda
  let kategorijaprihoda = 'low';
  const prihodNum = parseInt(prihod) || 0;

  if (prihodNum >= 1000000) kategorijaprihoda = 'high';
  else if (prihodNum >= 100000) kategorijaprihoda = 'medium';

  return { tipFirme, kategorijaprihoda };
}

async function insertNewCompanies(csvFile) {
  let connection;
  let inserted = 0;
  let errors = 0;
  let newCompanies = [];

  try {
    console.log('📥 DODAVANJE NOVIH FIRMI U EMAILS TABELU');
    console.log('==========================================');

    // Učitaj podatke (CSV ili Excel)
    console.log(`📁 Čitam: ${csvFile}`);
    let data;
    const fileExt = path.extname(csvFile).toLowerCase();

    if (fileExt === '.xlsx') {
      console.log('📊 Excel fajl detektovan');
      const workbook = XLSX.readFile(csvFile);
      const sheetName = workbook.SheetNames[0];
      data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      console.log('📄 CSV fajl detektovan');
      data = parseCSV(csvFile);
    }

    console.log(`📊 Učitano: ${data.length} zapisa iz fajla`);

    // Konektuj na bazu
    console.log('🔌 Konektujem na bazu direktno...');
    connection = await mysql.createConnection(dbConfig);

    // Proveravamo koji PIB-ovi već postoje u bazi
    console.log('🔍 Proveravam postojeće PIB-ove u bazi...');
    const pibList = data
      .map(row => {
        // Traži PIB u različitim kolonama
        return (
          row.pib ||
          row.PIB ||
          row.Pib ||
          row['PIB/Matični broj'] ||
          row['Matični broj']
        );
      })
      .filter(pib => pib);
    const placeholders = pibList.map(() => '?').join(',');
    const [existingPibs] = await connection.execute(
      `SELECT pib FROM emails WHERE pib IN (${placeholders})`,
      pibList
    );

    const existingPibSet = new Set(existingPibs.map(row => row.pib));
    console.log(`✅ Postojeći PIB-ovi u bazi: ${existingPibSet.size}`);

    // Filtriraj samo nove PIB-ove
    const newCompanies = data.filter(row => {
      const pib =
        row.pib ||
        row.PIB ||
        row.Pib ||
        row['PIB/Matični broj'] ||
        row['Matični broj'];
      return pib && !existingPibSet.has(pib);
    });
    console.log(`🆕 Novih firmi za dodavanje: ${newCompanies.length}`);

    if (newCompanies.length === 0) {
      console.log('🎯 Sve firme iz CSV-a već postoje u bazi!');
      return;
    }

    // Statistike pre dodavanja
    console.log('\n📊 STATISTIKE PRE DODAVANJA:');
    let validEmails = 0;
    let firmePoGradovima = {};
    let firmePoKD = {};

    newCompanies.forEach(row => {
      if (isValidEmail(row.email)) validEmails++;

      const grad = row.Grad || row.grad || 'Nepoznato';
      firmePoGradovima[grad] = (firmePoGradovima[grad] || 0) + 1;

      const kd = row.kd || 'Nepoznato';
      firmePoKD[kd] = (firmePoKD[kd] || 0) + 1;
    });

    console.log(
      `   📧 Sa validnim email-om: ${validEmails} (${(
        (validEmails / newCompanies.length) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `   🏙️  Top gradovi: ${Object.entries(firmePoGradovima)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([g, c]) => `${g}:${c}`)
        .join(', ')}`
    );
    console.log(
      `   🏢 Top KD: ${Object.entries(firmePoKD)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, c]) => `${k}:${c}`)
        .join(', ')}`
    );

    // Dodaj novi zapise
    console.log('\n🚀 Početak dodavanja novih firmi...');

    const insertQuery = `
            INSERT INTO emails (
                pib, naziv, grad, email, telefon, web, kd,
                broj_zaposlenih, prihod, opted_in, status, source,
                tip_firme, kategorija_prihoda,
                datum_dodavanja, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
        `;

    for (const [index, row] of newCompanies.entries()) {
      try {
        const hasValidEmail = isValidEmail(row.email);
        const { tipFirme, kategorijaprihoda } = categorizeFirma(
          row['Broj zaposlenih'],
          row.Prihod
        );

        await connection.execute(insertQuery, [
          row.pib || null,
          row.Naziv || row.naziv || 'Nepoznato ime',
          row.Grad || row.grad || null,
          row.email || null,
          row.telefon || null,
          row.web || null,
          row.kd || null,
          row['Broj zaposlenih'] || null,
          parseInt(row.Prihod) || 0,
          hasValidEmail ? 1 : 0,
          'active',
          'csv_import_2025',
          tipFirme,
          kategorijaprihoda,
        ]);

        inserted++;

        if ((index + 1) % 50 === 0) {
          console.log(`📝 Dodano: ${index + 1}/${newCompanies.length}`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Greška za PIB ${row.pib}: ${error.message}`);
      }
    }

    console.log('\n✅ DODAVANJE ZAVRŠENO!');
    console.log(`📊 FINALNI REZULTAT:`);
    console.log(`   ✅ Uspešno dodano: ${inserted} firmi`);
    console.log(`   ❌ Greške: ${errors}`);
    console.log(
      `   📈 Uspeh: ${((inserted / (inserted + errors)) * 100).toFixed(1)}%`
    );

    // Finalne statistike iz baze
    const [finalCount] = await connection.execute(
      'SELECT COUNT(*) as total FROM emails'
    );
    const [emailCount] = await connection.execute(`
            SELECT COUNT(*) as sa_email FROM emails 
            WHERE email IS NOT NULL AND email != '' AND email LIKE '%@%'
        `);

    console.log(`\n🎯 NOVO STANJE U BAZI:`);
    console.log(`   📊 Ukupno firmi: ${finalCount[0].total}`);
    console.log(`   📧 Sa email adresom: ${emailCount[0].sa_email}`);
    console.log(
      `   📈 Procenat sa email-om: ${(
        (emailCount[0].sa_email / finalCount[0].total) *
        100
      ).toFixed(1)}%`
    );

    return {
      inserted: inserted,
      errors: errors,
      total: newCompanies.length,
      success: ((inserted / (inserted + errors)) * 100).toFixed(1),
    };
  } catch (error) {
    console.error('❌ Glavna greška:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Pokretanje samo ako je pozvan direktno
if (require.main === module) {
  const csvFile = process.argv[2] || 'KOMPLETNI_SPOJENI_PODACI_CLEAN.csv';
  console.log(`🎯 Import firmi iz: ${csvFile}\n`);
  insertNewCompanies(csvFile);
}

module.exports = { insertNewCompanies };
