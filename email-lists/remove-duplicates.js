const fs = require('fs');

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  return {
    headers,
    data: lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });
      return obj;
    }),
  };
}

function removeDuplicatePibs(csvFile) {
  try {
    console.log('🔧 UKLANJANJE DUPLIKATA PIB-ova');
    console.log('===============================');

    const { headers, data } = parseCSV(csvFile);
    console.log(`📁 Učitao: ${data.length} redova`);

    // Mapa PIB -> najbolji red
    const uniqueData = new Map();
    let duplicatesRemoved = 0;

    data.forEach(row => {
      const pib = row.pib?.toString().trim();

      if (!pib || pib === '') {
        console.log('⚠️  Preskačem red bez PIB-a');
        return;
      }

      if (uniqueData.has(pib)) {
        duplicatesRemoved++;

        // Zadržaj red sa više podataka (email, telefon, web)
        const existing = uniqueData.get(pib);
        const current = row;

        // Skoruj redove na osnovu kompletnosti podataka
        const scoreRow = r => {
          let score = 0;
          if (r.email && r.email !== '' && r.email.includes('@')) score += 3;
          if (r.telefon && r.telefon !== '') score += 2;
          if (r.web && r.web !== '') score += 1;
          if (r.Naziv && r.Naziv !== '') score += 1;
          return score;
        };

        const existingScore = scoreRow(existing);
        const currentScore = scoreRow(current);

        // Zadržaj bolji red
        if (currentScore > existingScore) {
          uniqueData.set(pib, current);
          console.log(
            `🔄 Zamenio PIB ${pib} boljim redom (score: ${currentScore} > ${existingScore})`
          );
        }
      } else {
        uniqueData.set(pib, row);
      }
    });

    // Konvertuj nazad u array
    const cleanData = Array.from(uniqueData.values());

    console.log('\n📊 REZULTAT:');
    console.log(`   ✅ Jedinstvenih redova: ${cleanData.length}`);
    console.log(`   🗑️  Uklonjeno duplikata: ${duplicatesRemoved}`);
    console.log(
      `   📉 Smanjenje: ${((duplicatesRemoved / data.length) * 100).toFixed(
        1
      )}%`
    );

    // Sačuvaj čist CSV
    const outputFile = csvFile.replace('.csv', '_CLEAN.csv');

    const csvHeaders = headers.join(',');
    const csvRows = cleanData.map(row =>
      headers
        .map(
          header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`
        )
        .join(',')
    );
    const csvContent = [csvHeaders, ...csvRows].join('\n');
    fs.writeFileSync(outputFile, csvContent);

    console.log(`\n💾 ČIST FAJL KREIRAN:`);
    console.log(`   📄 ${outputFile}`);
    console.log(
      `   📊 Veličina: ${(fs.statSync(outputFile).size / 1024).toFixed(1)} KB`
    );

    // Brza provera da li je sada sve OK
    const pibSet = new Set();
    const finalDuplicates = [];

    cleanData.forEach(row => {
      if (pibSet.has(row.pib)) {
        finalDuplicates.push(row.pib);
      } else {
        pibSet.add(row.pib);
      }
    });

    if (finalDuplicates.length === 0) {
      console.log(`   ✅ Svi PIB-ovi su sada jedinstveni!`);
    } else {
      console.log(`   ⚠️  Još uvek ima ${finalDuplicates.length} duplikata`);
    }

    // Statistike email-ova
    const emailStats = cleanData.reduce(
      (acc, row) => {
        if (row.email && row.email !== '' && row.email.includes('@')) {
          acc.withEmail++;
        } else {
          acc.withoutEmail++;
        }
        return acc;
      },
      { withEmail: 0, withoutEmail: 0 }
    );

    console.log(`\n📧 EMAIL STATISTIKE:`);
    console.log(
      `   ✅ Sa email-om: ${emailStats.withEmail} (${(
        (emailStats.withEmail / cleanData.length) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `   ❌ Bez email-a: ${emailStats.withoutEmail} (${(
        (emailStats.withoutEmail / cleanData.length) *
        100
      ).toFixed(1)}%)`
    );
  } catch (error) {
    console.error('❌ Greška:', error.message);
  }
}

// Pokretanje samo ako je pozvan direktno
if (require.main === module) {
  const csvFile = process.argv[2] || 'KOMPLETNI_SPOJENI_PODACI.csv';
  console.log(`🎯 Čišćenje duplikata u: ${csvFile}\n`);
  removeDuplicatePibs(csvFile);
}

module.exports = { removeDuplicates: removeDuplicatePibs };
