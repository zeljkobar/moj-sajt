// Test script za marketing funkcionalnost
const MarketingEmailService = require('./marketing-email');

async function testMarketing() {
  console.log('🧪 Testiranje marketing funkcionalnosti...');
  
  try {
    const service = new MarketingEmailService();
    console.log('✅ MarketingEmailService kreiran uspešno');
    
    // Test CSV loading
    console.log('📄 Testiranje CSV loading...');
    const csvPath = './test-campaign.csv';
    const recipients = service.loadEmailListFromCSV(csvPath);
    console.log('✅ CSV učitan uspešno:', recipients.length, 'primaoca');
    console.log('Primer primaoca:', recipients[0]);
    
    // Test list available lists
    console.log('📋 Testiranje listAvailableLists...');
    const lists = service.listAvailableLists();
    console.log('✅ Lists dobijene uspešno:', lists);
    
    // Test kreiranja kampanje
    console.log('📧 Testiranje kreiranja kampanje...');
    const campaignId = await service.createCampaign(
      'Test Kampanja',
      'Test Subject', 
      recipients.length,
      1
    );
    console.log('✅ Kampanja kreirana sa ID:', campaignId);
    
    console.log('🎉 Svi testovi prošli uspešno!');
    
  } catch (error) {
    console.error('❌ Greška u testu:', error);
    console.error('Stack trace:', error.stack);
  }
}

testMarketing();
