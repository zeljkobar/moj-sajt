const fs = require('fs');
const axios = require('axios');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    legalStatusId: 1,
    municipalityId: 24,
    taxpayerStatusId: 11,
    startPage: 1,
    perPage: 100,
    maxPages: 300,
    outputAll: 'pib-podgorica.csv',
    output100: 'pib-doo-podgorica-irms-100.csv',
    delayMs: 150,
  };

  args.forEach(arg => {
    if (arg.startsWith('--legalStatusId='))
      out.legalStatusId = Number(arg.split('=')[1]) || out.legalStatusId;
    if (arg.startsWith('--municipalityId='))
      out.municipalityId = Number(arg.split('=')[1]) || out.municipalityId;
    if (arg.startsWith('--taxpayerStatusId='))
      out.taxpayerStatusId = Number(arg.split('=')[1]) || out.taxpayerStatusId;
    if (arg.startsWith('--startPage='))
      out.startPage = Number(arg.split('=')[1]) || out.startPage;
    if (arg.startsWith('--perPage='))
      out.perPage = Number(arg.split('=')[1]) || out.perPage;
    if (arg.startsWith('--maxPages='))
      out.maxPages = Number(arg.split('=')[1]) || out.maxPages;
    if (arg.startsWith('--outputAll='))
      out.outputAll = String(arg.split('=')[1] || out.outputAll).trim();
    if (arg.startsWith('--output100='))
      out.output100 = String(arg.split('=')[1] || out.output100).trim();
    if (arg.startsWith('--delay='))
      out.delayMs = Number(arg.split('=')[1]) || out.delayMs;
  });

  return out;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadExistingPibs(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map(value => value.trim())
    .filter(value => /^\d{8}$/.test(value));
}

async function getWithRetry(url, params, retries = 4) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios.get(url, {
        params,
        timeout: 30000,
        headers: { Accept: 'application/json, text/plain' },
      });
    } catch (error) {
      if (attempt >= retries) throw error;
      const backoff = 800 * Math.pow(2, attempt);
      await sleep(backoff);
    }
  }

  return null;
}

(async () => {
  const {
    legalStatusId,
    municipalityId,
    taxpayerStatusId,
    startPage,
    perPage,
    maxPages,
    outputAll,
    output100,
    delayMs,
  } = parseArgs();

  const url = 'https://irms.tax.gov.me/public/api/business-entities';
  const base = { legalStatusId, municipalityId, taxpayerStatusId, perPage };
  const all = [];
  const safeStartPage = Math.max(1, startPage);
  let page = safeStartPage;
  let pagesFetched = 0;

  while (page <= maxPages) {
    const response = await getWithRetry(url, { ...base, page });
    const data = response?.data || {};

    const results = Array.isArray(data.results) ? data.results : [];
    if (!results.length) break;

    pagesFetched += 1;

    const pibs = results
      .map(r => String(r.identificationNumber || '').trim())
      .filter(p => /^\d{8}$/.test(p));

    all.push(...pibs);
    if (page % 10 === 0) {
      console.log(`Obradjeno strana: ${page}, PIB zapisa: ${all.length}`);
    }
    page += 1;

    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  const existing = loadExistingPibs(outputAll);
  const merged = [...new Set([...existing, ...all])];

  fs.writeFileSync(outputAll, merged.join('\n') + '\n', 'utf8');
  fs.writeFileSync(output100, merged.slice(0, 100).join('\n') + '\n', 'utf8');

  console.log(
    'ALL_RESULTS ' +
      JSON.stringify({
        startPage: safeStartPage,
        pagesFetched,
        totalCollected: all.length,
        uniqueCollected: merged.length,
        addedThisRun: merged.length - existing.length,
        fileAll: outputAll,
        file100: output100,
        first10: merged.slice(0, 10),
      })
  );
})().catch(error => {
  console.error('EXTRACT_ERROR', error.message);
  process.exitCode = 1;
});
