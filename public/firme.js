/**
 * JavaScript modul za upravljanje firmama
 * Sadrži funkcionalnosti za pregled, dodavanje, uređivanje i brisanje firmi
 */

// =============================================================================
// GLOBALNE PROMENLJIVE
// =============================================================================

let allFirms = [];
let filteredFirms = [];
let currentFilter = 'all';
let currentPib = null;
let originalStatus = null;

// =============================================================================
// INICIJALIZACIJA
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {
  const currentPage = getCurrentPage();

  switch (currentPage) {
    case 'firme':
      loadFirms();
      setupEventListeners();

      // Čitaj search parametar iz URL-a i postavi ga u search input
      const urlParams = new URLSearchParams(window.location.search);
      const searchQuery = urlParams.get('search');
      if (searchQuery) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.value = searchQuery;
          // Pokreni filter da se primeni search
          setTimeout(() => filterFirms(), 100);
        }
      }

      // Čitaj filter parametar iz URL-a i postavi odgovarajući tab
      const filterQuery = urlParams.get('filter');
      if (filterQuery) {
        // Aktiviraj odgovarajući tab
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => tab.classList.remove('active'));

        const targetTab = document.querySelector(
          `[data-filter="${filterQuery}"]`
        );
        if (targetTab) {
          targetTab.classList.add('active');
          currentFilter = filterQuery;
          // Pokreni filter kada se firme učitaju
          setTimeout(() => filterFirms(), 200);
        }
      }
      break;
    case 'dodaj-firmu':
      initAddFirmPage();
      break;
    case 'edit-firmu':
      initEditFirmPage();
      break;
  }
});

function getCurrentPage() {
  const path = window.location.pathname;
  if (path.includes('firme.html')) return 'firme';
  if (path.includes('dodaj-firmu.html')) return 'dodaj-firmu';
  if (path.includes('edit-firmu.html')) return 'edit-firmu';
  return null;
}

// =============================================================================
// FIRME PAGE (firme.html)
// =============================================================================

function setupEventListeners() {
  // Search funkcionalnost
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function (e) {
      filterFirms();
    });
  }

  // Tab filtering
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document
        .querySelectorAll('.tab-btn')
        .forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      filterFirms();
    });
  });
}

async function loadFirms() {
  try {
    const loadingSpinner = document.querySelector('.loading-spinner');
    if (loadingSpinner) {
      loadingSpinner.style.display = 'block';
    }

    const response = await fetch('/api/firme', {
      credentials: 'include',
    });
    const data = await response.json();

    allFirms = data.firme || [];
    updateCounts();
    filterFirms();
  } catch (error) {
    console.error('Greška pri učitavanju firmi:', error);
    const container = document.getElementById('firmsContainer');
    if (container) {
      container.innerHTML =
        '<div class="alert alert-danger">Greška pri učitavanju firmi</div>';
    }
  } finally {
    const loadingSpinner = document.querySelector('.loading-spinner');
    if (loadingSpinner) {
      loadingSpinner.style.display = 'none';
    }
  }
}

function updateCounts() {
  const activeFirms = allFirms.filter(f => f.status === 'aktivan');
  const zeroFirms = allFirms.filter(f => f.status === 'nula');

  const totalCount = document.getElementById('totalCount');
  const activeCount = document.getElementById('activeCount');
  const zeroCount = document.getElementById('zeroCount');

  if (totalCount) totalCount.textContent = allFirms.length;
  if (activeCount) activeCount.textContent = activeFirms.length;
  if (zeroCount) zeroCount.textContent = zeroFirms.length;
}

function filterFirms() {
  const searchInput = document.getElementById('searchInput');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

  // Filter by status
  let firms = allFirms;
  if (currentFilter === 'active') {
    firms = allFirms.filter(f => f.status === 'aktivan');
  } else if (currentFilter === 'zero') {
    firms = allFirms.filter(f => f.status === 'nula');
  }

  // Filter by search term
  if (searchTerm) {
    firms = firms.filter(
      firm =>
        firm.naziv.toLowerCase().includes(searchTerm) ||
        firm.pib.includes(searchTerm) ||
        firm.adresa.toLowerCase().includes(searchTerm) ||
        (firm.pdvBroj && firm.pdvBroj.toLowerCase().includes(searchTerm))
    );
  }

  filteredFirms = firms;
  renderFirms();
}

