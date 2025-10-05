const { executeQuery } = require('../src/config/database');

async function readEmailsTable() {
  try {
    console.log('🔌 Konektujem na bazu (koristeći pool iz database.js)...');

    // Prvo proverim strukturu tabele
    console.log('📋 Proveravam strukturu emails tabele...');
    const structure = await executeQuery('DESCRIBE emails');

    console.log('🏗️ STRUKTURA TABELE emails:');
    structure.forEach(col => {
      console.log(
        `   ${col.Field} - ${col.Type} ${
          col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'
        } ${col.Key ? '[' + col.Key + ']' : ''}`
      );
    });

    // Čitaj sve emails
    const query = `
            SELECT 
                pib, 
                naziv, 
                grad, 
                email, 
                telefon, 
                web, 
                kd,
                opted_in,
                created_at,
                updated_at,
                poslednja_aktivnost
            FROM emails 
            ORDER BY naziv 
            LIMIT 50
        `;

    console.log('\n📧 Čitam podatke iz emails tabele...');
    const emails = await executeQuery(query);

    console.log(
      `\n📊 PRONAŠAO ${emails.length} MAILOVA (prikazujem prvih 50):\n`
    );

    emails.forEach((email, index) => {
      console.log(`${index + 1}. ${email.naziv} (PIB: ${email.pib})`);
      console.log(`   📧 Email: ${email.email || 'NEMA'}`);
      console.log(`   🏙️  Grad: ${email.grad || 'N/A'}`);
      console.log(`   📞 Tel: ${email.telefon || 'N/A'}`);
      console.log(`   🌐 Web: ${email.web || 'N/A'}`);
      console.log(`   🏢 KD: ${email.kd || 'N/A'}`);
      console.log(`   ✅ Opted In: ${email.opted_in ? 'DA' : 'NE'}`);
      console.log(
        `   📅 Kreiran: ${
          email.created_at
            ? new Date(email.created_at).toLocaleDateString('sr-RS')
            : 'N/A'
        }`
      );
      console.log(`   ─────────────────────────────────────────`);
    });

    // Osnovne statistike
    const statsQuery = `
            SELECT 
                COUNT(*) as ukupno,
                COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as sa_emailom,
                COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as bez_emaila
            FROM emails
        `;

    const stats = await executeQuery(statsQuery);

    console.log('\n📈 STATISTIKE:');
    console.log(`   Ukupno firmi: ${stats[0].ukupno}`);
    console.log(`   Sa email-om: ${stats[0].sa_emailom}`);
    console.log(`   Bez email-a: ${stats[0].bez_emaila}`);
    console.log(
      `   Procenat sa email-om: ${(
        (stats[0].sa_emailom / stats[0].ukupno) *
        100
      ).toFixed(1)}%`
    );
  } catch (error) {
    console.error('❌ Greška:', error.message);
  }
}

// Pokretanje samo ako je pozvan direktno
if (require.main === module) {
  readEmailsTable();
}

module.exports = { readEmailsTable };
