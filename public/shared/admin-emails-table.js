const state = {
  page: 1,
  pageSize: 100,
  total: 0,
  totalPages: 1,
  sortBy: 'updated_at',
  sortDir: 'desc',
  filters: {
    pib: '',
    naziv: '',
    oblik_organizacije: '',
    grad: '',
    kd: '',
    email: '',
    telefon: '',
    broj_zaposlenih: '',
    prihod: '',
    datum_registracije: '',
    created_at: '',
    updated_at: '',
    mail_knjigovodje: '',
  },
  selectedPibs: new Set(),
  visibleRows: [],
  updateJobId: null,
  updatePollingTimer: null,
  addPibsJobId: null,
  addPibsPollingTimer: null,
  legalStatusMap: {},
  municipalityMap: {},
  currentCompany: null,
};

const UPDATE_FIELD_LABELS = {
  naziv: 'Naziv ažuriran',
  oblik_organizacije: 'Oblik organizacije ažuriran',
  grad: 'Grad ažuriran',
  kd: 'KD ažuriran',
  email: 'Email ažuriran',
  telefon: 'Telefon ažuriran',
  broj_zaposlenih: 'Broj zaposlenih ažuriran',
  prihod: 'Prihod ažuriran',
  datum_registracije: 'Datum registracije ažuriran',
};

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('sr-RS');
}

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('sr-RS');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanPib(value) {
  return String(value || '').trim();
}

const DETAILS_FIELD_LABELS = {
  id: 'ID',
  pib: 'PIB',
  naziv: 'Naziv',
  oblik_organizacije: 'Oblik organizacije',
  grad: 'Grad',
  kd: 'KD',
  email: 'Email',
  telefon: 'Telefon',
  broj_zaposlenih: 'Broj zaposlenih',
  prihod: 'Prihod',
  datum_registracije: 'Datum registracije',
  web: 'Web',
  tip_firme: 'Tip firme',
  kategorija_prihoda: 'Kategorija prihoda',
  opted_in: 'Opted-in',
  created_at: 'Kreiran',
  updated_at: 'Ažuriran',
};

const DETAILS_PRIMARY_ORDER = [
  'pib',
  'naziv',
  'oblik_organizacije',
  'grad',
  'kd',
  'email',
  'telefon',
  'broj_zaposlenih',
  'prihod',
  'datum_registracije',
  'web',
  'tip_firme',
  'kategorija_prihoda',
  'opted_in',
  'created_at',
  'updated_at',
  'id',
];

