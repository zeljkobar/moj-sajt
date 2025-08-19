console.log('📅 Plan godišnjeg odmora - Nova verzija učitana!');

// Globalne promenljive
let firmaId = null;
let selectedYear = 2025;
let radniciData = [];
let odmoriData = [];
let prazniciData = [];
let selectedRadnikId = null;
let selectedDays = [];
let dragMode = false;

// Inicijalizacija
document.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 Pokretam inicijalizaciju...');

  const urlParams = new URLSearchParams(window.location.search);
  firmaId = urlParams.get('firma_id');

  if (!firmaId) {
    alert('Nedostaje ID firme!');
    return;
  }

  const godinaSelect = document.getElementById('godinaSelect');
  if (godinaSelect) {
    godinaSelect.value = selectedYear;
  }

  loadAllData();
});

// Promeni godinu
function changeYear() {
  const godinaSelect = document.getElementById('godinaSelect');
  if (godinaSelect) {
    selectedYear = parseInt(godinaSelect.value);
    loadAllData();
  }
}

// Učitaj sve podatke
async function loadAllData() {
  try {
    showLoading(true);
    await Promise.all([
      loadFirmaInfo(),
      loadRadnici(),
      loadPraznici(),
      loadOdmori(),
    ]);
    generateCalendar();
    populateRadniciSidebar();
    showLoading(false);
  } catch (error) {
    console.error('Greška pri učitavanju:', error);
    showLoading(false);
  }
}

// Loading indikator
function showLoading(show) {
  const spinner = document.querySelector('.spinner-border');
  if (spinner) {
    spinner.style.display = show ? 'block' : 'none';
  }
}

// Učitaj info o firmi
async function loadFirmaInfo() {
  try {
    const response = await fetch(`/api/firme/id/${firmaId}`, {
      credentials: 'include', // Uključi session cookies
    });
    if (response.ok) {
      const firma = await response.json();
      document.getElementById(
        'firmaInfo'
      ).textContent = `Firma: ${firma.naziv} • Plan za ${selectedYear}. godinu`;
    } else {
      // Fallback - postavi osnovni tekst
      document.getElementById(
        'firmaInfo'
      ).textContent = `Plan godišnjeg odmora za ${selectedYear}. godinu`;
    }
  } catch (error) {
    console.error('Greška pri učitavanju firme:', error);
    document.getElementById(
      'firmaInfo'
    ).textContent = `Plan godišnjeg odmora za ${selectedYear}. godinu`;
  }
}

// Učitaj radnike
async function loadRadnici() {
  try {
    const response = await fetch(`/api/radnici/firma/${firmaId}`, {
      credentials: 'include', // Uključi session cookies
    });
    if (response.ok) {
      radniciData = await response.json();
      console.log('👥 Učitano radnika:', radniciData.length);
    }
  } catch (error) {
    console.error('Greška pri učitavanju radnika:', error);
  }
}

// Učitaj praznike
async function loadPraznici() {
  try {
    const response = await fetch(
      `/api/godisnji-odmori/praznici?godina=${selectedYear}`
    );
    if (response.ok) {
      const result = await response.json();
      prazniciData = result.data || result; // Handle both formats
      console.log('🎉 Učitano praznika:', prazniciData.length);
      console.log('📊 Format praznika:', prazniciData.slice(0, 2)); // Debug: show first 2 holidays
    } else {
      console.error('Greška pri učitavanju praznika:', response.status);
      prazniciData = [];
    }
  } catch (error) {
    console.error('Greška pri učitavanju praznika:', error);
    prazniciData = [];
  }
}

// Učitaj odmore
async function loadOdmori() {
  try {
    const response = await fetch(
      `/api/godisnji-odmori/${firmaId}?godina=${selectedYear}`,
      {
        credentials: 'include', // Uključi session cookies
      }
    );
    if (response.ok) {
      const result = await response.json();
      odmoriData = result.data || result; // Handle both formats
      console.log(
        '🏖️ Učitano odmora:',
        Array.isArray(odmoriData) ? odmoriData.length : 0
      );

      // Debug: prikaži prvi odmor ako postoji
      if (Array.isArray(odmoriData) && odmoriData.length > 0) {
        console.log('📋 Prvi odmor:', odmoriData[0]);
      }
    } else {
      console.error('Greška pri učitavanju odmora:', response.status);
      odmoriData = [];
    }
  } catch (error) {
    console.error('Greška pri učitavanju odmora:', error);
    odmoriData = [];
  }
}

