/**
 * Godišnji odmori - JavaScript funkcionalnost
 * Autor: Summa Summarum sistem
 * Datum: 2025-08-19
 */

// Globalne varijable
let currentFirmaId = null;
let radniciData = [];
let odmoríData = [];

// Učitavanje podataka o odmorima
async function loadOdmoriData() {
  try {
    const response = await fetch(`/api/godisnji-odmori/${currentFirmaId}`, {
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Greška pri učitavanju odmora');

    const result = await response.json();
    odmoríData = result || []; // Backend vraća direktno array, ne result.data

    // Ažuriraj tabele
    updateNajaveljeniOdmoriTable();
    updateIstorijaTable();
  } catch (error) {
    console.error('❌ Greška pri učitavanju odmora:', error);
    odmoríData = [];
  }
}

// Ažuriranje tabele najavljenih odmora
function updateNajaveljeniOdmoriTable() {
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
            <button class="btn btn-sm btn-success me-1" onclick="approveOdmor(${odmor.id})" title="Odobri zahtev">
              <i class="fas fa-check"></i>
            </button>
            <button class="btn btn-sm btn-danger me-1" onclick="rejectOdmor(${odmor.id})" title="Odbaci zahtev">
              <i class="fas fa-times"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteOdmor(${odmor.id})" title="Obriši zahtev">
              <i class="fas fa-trash"></i>
            </button>
          `
              : odmor.status === 'odobren'
              ? `
            <button class="btn btn-sm btn-primary me-1" onclick="generateResenjeOdmor(${odmor.id})" title="Generiši rešenje o godišnjem odmoru">
              <i class="fas fa-file-alt"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteOdmor(${odmor.id})" title="Obriši zahtev">
              <i class="fas fa-trash"></i>
            </button>
          `
              : `
            <button class="btn btn-sm btn-outline-danger" onclick="deleteOdmor(${odmor.id})" title="Obriši zahtev">
              <i class="fas fa-trash"></i>
            </button>
          `
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
        <td colspan="7" class="text-center text-muted py-4">
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
        <td>
          <button class="btn btn-sm btn-primary me-1" onclick="generateResenjeOdmor(${odmor.id})" title="Generiši rešenje o godišnjem odmoru">
            <i class="fas fa-file-alt"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteOdmor(${odmor.id})" title="Obriši zahtev">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tabela.innerHTML = html;
}

// Ažuriranje tabele radnika i status
function updateRadniciTable() {
  const tabela = document.getElementById('radniciStatusTabela');

  if (!tabela) {
    console.error('❌ Element radniciStatusTabela nije pronađen!');
    return;
  }

  if (radniciData.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          <i class="fas fa-users me-2"></i>Nema radnika
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  radniciData.forEach(radnik => {
    const ukupnoDana = radnik.ukupno_dana || (radnik.subota ? 24 : 20);
    const iskorisenoDana = radnik.iskorisceno_dana || 0;
    const preostaloDana = ukupnoDana - iskorisenoDana;

    // Proveri da li je prekoračio dozvoljeni broj dana
    const prekoracenje = iskorisenoDana > ukupnoDana;

    html += `
      <tr>
        <td>${radnik.ime} ${radnik.prezime}</td>
        <td>${radnik.pozicija_naziv || 'Radnik'}</td>
        <td>${ukupnoDana}</td>
        <td>${iskorisenoDana}</td>
        <td>${preostaloDana}</td>
        <td>
          <span class="badge bg-${prekoracenje ? 'danger' : 'success'}">
            ${prekoracenje ? 'Kritično' : 'OK'}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-primary me-1" onclick="viewRadnikDetails(${
            radnik.radnik_id
          })">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-success" onclick="planOdmor(${
            radnik.radnik_id
          })">
            <i class="fas fa-plus"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tabela.innerHTML = html;

  // Ažuriraj statistike nakon što su radnici učitani
  updateDashboardStats();
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

  // Učitaj podatke
  loadInitialData();
});

// Učitavanje početnih podataka
async function loadInitialData() {
  try {
    showPreloader();

    // Prvo učitaj osnovne podatke
    await Promise.all([loadFirmaInfo(), loadRadniciStatus(), loadOdmoriData()]);

    // Zatim ažuriraj statistike kada su podaci učitani
    await loadDashboardStats();
  } catch (error) {
    console.error('❌ Greška pri učitavanju podataka:', error);
    showError('Greška pri učitavanju podataka godišnjih odmora');
  } finally {
    hidePreloader();
  }
}