function detailsFieldLabel(field) {
  if (Object.prototype.hasOwnProperty.call(DETAILS_FIELD_LABELS, field)) {
    return DETAILS_FIELD_LABELS[field];
  }

  return String(field || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function detailsFieldValue(field, value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return '<span class="text-muted">-</span>';
  }

  if (field === 'oblik_organizacije') {
    return escapeHtml(displayOrganizationType(value));
  }

  if (field === 'grad') {
    return escapeHtml(displayMunicipality(value));
  }

  if (field === 'opted_in') {
    return Number(value) === 1 ? 'Da' : 'Ne';
  }

  if (field === 'datum_registracije') {
    return escapeHtml(formatDate(value));
  }

  if (field === 'created_at' || field === 'updated_at') {
    return escapeHtml(formatDateTime(value));
  }

  return escapeHtml(value);
}

function renderCompanyDetails(company) {
  state.currentCompany = company;

  const keys = Object.keys(company || {});
  const orderedKeys = [
    ...DETAILS_PRIMARY_ORDER.filter(key => keys.includes(key)),
    ...keys.filter(key => !DETAILS_PRIMARY_ORDER.includes(key)),
  ];

  const rowsHtml = orderedKeys
    .map(
      key => `
      <tr>
        <th>${escapeHtml(detailsFieldLabel(key))}</th>
        <td>${detailsFieldValue(key, company[key])}</td>
      </tr>
    `
    )
    .join('');

  document.getElementById('companyDetailsBody').innerHTML = rowsHtml;
  document.getElementById('companyDetailsLoading').style.display = 'none';
  document.getElementById('companyDetailsContent').style.display = 'block';

  // Reset edit buttons
  document.getElementById('editCompanyBtn').classList.remove('d-none');
  document.getElementById('saveCompanyBtn').classList.add('d-none');
  document.getElementById('cancelEditBtn').classList.add('d-none');
}

const READONLY_FIELDS = new Set([
  'id', 'pib', 'created_at', 'updated_at', 'source', 'status',
  'datum_dodavanja', 'poslednja_aktivnost', 'ukupno_poslato',
  'ukupno_otvoreno', 'ukupno_kliknuto', 'poslednji_email',
]);

function enterEditMode() {
  const company = state.currentCompany;
  if (!company) return;

  const keys = Object.keys(company);
  const orderedKeys = [
    ...DETAILS_PRIMARY_ORDER.filter(key => keys.includes(key)),
    ...keys.filter(key => !DETAILS_PRIMARY_ORDER.includes(key)),
  ];

  const rowsHtml = orderedKeys.map(key => {
    const label = escapeHtml(detailsFieldLabel(key));
    const val = company[key] ?? '';

    if (READONLY_FIELDS.has(key)) {
      return `<tr><th>${label}</th><td>${detailsFieldValue(key, company[key])}</td></tr>`;
    }

    const safeVal = escapeHtml(String(val === null || val === undefined ? '' : val));

    if (key === 'opted_in') {
      const sel0 = Number(val) !== 1 ? ' selected' : '';
      const sel1 = Number(val) === 1 ? ' selected' : '';
      return `<tr><th>${label}</th><td>
        <select class="form-select form-select-sm" data-field="${key}">
          <option value="0"${sel0}>Ne</option>
          <option value="1"${sel1}>Da</option>
        </select></td></tr>`;
    }

    if (key === 'napomene') {
      return `<tr><th>${label}</th><td>
        <textarea class="form-control form-control-sm" data-field="${key}" rows="2">${safeVal}</textarea>
        </td></tr>`;
    }

    const type = key === 'email' || key === 'mail_knjigovodje' ? 'email'
      : key === 'datum_registracije' ? 'date'
      : (key === 'broj_zaposlenih' || key === 'prihod') ? 'number'
      : 'text';

    const dateVal = key === 'datum_registracije' && val
      ? String(val).slice(0, 10) : safeVal;

    return `<tr><th>${label}</th><td>
      <input type="${type}" class="form-control form-control-sm" data-field="${key}" value="${dateVal}">
      </td></tr>`;
  }).join('');

  document.getElementById('companyDetailsBody').innerHTML = rowsHtml;
  document.getElementById('editCompanyBtn').classList.add('d-none');
  document.getElementById('saveCompanyBtn').classList.remove('d-none');
  document.getElementById('cancelEditBtn').classList.remove('d-none');
}

function cancelEditMode() {
  if (state.currentCompany) {
    renderCompanyDetails(state.currentCompany);
  }
}

async function saveCompanyEdit() {
  const company = state.currentCompany;
  if (!company) return;

  const pib = cleanPib(company.pib);
  if (!pib) return;

  const payload = {};
  document.querySelectorAll('#companyDetailsBody [data-field]').forEach(el => {
    payload[el.dataset.field] = el.value;
  });

  const saveBtn = document.getElementById('saveCompanyBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Čuvam...';

  try {
    const response = await fetch(
      `/api/email-admin/table/company/${encodeURIComponent(pib)}`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Greška pri čuvanju');
    }

    // Osvježi podatke iz baze
    const resp2 = await fetch(
      `/api/email-admin/table/company/${encodeURIComponent(pib)}`,
      { credentials: 'include' }
    );
    const result2 = await resp2.json();
    renderCompanyDetails(result2.data?.company || company);

    // Osvježi red u tabeli
    loadTableData();
  } catch (error) {
    alert('Greška: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Sačuvaj';
  }
}

async function showCompanyDetails(pib) {
  const clean = cleanPib(pib);
  if (!clean) return;

  const modalElement = document.getElementById('companyDetailsModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

  document.getElementById('companyDetailsLoading').style.display = 'block';
  document.getElementById('companyDetailsContent').style.display = 'none';
  document.getElementById('companyDetailsBody').innerHTML = '';
  document.getElementById('editCompanyBtn').classList.remove('d-none');
  document.getElementById('saveCompanyBtn').classList.add('d-none');
  document.getElementById('cancelEditBtn').classList.add('d-none');
  state.currentCompany = null;
  modal.show();

  try {
    const response = await fetch(
      `/api/email-admin/table/company/${encodeURIComponent(clean)}`,
      { credentials: 'include' }
    );
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Greška pri učitavanju detalja firme');
    }

    renderCompanyDetails(result.data?.company || {});
  } catch (error) {
    document.getElementById('companyDetailsLoading').style.display = 'none';
    document.getElementById('companyDetailsContent').style.display = 'block';
    document.getElementById('companyDetailsBody').innerHTML = `
      <tr>
        <td colspan="2" class="text-danger py-3">${escapeHtml(error.message || 'Greška pri učitavanju detalja.')}</td>
      </tr>
    `;
  }
}

function normalizeLookupKey(value) {
  return String(value ?? '').trim();
}

function displayOrganizationType(value) {
  const clean = normalizeLookupKey(value);
  if (!clean) return '';

  if (Object.prototype.hasOwnProperty.call(state.legalStatusMap, clean)) {
    return state.legalStatusMap[clean];
  }

  return clean;
}

function displayMunicipality(value) {
  const clean = normalizeLookupKey(value);
  if (!clean) return '';

  if (Object.prototype.hasOwnProperty.call(state.municipalityMap, clean)) {
    return state.municipalityMap[clean];
  }

  return clean;
}

async function loadIrmsLookups() {
  try {
    const response = await fetch('/api/irms/lookups', {
      credentials: 'include',
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      return;
    }

    const data = result.data || {};
    const legalStatuses = Array.isArray(data.legalStatuses)
      ? data.legalStatuses
      : [];
    const municipalities = Array.isArray(data.municipalities)
      ? data.municipalities
      : [];

    state.legalStatusMap = legalStatuses.reduce((acc, row) => {
      const id = normalizeLookupKey(row?.id);
      const name = normalizeLookupKey(row?.name);
      if (id && name) {
        acc[id] = name;
      }
      return acc;
    }, {});

    state.municipalityMap = municipalities.reduce((acc, row) => {
      const id = normalizeLookupKey(row?.id);
      const name = normalizeLookupKey(row?.name);
      if (id && name) {
        acc[id] = name;
      }
      return acc;
    }, {});
  } catch (_) {
    // If lookup loading fails, raw DB values are still shown.
  }
}

function updateSelectionUI() {
  document.getElementById('selectedCount').textContent =
    state.selectedPibs.size.toLocaleString('sr-RS');

  const updateBtn = document.getElementById('updateSelectedBtn');
  updateBtn.disabled = state.selectedPibs.size === 0;

  const campaignBtn = document.getElementById('launchCampaignFromTableBtn');
  if (campaignBtn) campaignBtn.disabled = state.selectedPibs.size === 0;

  const pageCheckbox = document.getElementById('selectPageCheckbox');
  if (!pageCheckbox) return;

  const visiblePibs = state.visibleRows
    .map(row => cleanPib(row.pib))
    .filter(Boolean);

  if (!visiblePibs.length) {
    pageCheckbox.checked = false;
    pageCheckbox.indeterminate = false;
    return;
  }

  const selectedVisible = visiblePibs.filter(pib =>
    state.selectedPibs.has(pib)
  ).length;
  pageCheckbox.checked = selectedVisible === visiblePibs.length;
  pageCheckbox.indeterminate =
    selectedVisible > 0 && selectedVisible < visiblePibs.length;
}

function setProgressVisibility(visible) {
  const box = document.getElementById('irmsProgressBox');
  box.style.display = visible ? 'block' : 'none';
}

function setAddPibsProgressVisibility(visible) {
  const box = document.getElementById('addPibsProgressBox');
  box.style.display = visible ? 'block' : 'none';
}

function updateProgressBar(progress = 0, text = 'Spremno.') {
  const safeProgress = Math.max(0, Math.min(100, Number(progress || 0)));
  document.getElementById('irmsProgressFill').style.width = `${safeProgress}%`;
  document.getElementById('irmsProgressPercent').textContent =
    `${safeProgress.toFixed(1)}%`;
  document.getElementById('irmsProgressText').textContent = text;
}

function updateAddPibsProgressBar(progress = 0, text = 'Spremno.') {
  const safeProgress = Math.max(0, Math.min(100, Number(progress || 0)));
  document.getElementById('addPibsProgressFill').style.width =
    `${safeProgress}%`;
  document.getElementById('addPibsProgressPercent').textContent =
    `${safeProgress.toFixed(1)}%`;
  document.getElementById('addPibsProgressText').textContent = text;
}

function stopUpdatePolling() {
  if (state.updatePollingTimer) {
    clearInterval(state.updatePollingTimer);
    state.updatePollingTimer = null;
  }
}

function stopAddPibsPolling() {
  if (state.addPibsPollingTimer) {
    clearInterval(state.addPibsPollingTimer);
    state.addPibsPollingTimer = null;
  }
}

function restoreUpdateButton() {
  const button = document.getElementById('updateSelectedBtn');
  button.disabled = state.selectedPibs.size === 0;
  button.innerHTML =
    '<i class="fas fa-cloud-arrow-up me-1"></i>Update selektovanih (IRMS)';
  const cancelBtn = document.getElementById('cancelIrmsUpdateBtn');
  if (cancelBtn) {
    cancelBtn.disabled = true;
  }
}

function restoreAddPibsButton() {
  const button = document.getElementById('addPibsBtn');
  button.disabled = false;
  button.innerHTML = '<i class="fas fa-plus me-1"></i>Dodaj PIB-ove';
  const cancelBtn = document.getElementById('cancelAddPibsBtn');
  if (cancelBtn) {
    cancelBtn.disabled = true;
  }
}

async function pollUpdateStatus() {
  if (!state.updateJobId) return;

  try {
    const response = await fetch(
      `/api/email-admin/table/update-irms/status/${encodeURIComponent(state.updateJobId)}`,
      { credentials: 'include' }
    );

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Greška pri čitanju statusa update-a');
    }

    const job = result.job || {};
    const summary = job.summary || {};
    updateProgressBar(
      Number(job.progress || 0),
      `Obrađeno ${job.processed || 0}/${job.total || 0} PIB-ova${job.currentPib ? ` (trenutni: ${job.currentPib})` : ''}`
    );

    if (job.status === 'completed') {
      stopUpdatePolling();
      state.updateJobId = null;
      restoreUpdateButton();

      const fieldUpdates = summary.fieldUpdates || {};
      const dynamicUpdateLines = Object.entries(fieldUpdates)
        .filter(([, count]) => Number(count || 0) > 0)
        .map(
          ([field, count]) => `${UPDATE_FIELD_LABELS[field] || field}: ${count}`
        );

      const fieldSummaryText =
        dynamicUpdateLines.length > 0
          ? `${dynamicUpdateLines.join('\n')}\n`
          : '';

      alert(
        `IRMS update završen.\n` +
          `PIB-ova obrađeno: ${summary.uniquePibs || 0}\n` +
          `Ažuriranih redova: ${summary.updatedRows || 0}\n` +
          fieldSummaryText +
          `Nije nađeno u IRMS: ${summary.irmsNotFound || 0}\n` +
          `Greške: ${summary.errors || 0}`
      );

      state.selectedPibs.clear();
      await loadTable();
      setTimeout(() => {
        setProgressVisibility(false);
      }, 1200);
      return;
    }

    if (job.status === 'cancelled') {
      stopUpdatePolling();
      state.updateJobId = null;
      restoreUpdateButton();
      updateProgressBar(
        Number(job.progress || 0),
        'Update je otkazan od strane korisnika.'
      );
      alert('IRMS update je uspešno otkazan.');
      await loadTable();
      setTimeout(() => {
        setProgressVisibility(false);
      }, 1200);
      return;
    }

    if (job.status === 'failed') {
      stopUpdatePolling();
      state.updateJobId = null;
      restoreUpdateButton();
      updateProgressBar(
        Number(job.progress || 0),
        'Update je prekinut greškom.'
      );
      alert('IRMS update je prekinut greškom. Pokušajte ponovo.');
    }
  } catch (error) {
    console.error('Polling update status error:', error);
    stopUpdatePolling();
    state.updateJobId = null;
    restoreUpdateButton();
    updateProgressBar(0, error.message || 'Greška pri praćenju napretka.');
    alert(error.message || 'Greška pri praćenju napretka update-a');
  }
}

async function pollAddPibsStatus() {
  if (!state.addPibsJobId) return;

  try {
    const response = await fetch(
      `/api/email-admin/table/add-pibs/status/${encodeURIComponent(state.addPibsJobId)}`,
      { credentials: 'include' }
    );
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(
        result.message || 'Greška pri čitanju statusa dodavanja PIB-ova'
      );
    }

    const job = result.job || {};
    const summary = job.summary || {};
    updateAddPibsProgressBar(
      Number(job.progress || 0),
      `Obrađeno ${job.processed || 0}/${job.total || 0} PIB-ova${job.currentPib ? ` (trenutni: ${job.currentPib})` : ''}`
    );

    if (job.status === 'completed') {
      stopAddPibsPolling();
      state.addPibsJobId = null;
      restoreAddPibsButton();

      alert(
        `Dodavanje firmi završeno.\n` +
          `PIB-ova obrađeno: ${summary.uniquePibs || 0}\n` +
          `Ubačenih novih firmi: ${summary.insertedCompanies || 0}\n` +
          `Ažuriranih postojećih redova: ${summary.updatedExistingRows || 0}\n` +
          `Nije nađeno u IRMS: ${summary.irmsNotFound || 0}\n` +
          `Nevalidnih PIB-ova: ${summary.invalidPibs || 0}\n` +
          `Greške: ${summary.errors || 0}`
      );

      await loadTable();
      setTimeout(() => {
        setAddPibsProgressVisibility(false);
      }, 1200);
      return;
    }

    if (job.status === 'cancelled') {
      stopAddPibsPolling();
      state.addPibsJobId = null;
      restoreAddPibsButton();
      updateAddPibsProgressBar(
        Number(job.progress || 0),
        'Dodavanje je otkazano od strane korisnika.'
      );
      alert('Dodavanje PIB-ova je uspešno otkazano.');
      await loadTable();
      setTimeout(() => {
        setAddPibsProgressVisibility(false);
      }, 1200);
      return;
    }

    if (job.status === 'failed') {
      stopAddPibsPolling();
      state.addPibsJobId = null;
      restoreAddPibsButton();
      updateAddPibsProgressBar(
        Number(job.progress || 0),
        'Dodavanje je prekinuto greškom.'
      );
      alert('Dodavanje PIB-ova je prekinuto greškom. Pokušajte ponovo.');
    }
  } catch (error) {
    console.error('Polling add PIBs status error:', error);
    stopAddPibsPolling();
    state.addPibsJobId = null;
    restoreAddPibsButton();
    updateAddPibsProgressBar(
      0,
      error.message || 'Greška pri praćenju napretka.'
    );
    alert(error.message || 'Greška pri praćenju napretka dodavanja PIB-ova');
  }
}

function normalizePibInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 7) return `0${digits}`;
  return digits;
}

