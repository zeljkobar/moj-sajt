/**
 * JavaScript modul za upravljanje dokumentima firme
 * Prikazuje sve dokumente (ugovori, pozajmice, itd.) za određenu firmu
 */

// =============================================================================
// GLOBALNE PROMENLJIVE
// =============================================================================

let firmaId = null;
let firmaNaziv = null;
let dokumenti = {
  ugovori: [],
  pozajmice: [],
  otkazi: [],
};

// =============================================================================
// INICIJALIZACIJA
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {
  initPage();
});

function initPage() {
  // Dobij parametre iz URL-a
  const urlParams = new URLSearchParams(window.location.search);
  firmaId = urlParams.get('firmaId');
  firmaNaziv = urlParams.get('naziv');

  if (!firmaId) {
    alert('Greška: Nedostaje ID firme');
    window.location.href = '/shared/firme.html';
    return;
  }

  // Postavi naziv firme
  if (firmaNaziv) {
    document.getElementById('firmaNaziv').textContent =
      decodeURIComponent(firmaNaziv);
  }

  // Učitaj dokumente
  loadDokumenti();

  // Setup event listeners
  setupEventListeners();
}

function setupEventListeners() {
  // Novi ugovor o radu dugmad - otvori modal umesto redirekcije
  const noviUgovorBtns = document.querySelectorAll(
    '#noviUgovorBtn, #noviUgovorBtn2'
  );
  noviUgovorBtns.forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();

      // Otvori modal za dodavanje radnika sa firmId
      openRadnikModal({
        firmId: firmaId,
        onSuccess: function (result) {
          console.log('Radnik je uspešno dodan:', result);
          // Reload dokumenta da prikaže novi ugovor
          loadDokumenti();
          // Možda pokaži success poruku
          showSuccessMessage(
            'Radnik je uspešno dodan! Sada možete kreirati ugovor.'
          );
        },
      });
    });
  });

  // Nova pozajmnica dugme
  const novaPozajmicaBtn = document.getElementById('novaPozajmicaBtn');
  if (novaPozajmicaBtn) {
    novaPozajmicaBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openPozajmnicaModal();
    });
  }

  // Event listeners za pozajmica modal
  const savePozajmnicaBtn = document.getElementById('savePozajmnicaBtn');
  if (savePozajmnicaBtn) {
    savePozajmnicaBtn.addEventListener('click', savePozajmnica);
  }

  const savePozajmnicaAndGenerateBtn = document.getElementById(
    'savePozajmnicaAndGenerateBtn'
  );
  if (savePozajmnicaAndGenerateBtn) {
    savePozajmnicaAndGenerateBtn.addEventListener('click', () =>
      savePozajmnica(true)
    );
  }
}

// =============================================================================
// API POZIVI
// =============================================================================

async function loadDokumenti() {
  try {
    showLoading(true);

    // Učitaj postojeće ugovore o radu
    const ugovoriResponse = await fetch(`/api/radnici/firma/${firmaId}`);
    const ugovoriData = await ugovoriResponse.json();

    if (ugovoriResponse.ok) {
      dokumenti.ugovori = Array.isArray(ugovoriData) ? ugovoriData : [];
      console.log('Učitani ugovori:', dokumenti.ugovori);
    } else {
      console.warn('Greška pri učitavanju ugovora:', ugovoriData.error);
      dokumenti.ugovori = [];
    }

    // Učitaj otkaze za ovu firmu
    try {
      const otkaziResponse = await fetch(`/api/otkazi/firma/${firmaId}`);
      const otkaziData = await otkaziResponse.json();

      if (otkaziResponse.ok && otkaziData.success) {
        dokumenti.otkazi = Array.isArray(otkaziData.data)
          ? otkaziData.data
          : [];
        console.log('Učitani otkazi:', dokumenti.otkazi);
      } else {
        console.warn(
          'Greška pri učitavanju otkaza:',
          otkaziData.message || otkaziData.error
        );
        dokumenti.otkazi = [];
      }
    } catch (otkazError) {
      console.warn('Nema otkaza za ovu firmu:', otkazError);
      dokumenti.otkazi = [];
    }

    // Učitaj pozajmice za ovu firmu
    try {
      const pozajmiceResponse = await fetch(`/api/pozajmnice/firma/${firmaId}`);
      const pozajmiceData = await pozajmiceResponse.json();

      if (pozajmiceResponse.ok) {
        dokumenti.pozajmice = Array.isArray(pozajmiceData) ? pozajmiceData : [];
        console.log('Učitane pozajmice:', dokumenti.pozajmice);
      } else {
        console.warn('Greška pri učitavanju pozajmica:', pozajmiceData.error);
        dokumenti.pozajmice = [];
      }
    } catch (pozajmiceError) {
      console.warn('Nema pozajmica za ovu firmu:', pozajmiceError);
      dokumenti.pozajmice = [];
    }

    updateStats();
    renderDokumenti();
    showContainers();
  } catch (error) {
    console.error('Greška pri učitavanju dokumenata:', error);
    showError('Greška pri učitavanju dokumenata');
  } finally {
    showLoading(false);
  }
}