// Dummy funkcije koje nedostaju
async function loadFirmaInfo() {}

async function loadRadniciStatus() {
  try {
    // Prvo pokušaj da sinhronizuješ planove
    try {
      await fetch(`/api/godisnji-odmori/plan/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          firma_id: currentFirmaId,
        }),
      });
    } catch (syncError) {
      console.warn('⚠️ Greška pri sinhronizaciji planova:', syncError);
    }

    // Zatim učitaj planove
    const response = await fetch(
      `/api/godisnji-odmori/plan/${currentFirmaId}`,
      {
        credentials: 'include',
      }
    );

    if (!response.ok) throw new Error('Greška pri učitavanju plana');

    const result = await response.json();
    radniciData = result || [];

    // Ažuriraj tabelu radnika
    updateRadniciTable();
  } catch (error) {
    console.error('❌ Greška pri učitavanju radnika:', error);
    radniciData = [];
  }
}

async function loadDashboardStats() {
  try {
    // Izračunaj statistike na osnovu učitanih podataka
    updateDashboardStats();
  } catch (error) {
    console.error('❌ Greška pri učitavanju statistika:', error);
  }
}

// Funkcija za ažuriranje dashboard statistika
function updateDashboardStats() {
  // Ukupno radnika
  const ukupnoRadnika = radniciData.length;
  const ukupnoRadnikaElement = document.getElementById('ukupnoRadnika');
  if (ukupnoRadnikaElement) {
    ukupnoRadnikaElement.textContent = ukupnoRadnika;
  }

  // Na čekanju (odmori sa statusom 'na_cekanju')
  const naCekanju = odmoríData.filter(o => o.status === 'na_cekanju').length;
  const naCekanjuElement = document.getElementById('naCekanju');
  if (naCekanjuElement) {
    naCekanjuElement.textContent = naCekanju;
  }

  // Odobreni ovaj mesec (odobreni odmori u tekućem mesecu)
  const trenutniMesec = new Date().getMonth() + 1;
  const trenutnaGodina = new Date().getFullYear();
  const odobreniOvajMesec = odmoríData.filter(o => {
    if (o.status !== 'odobren') return false;
    const datumOd = new Date(o.datum_od);
    return (
      datumOd.getMonth() + 1 === trenutniMesec &&
      datumOd.getFullYear() === trenutnaGodina
    );
  }).length;
  const odobreniElement = document.getElementById('odobreniMjesec');
  if (odobreniElement) {
    odobreniElement.textContent = odobreniOvajMesec;
  }

  // Ukupno dana iskorišćeno (suma dana za sve odobrene odmori)
  const ukupnoDanaKorisceno = odmoríData
    .filter(o => o.status === 'odobren')
    .reduce((total, odmor) => {
      const datumOd = new Date(odmor.datum_od);
      const datumDo = new Date(odmor.datum_do);
      const dani = Math.floor((datumDo - datumOd) / (1000 * 60 * 60 * 24)) + 1;
      return total + dani;
    }, 0);
  const ukupnoDanaElement = document.getElementById('ukupnoDanaKorisceno');
  if (ukupnoDanaElement) {
    ukupnoDanaElement.textContent = ukupnoDanaKorisceno;
  }
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

// Funkcija za otvaranje plana godišnjeg odmora
function openPlanGodisnjegOdmora() {
  window.location.href = `/plan-godisnjeg-odmora.html?firma_id=${currentFirmaId}`;
}

// Funkcija za kreiranje novog zahtjeva za odmor
function openNoviZahtjev() {
  // Učitaj radnike u dropdown
  populateRadniciDropdown();

  // Otvori modal
  const modal = new bootstrap.Modal(
    document.getElementById('noviZahtjevModal')
  );
  modal.show();
}

// Funkcija za odobravanje zahtjeva za odmor
async function approveOdmor(id) {
  if (
    !confirm('Da li ste sigurni da želite da odobrite ovaj zahtjev za odmor?')
  ) {
    return;
  }

  try {
    const response = await fetch(`/api/godisnji-odmori/${id}/approve`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Greška pri odobravanju zahtjeva');
    }

    const result = await response.json();

    if (result.success) {
      alert('Zahtjev je uspješno odobren!');
      // Ponovo učitaj podatke
      await loadOdmoriData();
      await loadRadniciStatus();
    } else {
      alert('Greška: ' + (result.message || 'Nepoznata greška'));
    }
  } catch (error) {
    console.error('Greška pri odobravanju:', error);
    alert('Greška pri odobravanju zahtjeva');
  }
}

// Funkcija za odbacivanje zahtjeva za odmor
async function rejectOdmor(id) {
  const razlog = prompt('Unesite razlog odbacivanja zahtjeva (opcionalno):');

  if (razlog === null) {
    return; // Korisnik je otkazao
  }

  try {
    const response = await fetch(`/api/godisnji-odmori/${id}/reject`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ razlog }),
    });

    if (!response.ok) {
      throw new Error('Greška pri odbacivanju zahtjeva');
    }

    const result = await response.json();

    if (result.success) {
      alert('Zahtjev je odbačen!');
      // Ponovo učitaj podatke
      await loadOdmoriData();
    } else {
      alert('Greška: ' + (result.message || 'Nepoznata greška'));
    }
  } catch (error) {
    console.error('Greška pri odbacivanju:', error);
    alert('Greška pri odbacivanju zahtjeva');
  }
}

// Funkcija za brisanje zahtjeva za odmor
async function deleteOdmor(id) {
  if (
    !confirm(
      'Da li ste sigurni da želite da obrišete ovaj zahtjev za odmor? Ova akcija se ne može poništiti.'
    )
  )
    return;

  try {
    const response = await fetch(`/api/godisnji-odmori/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Greška pri brisanju zahtjeva');
    }

    const result = await response.json();

    if (result.success) {
      alert('Zahtjev je uspješno obrisan!');
      // Ponovo učitaj podatke
      await loadOdmoriData();
      await loadRadniciStatus();
    } else {
      alert('Greška: ' + (result.message || 'Nepoznata greška'));
    }
  } catch (error) {
    console.error('Greška pri brisanju:', error);
    alert('Greška pri brisanju zahtjeva');
  }
}

// Funkcija za popunjavanje dropdown-a radnika
function populateRadniciDropdown() {
  const select = document.getElementById('radnikSelect');
  select.innerHTML = '<option value="">Izaberite radnika...</option>';

  radniciData.forEach(radnik => {
    const option = document.createElement('option');
    option.value = radnik.radnik_id; // Koristim radnik_id jer to je polje iz godisnji_plan tabele
    option.textContent = `${radnik.ime} ${radnik.prezime} (${
      radnik.pozicija_naziv || 'Radnik'
    })`;
    select.appendChild(option);
  });
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

  // Učitaj podatke
  loadInitialData();

  // Event listeneri za modal
  setupModalEventListeners();
});

