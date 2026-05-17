const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiting');
const irmsApiClient = require('../services/irmsApiClient');

const ROOT_DIR = path.join(__dirname, '..', '..');
const IRMS_LOOKUPS_PATH = path.join(ROOT_DIR, 'scripts', 'irms-lookups.json');
const TAXPAYER_STATUSES = [
  { id: 11, name: 'Registrovan' },
  { id: 11, name: 'Aktivan' },
  { id: 9, name: 'Prestanak registracije' },
  { id: 12, name: 'U stecaju' },
];

function readIrmsLookups() {
  try {
    if (!fs.existsSync(IRMS_LOOKUPS_PATH)) {
      return { municipalities: [], legalStatuses: [] };
    }

    const raw = fs.readFileSync(IRMS_LOOKUPS_PATH, 'utf8');
    const parsed = JSON.parse(raw || '{}');

    const municipalities = Array.isArray(parsed?.municipalities)
      ? parsed.municipalities
      : [];
    const legalStatuses = Array.isArray(parsed?.legalStatuses)
      ? parsed.legalStatuses
      : [];

    return { municipalities, legalStatuses };
  } catch (error) {
    return { municipalities: [], legalStatuses: [] };
  }
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeCompareText(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toSafePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function resolveLookupId(rawValue, items = []) {
  const text = normalizeText(rawValue);
  if (!text) return null;

  const direct = Number.parseInt(text, 10);
  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  const normalizedText = normalizeCompareText(text);
  const found = items.find(item => normalizeCompareText(item.name) === normalizedText);
  if (!found) return null;
  return Number.parseInt(found.id, 10);
}

router.get('/lookups', authMiddleware, rateLimiter.api, async (req, res) => {
  const data = readIrmsLookups();

  res.json({
    success: true,
    data: {
      ...data,
      taxpayerStatuses: TAXPAYER_STATUSES,
    },
  });
});

router.post(
  '/search-entities',
  authMiddleware,
  rateLimiter.api,
  async (req, res) => {
    try {
      const lookups = readIrmsLookups();
      const body = req.body || {};

      const legalStatusId = resolveLookupId(
        body.legalStatusId || body.legalStatus,
        lookups.legalStatuses || []
      );
      const municipalityId = resolveLookupId(
        body.municipalityId || body.municipality,
        lookups.municipalities || []
      );
      const taxpayerStatusId = resolveLookupId(
        body.taxpayerStatusId || body.taxpayerStatus,
        TAXPAYER_STATUSES
      );

      const filters = {
        page: toSafePositiveInt(body.page, 1),
        perPage: Math.min(100, toSafePositiveInt(body.perPage, 100)),
      };

      const tradeClassificationCode = normalizeText(body.tradeClassificationCode);
      const registrationDate = normalizeText(body.registrationDate);
      const fullName = normalizeText(body.fullName || body.companyName);
      const registrationNumber = normalizeText(body.registrationNumber);
      const identificationNumber = normalizeText(
        body.identificationNumber || body.pib
      );

      if (tradeClassificationCode) filters.tradeClassificationCode = tradeClassificationCode;
      if (registrationDate) filters.registrationDate = registrationDate;
      if (fullName) filters.fullName = fullName;
      if (registrationNumber) filters.registrationNumber = registrationNumber;
      if (identificationNumber) filters.identificationNumber = identificationNumber;
      if (legalStatusId) filters.legalStatusId = legalStatusId;
      if (municipalityId) filters.municipalityId = municipalityId;
      if (taxpayerStatusId) filters.taxpayerStatusId = taxpayerStatusId;

      const results = await irmsApiClient.searchBusinessEntities(filters);

      res.json({
        success: true,
        appliedFilters: filters,
        data: results,
      });
    } catch (error) {
      console.error('Greška pri IRMS pretrazi liste subjekata:', error.message);
      res.status(502).json({
        success: false,
        message: 'IRMS servis trenutno nije dostupan',
      });
    }
  }
);

router.post('/search', authMiddleware, rateLimiter.api, async (req, res) => {
  try {
    const pib = String(req.body?.pib || '').trim();

    if (!pib) {
      return res.status(400).json({ message: 'PIB je obavezan' });
    }

    if (!/^\d{8}$/.test(pib)) {
      return res.status(400).json({ message: 'PIB mora imati 8 cifara' });
    }

    const result = await irmsApiClient.searchByPIB(pib);

    if (!result) {
      return res.status(404).json({
        message: 'Privredni subjekat sa ovim PIB-om nije pronađen u IRMS-u',
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Greška pri IRMS pretrazi:', error.message);
    res.status(502).json({
      message: 'IRMS servis trenutno nije dostupan',
    });
  }
});

module.exports = router;
