// Test tracking pixel funkcionalnosti
const MarketingEmailService = require('./marketing-email');

async function testTrackingPixel() {
  console.log('🧪 Testiranje tracking pixel funkcionalnosti...');
  
  try {
    const service = new MarketingEmailService();
    
    // Test personalizeTemplate sa emailId
    const template = service.loadTemplate();
    console.log('✅ Template učitan');
    
    const userData = {
      firstName: 'Test',
      companyName: 'Test Company'
    };
    
    // Test sa emailId
    console.log('\n1. Test sa emailId = 123:');
    const personalizedWithId = service.personalizeTemplate(template, userData, 123);
    
    // Proveriti da li se pixel ugrađuje
    if (personalizedWithId.includes('/api/marketing/track/open/123')) {
      console.log('✅ Tracking pixel URL uspešno ugrađen!');
    } else {
      console.log('❌ Tracking pixel URL NIJE ugrađen!');
    }
    
    // Test bez emailId
    console.log('\n2. Test bez emailId:');
    const personalizedWithoutId = service.personalizeTemplate(template, userData, null);
    
    // Proveriti da li se placeholder uklanja
    if (personalizedWithoutId.includes('{{TRACKING_PIXEL_URL}}')) {
      console.log('❌ Placeholder NIJE uklonjen!');
    } else {
      console.log('✅ Placeholder uspešno uklonjen');
    }
    
    console.log('\n🎉 Test završen!');
    
  } catch (error) {
    console.error('❌ Greška u testu:', error);
  }
}

testTrackingPixel();