// Postavi event listenere za modal
function setupModalEventListeners() {
  // Event listener za promjenu datuma - izračunaj broj dana
  const datumOd = document.getElementById('datumOd');
  const datumDo = document.getElementById('datumDo');

  if (datumOd && datumDo) {
    datumOd.addEventListener('change', calculateDaysPreview);
    datumDo.addEventListener('change', calculateDaysPreview);
  }

  // Event listener za submit zahtjeva
  const submitBtn = document.getElementById('submitZahtjev');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitNoviZahtjev);
  }
}

// Funkcija za preview broja dana
function calculateDaysPreview() {
  const datumOd = document.getElementById('datumOd').value;
  const datumDo = document.getElementById('datumDo').value;
  const preview = document.getElementById('brojDanaPreview');
  const text = document.getElementById('brojDanaText');

  if (datumOd && datumDo) {
    const startDate = new Date(datumOd);
    const endDate = new Date(datumDo);

    if (endDate >= startDate) {
      // Jednostavno računanje (bez uzimanja u obzir subote jer ne znamo koji radnik)
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      text.textContent = `Približan broj dana: ${diffDays} (tačan broj će biti izračunat na osnovu radnog vremena radnika)`;
      preview.classList.remove('d-none');
    } else {
      preview.classList.add('d-none');
    }
  } else {
    preview.classList.add('d-none');
  }
}

