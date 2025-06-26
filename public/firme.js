/**
 * JavaScript modul za upravljanje firmama
 * Sadrži funkcionalnosti za pregled, dodavanje, uređivanje i brisanje firmi
 */

// =============================================================================
// GLOBALNE PROMENLJIVE
// =============================================================================

let allFirms = [];
let filteredFirms = [];
let currentFilter = "all";
let currentPib = null;
let originalStatus = null;

// =============================================================================
// INICIJALIZACIJA
// =============================================================================

document.addEventListener("DOMContentLoaded", function () {
  const currentPage = getCurrentPage();

  switch (currentPage) {
    case "firme":
      initFirmesPage();
      break;
    case "dodaj-firmu":
      initAddFirmPage();
      break;
    case "edit-firmu":
      initEditFirmPage();
      break;
  }
});

function getCurrentPage() {
  const path = window.location.pathname;
  if (path.includes("firme.html")) return "firme";
  if (path.includes("dodaj-firmu.html")) return "dodaj-firmu";
  if (path.includes("edit-firmu.html")) return "edit-firmu";
  return null;
}

// =============================================================================
// FIRME PAGE (firme.html)
// =============================================================================

function initFirmesPage() {
  loadFirms();
  setupEventListeners();
}

function setupEventListeners() {
  // Search funkcionalnost
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      filterFirms();
    });
  }

  // Tab filtering
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      currentFilter = this.dataset.filter;
      filterFirms();
    });
  });
}

async function loadFirms() {
  try {
    const loadingSpinner = document.querySelector(".loading-spinner");
    if (loadingSpinner) {
      loadingSpinner.style.display = "block";
    }

    const response = await fetch("/api/firme");
    const data = await response.json();

    allFirms = data.firme || [];
    updateCounts();
    filterFirms();
  } catch (error) {
    console.error("Greška pri učitavanju firmi:", error);
    const container = document.getElementById("firmsContainer");
    if (container) {
      container.innerHTML =
        '<div class="alert alert-danger">Greška pri učitavanju firmi</div>';
    }
  } finally {
    const loadingSpinner = document.querySelector(".loading-spinner");
    if (loadingSpinner) {
      loadingSpinner.style.display = "none";
    }
  }
}

function updateCounts() {
  const activeFirms = allFirms.filter((f) => f.status === "active");
  const zeroFirms = allFirms.filter((f) => f.status === "zero");

  const totalCount = document.getElementById("totalCount");
  const activeCount = document.getElementById("activeCount");
  const zeroCount = document.getElementById("zeroCount");

  if (totalCount) totalCount.textContent = allFirms.length;
  if (activeCount) activeCount.textContent = activeFirms.length;
  if (zeroCount) zeroCount.textContent = zeroFirms.length;
}

function filterFirms() {
  const searchInput = document.getElementById("searchInput");
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";

  // Filter by status
  let firms = allFirms;
  if (currentFilter === "active") {
    firms = allFirms.filter((f) => f.status === "active");
  } else if (currentFilter === "zero") {
    firms = allFirms.filter((f) => f.status === "zero");
  }

  // Filter by search term
  if (searchTerm) {
    firms = firms.filter(
      (firm) =>
        firm.ime.toLowerCase().includes(searchTerm) ||
        firm.pib.includes(searchTerm) ||
        firm.adresa.toLowerCase().includes(searchTerm) ||
        (firm.pdv && firm.pdv.toLowerCase().includes(searchTerm))
    );
  }

  filteredFirms = firms;
  renderFirms();
}

function renderFirms() {
  const container = document.getElementById("firmsContainer");
  const noResults = document.querySelector(".no-results");

  if (!container) return;

  if (filteredFirms.length === 0) {
    container.innerHTML = "";
    if (noResults) noResults.classList.remove("d-none");
    return;
  }

  if (noResults) noResults.classList.add("d-none");

  const firmsHtml = filteredFirms
    .map(
      (firm) => `
    <div class="firm-card card">
      <div class="card-body">
        <div class="row align-items-center">
          <div class="col-md-7">
            <h5 class="card-title mb-2">
              <span class="firm-status ${
                firm.status === "active" ? "status-active" : "status-zero"
              }"></span>
              ${firm.ime}
            </h5>
            <p class="mb-1"><strong>PIB:</strong> ${firm.pib}</p>
            <p class="mb-1"><strong>Adresa:</strong> ${firm.adresa}</p>
            ${
              firm.pdv
                ? `<p class="mb-0"><strong>PDV broj:</strong> ${firm.pdv}</p>`
                : ""
            }
          </div>
          <div class="col-md-3 text-md-center">
            <span class="badge ${
              firm.status === "active" ? "bg-success" : "bg-warning"
            } fs-6 px-3 py-2">
              ${firm.status === "active" ? "Aktivna" : "Na nuli"}
            </span>
          </div>
          <div class="col-md-2 text-md-end">
            <div class="action-buttons">
              <button class="edit-btn" onclick="editFirm('${firm.pib}')">
                <i class="fas fa-edit"></i>
              </button>
              <button class="delete-btn" onclick="deleteFirm('${firm.pib}', '${
        firm.ime
      }')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  container.innerHTML = firmsHtml;
}

// Edit firma function
function editFirm(pib) {
  window.location.href = `/edit-firmu.html?pib=${pib}`;
}

// Delete firma function
async function deleteFirm(pib, ime) {
  if (!confirm(`Da li ste sigurni da želite da obrišete firmu "${ime}"?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/firme/${pib}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (response.ok) {
      // Remove firm from local array
      allFirms = allFirms.filter((f) => f.pib !== pib);
      updateCounts();
      filterFirms();

      // Show success message
      alert(`Firma "${ime}" je uspešno obrisana!`);
    } else {
      alert(result.message || "Greška pri brisanju firme");
    }
  } catch (error) {
    console.error("Error deleting firm:", error);
    alert("Greška pri komunikaciji sa serverom");
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
  const statusCards = document.querySelectorAll(".status-card");
  const statusInput = document.getElementById("status");

  if (!statusCards.length || !statusInput) return;

  statusCards.forEach((card) => {
    card.addEventListener("click", function () {
      // Remove selected class from all cards
      statusCards.forEach((c) => c.classList.remove("selected"));

      // Add selected class to clicked card
      this.classList.add("selected");

      // Set hidden input value
      statusInput.value = this.dataset.status;
    });
  });
}

function setupFormSubmit() {
  const form = document.getElementById("firmForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {
      ime: formData.get("ime"),
      pib: formData.get("pib"),
      adresa: formData.get("adresa"),
      pdv: formData.get("pdv"),
      status: formData.get("status"),
    };

    // Validation
    if (!data.status) {
      showError("Molimo izaberite status firme");
      return;
    }

    try {
      const endpoint =
        data.status === "active" ? "/api/firme" : "/api/firme/nula";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        showSuccess(`Firma "${data.ime}" je uspešno dodana!`);
        form.reset();
        document
          .querySelectorAll(".status-card")
          .forEach((c) => c.classList.remove("selected"));

        // Redirect to firms list after 2 seconds
        setTimeout(() => {
          window.location.href = "/firme.html";
        }, 2000);
      } else {
        showError(result.message || "Greška pri dodavanju firme");
      }
    } catch (error) {
      console.error("Error:", error);
      showError("Greška pri komunikaciji sa serverom");
    }
  });
}