function parsePibList(text) {
  return [
    ...new Set(
      String(text || '')
        .split(/[\s,;]+/)
        .map(normalizePibInput)
        .filter(pib => /^\d{8}$/.test(pib))
    ),
  ];
}

function showAddPibsModal() {
  const modalElement = document.getElementById('addPibsModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  modal.show();
}

async function startAddPibsFromIrms(pibs) {
  if (!Array.isArray(pibs) || pibs.length === 0) {
    alert('Unesite bar jedan validan PIB.');
    return;
  }

  const confirmed = window.confirm(
    `Da li želite dodavanje/azuriranje ${pibs.length} PIB-ova iz IRMS-a?`
  );
  if (!confirmed) return;

  const button = document.getElementById('addPibsBtn');
  button.disabled = true;
  button.innerHTML =
    '<i class="fas fa-spinner fa-spin me-1"></i>Dodavanje u toku...';

  const cancelBtn = document.getElementById('cancelAddPibsBtn');
  cancelBtn.disabled = true;

  setAddPibsProgressVisibility(true);
  updateAddPibsProgressBar(0, 'Pokretanje dodavanja PIB-ova...');

  try {
    const response = await fetch('/api/email-admin/table/add-pibs', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pibs }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(
        result.message || 'Greška pri pokretanju dodavanja PIB-ova'
      );
    }

    state.addPibsJobId = result.job?.id || null;
    if (!state.addPibsJobId) {
      throw new Error('Dodavanje nije pokrenuto ispravno');
    }

    cancelBtn.disabled = false;
    stopAddPibsPolling();
    await pollAddPibsStatus();
    state.addPibsPollingTimer = setInterval(() => {
      pollAddPibsStatus();
    }, 1000);
  } catch (error) {
    console.error('Add PIBs error:', error);
    alert(error.message || 'Greška pri dodavanju PIB-ova');
    setAddPibsProgressVisibility(false);
    cancelBtn.disabled = true;
    restoreAddPibsButton();
  }
}

