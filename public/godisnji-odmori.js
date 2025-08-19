/**
 * Godišnji odmori - JavaScript funkcionalnost
 * Autor: Summa Summarum sistem
 * Datum: 2025-08-19
 */

console.log('🏖️ godisnji-odmori.js loaded successfully!');

// Globalne varijable
let currentFirmaId = null;
let radniciData = [];
let odmoríData = [];

// Učitavanje podataka o odmorima
async function loadOdmoriData() {
  console.log('🔄 Učitavam podatke o odmorima...');
  try {
    console.log('🔍 Učitavam odmor podatke za firmu:', currentFirmaId);
    const response = await fetch(`/api/godisnji-odmori/${currentFirmaId}`, {
      credentials: 'include',
    });

    console.log('📡 Response status:', response.status);
    if (!response.ok) throw new Error('Greška pri učitavanju odmora');

    const result = await response.json();
    odmoríData = result || []; // Backend vraća direktno array, ne result.data
    console.log('✅ Učitani odmori:', odmoríData.length);
    console.log('📊 Podaci o odmorima:', odmoríData);

    // Ažuriraj tabele
    console.log('🔄 Pozivam updateNajaveljeniOdmoriTable()...');
    updateNajaveljeniOdmoriTable();
    console.log('🔄 Pozivam updateIstorijaTable()...');
    updateIstorijaTable();
  } catch (error) {
    console.error('❌ Greška pri učitavanju odmora:', error);
    odmoríData = [];
  }
}

