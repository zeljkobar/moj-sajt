const { executeQuery } = require('../config/database');
const { searchByPIB, searchBusinessEntities } = require('./irmsApiClient');

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizePibValue(value) {
  const digitsOnly = normalizeText(value).replace(/\D/g, '');
  if (!digitsOnly) return '';
  return digitsOnly.length === 7 ? `0${digitsOnly}` : digitsOnly;
}

function normalizeCity(cityRaw) {
  const city = normalizeText(cityRaw);
  if (!city) return '';
  return city.split(',')[0].trim();
}

function normalizeKd(activityRaw) {
  const activity = normalizeText(activityRaw);
  if (!activity) return '';

  const leadingCode = activity.match(/^(\d{3,6})\b/);
  if (leadingCode) return leadingCode[1];

  return activity.split(',')[0].trim();
}

function normalizeOrganizationType(legalStatusRaw) {
  const raw = normalizeText(legalStatusRaw);
  if (!raw) return '';

  const normalized = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized === 'doo') return 'DOO';
  if (normalized === 'ad') return 'AD';

  if (
    normalized.includes('drustvo sa ogranicenom odgovornoscu') ||
    normalized.includes('drustvo s ogranicenom odgovornoscu') ||
    normalized.includes('drustvo sa ogranicenom odgovornoscu doo') ||
    normalized.includes('drustvo s ogranicenom odgovornoscu doo')
  ) {
    return 'DOO';
  }

  if (
    normalized.includes('akcionarsko drustvo') ||
    normalized.includes('akcionarsko društvo')
  ) {
    return 'AD';
  }

  if (normalized.includes('preduzetnik')) return 'PREDUZETNIK';
  if (normalized.includes('ortačko') || normalized.includes('ortacko')) return 'OD';
  if (normalized.includes('komanditno')) return 'KD';

  return raw.toUpperCase();
}

