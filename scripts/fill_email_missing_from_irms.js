require('dotenv').config();

const { executeQuery, pool } = require('../src/config/database');
const { searchByPIB } = require('../src/services/irmsApiClient');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    limit: 100,
    delayMs: 1000,
  };

  args.forEach(arg => {
    if (arg.startsWith('--limit=')) {
      out.limit = Number(arg.split('=')[1]) || out.limit;
    }
    if (arg.startsWith('--delay=')) {
      out.delayMs = Number(arg.split('=')[1]) || out.delayMs;
    }
  });

  return out;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanText(value) {
  return String(value || '').trim();
}

function normalizeCity(cityRaw) {
  const city = cleanText(cityRaw);
  if (!city) return '';

  // IRMS often returns values like: "Danilovgrad, Crna Gora"
  return city.split(',')[0].trim();
}

function normalizeKd(activityRaw) {
  const activity = cleanText(activityRaw);
  if (!activity) return '';

  // Expected format: "1091, Proizvodnja ..."
  const leadingCode = activity.match(/^(\d{3,6})\b/);
  if (leadingCode) return leadingCode[1];

  return activity.split(',')[0].trim();
}

async function run() {
  const { limit, delayMs } = parseArgs();
  const safeDelayMs = Math.max(750, Number(delayMs) || 0);

  console.log(`🔎 Tražim do ${limit} zapisa bez grada ili KD...`);
  if (safeDelayMs !== delayMs) {
    console.log(`⚠️ Delay je automatski podignut na ${safeDelayMs}ms radi zaštite IRMS-a.`);
  }

  const rows = await executeQuery(
    `
      SELECT id, pib, grad, kd
      FROM emails
      WHERE (grad IS NULL OR TRIM(grad) = '' OR kd IS NULL OR TRIM(kd) = '')
        AND pib IS NOT NULL
        AND TRIM(pib) REGEXP '^[0-9]{8}$'
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [limit]
  );

  if (!rows.length) {
    console.log('✅ Nema zapisa za obradu.');
    return;
  }

  console.log(`📦 Za obradu: ${rows.length}`);

  const summary = {
    totalCandidates: rows.length,
    irmsFound: 0,
    updatedRows: 0,
    updatedGrad: 0,
    updatedKd: 0,
    noChange: 0,
    irmsNotFound: 0,
    errors: 0,
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const pib = cleanText(row.pib);
    const hasGrad = cleanText(row.grad) !== '';
    const hasKd = cleanText(row.kd) !== '';

    try {
      const irmsData = await searchByPIB(pib, {
        includeDirectors: false,
        includeOwners: false,
      });

      if (!irmsData) {
        summary.irmsNotFound += 1;
        continue;
      }

      summary.irmsFound += 1;

      const irmsGrad = normalizeCity(irmsData.city);
      const irmsKd = normalizeKd(irmsData.activity);

      const fields = [];
      const params = [];

      if (!hasGrad && irmsGrad) {
        fields.push('grad = ?');
        params.push(irmsGrad);
      }

      if (!hasKd && irmsKd) {
        fields.push('kd = ?');
        params.push(irmsKd);
      }

      if (!fields.length) {
        summary.noChange += 1;
      } else {
        params.push(row.id);

        await executeQuery(
          `UPDATE emails SET ${fields.join(', ')} WHERE id = ?`,
          params
        );

        summary.updatedRows += 1;
        if (!hasGrad && irmsGrad) summary.updatedGrad += 1;
        if (!hasKd && irmsKd) summary.updatedKd += 1;
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`❌ Greška za PIB ${pib}:`, error.message);
    }

    if ((i + 1) % 10 === 0 || i + 1 === rows.length) {
      console.log(`⏳ Obradjeno ${i + 1}/${rows.length}`);
    }

    if (safeDelayMs > 0) {
      await sleep(safeDelayMs);
    }
  }

  console.log('\n✅ Završeno. Rezime:');
  console.log(JSON.stringify(summary, null, 2));
}

run()
  .catch(error => {
    console.error('❌ Fatalna greška:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (pool && typeof pool.end === 'function') {
        await pool.end();
      }
    } catch (_) {}
  });