// Funkcija za slanje novog zahtjeva
async function submitNoviZahtjev() {
  const form = document.getElementById('noviZahtjevForm');
  const submitBtn = document.getElementById('submitZahtjev');

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const formData = {
    radnik_id: document.getElementById('radnikSelect').value,
    datum_od: document.getElementById('datumOd').value,
    datum_do: document.getElementById('datumDo').value,
    tip_odmora: document.getElementById('tipOdmoraSelect').value,
    napomena: document.getElementById('napomena').value || null,
  };

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin me-2"></i>Šalje se...';

    const response = await fetch('/api/godisnji-odmori', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error('Greška pri kreiranju zahtjeva');
    }

    const result = await response.json();

    if (result.success) {
      alert('Zahtjev je uspješno kreiran!');

      // Zatvori modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById('noviZahtjevModal')
      );
      modal.hide();

      // Resetuj formu
      form.reset();
      document.getElementById('brojDanaPreview').classList.add('d-none');

      // Ponovo učitaj podatke
      await loadOdmoriData();
      await loadRadniciStatus();
    } else {
      alert('Greška: ' + (result.message || 'Nepoznata greška'));
    }
  } catch (error) {
    console.error('Greška pri kreiranju zahtjeva:', error);
    alert('Greška pri kreiranju zahtjeva: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML =
      '<i class="fas fa-paper-plane me-2"></i>Pošalji zahtjev';
  }
}

