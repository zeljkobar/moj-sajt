const { checkNewPibs } = require('./check-new-pibs');
const path = require('path');

// Test funkcija sa fajlom iz uploads
async function testCheckPibs() {
  try {
    // Uzmi bilo koji Excel iz uploads
    const testFile =
      '/Users/summasummarum/Desktop/sajt/moj-sajt/email-lists/uploads/c0b450329adbe9228f129596e6a1bef1';

    console.log('🧪 Testiram checkNewPibs funkciju...');
    console.log('📁 Test fajl:', testFile);

    const result = await checkNewPibs(testFile);

    console.log('\n✅ REZULTAT:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Greška:', error);
  }
}

testCheckPibs();
