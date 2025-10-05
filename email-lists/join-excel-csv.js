const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Učitaj .env fajl (iz root folder-a)
require('dotenv').config({ path: '../.env' });

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

function normalizePib(pib) {
  if (!pib) return null;
  return pib
    .toString()
    .replace(/[^0-9]/g, '')
    .padStart(8, '0');
}

async function joinExcelWithCSV(excelFile, csvFile) {
  try {
    console.log('📋 SPAJANJE EXCEL + CSV FAJLOVA');
    console.log('================================');

    // Čitaj Excel fajl (centralni registar)
    console.log('📁 Čitam Excel fajl:', excelFile);
    const workbook = XLSX.readFile(excelFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Excel: ${excelData.length} redova`);

    // Čitaj CSV fajl (rezultati sa email podacima)
    console.log('📁 Čitam CSV fajl:', csvFile);
    const csvData = parseCSV(csvFile);

    console.log(`📧 CSV: ${csvData.length} redova sa email podacima`);

    // Kreiraj mapu PIB -> email podaci za brže pretraživanje
    const emailMap = new Map();
    csvData.forEach(row => {
      const pib = normalizePib(row.pib);
      if (pib) {
        emailMap.set(pib, {
          email: row.email,
          telefon: row.telefon,
          web: row.web,
          kd: row.kd, // DODAJ KD ŠIFRU DELATNOSTI
        });
      }
    });

    console.log(`🔗 Mapirao ${emailMap.size} PIB-ova sa email podacima`);

    // Spoji podatke - SVI PODACI IZ OBA FAJLA
    let spojeniPodaci = [];
    let emailMatches = 0;

    excelData.forEach(company => {
      // Pronađi PIB u Excel podatku (različiti nazivi kolona)
      let companyPib =
        company.PIB ||
        company.pib ||
        company.Pib ||
        company['Matični broj'] ||
        company['Tax ID'] ||
        company.maticni_broj ||
        company.id;

      const normalizedPib = normalizePib(companyPib);

      if (normalizedPib) {
        const emailData = emailMap.get(normalizedPib);

        // SPOJI SVE KOLONE IZ OBA FAJLA
        const spojenaFirma = {
          // 1. PIB kao prvi red (normalizovan)
          pib: normalizedPib,

          // 2. SVI PODACI IZ EXCEL-A (naziv, adresa, sve!)
          ...company,

          // 3. EMAIL PODACI IZ CSV-A
          email: emailData?.email || '',
          telefon: emailData?.telefon || '',
          web: emailData?.web || '',
          kd: emailData?.kd || '', // ŠIFRA DELATNOSTI IZ CSV-A

          // 4. STATUS POLJA
          ima_email: emailData?.email ? 'DA' : 'NE',
          validan_email:
            emailData?.email && emailData.email.includes('@') ? 'DA' : 'NE',
        };

        spojeniPodaci.push(spojenaFirma);

        if (emailData?.email) {
          emailMatches++;
        }
      }
    });

    console.log('\n📈 STATISTIKE SPAJANJA:');
    console.log(`   Ukupno firmi iz Excel-a: ${excelData.length}`);
    console.log(`   Ukupno email adresa iz CSV-a: ${csvData.length}`);
    console.log(`   Uspešno spojeno: ${spojeniPodaci.length}`);
    console.log(`   Firme sa email-om: ${emailMatches}`);
    console.log(
      `   Procenat sa email-om: ${(
        (emailMatches / spojeniPodaci.length) *
        100
      ).toFixed(1)}%`
    );

    // Sačuvaj spojene podatke - SAMO CSV
    const outputCSV = path.join(__dirname, 'KOMPLETNI_SPOJENI_PODACI.csv');

    // CSV output sa SVIM kolonama
    const csvHeaders = Object.keys(spojeniPodaci[0]).join(',');
    const csvRows = spojeniPodaci.map(row =>
      Object.values(row)
        .map(val => `"${(val || '').toString().replace(/"/g, '""')}"`)
        .join(',')
    );
    const csvContent = [csvHeaders, ...csvRows].join('\n');
    fs.writeFileSync(outputCSV, csvContent);

    console.log('\n💾 KREIRAN FAJL:');
    console.log(`   📄 ${outputCSV}`);
    console.log(
      `   📊 Veličina: ${(fs.statSync(outputCSV).size / 1024).toFixed(1)} KB`
    );

    // Prikaži detaljne statistike
    console.log('\n🔍 PRIMERI SPOJENIH PODATAKA:');
    spojeniPodaci.slice(0, 3).forEach((firma, index) => {
      const naziv = firma.naziv || firma.Naziv || firma['Naziv firme'] || 'N/A';
      console.log(`${index + 1}. ${naziv} (PIB: ${firma.pib})`);
      console.log(`   📧 Email: ${firma.email || 'NEMA'}`);
      console.log(`   📞 Tel: ${firma.telefon || 'NEMA'}`);
      console.log(`   🌐 Web: ${firma.web || 'NEMA'}`);
      console.log(`   🏢 KD: ${firma.kd || 'NEMA'}`);
      console.log(`   💰 Prihod: ${firma.Prihod || firma.prihod || 'NEMA'}`);
      console.log(
        `   👥 Zaposleni: ${
          firma['Broj zaposlenih'] || firma.zaposleni || 'NEMA'
        }`
      );
      console.log(`   ────────────────────────────────────`);
    });

    console.log('\n📈 DETALJNE STATISTIKE:');
    console.log(
      `   📄 Ukupno kolona u CSV-u: ${Object.keys(spojeniPodaci[0]).length}`
    );
    console.log(
      `   📊 Kolone: ${Object.keys(spojeniPodaci[0])
        .slice(0, 10)
        .join(', ')}...`
    );
  } catch (error) {
    console.error('❌ Greška:', error.message);
  }
}

// Pokretanje samo ako je pozvan direktno
if (require.main === module) {
  const excelFile = process.argv[2];
  const csvFile = process.argv[3];

  if (!excelFile || !csvFile) {
    console.log('📋 Korišćenje:');
    console.log('   node join-excel-csv.js excel-fajl.xlsx csv-fajl.csv');
    console.log('');
    console.log('📌 Primer:');
    console.log(
      '   node join-excel-csv.js centralni_registar_cist.xlsx rezultati.csv'
    );
    console.log('   node join-excel-csv.js 6920.xlsx rezultati.csv');
    process.exit(1);
  }

  joinExcelWithCSV(excelFile, csvFile);
}

module.exports = { joinExcelCsv: joinExcelWithCSV };