// =============================================================================
// UI FUNKCIJE
// =============================================================================

function showLoading(show) {
  const loadingSpinner = document.getElementById('loadingSpinner');
  if (loadingSpinner) {
    loadingSpinner.style.display = show ? 'block' : 'none';
  }
}

function showContainers() {
  const containers = ['statsContainer', 'actionsContainer'];

  containers.forEach(containerId => {
    const container = document.getElementById(containerId);
    if (container) {
      container.classList.remove('d-none');
    }
  });

  // Prikaži tabelu ili "nema dokumenata" poruku
  const totalDokumenti =
    dokumenti.ugovori.length +
    dokumenti.pozajmice.length +
    dokumenti.otkazi.length;

  if (totalDokumenti > 0) {
    const documentsContainer = document.getElementById('documentsContainer');
    if (documentsContainer) {
      documentsContainer.classList.remove('d-none');
    }
  } else {
    const noDocuments = document.getElementById('noDocuments');
    if (noDocuments) {
      noDocuments.classList.remove('d-none');
    }
  }
}

function updateStats() {
  const ugovoriBroj = dokumenti.ugovori.length;
  const pozajmiceBroj = dokumenti.pozajmice.length;
  const otkaziBroj = dokumenti.otkazi.length;
  const ukupnoDokumenti = ugovoriBroj + pozajmiceBroj + otkaziBroj;

  // Izračunaj ukupan iznos pozajmica
  const ukupnoIznos = dokumenti.pozajmice.reduce((sum, pozajmica) => {
    return sum + parseFloat(pozajmica.iznos || 0);
  }, 0);

  // Update UI
  document.getElementById('ugovoriBroj').textContent = ugovoriBroj;
  document.getElementById('pozajmiceBroj').textContent = pozajmiceBroj;
  document.getElementById('otkaziBroj').textContent = otkaziBroj;
  document.getElementById('ukupnoDokumenti').textContent = ukupnoDokumenti;
}