function normalizeDateValue(dateRaw) {
  const raw = normalizeText(dateRaw);
  if (!raw) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const dotFormat = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (dotFormat) {
    const day = dotFormat[1].padStart(2, '0');
    const month = dotFormat[2].padStart(2, '0');
    const year = dotFormat[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return '';
}

function formatDateYmd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPreviousDayYmd(now = new Date()) {
  const prev = new Date(now);
  prev.setDate(prev.getDate() - 1);
  return formatDateYmd(prev);
}

async function findExistingEmailPibs(pibs = []) {
  if (!Array.isArray(pibs) || pibs.length === 0) return new Set();

  const existing = new Set();
  const chunkSize = 500;

  for (let i = 0; i < pibs.length; i += chunkSize) {
    const chunk = pibs.slice(i, i + chunkSize);
    if (!chunk.length) continue;

    const placeholders = chunk.map(() => '?').join(', ');
    const rows = await executeQuery(
      `SELECT DISTINCT TRIM(pib) AS pib FROM emails WHERE TRIM(pib) IN (${placeholders})`,
      chunk
    );

    rows.forEach(row => {
      const normalized = normalizePibValue(row?.pib);
      if (normalized) existing.add(normalized);
    });
  }

  return existing;
}

async function collectPibsForRegistrationDate(registrationDate) {
  const perPage = 100;
  const allPibs = new Set();
  let page = 1;
  let pagesFetched = 0;

  while (page <= 500) {
    const data = await searchBusinessEntities({
      page,
      perPage,
      registrationDate,
    });

    pagesFetched += 1;
    const rows = Array.isArray(data?.results) ? data.results : [];

    rows.forEach(row => {
      const pib = normalizePibValue(row?.identificationNumber);
      if (pib) allPibs.add(pib);
    });

    if (!rows.length || !data?.hasNext) {
      break;
    }

    page += 1;
  }

  return {
    pibs: Array.from(allPibs),
    pagesFetched,
  };
}

async function upsertPibFromIrms(pib, summary) {
  const irmsData = await searchByPIB(pib, {
    includeDirectors: false,
    includeOwners: false,
  });

  if (!irmsData) {
    summary.irmsNotFound += 1;
    return;
  }

  summary.irmsFound += 1;

  const naziv = normalizeText(irmsData.name || irmsData.legalName);
  const oblikOrganizacije = normalizeOrganizationType(
    normalizeText(
      irmsData.legalForm ||
        irmsData.rawData?.legalStatus ||
        irmsData.rawData?.legalStatusDisplayName
    )
  );
  const email = normalizeText(irmsData.email);
  const telefon = normalizeText(irmsData.phone);
  const kd = normalizeKd(irmsData.activity);
  const grad = normalizeCity(irmsData.city);
  const datumRegistracije = normalizeDateValue(
    irmsData.founded ||
      irmsData.rawData?.registrationDate ||
      irmsData.rawData?.dateOfRegistration
  );

  if (
    !naziv &&
    !oblikOrganizacije &&
    !email &&
    !telefon &&
    !kd &&
    !grad &&
    !datumRegistracije
  ) {
    summary.skippedNoData += 1;
    return;
  }

  const existingRows = await executeQuery(
    `SELECT COUNT(*) AS total FROM emails WHERE TRIM(pib) = ?`,
    [pib]
  );

  const exists = Number(existingRows?.[0]?.total || 0) > 0;

  if (exists) {
    const updateResult = await executeQuery(
      `
        UPDATE emails
        SET
          naziv = CASE WHEN (naziv IS NULL OR TRIM(naziv) = '') AND ? <> '' THEN ? ELSE naziv END,
          oblik_organizacije = CASE WHEN (oblik_organizacije IS NULL OR TRIM(oblik_organizacije) = '') AND ? <> '' THEN ? ELSE oblik_organizacije END,
          email = CASE WHEN (email IS NULL OR TRIM(email) = '') AND ? <> '' THEN ? ELSE email END,
          telefon = CASE WHEN (telefon IS NULL OR TRIM(telefon) = '') AND ? <> '' THEN ? ELSE telefon END,
          kd = CASE WHEN (kd IS NULL OR TRIM(kd) = '') AND ? <> '' THEN ? ELSE kd END,
          grad = CASE WHEN (grad IS NULL OR TRIM(grad) = '') AND ? <> '' THEN ? ELSE grad END,
          datum_registracije = CASE WHEN datum_registracije IS NULL AND ? <> '' THEN ? ELSE datum_registracije END,
          updated_at = NOW()
        WHERE TRIM(pib) = ?
      `,
      [
        naziv,
        naziv,
        oblikOrganizacije,
        oblikOrganizacije,
        email,
        email,
        telefon,
        telefon,
        kd,
        kd,
        grad,
        grad,
        datumRegistracije,
        datumRegistracije,
        pib,
      ]
    );

    summary.updatedExistingRows += Number(updateResult?.affectedRows || 0);
    return;
  }

  await executeQuery(
    `
      INSERT INTO emails (
        pib,
        naziv,
        oblik_organizacije,
        grad,
        kd,
        email,
        telefon,
        datum_registracije,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
    [
      pib,
      naziv || null,
      oblikOrganizacije || null,
      grad || null,
      kd || null,
      email || null,
      telefon || null,
      datumRegistracije || null,
    ]
  );

  summary.insertedCompanies += 1;
}

async function runAutomaticIrmsImportForPreviousDay(options = {}) {
  const registrationDate = normalizeText(options.registrationDate) || getPreviousDayYmd();

  const summary = {
    registrationDate,
    pagesFetched: 0,
    totalPibsFromIrmsList: 0,
    existingInDatabase: 0,
    sentToIrmsDetails: 0,
    processed: 0,
    invalidPibs: 0,
    irmsFound: 0,
    irmsNotFound: 0,
    insertedCompanies: 0,
    updatedExistingRows: 0,
    skippedNoData: 0,
    errors: 0,
  };

  const { pibs, pagesFetched } = await collectPibsForRegistrationDate(registrationDate);
  summary.pagesFetched = pagesFetched;
  summary.totalPibsFromIrmsList = pibs.length;

  if (!pibs.length) {
    return summary;
  }

  const existingPibs = await findExistingEmailPibs(pibs);
  summary.existingInDatabase = existingPibs.size;

  const pibsForIrms = pibs.filter(pib => !existingPibs.has(pib));
  summary.sentToIrmsDetails = pibsForIrms.length;

  for (const pib of pibsForIrms) {
    try {
      if (!/^\d{8}$/.test(pib)) {
        summary.invalidPibs += 1;
        summary.processed += 1;
        continue;
      }

      await upsertPibFromIrms(pib, summary);
      summary.processed += 1;
    } catch (error) {
      summary.errors += 1;
      summary.processed += 1;
      console.error(`Automatski IRMS import greška za PIB ${pib}:`, error.message);
    }
  }

  return summary;
}

module.exports = {
  runAutomaticIrmsImportForPreviousDay,
  getPreviousDayYmd,
};