function renderFirms() {
  const container = document.getElementById('firmsContainer');
  const noResults = document.querySelector('.no-results');

  if (!container) return;

  if (filteredFirms.length === 0) {
    container.innerHTML = '';
    if (noResults) noResults.classList.remove('d-none');
    return;
  }

  if (noResults) noResults.classList.add('d-none');

  const firmsHtml = filteredFirms
    .map(
      firm => `
    <div class="firm-card card firma-row-clickable" onclick="viewFirmaDetalji(${
      firm.id
    })">
      <div class="card-body">
        <div class="row align-items-center">
          <div class="col-md-7">
            <h5 class="card-title mb-2">
              <span class="firm-status ${
                firm.status === 'aktivan' ? 'status-active' : 'status-zero'
              }"></span>
              ${firm.naziv}
            </h5>
            <p class="mb-1"><strong>PIB:</strong> ${firm.pib}</p>
            <p class="mb-1"><strong>Adresa:</strong> ${firm.adresa}</p>
            ${
              firm.pdvBroj
                ? `<p class="mb-1"><strong>PDV broj:</strong> ${firm.pdvBroj}</p>`
                : ''
            }
            ${
              firm.direktor_ime_prezime
                ? `<p class="mb-1"><strong>Direktor:</strong> ${firm.direktor_ime_prezime}</p>`
                : ''
            }
            ${
              firm.direktor_jmbg
                ? `<p class="mb-0"><strong>JMBG direktora:</strong> ${firm.direktor_jmbg}</p>`
                : ''
            }
          </div>
          <div class="col-md-3 text-md-center">
            <span class="badge ${
              firm.status === 'aktivan' ? 'bg-success' : 'bg-warning'
            } fs-6 px-3 py-2">
              ${firm.status === 'aktivan' ? 'Aktivna' : 'Na nuli'}
            </span>
          </div>
          <div class="col-md-2 text-md-end">
            <div class="action-buttons" onclick="event.stopPropagation();">
              <button class="edit-btn" onclick="editFirm('${firm.pib}')">
                <i class="fas fa-edit"></i>
              </button>
              <button class="edit-btn" onclick="viewRadnici(${
                firm.id
              })" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
                <i class="fas fa-users"></i>
              </button>
              <button class="edit-btn" onclick="viewFirmaDetalji(${
                firm.id
              })" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);" title="Detalji firme">
                <i class="fas fa-info-circle"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger delete-btn" data-pib="${
                firm.pib
              }" data-naziv="${firm.naziv.replace(/"/g, '&quot;')}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join('');

  container.innerHTML = firmsHtml;

  // Add event listeners directly to each delete button
  const deleteButtons = document.querySelectorAll('.delete-btn');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      const pib = this.getAttribute('data-pib');
      const naziv = this.getAttribute('data-naziv');

      if (pib && naziv) {
        deleteFirm(pib, naziv);
      }
    });
  });
}

// Edit firma function
function editFirm(pib) {
  window.location.href = `/edit-firmu.html?pib=${pib}`;
}

// Delete firma function
async function deleteFirm(pib, naziv) {
  if (!confirm(`Da li ste sigurni da želite da obrišete firmu "${naziv}"?`)) {
    return;
  }

  try {
    console.log('Šalje DELETE zahtev za PIB:', pib);

    // Pokušaj prvo sa DELETE metodom
    let response = await fetch(`/api/firme/${pib}`, {
      method: 'DELETE',
      credentials: 'include', // Dodao credentials za sesiju
    });

    // Ako DELETE ne radi (405), pokušaj sa POST fallback
    if (response.status === 405) {
      console.log('DELETE metoda nije podržana, koristim POST fallback');
      response = await fetch(`/api/firme/${pib}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Dodao credentials za sesiju
      });
    }

    const result = await response.json();
    console.log('Response:', { status: response.status, result });

    if (response.ok) {
      // Remove firm from local array
      allFirms = allFirms.filter(f => f.pib !== pib);
      updateCounts();
      filterFirms();

      // Show success message
      alert(`Firma "${naziv}" je uspešno obrisana!`);
    } else {
      alert(result.message || 'Greška pri brisanju firme');
    }
  } catch (error) {
    console.error('Error deleting firm:', error);
    alert('Greška pri komunikaciji sa serverom');
  }
}