async function cancelAddPibsJob() {
  if (!state.addPibsJobId) {
    alert('Nema aktivnog dodavanja za cancel.');
    return;
  }

  const confirmed = window.confirm(
    'Da li želite da prekinete aktivno dodavanje PIB-ova?'
  );
  if (!confirmed) return;

  const cancelBtn = document.getElementById('cancelAddPibsBtn');
  cancelBtn.disabled = true;

  try {
    const response = await fetch(
      `/api/email-admin/table/add-pibs/cancel/${encodeURIComponent(state.addPibsJobId)}`,
      {
        method: 'POST',
        credentials: 'include',
      }
    );
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(
        result.message || 'Greška pri otkazivanju dodavanja PIB-ova'
      );
    }

    updateAddPibsProgressBar(
      Number(result.job?.progress || 0),
      'Zahtev za otkazivanje je poslat. Čekam potvrdu...'
    );
  } catch (error) {
    console.error('Cancel add PIBs error:', error);
    alert(error.message || 'Greška pri otkazivanju dodavanja PIB-ova');
  } finally {
    if (state.addPibsJobId) {
      cancelBtn.disabled = false;
    }
  }
}

function buildQuery() {
  const params = new URLSearchParams();
  params.set('page', String(state.page));
  params.set('pageSize', String(state.pageSize));
  params.set('sortBy', state.sortBy);
  params.set('sortDir', state.sortDir);

  Object.entries(state.filters).forEach(([key, value]) => {
    const clean = String(value || '').trim();
    if (clean) {
      params.set(`filter_${key}`, clean);
    }
  });

  return params.toString();
}

