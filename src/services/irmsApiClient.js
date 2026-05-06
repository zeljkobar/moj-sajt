const axios = require('axios');

const IRMS_BASE_URL = 'https://irms.tax.gov.me/public/api';
const REQUEST_TIMEOUT_MS = toPositiveInt(
  process.env.IRMS_REQUEST_TIMEOUT_MS,
  12000
);
const MIN_REQUEST_INTERVAL_MS = toNonNegativeInt(
  process.env.IRMS_MIN_REQUEST_INTERVAL_MS,
  900
);
const MAX_RETRIES = toNonNegativeInt(process.env.IRMS_MAX_RETRIES, 5);
const RETRY_BASE_DELAY_MS = toNonNegativeInt(
  process.env.IRMS_RETRY_BASE_DELAY_MS,
  1200
);
const BLOCK_COOLDOWN_MS = toNonNegativeInt(
  process.env.IRMS_COOLDOWN_ON_BLOCK_MS,
  60000
);
const BLOCK_THRESHOLD = toPositiveInt(
  process.env.IRMS_CONSECUTIVE_BLOCK_THRESHOLD,
  4
);

let requestChain = Promise.resolve();
let lastRequestAt = 0;
let blockedUntil = 0;
let consecutiveBlockResponses = 0;

function toPositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function toNonNegativeInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRetryAfterDelayMs(error) {
  const headerValue = error?.response?.headers?.['retry-after'];
  if (!headerValue) return null;

  const seconds = Number.parseInt(headerValue, 10);
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  return null;
}

function isRetryableError(error) {
  const status = Number(error?.response?.status || 0);
  const code = String(error?.code || '').toUpperCase();

  if ([408, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  return [
    'ECONNABORTED',
    'ETIMEDOUT',
    'ECONNRESET',
    'EAI_AGAIN',
    'ENOTFOUND',
  ].includes(code);
}

function computeRetryDelayMs(error, attemptIndex) {
  const retryAfterMs = getRetryAfterDelayMs(error);
  if (retryAfterMs !== null) {
    return retryAfterMs;
  }

  const base = RETRY_BASE_DELAY_MS * Math.pow(2, attemptIndex);
  const jitter = Math.floor(Math.random() * 500);
  return base + jitter;
}

async function scheduleRequest(task) {
  const runTask = async () => {
    const now = Date.now();
    if (blockedUntil > now) {
      await sleep(blockedUntil - now);
    }

    const elapsed = Date.now() - lastRequestAt;
    const waitMs = Math.max(0, MIN_REQUEST_INTERVAL_MS - elapsed);
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    try {
      return await task();
    } finally {
      lastRequestAt = Date.now();
    }
  };

  requestChain = requestChain.then(runTask, runTask);
  return requestChain;
}

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function mapDirector(role) {
  const name = normalizeText(role.name);
  const lastname = normalizeText(role.lastname);
  const fullName = normalizeText(role.fullName) || `${name} ${lastname}`.trim();

  return {
    name,
    lastname,
    role: normalizeText(role.role),
    fullName,
  };
}

function mapOwner(owner) {
  return {
    fullName: normalizeText(owner.fullName),
    percentage: normalizeText(owner.percentage),
  };
}

function mapToBusinessEntity(apiData, directors = [], owners = []) {
  return {
    id: apiData.taxpayerId,
    name: normalizeText(apiData.shortName || apiData.fullName),
    legalName: normalizeText(apiData.fullName) || undefined,
    pib: normalizeText(apiData.identificationNumber),
    registrationNumber: normalizeText(apiData.registrationNumber) || undefined,
    legalForm: normalizeText(apiData.legalStatus) || undefined,
    status: normalizeText(apiData.taxpayerStatusDisplayName) || undefined,
    founded: normalizeText(apiData.registrationDate) || undefined,
    activity: normalizeText(apiData.mainActivity) || undefined,
    address: normalizeText(apiData.address) || undefined,
    city: normalizeText(apiData.city) || undefined,
    email: normalizeText(apiData.email) || undefined,
    phone: normalizeText(apiData.phoneNumber) || undefined,
    webAddress: normalizeText(apiData.website) || undefined,
    capital: normalizeText(apiData.totalCapital) || undefined,
    directors: directors.length > 0 ? directors : undefined,
    owners: owners.length > 0 ? owners : undefined,
    rawData: apiData,
  };
}

async function getJson(path, params = {}) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await scheduleRequest(() =>
        axios.get(`${IRMS_BASE_URL}${path}`, {
          params,
          timeout: REQUEST_TIMEOUT_MS,
          headers: {
            Accept: 'application/json, text/plain',
          },
        })
      );

      consecutiveBlockResponses = 0;
      return response.data;
    } catch (error) {
      const status = Number(error?.response?.status || 0);
      const retryable = isRetryableError(error);

      if (status === 429 || status === 503) {
        consecutiveBlockResponses += 1;
        if (consecutiveBlockResponses >= BLOCK_THRESHOLD) {
          blockedUntil = Date.now() + BLOCK_COOLDOWN_MS;
        }
      }

      const isLastAttempt = attempt >= MAX_RETRIES;
      if (!retryable || isLastAttempt) {
        throw error;
      }

      const delayMs = computeRetryDelayMs(error, attempt);
      await sleep(delayMs);
    }
  }

  return null;
}

async function searchByPIB(pib, options = {}) {
  const includeDirectors = options.includeDirectors !== false;
  const includeOwners = options.includeOwners !== false;

  const searchData = await getJson('/business-entities', {
    page: 1,
    perPage: 5,
    identificationNumber: pib,
  });

  const businessEntity = searchData.results?.[0];
  if (!businessEntity?.taxpayerId) {
    return null;
  }

  const entityId = businessEntity.taxpayerId;
  const detailsData = await getJson(`/business-entity/${entityId}`);

  let directors = [];
  if (includeDirectors) {
    try {
      const rolesData = await getJson(`/business-entity/${entityId}/ownership-roles`, {
        id: entityId,
        page: 1,
        perPage: 25,
      });
      directors = (rolesData.results || []).map(mapDirector);
    } catch (error) {
      directors = [];
    }
  }

  let owners = [];
  if (includeOwners) {
    try {
      const ownersData = await getJson(`/business-entity/${entityId}/owners`, {
        id: entityId,
        page: 1,
        perPage: 25,
      });
      owners = (ownersData.results || []).map(mapOwner);
    } catch (error) {
      owners = [];
    }
  }

  return mapToBusinessEntity(detailsData, directors, owners);
}

module.exports = {
  searchByPIB,
};
