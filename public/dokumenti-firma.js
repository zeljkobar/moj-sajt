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
};

// =============================================================================
// INICIJALIZACIJA
// =============================================================================

document.addEventListener("DOMContentLoaded", function () {
  initPage();
});

function initPage() {
  // Dobij parametre iz URL-a
  const urlParams = new URLSearchParams(window.location.search);
  firmaId = urlParams.get("firmaId");
  firmaNaziv = urlParams.get("naziv");

  if (!firmaId) {
    alert("Greška: Nedostaje ID firme");
    window.location.href = "/firme.html";
    return;
  }

  // Postavi naziv firme
  if (firmaNaziv) {
    document.getElementById("firmaNaziv").textContent =
      decodeURIComponent(firmaNaziv);
  }

  // Učitaj dokumente
  loadDokumenti();

  // Setup event listeners
  setupEventListeners();
}

function setupEventListeners() {
  // Novi ugovor o radu dugmad
  const noviUgovorBtns = document.querySelectorAll(
    "#noviUgovorBtn, #noviUgovorBtn2"
  );
  noviUgovorBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = `/radnici-firma.html?firmaId=${firmaId}`;
    });
  });

  // Nova pozajmnica dugme
  const novaPozajmicaBtn = document.getElementById("novaPozajmicaBtn");
  if (novaPozajmicaBtn) {
    novaPozajmicaBtn.addEventListener("click", function (e) {
      e.preventDefault();
      // TODO: Kad napravimo pozajmnice
      alert("Pozajmnice funkcionalnost će biti dodana uskoro!");
    });
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
      console.log("Učitani ugovori:", dokumenti.ugovori);
    } else {
      console.warn("Greška pri učitavanju ugovora:", ugovoriData.error);
      dokumenti.ugovori = [];
    }

    // TODO: Učitaj pozajmice kad napravimo tabelu
    // const pozajmiceResponse = await fetch(`/api/pozajmice/firma/${firmaId}`);
    dokumenti.pozajmice = []; // Placeholder

    updateStats();
    renderDokumenti();
    showContainers();
  } catch (error) {
    console.error("Greška pri učitavanju dokumenata:", error);
    showError("Greška pri učitavanju dokumenata");
  } finally {
    showLoading(false);
  }
}

// =============================================================================
// UI FUNKCIJE
// =============================================================================

function showLoading(show) {
  const loadingSpinner = document.getElementById("loadingSpinner");
  if (loadingSpinner) {
    loadingSpinner.style.display = show ? "block" : "none";
  }
}

function showContainers() {
  const containers = ["statsContainer", "actionsContainer"];

  containers.forEach((containerId) => {
    const container = document.getElementById(containerId);
    if (container) {
      container.classList.remove("d-none");
    }
  });

  // Prikaži tabelu ili "nema dokumenata" poruku
  const totalDokumenti = dokumenti.ugovori.length + dokumenti.pozajmice.length;

  if (totalDokumenti > 0) {
    const documentsContainer = document.getElementById("documentsContainer");
    if (documentsContainer) {
      documentsContainer.classList.remove("d-none");
    }
  } else {
    const noDocuments = document.getElementById("noDocuments");
    if (noDocuments) {
      noDocuments.classList.remove("d-none");
    }
  }
}

function updateStats() {
  const ugovoriBroj = dokumenti.ugovori.length;
  const pozajmiceBroj = dokumenti.pozajmice.length;
  const ukupnoDokumenti = ugovoriBroj + pozajmiceBroj;

  // TODO: Kad napravimo pozajmice, izračunaj ukupan iznos
  const ukupnoIznos = 0;

  // Update UI
  document.getElementById("ugovoriBroj").textContent = ugovoriBroj;
  document.getElementById("pozajmiceBroj").textContent = pozajmiceBroj;
  document.getElementById(
    "ukupnoIznos"
  ).textContent = `€${ukupnoIznos.toLocaleString()}`;
  document.getElementById("ukupnoDokumenti").textContent = ukupnoDokumenti;
}

function renderDokumenti() {
  const tableBody = document.getElementById("documentsTableBody");
  if (!tableBody) return;

  let html = "";

  // Dodaj ugovore o radu
  dokumenti.ugovori.forEach((ugovor) => {
    html += `
      <tr>
        <td>
          <div class="document-type">
            <i class="fas fa-handshake text-success"></i>
            Ugovor o radu
          </div>
        </td>
        <td>
          <strong>${ugovor.ime} ${ugovor.prezime}</strong><br>
          <small class="text-muted">${
            ugovor.pozicija_naziv || ugovor.pozicija || "Nespecifikovano"
          }</small>
        </td>
        <td>${formatDate(ugovor.datum_zaposljavanja)}</td>
        <td>
          <span class="document-status ${
            ugovor.aktivan ? "status-active" : "status-inactive"
          }">
            ${ugovor.aktivan ? "Aktivan" : "Neaktivan"}
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

  // TODO: Dodaj pozajmice kad napravimo tabelu
  dokumenti.pozajmice.forEach((pozajmica) => {
    html += `
      <tr>
        <td>
          <div class="document-type">
            <i class="fas fa-money-bill-wave text-warning"></i>
            Pozajmnica
          </div>
        </td>
        <td>
          <strong>€${pozajmica.iznos}</strong><br>
          <small class="text-muted">${pozajmica.opis}</small>
        </td>
        <td>${formatDate(pozajmica.datum_pozajmice)}</td>
        <td>
          <span class="document-status ${
            pozajmica.aktivna ? "status-active" : "status-inactive"
          }">
            ${pozajmica.aktivna ? "Aktivna" : "Zatvorena"}
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
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  return date.toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function showError(message) {
  const container = document.querySelector(".container");
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

function viewUgovor(radnikId) {
  // Otvori postojeći ugovor o radu
  window.open(
    `/ugovor-o-radu.html?radnikId=${radnikId}&firmaId=${firmaId}`,
    "_blank"
  );
}

function editRadnik(radnikId) {
  // Otvori edit radnika
  window.location.href = `/radnici-firma.html?firmaId=${firmaId}&editId=${radnikId}`;
}

function viewPozajmica(pozajmicaId) {
  // TODO: Kad napravimo pozajmice
  alert("Pozajmice funkcionalnost će biti dodana uskoro!");
}

function editPozajmica(pozajmicaId) {
  // TODO: Kad napravimo pozajmice
  alert("Pozajmice funkcionalnost će biti dodana uskoro!");
}