// Ažuriranje tabele najavljenih odmora
function updateNajaveljeniOdmoriTable() {
  console.log('🔄 Ažuriram tabelu najavljenih odmora...');
  console.log('📊 Podaci o odmorima:', odmoríData);

  const tabela = document.getElementById('najaveljeniOdmoriTabela');

  if (!tabela) {
    console.error('❌ Element najaveljeniOdmoriTabela nije pronađen!');
    return;
  }

  // Filtriraj buduce odmori i one na čekanju
  const najavljeni = odmoríData.filter(o => {
    const datumOd = new Date(o.datum_od);
    const danas = new Date();
    return datumOd >= danas || o.status === 'na_cekanju';
  });

  console.log('📅 Najavljeni odmori:', najavljeni.length);

  if (najavljeni.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          <i class="fas fa-calendar me-2"></i>Nema najavljenih odmora
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  najavljeni.forEach(odmor => {
    const statusClass =
      {
        na_cekanju: 'warning',
        odobren: 'success',
        odbacen: 'danger',
      }[odmor.status] || 'secondary';

    const statusText =
      {
        na_cekanju: 'Na čekanju',
        odobren: 'Odobren',
        odbacen: 'Odbačen',
      }[odmor.status] || odmor.status;

    html += `
      <tr>
        <td>${odmor.ime} ${odmor.prezime}</td>
        <td>${odmor.tip_odmora || 'Godišnji'}</td>
        <td>${new Date(odmor.datum_od).toLocaleDateString('sr-RS')}</td>
        <td>${new Date(odmor.datum_do).toLocaleDateString('sr-RS')}</td>
        <td>${odmor.broj_dana}</td>
        <td><span class="badge bg-${statusClass}">${statusText}</span></td>
        <td>
          ${
            odmor.status === 'na_cekanju'
              ? `
            <button class="btn btn-sm btn-success me-1" onclick="approveOdmor(${odmor.id})">
              <i class="fas fa-check"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="rejectOdmor(${odmor.id})">
              <i class="fas fa-times"></i>
            </button>
          `
              : '-'
          }
        </td>
      </tr>
    `;
  });

  tabela.innerHTML = html;
}

// Ažuriranje tabele istorije
function updateIstorijaTable() {
  const tabela = document.getElementById('istorijaTabela');

  if (!tabela) {
    console.error('❌ Element istorijaTabela nije pronađen!');
    return;
  }

  // Filtriraj prošle odmori
  const istorija = odmoríData.filter(o => {
    const datumDo = new Date(o.datum_do);
    const danas = new Date();
    return datumDo < danas && o.status === 'odobren';
  });

  if (istorija.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          <i class="fas fa-history me-2"></i>Nema istorije odmora
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  istorija.forEach(odmor => {
    html += `
      <tr>
        <td>${odmor.ime} ${odmor.prezime}</td>
        <td>${odmor.tip_odmora || 'Godišnji'}</td>
        <td>${new Date(odmor.datum_od).toLocaleDateString('sr-RS')}</td>
        <td>${new Date(odmor.datum_do).toLocaleDateString('sr-RS')}</td>
        <td>${odmor.broj_dana}</td>
        <td><span class="badge bg-success">Odobren</span></td>
        <td>${odmor.odobrio_username || '-'}</td>
        <td>${
          odmor.updated_at
            ? new Date(odmor.updated_at).toLocaleDateString('sr-RS')
            : '-'
        }</td>
      </tr>
    `;
  });

  tabela.innerHTML = html;
}

// Ažuriranje tabele radnika i status
function updateRadniciTable() {
  console.log('👥 Ažuriram tabelu radnika...');
  const tabela = document.getElementById('radniciStatusTabela');
  
  if (!tabela) {
    console.error('❌ Element radniciStatusTabela nije pronađen!');
    return;
  }

  if (radniciData.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-4">
          <i class="fas fa-users me-2"></i>Nema radnika
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  radniciData.forEach(radnik => {
    html += `
      <tr>
        <td>${radnik.ime} ${radnik.prezime}</td>
        <td>${radnik.pozicija_naziv || 'Radnik'}</td>
        <td>${radnik.ukupno_dana}</td>
        <td>${radnik.iskorisceno_dana}</td>
        <td>${radnik.preostalo_dana}</td>
        <td>
          <span class="badge bg-${radnik.preostalo_dana < 5 ? 'danger' : 'success'}">
            ${radnik.preostalo_dana < 5 ? 'Kritično' : 'OK'}
          </span>
        </td>
      </tr>
    `;
  });

  tabela.innerHTML = html;
}

// Inicijalizacija stranice
document.addEventListener('DOMContentLoaded', function () {
  // Preuzmi firma_id iz URL parametara
  const urlParams = new URLSearchParams(window.location.search);
  currentFirmaId = urlParams.get('firma_id');

  if (!currentFirmaId) {
    alert('Nedostaje ID firme!');
    window.location.href = '/dashboard.html';
    return;
  }

  console.log('📊 Inicijalizujem godišnje odmore za firmu:', currentFirmaId);

  // Učitaj podatke
  loadInitialData();
});

// Učitavanje početnih podataka
async function loadInitialData() {
  try {
    showPreloader();

    // Paralelno učitavanje podataka
    await Promise.all([
      loadFirmaInfo(),
      loadRadniciStatus(),
      loadOdmoriData(),
      loadDashboardStats(),
    ]);

    console.log('✅ Svi podaci uspješno učitani');
  } catch (error) {
    console.error('❌ Greška pri učitavanju podataka:', error);
    showError('Greška pri učitavanju podataka godišnjih odmora');
  } finally {
    hidePreloader();
  }
}

// Dummy funkcije koje nedostaju
async function loadFirmaInfo() {
  console.log('📊 Učitavam info o firmi...');
}

async function loadRadniciStatus() {
  console.log('👥 Učitavam status radnika...');
  try {
    const response = await fetch(`/api/godisnji-odmori/plan/${currentFirmaId}`, {
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Greška pri učitavanju plana');

    const result = await response.json();
    radniciData = result || [];
    console.log('✅ Učitani radnici:', radniciData.length);
    
    // Ažuriraj tabelu radnika
    updateRadniciTable();
  } catch (error) {
    console.error('❌ Greška pri učitavanju radnika:', error);
    radniciData = [];
  }
}

async function loadDashboardStats() {
  console.log('📈 Učitavam dashboard statistike...');
}

function showPreloader() {
  const preloader = document.getElementById('preloader');
  if (preloader) preloader.style.display = 'block';
}

function hidePreloader() {
  const preloader = document.getElementById('preloader');
  if (preloader) preloader.style.display = 'none';
}

function showError(message) {
  console.error(message);
  alert(message);
}