// =============================================================================
// ADD FIRM PAGE (dodaj-firmu.html)
// =============================================================================

function initAddFirmPage() {
  setupStatusSelection();
  setupFormSubmit();
}

function setupStatusSelection() {
  const statusCards = document.querySelectorAll('.status-card');
  const statusInput = document.getElementById('status');

  if (!statusCards.length || !statusInput) return;

  statusCards.forEach(card => {
    card.addEventListener('click', function () {
      // Remove selected class from all cards
      statusCards.forEach(c => c.classList.remove('selected'));

      // Add selected class to clicked card
      this.classList.add('selected');

      // Set hidden input value
      statusInput.value = this.dataset.status;
    });
  });
}

function setupFormSubmit() {
  const form = document.getElementById('firmForm');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {
      naziv: formData.get('naziv'),
      pib: formData.get('pib'),
      adresa: formData.get('adresa'),
      grad: formData.get('grad'),
      pdvBroj: formData.get('pdvBroj'),
      ziro_racun: formData.get('ziroRacun'),
      telefon: formData.get('telefon'),
      email: formData.get('email'),
      direktor_ime_prezime: formData.get('direktorImePrezime'),
      direktor_jmbg: formData.get('direktorJmbg'),
      status: formData.get('status'),
    };

    // Validation
    if (!data.status) {
      showError('Molimo izaberite status firme');
      return;
    }

    try {
      // Koristi uvek isti endpoint za dodavanje firmi, bez obzira na status
      const endpoint = '/api/firme';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Dodao credentials za sesiju
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        showSuccess(`Firma "${data.naziv}" je uspešno dodana!`);
        form.reset();
        document
          .querySelectorAll('.status-card')
          .forEach(c => c.classList.remove('selected'));

        // Redirect to firms list after 2 seconds
        setTimeout(() => {
          window.location.href = '/firme.html';
        }, 2000);
      } else {
        showError(result.message || 'Greška pri dodavanju firme');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Greška pri komunikaciji sa serverom');
    }
  });
}

// =============================================================================
// EDIT FIRM PAGE (edit-firmu.html)
// =============================================================================

function initEditFirmPage() {
  console.log('initEditFirmPage pozvana');
  const urlParams = new URLSearchParams(window.location.search);
  currentPib = urlParams.get('pib');
  console.log('PIB iz URL-a:', currentPib);

  if (!currentPib) {
    console.error('PIB firme nije specificiran u URL-u');
    showError('PIB firme nije specificiran');
    return;
  }

  loadFirmData();
  setupStatusSelection();
  setupEditFormSubmit();
}

async function loadFirmData() {
  try {
    console.log('Učitavam podatke za PIB:', currentPib);
    const response = await fetch(`/api/firme/${currentPib}`, {
      credentials: 'include',
    });

    if (response.status === 401) {
      // Korisnik nije ulogovan - preusmeri na početnu sa porukom
      alert('Niste ulogovani. Molimo prijavite se prvo.');
      window.location.href = '/';
      return;
    }

    if (!response.ok) {
      throw new Error('Firma nije pronađena');
    }

    const data = await response.json();
    console.log('Podaci primljeni:', data);

    // Backend vraća { firma: {...} }
    const firm = data.firma || data;
    console.log('Firma objekat:', firm);
    console.log('Telefon iz baze:', firm.telefon);
    console.log('Email iz baze:', firm.email);
    console.log('Grad iz baze:', firm.grad);

    // Populate form
    const nazivInput = document.getElementById('naziv');
    const pibInput = document.getElementById('pib');
    const adresaInput = document.getElementById('adresa');
    const gradInput = document.getElementById('grad');
    const pdvBrojInput = document.getElementById('pdvBroj');
    const ziroRacunInput = document.getElementById('ziroRacun');
    const telefonInput = document.getElementById('telefon');
    const emailInput = document.getElementById('email');
    const direktorImeInput = document.getElementById('direktorImePrezime');
    const direktorJmbgInput = document.getElementById('direktorJmbg');
    const statusInput = document.getElementById('status');

    if (nazivInput) nazivInput.value = firm.naziv || '';
    if (pibInput) pibInput.value = firm.pib || '';
    if (adresaInput) adresaInput.value = firm.adresa || '';
    if (gradInput) gradInput.value = firm.grad || '';
    if (pdvBrojInput) pdvBrojInput.value = firm.pdvBroj || '';
    if (ziroRacunInput) ziroRacunInput.value = firm.ziro_racun || '';
    if (telefonInput) telefonInput.value = firm.telefon || '';
    if (emailInput) emailInput.value = firm.email || '';
    if (direktorImeInput)
      direktorImeInput.value = firm.direktor_ime_prezime || '';
    if (direktorJmbgInput) direktorJmbgInput.value = firm.direktor_jmbg || '';

    // Set status
    originalStatus = firm.status;
    if (statusInput) statusInput.value = firm.status;

    // Select appropriate status card
    const statusCard = document.querySelector(`[data-status="${firm.status}"]`);
    if (statusCard) {
      statusCard.classList.add('selected');
    }

    // Show form, hide loading
    const loadingMessage = document.getElementById('loadingMessage');
    const formContainer = document.getElementById('formContainer');

    if (loadingMessage) loadingMessage.style.display = 'none';
    if (formContainer) formContainer.style.display = 'block';
  } catch (error) {
    console.error('Error loading firm:', error);
    showError('Greška pri učitavanju podataka o firmi');

    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) loadingMessage.style.display = 'none';
  }
}