function renderTable(rows) {
  state.visibleRows = rows;

  const tbody = document.getElementById('emailsTableBody');
  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="14" class="text-center text-muted py-4">Nema rezultata za zadate filtere.</td></tr>';
    updateSelectionUI();
    return;
  }

  tbody.innerHTML = rows
    .map(row => {
      const pib = cleanPib(row.pib);
      const checked = pib && state.selectedPibs.has(pib) ? 'checked' : '';

      return `
      <tr class="company-row" data-pib="${escapeHtml(pib)}">
        <td class="col-select"><input class="row-select" type="checkbox" data-pib="${escapeHtml(pib)}" ${checked} ${pib ? '' : 'disabled'} /></td>
        <td>${escapeHtml(row.pib)}</td>
        <td>${escapeHtml(row.naziv)}</td>
        <td>${escapeHtml(displayOrganizationType(row.oblik_organizacije))}</td>
        <td>${escapeHtml(displayMunicipality(row.grad))}</td>
        <td>${escapeHtml(row.kd)}</td>
        <td>${escapeHtml(row.email)}</td>
        <td>${escapeHtml(row.telefon)}</td>
        <td>${escapeHtml(row.broj_zaposlenih)}</td>
        <td>${escapeHtml(row.prihod)}</td>
        <td>${escapeHtml(formatDate(row.datum_registracije))}</td>
        <td>${escapeHtml(formatDate(row.created_at))}</td>
        <td>${escapeHtml(formatDate(row.updated_at))}</td>
        <td>${row.mail_knjigovodje ? `<span class="badge bg-warning text-dark" title="${escapeHtml(row.mail_knjigovodje)}">knjig.</span>` : ''}</td>
      </tr>
    `;
    })
    .join('');

  tbody.querySelectorAll('.row-select').forEach(checkbox => {
    checkbox.addEventListener('change', e => {
      const pib = cleanPib(e.target.getAttribute('data-pib'));
      if (!pib) return;

      if (e.target.checked) {
        state.selectedPibs.add(pib);
      } else {
        state.selectedPibs.delete(pib);
      }

      updateSelectionUI();
    });
  });

  tbody.querySelectorAll('.company-row').forEach(tableRow => {
    tableRow.addEventListener('click', event => {
      if (event.target.closest('.row-select')) {
        return;
      }

      const pib = cleanPib(tableRow.getAttribute('data-pib'));
      if (!pib) return;
      showCompanyDetails(pib);
    });
  });

  updateSelectionUI();
}

