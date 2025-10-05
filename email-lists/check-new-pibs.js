const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');

// Učitaj .env fajl (iz root folder-a)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Database konfiguracija direktno iz .env
const dbConfig = {
  host: process.env.DB_HOST || '185.102.78.178',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'zeljko',
  password: process.env.DB_PASSWORD || '_3r05o1Ot',
  database: process.env.DB_NAME || 'summasum_',
};

async function checkNewPibs(excelFilePath) {
  let connection;

  try {
    console.log('📁 Čitam Excel fajl:', excelFilePath);

    // Čitaj Excel fajl
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Učitano ${data.length} redova iz Excel-a`);

    // Normalizuj PIB-ove iz Excel-a
    const excelPibs = data
      .map(row => {
        // Pokušaj različite nazive kolona za PIB
        let pib =
          row.PIB ||
          row.pib ||
          row.Pib ||
          row['Matični broj'] ||
          row['Matični broj / PIB'] ||
          row['PIB/Matični broj'] ||
          row['Tax number'] ||
          row.id ||
          row.ID ||
          row.Id;

        if (pib) {
          return pib
            .toString()
            .replace(/[^0-9]/g, '')
            .padStart(8, '0');
        }
        return null;
      })
      .filter(pib => pib && pib.length >= 8);

    console.log(`🔢 Pronašao ${excelPibs.length} validnih PIB-ova`);

    if (excelPibs.length === 0) {
      console.log('❌ Nema validnih PIB-ova u fajlu!');
      console.log('Dostupne kolone:', Object.keys(data[0] || {}));
      return;
    }

    // Konektuj na bazu
    console.log('🔌 Konektujem na bazu direktno...');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   User: ${dbConfig.user}`);
    console.log(`   Database: ${dbConfig.database}`);

    connection = await mysql.createConnection(dbConfig);

    // Napravi placeholder string za SQL upit
    const placeholders = excelPibs.map(() => '?').join(',');
    const query = `SELECT pib FROM emails WHERE pib IN (${placeholders})`;

    console.log('🔍 Proveravam koje PIB-ove već imaš u bazi...');
    const [results] = await connection.execute(query, excelPibs);

    const existingPibs = new Set(results.map(row => row.pib));
    console.log(
      `✅ U bazi već imaš ${existingPibs.size} PIB-ova od ${excelPibs.length}`
    );

    // Filtriraj podatke - ostavi samo nove PIB-ove
    const newData = data.filter(row => {
      let pib =
        row.PIB ||
        row.pib ||
        row.Pib ||
        row['Matični broj'] ||
        row['Matični broj / PIB'] ||
        row['PIB/Matični broj'] ||
        row['Tax number'] ||
        row.id ||
        row.ID ||
        row.Id;

      if (pib) {
        const normalizedPib = pib
          .toString()
          .replace(/[^0-9]/g, '')
          .padStart(8, '0');
        return !existingPibs.has(normalizedPib);
      }
      return false;
    });

    console.log(`🆕 Ostalo je ${newData.length} novih PIB-ova za dodavanje`);

    if (newData.length === 0) {
      console.log('🎯 Svi PIB-ovi iz fajla već postoje u bazi!');
      return {
        totalPibs: excelPibs.length,
        existingPibs: existingPibs.size,
        newPibs: 0,
      };
    }

    // Sačuvaj novi Excel sa samo novim PIB-ovima
    const fileName = path.basename(excelFilePath, path.extname(excelFilePath));
    const outputPath = path.join(
      path.dirname(excelFilePath), // Same directory as input (uploads)
      `${fileName}_NOVI.xlsx`
    );

    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(newData);
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Novi PIBovi');
    XLSX.writeFile(newWorkbook, outputPath);

    console.log('💾 Sačuvao novi fajl:', outputPath);

    // Prikaži statistike
    console.log('\n📈 STATISTIKE:');
    console.log(`   Ukupno u Excel-u: ${data.length}`);
    console.log(`   Validnih PIB-ova: ${excelPibs.length}`);
    console.log(`   Već u bazi: ${existingPibs.size}`);
    console.log(`   Novi PIB-ovi: ${newData.length}`);
    console.log(
      `   Procenat novih: ${((newData.length / excelPibs.length) * 100).toFixed(
        1
      )}%`
    );

    // Prikaži primere postojećih PIB-ova
    if (existingPibs.size > 0) {
      console.log('\n🔍 Primeri PIB-ova koji već postoje:');
      Array.from(existingPibs)
        .slice(0, 5)
        .forEach(pib => {
          console.log(`   ${pib}`);
        });
      if (existingPibs.size > 5) {
        console.log(`   ... i još ${existingPibs.size - 5} PIB-ova`);
      }
    }

    return {
      totalPibs: excelPibs.length,
      existingPibs: existingPibs.size,
      newPibs: newData.length,
      outputFile: outputPath,
    };
  } catch (error) {
    console.error('❌ Greška:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Pokretanje samo ako je pozvan direktno
if (require.main === module) {
  const excelFile = process.argv[2];

  if (!excelFile) {
    console.log('📋 Korišćenje:');
    console.log('   node check-new-pibs.js naziv-fajla.xlsx');
    console.log('');
    console.log('📌 Primer:');
    console.log('   node check-new-pibs.js 6920.xlsx');
    console.log('   node check-new-pibs.js novi-pibovi.xlsx');
    process.exit(1);
  }

  checkNewPibs(excelFile);
}

module.exports = { checkNewPibs };
