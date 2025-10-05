const fs = require('fs');

function betterParseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Uzmi header
  const headerLine = lines[0];
  console.log('📋 Header:', headerLine);

  // Pronađi problematičnu liniju
  const problematicLine = lines.find(line => line.includes('02845407'));

  if (problematicLine) {
    console.log('\n🔍 PROBLEMATIČNA LINIJA:');
    console.log(problematicLine);

    // Podeli po zarezima
    const parts = problematicLine.split('","');
    console.log(`\n📊 BROJ DELOVA: ${parts.length}`);

    parts.forEach((part, index) => {
      console.log(`${index}: ${part.replace(/^"|"$/g, '')}`);
    });

    // Pokušaj da identifikuješ kolone
    console.log('\n🎯 IDENTIFIKACIJA KOLONA:');
    parts.forEach((part, index) => {
      const clean = part.replace(/^"|"$/g, '');

      if (clean === '02845407') {
        console.log(`PIB (kolona ${index}): ${clean}`);
      } else if (clean === 'PODGORICA') {
        console.log(`GRAD (kolona ${index}): ${clean}`);
      } else if (clean === '17') {
        console.log(`BROJ ZAPOSLENIH (kolona ${index}): ${clean}`);
      } else if (clean === '833933.00') {
        console.log(`PRIHOD (kolona ${index}): ${clean}`);
      } else if (clean.length > 50) {
        console.log(`NAZIV (kolona ${index}): ${clean.substring(0, 50)}...`);
      } else {
        console.log(`OSTALO (kolona ${index}): ${clean}`);
      }
    });
  }
}

// Pokretanje
betterParseCSV('KOMPLETNI_SPOJENI_PODACI_CLEAN.csv');
