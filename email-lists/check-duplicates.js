const fs = require('fs');

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim()); // Ukloni navodnice
    const obj = { _rowNumber: index + 2 }; // +2 jer počinje od 2 (header je 1)
    headers.forEach((header, idx) => {
      obj[header] = values[idx] || '';
    });
    return obj;
  });
}

function checkDuplicatePibs(csvFile) {
  try {
    console.log('🔍 PROVERA DUPLIKATA PIB-ova');
    console.log('==============================');

    console.log(`📁 Čitam fajl: ${csvFile}`);
    const data = parseCSV(csvFile);

    console.log(`📊 Ukupno redova: ${data.length}`);

    // Mapa PIB -> lista redova
    const pibMap = new Map();
    let validPibs = 0;
    let emptyPibs = 0;

    data.forEach(row => {
      const pib = row.pib?.toString().trim();

      if (!pib || pib === '') {
        emptyPibs++;
        return;
      }

      validPibs++;

      if (!pibMap.has(pib)) {
        pibMap.set(pib, []);
      }

      pibMap.get(pib).push({
        rowNumber: row._rowNumber,
        naziv: row.Naziv || row.naziv || 'N/A',
        grad: row.Grad || row.grad || 'N/A',
        email: row.email || 'NEMA',
      });
    });

    // Pronađi duplikate
    const duplicates = [];
    const uniquePibs = [];

    pibMap.forEach((rows, pib) => {
      if (rows.length > 1) {
        duplicates.push({ pib, rows });
      } else {
        uniquePibs.push(pib);
      }
    });

    // Statistike
    console.log('\n📈 REZULTAT ANALIZE:');
    console.log(`   📄 Ukupno redova u CSV-u: ${data.length}`);
    console.log(`   🔢 Validnih PIB-ova: ${validPibs}`);
    console.log(`   ❌ Praznih PIB-ova: ${emptyPibs}`);
    console.log(`   ✅ Jedinstvenih PIB-ova: ${uniquePibs.length}`);
    console.log(`   ⚠️  Duplikata PIB-ova: ${duplicates.length}`);

    if (duplicates.length > 0) {
      console.log(
        `   💥 Ukupno problematičnih redova: ${duplicates.reduce(
          (sum, dup) => sum + dup.rows.length,
          0
        )}`
      );
    }

    // Prikaži duplikate
    if (duplicates.length > 0) {
      console.log('\n⚠️  DUPLI PIB-OVI:');
      console.log('================');

      duplicates.forEach((dup, index) => {
        console.log(
          `\n${index + 1}. PIB: ${dup.pib} (${dup.rows.length} ponavljanja)`
        );

        dup.rows.forEach((row, rowIndex) => {
          console.log(
            `   ${rowIndex + 1}. Red ${row.rowNumber}: ${row.naziv} (${
              row.grad
            }) - ${row.email}`
          );
        });

        if (index < duplicates.length - 1) {
          console.log('   ─────────────────────────────────────');
        }
      });

      // Preporuke
      console.log('\n🔧 PREPORUKE:');
      console.log('   1. Proverite da li su to stvarno različite firme');
      console.log('   2. Možda imaju isti PIB ali različite nazive/adrese');
      console.log('   3. Uklonite duplikate ili spojite podatke');
      console.log(
        '   4. Zadržite red sa najkompletnijim podacima (email, telefon)'
      );
    } else {
      console.log('\n✅ ODLIČO! Nema duplikata PIB-ova!');
      console.log('   Svi PIB-ovi su jedinstveni.');
    }

    // Proveri i duplikate email-ova
    console.log('\n📧 BONUS: Provera email duplikata...');
    const emailMap = new Map();
    let validEmails = 0;

    data.forEach(row => {
      const email = row.email?.toString().trim().toLowerCase();
      if (email && email !== '' && email.includes('@')) {
        validEmails++;
        if (!emailMap.has(email)) {
          emailMap.set(email, []);
        }
        emailMap.get(email).push({
          pib: row.pib,
          naziv: row.Naziv || row.naziv || 'N/A',
        });
      }
    });

    const emailDuplicates = [];
    emailMap.forEach((rows, email) => {
      if (rows.length > 1) {
        emailDuplicates.push({ email, rows });
      }
    });

    if (emailDuplicates.length > 0) {
      console.log(
        `   ⚠️  ${emailDuplicates.length} email adresa se koristi za više firmi:`
      );
      emailDuplicates.slice(0, 3).forEach(dup => {
        console.log(`     ${dup.email} → ${dup.rows.length} firmi`);
      });
    } else {
      console.log(
        `   ✅ Svi email-ovi su jedinstveni (${validEmails} email-ova)`
      );
    }
  } catch (error) {
    console.error('❌ Greška:', error.message);
  }
}

// Pokretanje samo ako je pozvan direktno
if (require.main === module) {
  const csvFile = process.argv[2] || 'KOMPLETNI_SPOJENI_PODACI.csv';
  console.log(`🎯 Analiza fajla: ${csvFile}\n`);
  checkDuplicatePibs(csvFile);
}

module.exports = { checkDuplicates: checkDuplicatePibs };
