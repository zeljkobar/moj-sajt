const axios = require('axios');

const IRMS_BASE_URL = 'https://irms.tax.gov.me/public/api';
const REQUEST_TIMEOUT_MS = 12000;

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
  const response = await axios.get(`${IRMS_BASE_URL}${path}`, {
    params,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      Accept: 'application/json, text/plain',
    },
  });

  return response.data;
}

async function searchByPIB(pib) {
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

  let owners = [];
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

  return mapToBusinessEntity(detailsData, directors, owners);
}

module.exports = {
  searchByPIB,
};