function updatePager() {
  document.getElementById('totalCount').textContent =
    state.total.toLocaleString('sr-RS');
  document.getElementById('pageInfo').textContent =
    `Strana ${state.page} / ${state.totalPages}`;
  document.getElementById('prevPageBtn').disabled = state.page <= 1;
  document.getElementById('nextPageBtn').disabled =
    state.page >= state.totalPages;
}

async function loadTable() {
  const tbody = document.getElementById('emailsTableBody');
  tbody.innerHTML =
    '<tr><td colspan="14" class="text-center text-muted py-4">Učitavanje...</td></tr>';

  try {
    const response = await fetch(`/api/email-admin/table?${buildQuery()}`, {
      credentials: 'include',
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Greška pri učitavanju podataka');
    }

    const data = result.data || {};
    const rows = data.rows || [];
    const pagination = data.pagination || {};

    state.total = Number(pagination.total || 0);
    state.totalPages = Number(pagination.totalPages || 1);

    renderTable(rows);
    updatePager();
  } catch (error) {
    console.error('Emails table load error:', error);
    tbody.innerHTML = `<tr><td colspan="14" class="text-center text-danger py-4">${escapeHtml(error.message)}</td></tr>`;
    state.total = 0;
    state.totalPages = 1;
    updatePager();
    updateSelectionUI();
  }
}

async function selectAllFiltered() {
  state.visibleRows.forEach(row => {
    const pib = cleanPib(row.pib);
    if (!pib) return;
    state.selectedPibs.add(pib);
  });

  renderTable(state.visibleRows);
}

async function selectAllFromFilter() {
  const btn = document.getElementById('selectAllFilteredBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Učitavam...';

  try {
    const filters = { ...state.filters };
    const response = await fetch('/api/email-admin/table/select-all', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Greška');

    const pibs = result.data?.pibs || [];
    pibs.forEach(pib => state.selectedPibs.add(pib));
    renderTable(state.visibleRows);
    alert(`Selektovano ${pibs.length.toLocaleString('sr-RS')} PIB-ova.`);
  } catch (err) {
    alert('Greška: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-list-check me-1"></i>Selektuj sve rezultate';
  }
}

function showCampaignModal() {
  if (state.selectedPibs.size === 0) {
    alert('Nema selektovanih PIB-ova.');
    return;
  }
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('campaignName').placeholder = `Kampanja ${today}`;
  document.getElementById('campaignPibCount').textContent =
    state.selectedPibs.size.toLocaleString('sr-RS');
  document.getElementById('campaignRecipientEstimate').textContent = 'računam...';

  // Procjena stvarnih primaoca (bez mail_knjigovodje ako je čekirano)
  const skipBookkeeper = document.getElementById('campaignSkipBookkeeper').checked;
  const filtered = state.visibleRows.filter(r =>
    state.selectedPibs.has(cleanPib(r.pib)) && r.email &&
    (!skipBookkeeper || !r.mail_knjigovodje)
  ).length;
  document.getElementById('campaignRecipientEstimate').textContent =
    `~${filtered} (vidljivi); tačan broj biće izračunat pri pokretanju`;

  bootstrap.Modal.getOrCreateInstance(document.getElementById('campaignModal')).show();
}

async function launchCampaign() {
  const today = new Date().toISOString().split('T')[0];
  const campaignName =
    document.getElementById('campaignName').value.trim() || `Kampanja ${today}`;
  const subject = document.getElementById('campaignSubject').value.trim();
  const template = document.getElementById('campaignTemplate').value;
  const senderName = document.getElementById('campaignSenderName').value.trim();
  const senderEmail = document.getElementById('campaignSenderEmail').value.trim();
  const skipBookkeeper = document.getElementById('campaignSkipBookkeeper').checked;

  const btn = document.getElementById('launchCampaignBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Pokrećem...';

  try {
    const response = await fetch('/api/email-admin/table/launch-campaign', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pibs: Array.from(state.selectedPibs),
        campaignName,
        subject,
        template,
        senderName,
        senderEmail,
        skipBookkeeper,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.success)
      throw new Error(result.message || 'Greška pri pokretanju kampanje');

    bootstrap.Modal.getOrCreateInstance(
      document.getElementById('campaignModal')
    ).hide();
    alert(
      `✅ Kampanja pokrenuta!\n${result.total} primaoca.\nPreusmjeravam na marketing stranicu...`
    );
    window.location.href = '/shared/email-marketing.html';
  } catch (err) {
    alert('Greška: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Pokreni kampanju';
  }
}

async function cancelRunningUpdate() {
  if (!state.updateJobId) {
    alert('Nema aktivnog update-a za cancel.');
    return;
  }

  const confirmed = window.confirm(
    'Da li želite da prekinete aktivni IRMS update?'
  );
  if (!confirmed) return;

  const cancelBtn = document.getElementById('cancelIrmsUpdateBtn');
  cancelBtn.disabled = true;

  try {
    const response = await fetch(
      `/api/email-admin/table/update-irms/cancel/${encodeURIComponent(state.updateJobId)}`,
      {
        method: 'POST',
        credentials: 'include',
      }
    );

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Greška pri otkazivanju update-a');
    }

    updateProgressBar(
      Number(result.job?.progress || 0),
      'Zahtev za otkazivanje je poslat. Čekam potvrdu...'
    );
  } catch (error) {
    console.error('Cancel update error:', error);
    alert(error.message || 'Greška pri otkazivanju update-a');
  } finally {
    if (state.updateJobId) {
      cancelBtn.disabled = false;
    }
  }
}

function getSelectedUpdateFieldsFromModal() {
  return Array.from(
    document.querySelectorAll('input[name="updateField"]:checked')
  ).map(checkbox => checkbox.value);
}

function showUpdateOptionsModal() {
  if (state.selectedPibs.size === 0) {
    alert('Nema selektovanih PIB-ova.');
    return;
  }

  document.getElementById('updateOptionsSelectedCount').textContent =
    state.selectedPibs.size.toLocaleString('sr-RS');

  const modalElement = document.getElementById('updateOptionsModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  modal.show();
}

async function updateSelectedFromIrms(options = {}) {
  if (state.selectedPibs.size === 0) {
    alert('Nema selektovanih PIB-ova.');
    return;
  }

  const selectedFields = Array.isArray(options.fields) ? options.fields : [];
  if (!selectedFields.length) {
    alert('Izaberi bar jedno polje za ažuriranje.');
    return;
  }

  const overwriteExisting = Boolean(options.overwriteExisting);

  const total = state.selectedPibs.size;
  const fieldText = selectedFields
    .map(field => UPDATE_FIELD_LABELS[field]?.replace(' ažuriran', '') || field)
    .join(', ');
  const confirmed = window.confirm(
    `Da li želite IRMS update za ${total} selektovanih PIB-ova?\n` +
      `Polja: ${fieldText}\n` +
      `Režim: ${overwriteExisting ? 'Ažuriraj i postojeće vrednosti' : 'Samo prazna polja'}`
  );
  if (!confirmed) return;

  const button = document.getElementById('updateSelectedBtn');
  const oldHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Pokrećem...';
  const cancelBtn = document.getElementById('cancelIrmsUpdateBtn');
  cancelBtn.disabled = true;

  setProgressVisibility(true);
  updateProgressBar(0, 'Pokretanje IRMS update-a...');

  try {
    const response = await fetch('/api/email-admin/table/update-irms', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pibs: Array.from(state.selectedPibs),
        fields: selectedFields,
        overwriteExisting,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Greška pri IRMS update-u');
    }

    state.updateJobId = result.job?.id || null;
    if (!state.updateJobId) {
      throw new Error('Update job nije pokrenut ispravno');
    }

    button.innerHTML =
      '<i class="fas fa-spinner fa-spin me-1"></i>Update u toku...';
    cancelBtn.disabled = false;

    stopUpdatePolling();
    await pollUpdateStatus();
    state.updatePollingTimer = setInterval(() => {
      pollUpdateStatus();
    }, 1000);
  } catch (error) {
    console.error('IRMS update error:', error);
    alert(error.message || 'Greška pri IRMS update-u selektovanih redova');
    setProgressVisibility(false);
    cancelBtn.disabled = true;
  } finally {
    if (!state.updateJobId) {
      button.disabled = false;
      button.innerHTML = oldHtml;
      updateSelectionUI();
    }
  }
}

function setupFilters() {
  const inputs = document.querySelectorAll('[data-filter]');
  let debounceTimer;

  inputs.forEach(input => {
    input.addEventListener('input', e => {
      const key = e.target.getAttribute('data-filter');
      state.filters[key] = e.target.value;
      state.page = 1;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadTable();
      }, 300);
    });
  });

  document.getElementById('resetFiltersBtn').addEventListener('click', () => {
    inputs.forEach(input => {
      input.value = '';
    });

    Object.keys(state.filters).forEach(key => {
      state.filters[key] = '';
    });

    state.page = 1;
    state.sortBy = 'updated_at';
    state.sortDir = 'desc';
    loadTable();
  });
}

function setupSorting() {
  document.querySelectorAll('.sortable').forEach(header => {
    header.addEventListener('click', () => {
      const field = header.getAttribute('data-sort');
      if (!field) return;

      if (state.sortBy === field) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = field;
        state.sortDir = 'asc';
      }

      state.page = 1;
      loadTable();
    });
  });
}

function setupPager() {
  document.getElementById('pageSize').addEventListener('change', e => {
    state.pageSize = Number(e.target.value) || 100;
    state.page = 1;
    loadTable();
  });

  document.getElementById('prevPageBtn').addEventListener('click', () => {
    if (state.page <= 1) return;
    state.page -= 1;
    loadTable();
  });

  document.getElementById('nextPageBtn').addEventListener('click', () => {
    if (state.page >= state.totalPages) return;
    state.page += 1;
    loadTable();
  });
}

function setupSelectionControls() {
  document
    .getElementById('selectPageCheckbox')
    .addEventListener('change', e => {
      const checked = e.target.checked;

      state.visibleRows.forEach(row => {
        const pib = cleanPib(row.pib);
        if (!pib) return;
        if (checked) {
          state.selectedPibs.add(pib);
        } else {
          state.selectedPibs.delete(pib);
        }
      });

      renderTable(state.visibleRows);
    });

  document
    .getElementById('selectCurrentPageBtn')
    .addEventListener('click', () => {
      selectAllFiltered();
    });

  document
    .getElementById('selectAllFilteredBtn')
    .addEventListener('click', () => {
      selectAllFromFilter();
    });

  document
    .getElementById('launchCampaignFromTableBtn')
    .addEventListener('click', () => {
      showCampaignModal();
    });

  document.getElementById('clearSelectionBtn').addEventListener('click', () => {
    state.selectedPibs.clear();
    renderTable(state.visibleRows);
  });

  document.getElementById('updateSelectedBtn').addEventListener('click', () => {
    showUpdateOptionsModal();
  });

  document
    .getElementById('confirmUpdateOptionsBtn')
    .addEventListener('click', () => {
      const fields = getSelectedUpdateFieldsFromModal();
      if (!fields.length) {
        alert('Izaberi bar jedno polje za ažuriranje.');
        return;
      }

      const onlyEmpty = document.getElementById(
        'updateOnlyEmptyCheckbox'
      ).checked;
      const modalElement = document.getElementById('updateOptionsModal');
      const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
      modal.hide();

      updateSelectedFromIrms({
        fields,
        overwriteExisting: !onlyEmpty,
      });
    });

  document
    .getElementById('cancelIrmsUpdateBtn')
    .addEventListener('click', () => {
      cancelRunningUpdate();
    });

  document.getElementById('addPibsBtn').addEventListener('click', () => {
    showAddPibsModal();
  });

  document.getElementById('confirmAddPibsBtn').addEventListener('click', () => {
    const text = document.getElementById('addPibsTextarea').value;
    const pibs = parsePibList(text);

    if (!pibs.length) {
      alert('Unesite bar jedan validan PIB (8 cifara).');
      return;
    }

    const modalElement = document.getElementById('addPibsModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.hide();
    startAddPibsFromIrms(pibs);
  });

  document.getElementById('cancelAddPibsBtn').addEventListener('click', () => {
    cancelAddPibsJob();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupFilters();
  setupSorting();
  setupPager();
  setupSelectionControls();
  updateSelectionUI();
  loadIrmsLookups().finally(() => {
    loadTable();
  });
});