// Funkcija za pregled detalja radnika
async function viewRadnikDetails(radnikId) {
  try {
    // Radnik je već učitan u radniciData preko godisnji_plan endpoint-a
    const radnik = radniciData.find(r => r.radnik_id === radnikId);

    if (!radnik) {
      alert('Radnik nije pronađen!');
      return;
    }

    // Učitaj odmor podatke za radnika
    const odmorResponse = await fetch(
      `/api/godisnji-odmori/${currentFirmaId}`,
      {
        credentials: 'include',
      }
    );

    if (!odmorResponse.ok) {
      if (odmorResponse.status === 401) {
        alert('Morate se ulogirati da biste pristupili ovoj stranici.');
        window.location.href = '/prijava.html';
        return;
      }
      throw new Error(
        `HTTP ${odmorResponse.status}: ${odmorResponse.statusText}`
      );
    }

    const sviOdmori = await odmorResponse.json();
    const radnikOdmori = sviOdmori.filter(o => o.radnik_id === radnikId);

    // Popuni modal sa podacima
    document.getElementById(
      'detaljRadnikNaslov'
    ).textContent = `${radnik.ime} ${radnik.prezime}`;
    document.getElementById('detaljPozicija').textContent =
      radnik.pozicija_naziv || 'Radnik';
    document.getElementById('detaljUkupnoDana').textContent =
      radnik.ukupno_dana || (radnik.subota ? 24 : 20);
    document.getElementById('detaljIskorisenoDana').textContent =
      radnik.iskorisceno_dana || 0;
    document.getElementById('detaljPreostaloDana').textContent =
      (radnik.ukupno_dana || (radnik.subota ? 24 : 20)) -
      (radnik.iskorisceno_dana || 0);

    // Popuni tabelu odmora
    const tabelaOdmora = document.getElementById('detaljOdmoriTabela');

    if (radnikOdmori.length === 0) {
      tabelaOdmora.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted py-4">
            <i class="fas fa-calendar-times me-2"></i>Nema zabeleženih odmora
          </td>
        </tr>
      `;
    } else {
      let odmoriHtml = '';
      radnikOdmori.forEach(odmor => {
        const statusClass =
          odmor.status === 'odobren'
            ? 'success'
            : odmor.status === 'na_cekanju'
            ? 'warning'
            : 'danger';
        const statusText =
          odmor.status === 'odobren'
            ? 'Odobren'
            : odmor.status === 'na_cekanju'
            ? 'Na čekanju'
            : 'Odbačen';

        odmoriHtml += `
          <tr>
            <td>${new Date(odmor.datum_od).toLocaleDateString('sr-RS')}</td>
            <td>${new Date(odmor.datum_do).toLocaleDateString('sr-RS')}</td>
            <td>${odmor.broj_dana}</td>
            <td>
              <span class="badge bg-${statusClass}">${statusText}</span>
            </td>
            <td>${odmor.napomena || '-'}</td>
          </tr>
        `;
      });
      tabelaOdmora.innerHTML = odmoriHtml;
    }

    // Prikaži modal
    const modal = new bootstrap.Modal(
      document.getElementById('detaljRadnikModal')
    );
    modal.show();
  } catch (error) {
    console.error('❌ Greška pri učitavanju detalja radnika:', error);
    alert('Greška pri učitavanju detalja radnika!');
  }
}

// Funkcija za planiranje odmora
async function planOdmor(radnikId) {
  try {
    // Radnik je već učitan u radniciData preko godisnji_plan endpoint-a
    const radnik = radniciData.find(r => r.radnik_id === radnikId);

    if (!radnik) {
      alert('Radnik nije pronađen!');
      return;
    }

    // Popuni modal sa podacima radnika
    document.getElementById(
      'planRadnikNaslov'
    ).textContent = `Planiraj odmor - ${radnik.ime} ${radnik.prezime}`;
    document.getElementById('planRadnikId').value = radnikId;
    document.getElementById('planUkupnoDana').textContent =
      radnik.ukupno_dana || (radnik.subota ? 24 : 20);
    document.getElementById('planIskorisenoDana').textContent =
      radnik.iskorisceno_dana || 0;
    document.getElementById('planPreostaloDana').textContent =
      (radnik.ukupno_dana || (radnik.subota ? 24 : 20)) -
      (radnik.iskorisceno_dana || 0);

    // Resetuj formu
    document.getElementById('planOdmorForm').reset();
    document.getElementById('planBrojDanaPreview').classList.add('d-none');

    // Prikaži modal
    const modal = new bootstrap.Modal(
      document.getElementById('planOdmorModal')
    );
    modal.show();
  } catch (error) {
    console.error('❌ Greška pri učitavanju radnika:', error);
    alert('Greška pri učitavanju radnika!');
  }
}

// Funkcija za kalkulaciju dana u plan modalul
function calculatePlanDays() {
  const datumOd = document.getElementById('planDatumOd').value;
  const datumDo = document.getElementById('planDatumDo').value;

  if (datumOd && datumDo) {
    const from = new Date(datumOd);
    const to = new Date(datumDo);

    if (to >= from) {
      const days = Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
      document.getElementById('planBrojDana').textContent = days;
      document.getElementById('planBrojDanaPreview').classList.remove('d-none');
    } else {
      document.getElementById('planBrojDanaPreview').classList.add('d-none');
    }
  } else {
    document.getElementById('planBrojDanaPreview').classList.add('d-none');
  }
}

// Funkcija za submit plana odmora
async function submitPlanOdmor() {
  const form = document.getElementById('planOdmorForm');
  const formData = new FormData(form);

  const data = {
    radnik_id: parseInt(formData.get('radnik_id')),
    datum_od: formData.get('datum_od'),
    datum_do: formData.get('datum_do'),
    napomena: formData.get('napomena') || '',
    status: 'na_cekanju',
  };

  const submitBtn = document.getElementById('planSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Šalje...';

  try {
    const response = await fetch(`/api/godisnji-odmori/${currentFirmaId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      alert('Odmor je uspešno planiran!');

      // Zatvori modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById('planOdmorModal')
      );
      modal.hide();

      // Resetuj formu
      form.reset();
      document.getElementById('planBrojDanaPreview').classList.add('d-none');

      // Ponovo učitaj podatke
      await loadOdmoriData();
      await loadRadniciStatus();
    } else {
      alert('Greška: ' + (result.message || 'Nepoznata greška'));
    }
  } catch (error) {
    console.error('Greška pri kreiranju plana:', error);
    alert('Greška pri kreiranju plana: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML =
      '<i class="fas fa-paper-plane me-2"></i>Planiraj odmor';
  }
}

// Funkcija za generisanje rešenja o godišnjem odmoru
async function generateResenjeOdmor(odmorId) {
  try {
    // Pronađi podatke o odmoru
    const odmor = odmoríData.find(o => o.id === odmorId);
    if (!odmor) {
      alert('Podaci o odmoru nisu pronađeni');
      return;
    }

    // Proveri da li je odmor odobren
    if (odmor.status !== 'odobren') {
      alert('Rešenje se može generisati samo za odobrene odmove');
      return;
    }

    // Generiši i otvori rešenje o godišnjem odmoru
    const url = `/resenje-godisnji-odmor.html?odmorId=${odmorId}`;
    window.open(url, '_blank');
  } catch (error) {
    console.error('Greška pri generisanju rešenja:', error);
    alert('Greška pri generisanju rešenja: ' + error.message);
  }
}