// =============================================================================
// EDIT FIRM PAGE (edit-firmu.html)
// =============================================================================

function initEditFirmPage() {
  const urlParams = new URLSearchParams(window.location.search);
  currentPib = urlParams.get("pib");

  if (!currentPib) {
    showError("PIB firme nije specificiran");
    return;
  }

  loadFirmData();
  setupStatusSelection();
  setupEditFormSubmit();
}

async function loadFirmData() {
  try {
    const response = await fetch(`/api/firme/${currentPib}`);

    if (!response.ok) {
      throw new Error("Firma nije pronađena");
    }

    const firm = await response.json();

    // Populate form
    const imeInput = document.getElementById("ime");
    const pibInput = document.getElementById("pib");
    const adresaInput = document.getElementById("adresa");
    const pdvInput = document.getElementById("pdv");
    const statusInput = document.getElementById("status");

    if (imeInput) imeInput.value = firm.ime || "";
    if (pibInput) pibInput.value = firm.pib || "";
    if (adresaInput) adresaInput.value = firm.adresa || "";
    if (pdvInput) pdvInput.value = firm.pdv || "";

    // Set status
    originalStatus = firm.status;
    if (statusInput) statusInput.value = firm.status;

    // Select appropriate status card
    const statusCard = document.querySelector(`[data-status="${firm.status}"]`);
    if (statusCard) {
      statusCard.classList.add("selected");
    }

    // Show form, hide loading
    const loadingMessage = document.getElementById("loadingMessage");
    const formContainer = document.getElementById("formContainer");

    if (loadingMessage) loadingMessage.style.display = "none";
    if (formContainer) formContainer.style.display = "block";
  } catch (error) {
    console.error("Error loading firm:", error);
    showError("Greška pri učitavanju podataka o firmi");

    const loadingMessage = document.getElementById("loadingMessage");
    if (loadingMessage) loadingMessage.style.display = "none";
  }
}

function setupEditFormSubmit() {
  const form = document.getElementById("firmForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {
      ime: formData.get("ime"),
      pib: formData.get("pib"),
      adresa: formData.get("adresa"),
      pdv: formData.get("pdv"),
      status: formData.get("status"),
    };

    if (!data.status) {
      showError("Molimo izaberite status firme");
      return;
    }

    try {
      const response = await fetch(`/api/firme/${currentPib}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        showSuccess(`Firma "${data.ime}" je uspešno ažurirana!`);

        setTimeout(() => {
          window.location.href = "/firme.html";
        }, 2000);
      } else {
        showError(result.message || "Greška pri ažuriranju firme");
      }
    } catch (error) {
      console.error("Error:", error);
      showError("Greška pri komunikaciji sa serverom");
    }
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function showSuccess(message) {
  const successDiv = document.getElementById("successMessage");
  const successText = document.getElementById("successText");

  if (successDiv && successText) {
    successText.textContent = message;
    successDiv.style.display = "block";

    // Hide error message if visible
    const errorDiv = document.getElementById("errorMessage");
    if (errorDiv) errorDiv.style.display = "none";

    // Scroll to top
    window.scrollTo(0, 0);
  }
}

function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");

  if (errorDiv && errorText) {
    errorText.textContent = message;
    errorDiv.style.display = "block";

    // Hide success message if visible
    const successDiv = document.getElementById("successMessage");
    if (successDiv) successDiv.style.display = "none";

    // Scroll to top
    window.scrollTo(0, 0);
  }
}

// =============================================================================
// GLOBAL EXPORTS (for onclick handlers in HTML)
// =============================================================================

// Make functions globally available for onclick handlers
window.editFirm = editFirm;
window.deleteFirm = deleteFirm;