function renderDokumenti() {
  const tableBody = document.getElementById('documentsTableBody');
  if (!tableBody) return;

  let html = '';

  // Formatiranje vrste ugovora
  const vrstaUgovoraText = {
    ugovor_o_radu: 'Ugovor o radu',
    ugovor_o_djelu: 'Ugovor o djelu',
    ugovor_o_dopunskom_radu: 'Ugovor o dopunskom radu',
    autorski_ugovor: 'Autorski ugovor',
    ugovor_o_pozajmnici: 'Ugovor o pozajmnici',
  };

  // Dodaj ugovore o radu
  dokumenti.ugovori.forEach(ugovor => {
    const status = getUgovorStatus(ugovor);
    const vrstaUgovora =
      vrstaUgovoraText[ugovor.vrsta_ugovora] || 'Ugovor o radu';

    html += `
      <tr>
        <td>
          <div class="document-type">
            <i class="fas fa-handshake text-success"></i>
            ${vrstaUgovora}
          </div>
        </td>
        <td>
          <strong>${ugovor.ime} ${ugovor.prezime}</strong><br>
          <small class="text-muted">${
            ugovor.pozicija_naziv || ugovor.pozicija || 'Nespecifikovano'
          }</small>
        </td>
        <td>${formatDate(ugovor.datum_zaposlenja)}</td>
        <td>
          <span class="document-status ${status.cssClass}">
            ${status.text}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-primary btn-sm" onclick="viewUgovor(${
              ugovor.id
            })" title="Pregled">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="editRadnik(${
              ugovor.id
            })" title="Uredi">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  // Dodaj otkaze
  dokumenti.otkazi.forEach(otkaz => {
    let tipOtkaza;
    if (otkaz.tip_otkaza === 'sporazumni_raskid') {
      tipOtkaza = 'Sporazumni raskid';
    } else if (otkaz.tip_otkaza === 'jednostrani_raskid_radnik') {
      tipOtkaza = 'Jednostrani raskid od strane radnika';
    } else {
      tipOtkaza = 'Istek ugovora';
    }

    html += `
      <tr>
        <td>
          <div class="document-type">
            <i class="fas fa-user-times text-danger"></i>
            ${tipOtkaza}
          </div>
        </td>
        <td>
          <strong>${otkaz.ime} ${otkaz.prezime}</strong><br>
          <small class="text-muted">${
            otkaz.pozicija_naziv || 'Nespecifikovano'
          }</small>
        </td>
        <td>${formatDate(otkaz.datum_otkaza)}</td>
        <td>
          <span class="document-status status-inactive">
            Otkazan
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-primary btn-sm" onclick="viewOtkaz(${
              otkaz.id
            }, '${otkaz.tip_otkaza}', ${
      otkaz.radnik_id
    }, ${firmaId})" title="Pregled dokumenta">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  // Dodaj pozajmice
  dokumenti.pozajmice.forEach(pozajmica => {
    const status = pozajmica.status || 'aktivna';
    const statusClass =
      status === 'aktivna' ? 'status-active' : 'status-inactive';
    const statusText = status === 'aktivna' ? 'Aktivna' : 'Zatvorena';

    html += `
      <tr>
        <td>
          <div class="document-type">
            <i class="fas fa-money-bill-wave text-warning"></i>
            Pozajmnica
          </div>
        </td>
        <td>
          <strong>€${parseFloat(pozajmica.iznos).toFixed(2)}</strong><br>
          <small class="text-muted">${pozajmica.radnik_ime} ${
      pozajmica.radnik_prezime
    }</small>
        </td>
        <td>${formatDate(pozajmica.datum_izdavanja)}</td>
        <td>
          <span class="document-status ${statusClass}">
            ${statusText}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-primary btn-sm" onclick="viewPozajmica(${
              pozajmica.id
            })" title="Pregled">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="editPozajmica(${
              pozajmica.id
            })" title="Uredi">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

// =============================================================================
// HELPER FUNKCIJE
// =============================================================================

function formatDate(dateString) {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  return date.toLocaleDateString('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isUgovorAktivan(ugovor) {
  // Prvo proverio da li je radnik otkazan
  const otkaz = dokumenti.otkazi.find(o => o.radnik_id === ugovor.id);
  if (otkaz) {
    // Ako postoji otkaz, ugovor nije aktivan
    return false;
  }

  // Ako nema datum_prestanka (null), ugovor je na neodređeno - aktivan
  if (!ugovor.datum_prestanka) {
    return true;
  }

  // Ako ima datum_prestanka, proverio da li je u budućnosti
  const prestanak = new Date(ugovor.datum_prestanka);
  const danas = new Date();
  danas.setHours(0, 0, 0, 0); // Reset na početak dana

  return prestanak >= danas;
}

function getUgovorStatus(ugovor) {
  const aktivan = isUgovorAktivan(ugovor);
  return {
    aktivan: aktivan,
    text: aktivan ? 'Aktivan' : 'Neaktivan',
    cssClass: aktivan ? 'status-active' : 'status-inactive',
  };
}

function showError(message) {
  const container = document.querySelector('.container');
  if (container) {
    container.innerHTML = `
      <div class="alert alert-danger">
        <h4>Greška</h4>
        <p>${message}</p>
        <a href="/firme.html" class="btn btn-primary">Nazad na firme</a>
      </div>
    `;
  }
}

// =============================================================================
// ACTION FUNKCIJE
// =============================================================================

async function viewUgovor(radnikId) {
  try {
    // Prvo dohvati podatke o radniku da vidiš vrstu ugovora
    const radnikResponse = await fetch(`/api/radnici/id/${radnikId}`);
    const radnik = await radnikResponse.json();

    // Na osnovu vrste ugovora otvori odgovarajući template
    let ugovorUrl;

    if (radnik.vrsta_ugovora === 'ugovor_o_dopunskom_radu') {
      ugovorUrl = `/shared/ugovor-o-dopunskom-radu.html?radnikId=${radnikId}&firmaId=${firmaId}`;
    } else {
      // Default - ugovor o radu (ili bilo koja druga vrsta)
      ugovorUrl = `/shared/ugovor-o-radu.html?radnikId=${radnikId}&firmaId=${firmaId}`;
    }

    window.open(ugovorUrl, '_blank');
  } catch (error) {
    console.error('Greška pri dohvaćanju podataka o radniku:', error);
    // Fallback - otvori ugovor o radu
    window.open(
      `/shared/ugovor-o-radu.html?radnikId=${radnikId}&firmaId=${firmaId}`,
      '_blank'
    );
  }
}

function editRadnik(radnikId) {
  // Otvori edit radnika na firma detalji stranici
  window.location.href = `/shared/firma-detalji.html?id=${firmaId}&editId=${radnikId}`;
}

// Funkcija za pregled otkaz dokumenata
function viewOtkaz(otkazId, tipOtkaza, radnikId, firmaId) {
  let documentUrl;

  if (tipOtkaza === 'sporazumni_raskid') {
    documentUrl = `/sporazumni-raskid.html?radnikId=${radnikId}&firmaId=${firmaId}&otkazId=${otkazId}`;
  } else if (tipOtkaza === 'istek_ugovora') {
    documentUrl = `/istek-ugovora.html?radnikId=${radnikId}&firmaId=${firmaId}&otkazId=${otkazId}`;
  } else if (tipOtkaza === 'jednostrani_raskid_radnik') {
    documentUrl = `/jednostrani-raskid-od-strane-radnika.html?radnikId=${radnikId}&firmaId=${firmaId}&otkazId=${otkazId}`;
  } else {
    console.error('Nepoznat tip otkaza:', tipOtkaza);
    return;
  }

  window.open(documentUrl, '_blank');
}

// Helper funkcija za prikazivanje success poruka
function showSuccessMessage(message) {
  // Kreiraj alert element
  const alertDiv = document.createElement('div');
  alertDiv.className =
    'alert alert-success alert-dismissible fade show position-fixed';
  alertDiv.style.cssText =
    'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  // Dodaj u body
  document.body.appendChild(alertDiv);

  // Auto ukloni nakon 5 sekundi
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

// =============================================================================
// POZAJMICA FUNKCIJE
// =============================================================================

async function openPozajmnicaModal() {
  try {
    // Resetuj modal u create mode
    resetPozajmnicaModal();

    // Postavi firma_id
    document.getElementById('firma_id').value = firmaId;

    // Postavi današnji datum
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('datum_izdavanja').value = today;

    // Generiši sledeći broj ugovora za ovu firmu
    const nextBrojResponse = await fetch(
      `/api/pozajmnice/next-broj/${firmaId}`
    );
    if (nextBrojResponse.ok) {
      const data = await nextBrojResponse.json();
      document.getElementById('broj_ugovora').value = data.nextBrojUgovora;
    }

    // Učitaj radnike firme
    await loadRadniciFirme();

    // Otvori modal
    const modal = new bootstrap.Modal(
      document.getElementById('pozajmnicaModal')
    );
    modal.show();
  } catch (error) {
    console.error('Error opening pozajmica modal:', error);
    alert('Greška pri otvaranju modala za pozajmicu');
  }
}

async function loadRadniciFirme() {
  try {
    const response = await fetch(`/api/radnici/firma/${firmaId}`);
    if (response.ok) {
      const radnici = await response.json();
      const radnikSelect = document.getElementById('radnik_id');

      // Očisti postojeće opcije osim prve
      radnikSelect.innerHTML = '<option value="">Izaberite radnika</option>';

      // Dodaj radnike
      radnici.forEach(radnik => {
        const option = document.createElement('option');
        option.value = radnik.id;
        option.textContent = `${radnik.ime} ${radnik.prezime} (${
          radnik.pozicija_naziv || 'N/A'
        })`;
        radnikSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading radnici:', error);
  }
}

async function savePozajmnica(generateDocument = false) {
  try {
    const form = document.getElementById('pozajmnicaForm');
    const formData = new FormData(form);

    // Validacija
    if (
      !formData.get('radnik_id') ||
      !formData.get('iznos') ||
      !formData.get('svrha')
    ) {
      alert('Molimo popunite sva obavezna polja');
      return;
    }

    // Pripremi podatke
    const pozajmnicaData = {
      firma_id: parseInt(formData.get('firma_id')),
      radnik_id: parseInt(formData.get('radnik_id')),
      iznos: parseFloat(formData.get('iznos')),
      svrha: formData.get('svrha'),
      broj_ugovora: formData.get('broj_ugovora'),
      datum_izdavanja: formData.get('datum_izdavanja'),
      datum_dospeća: formData.get('datum_dospeća') || null,
      napomene: formData.get('napomene') || '',
    };

    // Proverio da li je edit mode
    const editId = document.getElementById('editPozajmicaId')?.value;
    const isEdit = !!editId;

    // Pripremi URL i metodu
    const url = isEdit ? `/api/pozajmnice/${editId}` : '/api/pozajmnice';
    const method = isEdit ? 'PUT' : 'POST';

    // Pošalji na server
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pozajmnicaData),
    });

    const result = await response.json();

    if (response.ok) {
      // Zatvori modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById('pozajmnicaModal')
      );
      modal.hide();

      // Resetuj formu i modal
      resetPozajmnicaModal();

      // Prikaži success poruku
      const message = isEdit
        ? 'Pozajmica je uspešno ažurirana!'
        : 'Pozajmica je uspešno kreirana!';
      showSuccessMessage(message);

      // Osveži dokumente
      loadDokumenti();

      // Generiši dokument ako je potrebno
      const pozajmnicaId = result.pozajmnicaId || editId;
      if (generateDocument && pozajmnicaId) {
        generatePozajmnicaDocument(pozajmnicaId);
      }
    } else {
      alert('Greška: ' + (result.message || 'Nepoznata greška'));
    }
  } catch (error) {
    console.error('Error saving pozajmica:', error);
    alert('Greška pri snimanju pozajmice');
  }
}

function resetPozajmnicaModal() {
  // Resetuj formu
  document.getElementById('pozajmnicaForm').reset();

  // Resetuj naslov i dugmad
  document.querySelector('#pozajmnicaModal .modal-title').textContent =
    'Nova pozajmica';
  document.getElementById('savePozajmnicaBtn').textContent = 'Sačuvaj';
  document.getElementById('savePozajmnicaAndGenerateBtn').textContent =
    'Sačuvaj i generiši dokument';

  // Ukloni edit ID
  const editIdInput = document.getElementById('editPozajmicaId');
  if (editIdInput) {
    editIdInput.remove();
  }
}

function generatePozajmnicaDocument(pozajmnicaId) {
  // Otvori dokument u novom tabu
  const url = `/ugovor-o-zajmu-novca.html?pozajmnicaId=${pozajmnicaId}&firmaId=${firmaId}`;
  window.open(url, '_blank');
}

// =============================================================================
// POZAJMICA ACTION FUNKCIJE
// =============================================================================

function viewPozajmica(pozajmnicaId) {
  // Otvori dokument pozajmice u novom tabu
  generatePozajmnicaDocument(pozajmnicaId);
}

async function editPozajmica(pozajmicaId) {
  try {
    // Učitaj podatke o pozajmici
    const response = await fetch(`/api/pozajmnice/${pozajmicaId}`);
    if (!response.ok) {
      throw new Error('Pozajmica nije pronađena');
    }

    const pozajmica = await response.json();

    // Popuni formu sa postojećim podacima
    document.getElementById('firma_id').value = pozajmica.firma_id;
    document.getElementById('radnik_id').value = pozajmica.radnik_id;
    document.getElementById('iznos').value = pozajmica.iznos;
    document.getElementById('svrha').value = pozajmica.svrha;
    document.getElementById('broj_ugovora').value = pozajmica.broj_ugovora;
    document.getElementById('datum_izdavanja').value =
      pozajmica.datum_izdavanja?.split('T')[0];
    document.getElementById('datum_dospeća').value =
      pozajmica.datum_dospeća?.split('T')[0] || '';
    document.getElementById('napomene').value = pozajmica.napomene || '';

    // Učitaj radnike firme
    await loadRadniciFirme();

    // Postavi radnika nakon što su opcije učitane
    document.getElementById('radnik_id').value = pozajmica.radnik_id;

    // Promeni naslov modala i dugmad za edit mode
    document.querySelector('#pozajmnicaModal .modal-title').textContent =
      'Uredi pozajmicu';
    document.getElementById('savePozajmnicaBtn').textContent = 'Ažuriraj';
    document.getElementById('savePozajmnicaAndGenerateBtn').textContent =
      'Ažuriraj i generiši dokument';

    // Dodaj hidden input za ID pozajmice
    let editIdInput = document.getElementById('editPozajmicaId');
    if (!editIdInput) {
      editIdInput = document.createElement('input');
      editIdInput.type = 'hidden';
      editIdInput.id = 'editPozajmicaId';
      document.getElementById('pozajmnicaForm').appendChild(editIdInput);
    }
    editIdInput.value = pozajmicaId;

    // Otvori modal
    const modal = new bootstrap.Modal(
      document.getElementById('pozajmnicaModal')
    );
    modal.show();
  } catch (error) {
    console.error('Error loading pozajmica for edit:', error);
    alert('Greška pri učitavanju pozajmice: ' + error.message);
  }
}
