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

async function analyzeDatabaseStructure() {
  let connection;

  try {
    console.log('📊 ANALIZA STRUKTURE BAZE PODATAKA');
    console.log('==========================================');
    console.log('🔌 Konektujem na bazu...');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);

    connection = await mysql.createConnection(dbConfig);

    // 1. Dobij sve tabele
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]).sort();

    console.log(`\n📋 PRONAĐENO ${tableNames.length} TABELA:`);
    console.log('==========================================');

    const tableAnalysis = [];

    // 2. Analiziraj svaku tabelu
    for (const tableName of tableNames) {
      try {
        // Broj redova
        const [countResult] = await connection.execute(
          `SELECT COUNT(*) as count FROM \`${tableName}\``
        );
        const rowCount = countResult[0].count;

        // Struktura tabele
        const [structure] = await connection.execute(
          `DESCRIBE \`${tableName}\``
        );

        // Indeksi
        const [indexes] = await connection.execute(
          `SHOW INDEX FROM \`${tableName}\``
        );

        tableAnalysis.push({
          name: tableName,
          rows: rowCount,
          columns: structure,
          indexes: indexes,
        });

        console.log(
          `✅ ${tableName.padEnd(25)} - ${rowCount
            .toString()
            .padStart(6)} redova`
        );
      } catch (error) {
        console.log(`❌ ${tableName.padEnd(25)} - GREŠKA: ${error.message}`);
      }
    }

    // 3. Sortiranje po broju redova (descending)
    tableAnalysis.sort((a, b) => b.rows - a.rows);

    console.log('\n📊 TABELE SORTIRANE PO BROJU REDOVA:');
    console.log('==========================================');

    let totalRows = 0;
    tableAnalysis.forEach(table => {
      totalRows += table.rows;
      const percentage =
        totalRows > 0 ? ((table.rows / totalRows) * 100).toFixed(1) : '0.0';
      console.log(
        `${table.name.padEnd(25)} # ${table.rows.toString().padStart(6)} redova`
      );
    });

    console.log(`\n🎯 UKUPNO REDOVA U BAZI: ${totalRows}`);

    // 4. Detaljno za svaku tabelu sa više od 0 redova
    console.log('\n📝 DETALJNA STRUKTURA TABELA:');
    console.log('==========================================');

    for (const table of tableAnalysis) {
      if (table.rows > 0) {
        console.log(
          `\n### 📊 ${table.name.toUpperCase()} - ${table.rows} redova\n`
        );
        console.log('```sql');

        table.columns.forEach(col => {
          const nullable = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal =
            col.Default !== null ? `DEFAULT '${col.Default}'` : '';
          const extra = col.Extra ? col.Extra : '';
          const key =
            col.Key === 'PRI'
              ? 'PRIMARY KEY'
              : col.Key === 'UNI'
              ? 'UNIQUE'
              : col.Key === 'MUL'
              ? 'INDEX'
              : '';

          console.log(
            `${col.Field.padEnd(25)} ${col.Type.toUpperCase().padEnd(
              15
            )} ${nullable.padEnd(8)} ${key} ${defaultVal} ${extra}`.trim()
          );
        });

        console.log('```\n');

        // Prikaži indekse ako postoje
        const uniqueIndexes = [
          ...new Set(table.indexes.map(idx => idx.Key_name)),
        ];
        if (uniqueIndexes.length > 1) {
          // Više od samo PRIMARY
          console.log(
            '**Indeksi:**',
            uniqueIndexes.filter(idx => idx !== 'PRIMARY').join(', ')
          );
          console.log('');
        }
      }
    }

    // 5. Tabele bez podataka
    const emptyTables = tableAnalysis.filter(t => t.rows === 0);
    if (emptyTables.length > 0) {
      console.log('\n🗳️  PRAZNE TABELE:');
      console.log('==========================================');
      emptyTables.forEach(table => {
        console.log(`${table.name.padEnd(25)} - 0 redova`);
      });
    }

    // 6. Sažetak za dokumentaciju
    console.log('\n📋 SAŽETAK ZA PROJEKAT-DOKUMENTACIJA.md:');
    console.log('==========================================');
    console.log(`- **Ukupno tabela**: ${tableNames.length}`);
    console.log(`- **Ukupno redova**: ${totalRows.toLocaleString()}`);
    console.log(
      `- **Tabele sa podacima**: ${
        tableAnalysis.filter(t => t.rows > 0).length
      }`
    );
    console.log(`- **Prazne tabele**: ${emptyTables.length}`);

    console.log('\n**Top 10 tabela po broju redova:**');
    tableAnalysis.slice(0, 10).forEach((table, index) => {
      console.log(
        `${(index + 1).toString().padStart(2)}. ${table.name.padEnd(
          25
        )} - ${table.rows.toLocaleString().padStart(6)} redova`
      );
    });
  } catch (error) {
    console.error('❌ Greška pri analizi baze:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Pokreni analizu
if (require.main === module) {
  analyzeDatabaseStructure();
}

module.exports = { analyzeDatabaseStructure };
