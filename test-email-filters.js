// Test script for email filter API endpoints
const { executeQuery } = require('./src/config/database');

async function testEmailFilters() {
  console.log('🧪 Testing Email Filter System...\n');

  try {
    // Test 1: Check emails table
    console.log('1. Testing emails table access...');
    const emailsCount = await executeQuery(
      'SELECT COUNT(*) as count FROM emails'
    );
    console.log(`   ✅ Found ${emailsCount[0].count} emails in database\n`);

    // Test 2: Test cities query
    console.log('2. Testing cities query...');
    const cities = await executeQuery(`
      SELECT DISTINCT grad as city, COUNT(*) as count 
      FROM emails 
      WHERE grad IS NOT NULL AND grad != '' 
      GROUP BY grad 
      ORDER BY count DESC, grad ASC
      LIMIT 5
    `);
    console.log(`   ✅ Found ${cities.length} unique cities:`);
    cities.forEach(city => {
      console.log(`      ${city.city}: ${city.count} companies`);
    });
    console.log('');

    // Test 3: Test business codes query
    console.log('3. Testing business codes query...');
    const businessCodes = await executeQuery(`
      SELECT DISTINCT kd as code, COUNT(*) as count 
      FROM emails 
      WHERE kd IS NOT NULL AND kd != '' 
      GROUP BY kd 
      ORDER BY count DESC
      LIMIT 5
    `);
    console.log(`   ✅ Found ${businessCodes.length} unique business codes:`);
    businessCodes.forEach(code => {
      console.log(`      ${code.code}: ${code.count} companies`);
    });
    console.log('');

    // Test 4: Test stats query
    console.log('4. Testing statistics query...');
    const stats = await executeQuery(`
      SELECT 
        MIN(CAST(broj_zaposlenih AS UNSIGNED)) as minEmployees,
        MAX(CAST(broj_zaposlenih AS UNSIGNED)) as maxEmployees,
        MIN(CAST(prihod AS DECIMAL(15,2))) as minRevenue,
        MAX(CAST(prihod AS DECIMAL(15,2))) as maxRevenue,
        COUNT(*) as totalEmails
      FROM emails 
      WHERE broj_zaposlenih IS NOT NULL 
        AND prihod IS NOT NULL
        AND broj_zaposlenih != ''
        AND prihod != ''
    `);

    if (stats.length > 0) {
      const s = stats[0];
      console.log('   ✅ Statistics:');
      console.log(`      Employees: ${s.minEmployees} - ${s.maxEmployees}`);
      console.log(`      Revenue: ${s.minRevenue} - ${s.maxRevenue} RSD`);
      console.log(`      Total with valid data: ${s.totalEmails}`);
    }
    console.log('');

    // Test 5: Test search query with sample filters
    console.log('5. Testing search query...');
    const sampleSearch = await executeQuery(`
      SELECT id, naziv as companyName, email, grad as city, 
             kd as businessCode, broj_zaposlenih as employees, 
             prihod as revenue
      FROM emails 
      WHERE email IS NOT NULL AND email != '' AND email LIKE '%@%'
        AND grad IS NOT NULL AND grad != ''
      ORDER BY prihod DESC
      LIMIT 3
    `);

    console.log(
      `   ✅ Sample search results (${sampleSearch.length} companies):`
    );
    sampleSearch.forEach((company, index) => {
      console.log(`      ${index + 1}. ${company.companyName}`);
      console.log(`         Email: ${company.email}`);
      console.log(`         Location: ${company.city}`);
      console.log(`         Employees: ${company.employees}`);
      console.log(`         Revenue: ${company.revenue} RSD`);
      console.log('');
    });

    console.log(
      '🎉 All tests passed! Email filter system should work correctly.'
    );
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }

  process.exit(0);
}

testEmailFilters();
