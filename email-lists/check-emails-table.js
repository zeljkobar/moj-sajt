const mysql = require('mysql2/promise');

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

async function getEmailsTableStructure() {
  let connection;

  try {
    console.log('🔍 PROVERAM STRUKTURU TABELE emails');
    console.log('====================================');

    // Konektuj na bazu
    console.log('🔌 Konektujem na bazu direktno...');
    connection = await mysql.createConnection(dbConfig);

    // Struktura tabele
    const [structure] = await connection.execute('DESCRIBE emails');

    console.log('🏗️ KOLONE U TABELI emails:');
    structure.forEach(col => {
      console.log(
        `   ${col.Field} - ${col.Type} ${
          col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'
        } ${col.Key ? '[' + col.Key + ']' : ''} ${
          col.Default !== null ? `DEFAULT: ${col.Default}` : ''
        }`
      );
    });

    // Broj postojećih zapisa
    const [count] = await connection.execute(
      'SELECT COUNT(*) as total FROM emails'
    );
    console.log(`\n📊 TRENUTNO U BAZI: ${count[0].total} zapisa`);

    // Primer postojećih zapisa
    const [sample] = await connection.execute(
      'SELECT pib, naziv, grad, email, telefon, web, kd FROM emails LIMIT 5'
    );

    console.log('\n🔍 PRIMERI POSTOJEĆIH ZAPISA:');
    sample.forEach((row, index) => {
      console.log(`${index + 1}. ${row.naziv} (${row.pib})`);
      console.log(`   📧 Email: ${row.email || 'NEMA'}`);
      console.log(`   📞 Tel: ${row.telefon || 'NEMA'}`);
      console.log(`   🌐 Web: ${row.web || 'NEMA'}`);
      console.log(`   🏢 KD: ${row.kd || 'NEMA'}`);
      console.log(`   ────────────────────────────────`);
    });
  } catch (error) {
    console.error('❌ Greška:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Pokretanje
getEmailsTableStructure();