function setupEditFormSubmit() {
  const form = document.getElementById('firmForm');
  if (!form) {
    console.error("Form 'firmForm' nije pronađen na stranici");
    return;
  }

  console.log('Form za edit je pronađen i setup je završen');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    console.log('Form submit event pokrennut');

    const formData = new FormData(form);
    const data = {
      naziv: formData.get('naziv'),
      pib: formData.get('pib'),
      adresa: formData.get('adresa'),
      grad: formData.get('grad'),
      pdvBroj: formData.get('pdvBroj'),
      ziro_racun: formData.get('ziroRacun'),
      telefon: formData.get('telefon'),
      email: formData.get('email'),
      direktor_ime_prezime: formData.get('direktorImePrezime'),
      direktor_jmbg: formData.get('direktorJmbg'),
      status: formData.get('status'),
    };

    console.log('Podaci iz forme:', data);

    if (!data.status) {
      showError('Molimo izaberite status firme');
      return;
    }

    try {
      console.log(`Šalje PUT zahtev za PIB: ${currentPib}`);

      // Pokušaj prvo sa PUT metodom
      let response = await fetch(`/api/firme/${currentPib}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      // Ako PUT ne radi (405), pokušaj sa POST fallback
      if (response.status === 405) {
        console.log('PUT metoda nije podržana, koristim POST fallback');
        response = await fetch(`/api/firme/${currentPib}/edit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        });
      }

      const result = await response.json();
      console.log('Response:', { status: response.status, result });

      if (response.ok) {
        showSuccess(`Firma "${data.naziv}" je uspešno ažurirana!`);

        setTimeout(() => {
          window.location.href = '/firme.html';
        }, 2000);
      } else {
        showError(result.message || 'Greška pri ažuriranju firme');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Greška pri komunikaciji sa serverom');
    }
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function showSuccess(message) {
  const successDiv = document.getElementById('successMessage');
  const successText = document.getElementById('successText');

  if (successDiv && successText) {
    successText.textContent = message;
    successDiv.style.display = 'block';

    // Hide error message if visible
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) errorDiv.style.display = 'none';

    // Scroll to top
    window.scrollTo(0, 0);
  }
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');

  if (errorDiv && errorText) {
    errorText.textContent = message;
    errorDiv.style.display = 'block';

    // Hide success message if visible
    const successDiv = document.getElementById('successMessage');
    if (successDiv) successDiv.style.display = 'none';

    // Scroll to top
    window.scrollTo(0, 0);
  }
}

// =============================================================================
// GLOBAL EXPORTS (for onclick handlers in HTML)
// =============================================================================

// Make functions globally available for onclick handlers
window.editFirm = editFirm;
window.deleteFirm = deleteFirm; // =============================================================================
// RADNICI FUNKCIJE
// =============================================================================

// Funkcija za pregled radnika po firmi
function viewRadnici(firmaId) {
  window.location.href = `/firma-detalji.html?id=${firmaId}&tab=radnici`;
}

// Funkcija za pregled detalja firme
function viewFirmaDetalji(firmaId) {
  window.location.href = `/firma-detalji.html?id=${firmaId}`;
}
