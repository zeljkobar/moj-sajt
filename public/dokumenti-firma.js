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
  // Novi ugovor o radu dugmad - otvori modal umesto redirekcije
  const noviUgovorBtns = document.querySelectorAll(
    "#noviUgovorBtn, #noviUgovorBtn2"
  );
  noviUgovorBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();

      // Otvori modal za dodavanje radnika sa firmId
      openRadnikModal({
        firmId: firmaId,
        onSuccess: function (result) {
          console.log("Radnik je uspešno dodan:", result);
          // Reload dokumenta da prikaži novi ugovor
          loadDokumenti();
          // Možda pokaži success poruku
          showSuccessMessage(
            "Radnik je uspešno dodan! Sada možete kreirati ugovor."
          );
        },
      });
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

  // Formatiranje vrste ugovora
  const vrstaUgovoraText = {
    ugovor_o_radu: "Ugovor o radu",
    ugovor_o_djelu: "Ugovor o djelu",
    ugovor_o_dopunskom_radu: "Ugovor o dopunskom radu",
    autorski_ugovor: "Autorski ugovor",
    ugovor_o_pozajmnici: "Ugovor o pozajmnici",
  };

  // Dodaj ugovore o radu
  dokumenti.ugovori.forEach((ugovor) => {
    const status = getUgovorStatus(ugovor);
    const vrstaUgovora =
      vrstaUgovoraText[ugovor.vrsta_ugovora] || "Ugovor o radu";

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
            ugovor.pozicija_naziv || ugovor.pozicija || "Nespecifikovano"
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

function isUgovorAktivan(ugovor) {
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
    text: aktivan ? "Aktivan" : "Neaktivan",
    cssClass: aktivan ? "status-active" : "status-inactive",
  };
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

async function viewUgovor(radnikId) {
  try {
    // Prvo dohvati podatke o radniku da vidiš vrstu ugovora
    const radnikResponse = await fetch(`/api/radnici/id/${radnikId}`);
    const radnik = await radnikResponse.json();

    // Na osnovu vrste ugovora otvori odgovarajući template
    let ugovorUrl;

    if (radnik.vrsta_ugovora === "ugovor_o_dopunskom_radu") {
      ugovorUrl = `/ugovor-o-dopunskom-radu.html?radnikId=${radnikId}&firmaId=${firmaId}`;
    } else {
      // Default - ugovor o radu (ili bilo koja druga vrsta)
      ugovorUrl = `/ugovor-o-radu.html?radnikId=${radnikId}&firmaId=${firmaId}`;
    }

    window.open(ugovorUrl, "_blank");
  } catch (error) {
    console.error("Greška pri dohvaćanju podataka o radniku:", error);
    // Fallback - otvori ugovor o radu
    window.open(
      `/ugovor-o-radu.html?radnikId=${radnikId}&firmaId=${firmaId}`,
      "_blank"
    );
  }
}

function editRadnik(radnikId) {
  // Otvori edit radnika
  window.location.href = `/radnici-firma.html?firmaId=${firmaId}&editId=${radnikId}`;
}

// Helper funkcija za prikazivanje success poruka
function showSuccessMessage(message) {
  // Kreiraj alert element
  const alertDiv = document.createElement("div");
  alertDiv.className =
    "alert alert-success alert-dismissible fade show position-fixed";
  alertDiv.style.cssText =
    "top: 20px; right: 20px; z-index: 9999; max-width: 400px;";
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
