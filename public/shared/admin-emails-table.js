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
    grad: '',
    kd: '',
    email: '',
    telefon: '',
    broj_zaposlenih: '',
    prihod: '',
    created_at: '',
    updated_at: '',
  },
  selectedPibs: new Set(),
  visibleRows: [],
  updateJobId: null,
  updatePollingTimer: null,
  addPibsJobId: null,
  addPibsPollingTimer: null,
};

const UPDATE_FIELD_LABELS = {
  naziv: 'Naziv ažuriran',
  grad: 'Grad ažuriran',
  kd: 'KD ažuriran',
  email: 'Email ažuriran',
  telefon: 'Telefon ažuriran',
  broj_zaposlenih: 'Broj zaposlenih ažuriran',
  prihod: 'Prihod ažuriran',
};

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('sr-RS');
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

function updateSelectionUI() {
  document.getElementById('selectedCount').textContent = state.selectedPibs.size.toLocaleString('sr-RS');

  const updateBtn = document.getElementById('updateSelectedBtn');
  updateBtn.disabled = state.selectedPibs.size === 0;

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

  const selectedVisible = visiblePibs.filter(pib => state.selectedPibs.has(pib)).length;
  pageCheckbox.checked = selectedVisible === visiblePibs.length;
  pageCheckbox.indeterminate = selectedVisible > 0 && selectedVisible < visiblePibs.length;
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
  document.getElementById('irmsProgressPercent').textContent = `${safeProgress.toFixed(1)}%`;
  document.getElementById('irmsProgressText').textContent = text;
}

function updateAddPibsProgressBar(progress = 0, text = 'Spremno.') {
  const safeProgress = Math.max(0, Math.min(100, Number(progress || 0)));
  document.getElementById('addPibsProgressFill').style.width = `${safeProgress}%`;
  document.getElementById('addPibsProgressPercent').textContent = `${safeProgress.toFixed(1)}%`;
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
  button.innerHTML = '<i class="fas fa-cloud-arrow-up me-1"></i>Update selektovanih (IRMS)';
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
        .map(([field, count]) => `${UPDATE_FIELD_LABELS[field] || field}: ${count}`);

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
      updateProgressBar(Number(job.progress || 0), 'Update je otkazan od strane korisnika.');
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
      updateProgressBar(Number(job.progress || 0), 'Update je prekinut greškom.');
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
      throw new Error(result.message || 'Greška pri čitanju statusa dodavanja PIB-ova');
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
      updateAddPibsProgressBar(Number(job.progress || 0), 'Dodavanje je otkazano od strane korisnika.');
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
      updateAddPibsProgressBar(Number(job.progress || 0), 'Dodavanje je prekinuto greškom.');
      alert('Dodavanje PIB-ova je prekinuto greškom. Pokušajte ponovo.');
    }
  } catch (error) {
    console.error('Polling add PIBs status error:', error);
    stopAddPibsPolling();
    state.addPibsJobId = null;
    restoreAddPibsButton();
    updateAddPibsProgressBar(0, error.message || 'Greška pri praćenju napretka.');
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
  return [...new Set(
    String(text || '')
      .split(/[\s,;]+/)
      .map(normalizePibInput)
      .filter(pib => /^\d{8}$/.test(pib))
  )];
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
  button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Dodavanje u toku...';

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
      throw new Error(result.message || 'Greška pri pokretanju dodavanja PIB-ova');
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

  const confirmed = window.confirm('Da li želite da prekinete aktivno dodavanje PIB-ova?');
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
      throw new Error(result.message || 'Greška pri otkazivanju dodavanja PIB-ova');
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
    tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted py-4">Nema rezultata za zadate filtere.</td></tr>';
    updateSelectionUI();
    return;
  }

  tbody.innerHTML = rows
    .map(row => {
      const pib = cleanPib(row.pib);
      const checked = pib && state.selectedPibs.has(pib) ? 'checked' : '';

      return `
      <tr>
        <td class="col-select"><input class="row-select" type="checkbox" data-pib="${escapeHtml(pib)}" ${checked} ${pib ? '' : 'disabled'} /></td>
        <td>${escapeHtml(row.pib)}</td>
        <td>${escapeHtml(row.naziv)}</td>
        <td>${escapeHtml(row.grad)}</td>
        <td>${escapeHtml(row.kd)}</td>
        <td>${escapeHtml(row.email)}</td>
        <td>${escapeHtml(row.telefon)}</td>
        <td>${escapeHtml(row.broj_zaposlenih)}</td>
        <td>${escapeHtml(row.prihod)}</td>
        <td>${escapeHtml(formatDate(row.created_at))}</td>
        <td>${escapeHtml(formatDate(row.updated_at))}</td>
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

  updateSelectionUI();
}

function updatePager() {
  document.getElementById('totalCount').textContent = state.total.toLocaleString('sr-RS');
  document.getElementById('pageInfo').textContent = `Strana ${state.page} / ${state.totalPages}`;
  document.getElementById('prevPageBtn').disabled = state.page <= 1;
  document.getElementById('nextPageBtn').disabled = state.page >= state.totalPages;
}

async function loadTable() {
  const tbody = document.getElementById('emailsTableBody');
  tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted py-4">Učitavanje...</td></tr>';

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
    tbody.innerHTML = `<tr><td colspan="11" class="text-center text-danger py-4">${escapeHtml(error.message)}</td></tr>`;
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

async function cancelRunningUpdate() {
  if (!state.updateJobId) {
    alert('Nema aktivnog update-a za cancel.');
    return;
  }

  const confirmed = window.confirm('Da li želite da prekinete aktivni IRMS update?');
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
  return Array.from(document.querySelectorAll('input[name="updateField"]:checked')).map(
    checkbox => checkbox.value
  );
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

    button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Update u toku...';
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
  document.getElementById('selectPageCheckbox').addEventListener('change', e => {
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

  document.getElementById('selectCurrentPageBtn').addEventListener('click', () => {
    selectAllFiltered();
  });

  document.getElementById('clearSelectionBtn').addEventListener('click', () => {
    state.selectedPibs.clear();
    renderTable(state.visibleRows);
  });

  document.getElementById('updateSelectedBtn').addEventListener('click', () => {
    showUpdateOptionsModal();
  });

  document.getElementById('confirmUpdateOptionsBtn').addEventListener('click', () => {
    const fields = getSelectedUpdateFieldsFromModal();
    if (!fields.length) {
      alert('Izaberi bar jedno polje za ažuriranje.');
      return;
    }

    const onlyEmpty = document.getElementById('updateOnlyEmptyCheckbox').checked;
    const modalElement = document.getElementById('updateOptionsModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.hide();

    updateSelectedFromIrms({
      fields,
      overwriteExisting: !onlyEmpty,
    });
  });

  document.getElementById('cancelIrmsUpdateBtn').addEventListener('click', () => {
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
  loadTable();
});