// Generiši kalendar
function generateCalendar() {
  const container = document.getElementById('calendarGrid');
  if (!container) return;

  const meseci = [
    'Januar',
    'Februar',
    'Mart',
    'April',
    'Maj',
    'Jun',
    'Juli',
    'Avgust',
    'Septembar',
    'Oktobar',
    'Novembar',
    'Decembar',
  ];

  let html = '<div class="month-grid">';

  for (let mesec = 0; mesec < 12; mesec++) {
    html += `
      <div class="month-card">
        <div class="month-header">${meseci[mesec]} ${selectedYear}</div>
        <div class="days-grid">
          <div class="day-header">Pon</div>
          <div class="day-header">Uto</div>
          <div class="day-header">Sre</div>
          <div class="day-header">Čet</div>
          <div class="day-header">Pet</div>
          <div class="day-header">Sub</div>
          <div class="day-header">Ned</div>
          ${generateDaysForMonth(selectedYear, mesec)}
        </div>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

// Generiši dane za mesec
function generateDaysForMonth(godina, mesec) {
  const daysInMonth = new Date(godina, mesec + 1, 0).getDate();
  const firstDayOfMonth = new Date(godina, mesec, 1).getDay();
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  let html = '';

  // Prazni dani na početku
  for (let i = 0; i < startDay; i++) {
    html += '<div class="day empty"></div>';
  }

  // Dani u mesecu
  for (let dan = 1; dan <= daysInMonth; dan++) {
    const datum = `${godina}-${String(mesec + 1).padStart(2, '0')}-${String(
      dan
    ).padStart(2, '0')}`;

    let classes = 'day clickable-day';
    if (isPraznicDay(datum)) classes += ' holiday';
    if (hasOdmorDay(datum)) classes += ' vacation';
    if (hasPendingOdmor(datum)) classes += ' pending';
    if (isAvailableDay(datum)) classes += ' available';
    if (isToday(datum)) classes += ' today';
    if (selectedDays.includes(datum)) classes += ' selected';

    html += `
      <div class="${classes}" 
           data-date="${datum}"
           onclick="handleDayClick('${datum}')"
           title="${getDayTooltip(datum)}">
        <span class="day-number">${dan}</span>
        ${isPraznicDay(datum) ? '<i class="fas fa-star holiday-icon"></i>' : ''}
        ${
          hasOdmorDay(datum)
            ? '<i class="fas fa-umbrella-beach vacation-icon"></i>'
            : ''
        }
      </div>
    `;
  }

  return html;
}

// Helper funkcije
function isToday(datum) {
  const today = new Date();
  const checkDate = new Date(datum);
  return today.toDateString() === checkDate.toDateString();
}

function isPraznicDay(datum) {
  return prazniciData.some(praznik => {
    // Handle both 'datum' and 'datum_od' properties
    const praznikDatum = praznik.datum || praznik.datum_od;

    // Konvertuj date objekte u YYYY-MM-DD string format za poređenje
    const praznikString = new Date(praznikDatum).toISOString().split('T')[0];

    return praznikString === datum;
  });
}

function hasOdmorDay(datum) {
  if (selectedRadnikId) {
    return odmoriData.some(
      odmor =>
        odmor.radnik_id === selectedRadnikId &&
        odmor.status === 'odobren' &&
        datum >= odmor.datum_od &&
        datum <= odmor.datum_do
    );
  } else {
    return odmoriData.some(
      odmor =>
        odmor.status === 'odobren' &&
        datum >= odmor.datum_od &&
        datum <= odmor.datum_do
    );
  }
}

function hasPendingOdmor(datum) {
  if (selectedRadnikId) {
    return odmoriData.some(
      odmor =>
        odmor.radnik_id === selectedRadnikId &&
        odmor.status === 'na_cekanju' &&
        datum >= odmor.datum_od &&
        datum <= odmor.datum_do
    );
  }
  return false;
}

function isAvailableDay(datum) {
  const date = new Date(datum);
  const today = new Date();

  if (date < today) return false;
  if (isPraznicDay(datum)) return false;
  if (hasOdmorDay(datum) || hasPendingOdmor(datum)) return false;

  return true;
}

function getDayTooltip(datum) {
  const date = new Date(datum);
  const formatDate = date.toLocaleDateString('sr-RS');

  if (isPraznicDay(datum)) {
    const praznik = prazniciData.find(p => {
      const praznikDatum = p.datum || p.datum_od;
      return praznikDatum === datum;
    });
    return `${formatDate} - ${praznik?.naziv || 'Praznik'}`;
  }

  if (hasOdmorDay(datum)) {
    return `${formatDate} - Godišnji odmor`;
  }

  if (hasPendingOdmor(datum)) {
    return `${formatDate} - Zahtev za odmor (čeka odobrenje)`;
  }

  if (isAvailableDay(datum)) {
    return `${formatDate} - Kliknite za dodavanje odmora`;
  }

  return formatDate;
}

// Sidebar sa radnicima
function populateRadniciSidebar() {
  const container = document.getElementById('radniciLista');
  if (!container) return;

  if (radniciData.length === 0) {
    container.innerHTML =
      '<p class="text-muted text-center py-3">Nema radnika</p>';
    return;
  }

  let html = '';
  radniciData.forEach(radnik => {
    const radnikOdmori = odmoriData.filter(
      o => o.radnik_id === radnik.id && o.status === 'odobren'
    );

    const ukupnoDana = radnikOdmori.reduce((total, odmor) => {
      const from = new Date(odmor.datum_od);
      const to = new Date(odmor.datum_do);
      const days = Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
      return total + days;
    }, 0);

    const dostupnoDana = radnik.radi_subotom ? 24 : 20;
    const preostalo = dostupnoDana - ukupnoDana;

    html += `
      <div class="radnik-item ${
        selectedRadnikId === radnik.id ? 'selected' : ''
      }" 
           onclick="selectRadnik(${radnik.id})">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <strong>${radnik.ime} ${radnik.prezime}</strong>
            <div class="small text-muted">
              ${radnik.pozicija || 'Radnik'}
              ${radnik.radi_subotom ? '• Subota' : ''}
            </div>
          </div>
          <div class="text-end">
            <span class="badge bg-primary">${ukupnoDana}/${dostupnoDana}</span>
            <small class="text-${preostalo < 5 ? 'danger' : 'success'} d-block">
              ${preostalo} preostalo
            </small>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Selekcija radnika
function selectRadnik(radnikId) {
  selectedRadnikId = radnikId;
  generateCalendar();
  populateRadniciSidebar();

  const radnik = radniciData.find(r => r.id === radnikId);
  if (radnik) {
    showToast(
      `Filtriram kalendar za: ${radnik.ime} ${radnik.prezime}`,
      'success'
    );
  }
}

// Očisti selekciju
function clearSelection() {
  selectedRadnikId = null;
  selectedDays = [];
  generateCalendar();
  populateRadniciSidebar();
  updateSelectionActions();
  showToast('Prikazujem sve radnike', 'info');
}

// Klik na dan
function handleDayClick(datum) {
  if (!isAvailableDay(datum)) {
    if (isPraznicDay(datum)) {
      showToast('Ne možete odabrati praznik', 'error');
    } else if (hasOdmorDay(datum)) {
      showToast('Ovaj dan je već rezervisan za odmor', 'error');
    } else {
      showToast('Ovaj dan nije dostupan', 'error');
    }
    return;
  }

  if (!selectedRadnikId) {
    showToast('Prvo odaberite radnika iz sidebar-a', 'error');
    return;
  }

  // Toggle selection
  if (selectedDays.includes(datum)) {
    selectedDays = selectedDays.filter(d => d !== datum);
    showToast('Dan uklonjen iz selekcije', 'info');
  } else {
    selectedDays.push(datum);
    showToast('Dan dodat u selekciju', 'success');
  }

  generateCalendar();
  updateSelectionActions();
}

// Update selection actions
function updateSelectionActions() {
  let actionsHtml = '';

  if (selectedDays.length > 0) {
    const sortedDays = selectedDays.sort();
    const startDate = new Date(sortedDays[0]).toLocaleDateString('sr-RS');
    const endDate = new Date(
      sortedDays[sortedDays.length - 1]
    ).toLocaleDateString('sr-RS');

    actionsHtml = `
      <div class="alert alert-info mt-3">
        <h6><i class="fas fa-calendar-check me-2"></i>Odabrani period:</h6>
        <p class="mb-2">
          <strong>${startDate}</strong> do <strong>${endDate}</strong> 
          (${selectedDays.length} ${
      selectedDays.length === 1
        ? 'dan'
        : selectedDays.length < 5
        ? 'dana'
        : 'dana'
    })
        </p>
        <div class="d-flex gap-2">
          <button class="btn btn-success btn-sm" onclick="createOdmorRequest()">
            <i class="fas fa-plus me-1"></i>Kreiraj zahtev
          </button>
          <button class="btn btn-outline-secondary btn-sm" onclick="clearSelectedDays()">
            <i class="fas fa-times me-1"></i>Poništi
          </button>
        </div>
      </div>
    `;
  }

  const container = document.getElementById('selectionActions');
  if (container) {
    container.innerHTML = actionsHtml;
  }
}

// Očisti odabrane dane
function clearSelectedDays() {
  selectedDays = [];
  generateCalendar();
  updateSelectionActions();
  showToast('Selekcija poništena', 'info');
}

// Kreiraj zahtev za odmor
async function createOdmorRequest() {
  if (!selectedRadnikId || selectedDays.length === 0) {
    showToast('Nedostaju podaci za kreiranje zahteva', 'error');
    return;
  }

  const sortedDays = selectedDays.sort();
  const datumOd = sortedDays[0];
  const datumDo = sortedDays[sortedDays.length - 1];

  try {
    const requestData = {
      radnik_id: selectedRadnikId,
      datum_od: datumOd,
      datum_do: datumDo,
      tip_odmora: 'godisnji',
      napomena: `Zahtev kreiran preko kalendara (${selectedDays.length} dana)`,
    };

    const response = await fetch(`/api/godisnji-odmori`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error('Greška pri kreiranju zahteva');
    }

    showToast(`Zahtev za odmor kreiran uspešno!`, 'success');
    clearSelectedDays();
    await loadAllData();
  } catch (error) {
    console.error('Greška:', error);
    showToast('Greška pri kreiranju zahteva: ' + error.message, 'error');
  }
}

// Toast notifikacije
function showToast(message, type = 'info') {
  const existingToast = document.querySelector('.custom-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `custom-toast alert alert-${
    type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'
  } alert-dismissible`;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    min-width: 300px;
    animation: slideIn 0.3s ease;
  `;

  toast.innerHTML = `
    <i class="fas fa-${
      type === 'success'
        ? 'check-circle'
        : type === 'error'
        ? 'exclamation-circle'
        : 'info-circle'
    } me-2"></i>
    ${message}
    <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 4000);
}

// Toggle help
function toggleHelp() {
  const helpContent = document.getElementById('helpContent');
  const toggleBtn = document.getElementById('helpToggleBtn');

  if (helpContent.style.display === 'none') {
    helpContent.style.display = 'block';
    toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
  } else {
    helpContent.style.display = 'none';
    toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
  }
}

// Toggle sidebar
function toggleRadniciSidebar() {
  const sidebar = document.getElementById('radniciSidebar');
  const calendarColumn = document.getElementById('calendarColumn');

  if (sidebar.style.display === 'none') {
    sidebar.style.display = 'block';
    calendarColumn.className = 'col-lg-10';
  } else {
    sidebar.style.display = 'none';
    calendarColumn.className = 'col-lg-12';
  }
}

// Štampanje
function printPlan() {
  const printDate = document.getElementById('printDate');
  if (printDate) {
    printDate.textContent = formatDate(new Date());
  }

  const printFirmaElement = document.getElementById('printFirmaInfo');
  const firmaInfoElement = document.getElementById('firmaInfo');
  if (printFirmaElement && firmaInfoElement) {
    printFirmaElement.textContent = firmaInfoElement.textContent;
  }

  window.print();
}

// Navigacija nazad
function goBackToGodisnji() {
  if (firmaId) {
    window.location.href = `/godisnji-odmori.html?firma_id=${firmaId}`;
  } else {
    window.location.href = '/godisnji-odmori.html';
  }
}

// Format datum
function formatDate(date) {
  const dan = String(date.getDate()).padStart(2, '0');
  const mesec = String(date.getMonth() + 1).padStart(2, '0');
  const godina = date.getFullYear();
  return `${dan}.${mesec}.${godina}.`;
}
