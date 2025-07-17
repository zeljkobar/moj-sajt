// Globalne varijable
let pozicije = [];
let firme = [];
let radnici = [];
let filteredRadnici = []; // Za filtriranu listu radnika

// Funkcija za formatiranje datuma u YYYY-MM-DD format
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toISOString().split("T")[0];
}

// Funkcija za dobijanje teksta vrste ugovora
function getVrstaUgovoraText(vrstaUgovora) {
  const vrstaUgovoraText = {
    ugovor_o_radu: "Ugovor o radu",
    ugovor_o_djelu: "Ugovor o djelu",
    ugovor_o_dopunskom_radu: "Dopunski rad",
    autorski_ugovor: "Autorski ugovor",
    ugovor_o_pozajmnici: "Pozajmica",
  };
  return vrstaUgovoraText[vrstaUgovora] || "Nije definisano";
}

// Funkcija za otvaranje modala sa callback-om
function openRadnikModalWithCallback() {
  openRadnikModal({
    onSuccess: function (result) {
      alert("Radnik je uspešno dodan!");
      loadRadnici();
    },
  });
}

// Osnovne modal funkcije
function openRadnikModal() {
  // Zatvori sve Bootstrap modale koji možda postoje
  const existingBootstrapModals = document.querySelectorAll(".modal.fade");
  existingBootstrapModals.forEach((modalEl) => {
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) {
      modalInstance.hide();
    }
    // Ukloni modal iz DOM-a
    setTimeout(() => {
      if (modalEl.parentNode) {
        modalEl.remove();
      }
    }, 300);
  });

  resetModalForNew();
  document.getElementById("radnikModal").style.display = "block";
}

function closeRadnikModal() {
  console.log("closeRadnikModal je pozvana");
  document.getElementById("radnikModal").style.display = "none";
  resetModalForNew();
}

function resetModalForNew() {
  // Reset naslov i dugme
  document.getElementById("modalTitle").textContent = "Dodaj novog radnika";
  document.getElementById("submitBtn").textContent = "Dodaj radnika";

  // Reset formu
  document.getElementById("radnikForm").reset();

  // Sakrij datum prestanka polje
  const datumPrestankaGroup = document.getElementById("datum_prestanka_group");
  const datumPrestankaInput = document.getElementById("datum_prestanka");
  if (datumPrestankaGroup && datumPrestankaInput) {
    datumPrestankaGroup.style.display = "none";
    datumPrestankaInput.required = false;
  }

  // Reset help text
  const helpText = document.getElementById("radnoVremeHelp");
  if (helpText) {
    helpText.style.display = "none";
  }

  // Postavi današnji datum
  const today = new Date().toISOString().split("T")[0];
  const datumZaposlenjaField = document.getElementById("datum_zaposlenja");
  if (datumZaposlenjaField) {
    datumZaposlenjaField.value = today;
  }
}

// Zatvaranje modala klikom van njega
window.onclick = function (event) {
  const radnikModal = document.getElementById("radnikModal");
  if (event.target === radnikModal) {
    console.log("Zatvaramo modal klikom van njega");
    closeRadnikModal();
  }

  // Dodaj i zatvaranje Bootstrap modala ako kliknemo van njih
  const sedmicniModal = document.getElementById("sedmicniOdmorModal");
  if (sedmicniModal && event.target === sedmicniModal) {
    closeSedmicniOdmorModal();
  }

  // Zatvaranje otkaz modala
  const otkazModal = document.getElementById("otkazModal");
  if (otkazModal && event.target === otkazModal) {
    closeOtkazModal();
  }
};

// Učitavanje podataka na početku
document.addEventListener("DOMContentLoaded", function () {
  loadPozicije();
  loadFirme();
  loadRadnici();

  // Postavi funkcionalnost pretrage
  setupSearchFunctionality();

  // Event listener za submit forme radnika
  const radnikForm = document.getElementById("radnikForm");
  if (radnikForm) {
    radnikForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      try {
        const formData = new FormData(this);
        const radnikId = formData.get("radnik_id");

        // Određuj da li je to dodavanje novog ili editovanje postojećeg radnika
        const isEdit = radnikId && radnikId.trim() !== "";
        const url = isEdit ? `/api/radnici/${radnikId}` : "/api/radnici";
        const method = isEdit ? "PUT" : "POST";

        // Pripremi podatke
        const radnikData = {
          vrsta_ugovora: formData.get("vrsta_ugovora"),
          ime: formData.get("ime"),
          prezime: formData.get("prezime"),
          jmbg: formData.get("jmbg"),
          grad: formData.get("grad"),
          adresa: formData.get("adresa"),
          pozicija_id: formData.get("pozicija_id"),
          firma_id: formData.get("firma_id"),
          datum_zaposlenja: formData.get("datum_zaposlenja"),
          visina_zarade: formData.get("visina_zarade"),
          tip_radnog_vremena: formData.get("tip_radnog_vremena"),
          tip_ugovora: formData.get("tip_ugovora"),
          datum_prestanka: formData.get("datum_prestanka") || null,
          napomene: formData.get("napomene"),
        };

        console.log("Šaljemo radnikData:", radnikData); // Debug log

        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(radnikData),
        });

        if (!response.ok) {
          throw new Error(`Greška ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // Prikaži poruku o uspešnoj operaciji
        alert(
          isEdit ? "Radnik je uspešno ažuriran!" : "Radnik je uspešno dodan!"
        );

        // Zatvori modal i resetuj podatke
        closeRadnikModal();

        // Osveži listu radnika
        loadRadnici();
      } catch (error) {
        console.error("Greška pri dodavanju/uređivanju radnika:", error);
        alert("Greška pri dodavanju/uređivanju radnika: " + error.message);
      }
    });
  }

  // Proveri URL parametre za pretragu ili editovanje
  checkURLSearchParam();
});

// Učitavanje pozicija (samo za dropdown u formi)
async function loadPozicije() {
  try {
    const response = await fetch("/api/pozicije");
    if (response.ok) {
      pozicije = await response.json();
      console.log("Pozicije loaded:", pozicije);
      console.log("Is pozicije array:", Array.isArray(pozicije));

      if (Array.isArray(pozicije)) {
        populatePozicijeSelect();
      } else {
        console.error("Pozicije is not an array:", pozicije);
        pozicije = [];
      }
    } else {
      const errorData = await response.json();
      console.error("Error loading pozicije:", response.status, errorData);
      pozicije = [];
    }
  } catch (error) {
    console.error("Greška pri učitavanju pozicija:", error);
    pozicije = []; // Set to empty array on error
  }
}

// Učitavanje firmi
async function loadFirme() {
  try {
    const response = await fetch("/api/firme");
    const data = await response.json();
    firme = data.firme || data;
    populateFirmeSelect();
  } catch (error) {
    console.error("Greška pri učitavanju firmi:", error);
  }
}

// Učitavanje radnika
async function loadRadnici() {
  try {
    const response = await fetch("/api/radnici");
    radnici = await response.json();
    filteredRadnici = [...radnici]; // Kopiraju se svi radnici u filtriranu listu
    displayRadnici();
    updateRadniciCount();
  } catch (error) {
    console.error("Greška pri učitavanju radnika:", error);
  }
}

// Prikaz radnika
function displayRadnici() {
  const tbody = document.querySelector("#radniciTable tbody");
  tbody.innerHTML = "";

  filteredRadnici.forEach((radnik) => {
    // Formatiranje datuma
    const datumZaposlenja = radnik.datum_zaposlenja
      ? new Date(radnik.datum_zaposlenja).toLocaleDateString("sr-RS")
      : "N/A";

    // Formatiranje radnog vremena
    const radnoVremeText = {
      puno_8h: "8h/dan (40h/ned)",
      skraceno_6h: "6h/dan (30h/ned)",
      skraceno_4h: "4h/dan (20h/ned)",
      skraceno_2h: "2h/dan (10h/ned)",
    };

    // Formatiranje tipa ugovora
    const tipUgovoraText = {
      na_neodredjeno: "Neodređeno",
      na_odredjeno: "Određeno",
    };

    // Formatiranje vrste ugovora
    const vrstaUgovoraText = {
      ugovor_o_radu: "Ugovor o radu",
      ugovor_o_djelu: "Ugovor o djelu",
      ugovor_o_dopunskom_radu: "Dopunski rad",
      autorski_ugovor: "Autorski ugovor",
      ugovor_o_pozajmnici: "Pozajmica",
    };

    // Debug log za proveru podataka
    console.log("Radnik vrsta_ugovora:", radnik.vrsta_ugovora);
    console.log("Mapiranje rezultat:", vrstaUgovoraText[radnik.vrsta_ugovora]);

    const row = document.createElement("tr");

    // Formatuj datum prestanka
    let datumPrestanka = "N/A";
    if (radnik.datum_prestanka) {
      const prestankDatum = new Date(radnik.datum_prestanka);
      datumPrestanka = prestankDatum.toLocaleDateString("sr-RS");
    }

    row.innerHTML = `
            <td class="col-name" title="${radnik.ime} ${radnik.prezime}">${
      radnik.ime
    } ${radnik.prezime}</td>
            <td class="col-jmbg">${radnik.jmbg}</td>
            <td class="col-position" title="${
              radnik.pozicija_naziv || "N/A"
            }">${radnik.pozicija_naziv || "N/A"}</td>
            <td class="col-company" title="${radnik.firma_naziv || "N/A"}">${
      radnik.firma_naziv || "N/A"
    }</td>
            <td class="col-date">${datumZaposlenja}</td>
            <td class="col-date">${datumPrestanka}</td>
            <td class="col-work-time">${
              radnoVremeText[radnik.tip_radnog_vremena] || "N/A"
            }</td>
            <td class="col-contract-type">${
              tipUgovoraText[radnik.tip_ugovora] || "N/A"
            }</td>
            <td class="col-contract-kind">${
              vrstaUgovoraText[radnik.vrsta_ugovora] || "Nije definisano"
            }</td>
            <td class="col-status">
                <span class="status-badge ${
                  radnik.status === "otkazan"
                    ? "status-terminated"
                    : "status-active"
                }">
                    ${radnik.status === "otkazan" ? "🚪 Otkazan" : "✅ Aktivan"}
                </span>
            </td>
            <td class="col-actions" style="min-width: 90px;">
                <div style="display: flex; flex-direction: column; gap: 3px;">
                    <button class="radnici-btn radnici-btn-sm" onclick="editRadnik(${
                      radnik.id
                    })" style="font-size: 11px; padding: 4px 8px; width: 100%;">Uredi</button>
                    <button class="radnici-btn radnici-btn-sm" onclick="deleteRadnik(${
                      radnik.id
                    })" style="background-color: #dc3545; font-size: 11px; padding: 4px 8px; width: 100%;">Obriši</button>
                    <div class="radnici-dropdown-container" style="position: relative; width: 100%;">
                        <button class="radnici-btn radnici-btn-sm radnici-dropdown-btn" onclick="toggleDropdown(${
                          radnik.id
                        })" 
                                style="background-color: #28a745; font-size: 11px; padding: 4px 8px; width: 100%;">
                            📄 Dokumenta ▼
                        </button>
                        <div id="dropdown-${
                          radnik.id
                        }" class="radnici-dropdown-menu" style="display: none;">
                            <a href="#" onclick="generateUgovorFromTable(${
                              radnik.id
                            }, ${radnik.firma_id}); closeDropdown(${
      radnik.id
    })">
                                📋 Ugovor
                            </a>
                        <a href="#" onclick="generateDocument(${
                          radnik.id
                        }, 'sedmicni-odmor'); closeDropdown(${radnik.id})">
                            🏖️ Sedmični odmor
                        </a>
                        <a href="#" onclick="generateDocument(${
                          radnik.id
                        }, 'mobing'); closeDropdown(${radnik.id})">
                            ⚠️ Mobing
                        </a>
                        <a href="#" onclick="generateDocument(${
                          radnik.id
                        }, 'potvrda-zaposlenja'); closeDropdown(${radnik.id})">
                            ✅ Potvrda o zaposlenju
                        </a>
                        <a href="#" onclick="openOtkazModal(${
                          radnik.id
                        }); closeDropdown(${radnik.id})">
                            🚪 Otkaz
                        </a>
                    </div>
                </div>
                </div>
            </td>
        `;
    tbody.appendChild(row);
  });
}

// Popunjavanje select-a za pozicije
function populatePozicijeSelect() {
  const select = document.getElementById("pozicija_id");
  select.innerHTML = '<option value="">Izaberite poziciju</option>';

  pozicije.forEach((pozicija) => {
    const option = document.createElement("option");
    option.value = pozicija.id;
    option.textContent = pozicija.naziv;
    select.appendChild(option);
  });
}

// Popunjavanje select-a za firme
function populateFirmeSelect() {
  const select = document.getElementById("firma_id");
  select.innerHTML = '<option value="">Izaberite firmu</option>';

  firme.forEach((firma) => {
    const option = document.createElement("option");
    option.value = firma.id;
    option.textContent = firma.naziv;
    select.appendChild(option);
  });
}

// Funkcionalnost pretrage
function setupSearchFunctionality() {
  const searchInput = document.getElementById("radniciSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      filterRadnici();
    });
  }
}

function filterRadnici() {
  const searchInput = document.getElementById("radniciSearchInput");
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";

  if (searchTerm.trim() === "") {
    // Ako nema search term-a, prikaži sve radnike
    filteredRadnici = [...radnici];
  } else {
    // Filtriraj radnike na osnovu search term-a
    filteredRadnici = radnici.filter((radnik) => {
      const fullName = `${radnik.ime} ${radnik.prezime}`.toLowerCase();
      const jmbg = radnik.jmbg || "";
      const pozicija = (radnik.pozicija_naziv || "").toLowerCase();
      const firma = (radnik.firma_naziv || "").toLowerCase();

      return (
        fullName.includes(searchTerm) ||
        jmbg.includes(searchTerm) ||
        pozicija.includes(searchTerm) ||
        firma.includes(searchTerm)
      );
    });
  }

  displayRadnici();
  updateRadniciCount();
}

function updateRadniciCount() {
  const countElement = document.getElementById("radniciCount");
  if (countElement) {
    countElement.textContent = filteredRadnici.length;
  }
}

// Funkcije za brisanje
async function deleteRadnik(id) {
  if (confirm("Da li ste sigurni da želite da obrišete ovog radnika?")) {
    try {
      const response = await fetch(`/api/radnici/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        loadRadnici();
      } else if (result.hasContracts) {
        // Radnik ima ugovore, pita korisnika da li želi da obriše i ugovore
        const forceDelete = confirm(
          result.message + "\n\nNAPOMENA: Ova akcija je nepovratna!"
        );

        if (forceDelete) {
          // Pozovi ponovo sa force=true
          const forceResponse = await fetch(`/api/radnici/${id}?force=true`, {
            method: "DELETE",
          });

          const forceResult = await forceResponse.json();

          if (forceResult.success) {
            alert(forceResult.message);
            loadRadnici();
          } else {
            alert("Greška: " + forceResult.message);
          }
        }
      } else {
        alert("Greška: " + result.message);
      }
    } catch (error) {
      console.error("Greška pri brisanju radnika:", error);
      alert("Greška pri brisanju radnika: " + error.message);
    }
  }
}

// Funkcije za editovanje (placeholder)
// Funkcija za uređivanje radnika
async function editRadnik(id) {
  try {
    // Dohvati podatke o radniku
    const response = await fetch(`/api/radnici/id/${id}`);
    if (!response.ok) {
      throw new Error("Greška pri dohvatanju podataka o radniku");
    }

    const radnik = await response.json();

    // Promeni naslov modala
    document.getElementById("modalTitle").textContent = "Uredi radnika";
    document.getElementById("submitBtn").textContent = "Sačuvaj izmene";

    // Popuni formu sa postojećim podacima
    document.getElementById("radnik_id").value = radnik.id;
    document.getElementById("vrsta_ugovora").value = radnik.vrsta_ugovora || "";
    document.getElementById("ime").value = radnik.ime || "";
    document.getElementById("prezime").value = radnik.prezime || "";
    document.getElementById("jmbg").value = radnik.jmbg || "";
    document.getElementById("grad").value = radnik.grad || "";
    document.getElementById("adresa").value = radnik.adresa || "";
    document.getElementById("pozicija_id").value = radnik.pozicija_id || "";
    document.getElementById("firma_id").value = radnik.firma_id || "";

    // Konvertuj datum zaposlenja u odgovarajući format za date input
    if (radnik.datum_zaposlenja) {
      const datumZaposlenja = new Date(radnik.datum_zaposlenja);
      document.getElementById("datum_zaposlenja").value = datumZaposlenja
        .toISOString()
        .split("T")[0];
    } else {
      document.getElementById("datum_zaposlenja").value = "";
    }

    document.getElementById("visina_zarade").value = radnik.visina_zarade || "";
    document.getElementById("tip_radnog_vremena").value =
      radnik.tip_radnog_vremena || "";
    document.getElementById("tip_ugovora").value = radnik.tip_ugovora || "";

    // Ako je datum prestanka setovan, prikaži polje i konvertuj datum
    if (radnik.datum_prestanka) {
      const datumPrestanka = new Date(radnik.datum_prestanka);
      document.getElementById("datum_prestanka").value = datumPrestanka
        .toISOString()
        .split("T")[0];
      document.getElementById("datum_prestanka_group").style.display = "block";
      document.getElementById("datum_prestanka").required = true;
    }

    document.getElementById("napomene").value = radnik.napomene || "";

    // Pozovi toggle funkcije da se prilagode opcije
    toggleRadnoVremeOptions();
    toggleDatumPrestanka();

    // Otvori modal DIREKTNO (ne pozivaj openRadnikModal jer resetuje podatke)
    document.getElementById("radnikModal").style.display = "block";
  } catch (error) {
    console.error("Greška pri dohvatanju podataka o radniku:", error);
    alert("Greška pri dohvatanju podataka o radniku");
  }
}

// Funkcija za generisanje ugovora iz tabele radnika
async function generateUgovorFromTable(radnikId, firmaId) {
  try {
    // Prvo dohvati podatke o radniku da vidiš vrstu ugovora
    const radnikResponse = await fetch(`/api/radnici/id/${radnikId}`);
    const radnik = await radnikResponse.json();

    console.log("Podaci o radniku za ugovor:", radnik); // Debug log

    // Na osnovu vrste ugovora otvori odgovarajući template
    let ugovorUrl;

    if (radnik.vrsta_ugovora === "ugovor_o_dopunskom_radu") {
      ugovorUrl = `/ugovor-o-dopunskom-radu.html?radnikId=${radnikId}&firmaId=${firmaId}`;
    } else {
      // Default - ugovor o radu (ili bilo koja druga vrsta)
      // Template ugovor-o-radu.html automatski prikazuje određeno/neodređeno na osnovu tip_ugovora polja
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

// Dropdown funkcije za dokumenta
function toggleDropdown(radnikId) {
  const dropdown = document.getElementById(`dropdown-${radnikId}`);
  const dropdownBtn = dropdown.previousElementSibling; // dugme koje je kliknuto
  const isVisible = dropdown.style.display === "block";

  // Zatvori sve ostale dropdown-ove
  document.querySelectorAll(".dropdown-menu").forEach((menu) => {
    menu.style.display = "none";
    menu.classList.remove("dropdown-up"); // ukloni klasu za otvaranje prema gore
  });

  // Toggle trenutni dropdown
  if (isVisible) {
    dropdown.style.display = "none";
  } else {
    dropdown.style.display = "block";

    // Proveri da li dropdown treba da se otvori prema gore
    const dropdownRect = dropdown.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - dropdownRect.bottom;
    const spaceAbove = dropdownRect.top;

    // Ako nema dovoljno prostora ispod (manje od visine dropdown-a), otvori prema gore
    if (spaceBelow < 200 && spaceAbove > spaceBelow) {
      dropdown.classList.add("dropdown-up");
    } else {
      dropdown.classList.remove("dropdown-up");
    }
  }
}

function closeDropdown(radnikId) {
  const dropdown = document.getElementById(`dropdown-${radnikId}`);
  dropdown.style.display = "none";
  dropdown.classList.remove("dropdown-up");
}

// Zatvori dropdown kada se klikne van njega
document.addEventListener("click", function (event) {
  if (!event.target.matches(".radnici-dropdown-btn")) {
    document.querySelectorAll(".dropdown-menu").forEach((menu) => {
      menu.style.display = "none";
      menu.classList.remove("dropdown-up");
    });
  }
});

// Funkcija za generisanje dokumenata (osim ugovora)
function generateDocument(radnikId, documentType) {
  console.log("generateDocument pozvan sa:", radnikId, documentType);

  const radnik = radnici.find((r) => r.id == radnikId);
  if (!radnik) {
    alert("Radnik nije pronađen!");
    return;
  }

  // Specijalni tretman za sedmični odmor - otvori modal za izbor dana
  if (documentType === "sedmicni-odmor") {
    console.log("Otvaram modal za sedmični odmor");
    openSedmicniOdmorModal(radnikId, radnik.firma_id);
    return;
  }

  // Novi modal za potvrdu o zaposlenju
  if (documentType === "potvrda-zaposlenja") {
    openPotvrdaModal(radnikId, radnik.firma_id);
    return;
  }

  // Kreiramo URL sa parametrima kao što ih koristi modal (radnikId i firmaId)
  const url = `${documentType}.html?radnikId=${radnikId}&firmaId=${radnik.firma_id}`;
  window.open(url, "_blank");
}

// Modal za unos razloga izdavanja potvrde o zaposlenju
function openPotvrdaModal(radnikId, firmaId) {
  const modalHtml = `
    <div class="modal fade" id="potvrdaModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-file-alt me-2"></i>Razlog izdavanja potvrde
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="razlogPotvrdaInput" class="form-label">Za šta vam je potrebna potvrda?</label>
              <input type="text" class="form-control" id="razlogPotvrdaInput" placeholder="npr. otvaranje računa u banci" maxlength="100" autofocus>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closePotvrdaModal()">Otkaži</button>
            <button type="button" class="btn btn-primary" onclick="potvrdiPotvrdaModal(${radnikId}, ${firmaId})">
              <i class="fas fa-check me-2"></i>Generiši potvrdu
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Ukloni postojeći modal ako postoji
  const existingModal = document.getElementById("potvrdaModal");
  if (existingModal) {
    existingModal.remove();
  }

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  const modal = new bootstrap.Modal(document.getElementById("potvrdaModal"));
  modal.show();

  // Ukloni iz DOM-a kad se zatvori
  const modalElement = document.getElementById("potvrdaModal");
  modalElement.addEventListener(
    "hidden.bs.modal",
    function () {
      modalElement.remove();
    },
    { once: true }
  );
}

function closePotvrdaModal() {
  const modalElement = document.getElementById("potvrdaModal");
  if (modalElement) {
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    } else {
      modalElement.remove();
    }
  }
}

function potvrdiPotvrdaModal(radnikId, firmaId) {
  const razlog = document.getElementById("razlogPotvrdaInput").value.trim();
  if (!razlog) {
    alert("Unesite razlog izdavanja potvrde.");
    return;
  }
  // Otvori potvrdu sa razlogom kao GET parametar
  const url = `potvrda-zaposlenja.html?radnikId=${radnikId}&firmaId=${firmaId}&razlog=${encodeURIComponent(
    razlog
  )}`;
  window.open(url, "_blank");
  closePotvrdaModal();
}

// Modal za izbor dana sedmičnog odmora
function openSedmicniOdmorModal(radnikId, firmaId) {
  console.log("openSedmicniOdmorModal pozvan sa:", radnikId, firmaId);

  const modalHtml = `
    <div class="modal fade" id="sedmicniOdmorModal" tabindex="-1">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-calendar-week me-2"></i>Izaberite dan sedmičnog odmora
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="danSedmicniSelect" class="form-label">Dan u nedelji:</label>
              <select class="form-select" id="danSedmicniSelect">
                <option value="ponedeljkom">Ponedeljkom</option>
                <option value="utorkom">Utorkom</option>
                <option value="sredom">Sredom</option>
                <option value="četvrtkom">Četvrtkom</option>
                <option value="petkom">Petkom</option>
                <option value="subotom">Subotom</option>
                <option value="nedeljom">Nedeljom</option>
              </select>
            </div>
            <div class="mb-3">
              <label for="specificniDatumSedmicni" class="form-label">Ili specifičan datum (opciono):</label>
              <input type="date" class="form-control" id="specificniDatumSedmicni">
              <small class="form-text text-muted">Ako unesete datum, on će imati prioritet</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeSedmicniOdmorModal()">Otkaži</button>
            <button type="button" class="btn btn-primary" onclick="potvrdiSedmicniOdmor(${radnikId}, ${firmaId})">
              <i class="fas fa-check me-2"></i>Generiši dokument
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Ukloni postojeći modal ako postoji
  const existingModal = document.getElementById("sedmicniOdmorModal");
  if (existingModal) {
    existingModal.remove();
  }

  // Dodaj novi modal
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // Prikaži modal
  const modal = new bootstrap.Modal(
    document.getElementById("sedmicniOdmorModal")
  );
  modal.show();

  // Dodaj event listener za automatsko uklanjanje iz DOM-a kada se modal zatvori
  const modalElement = document.getElementById("sedmicniOdmorModal");
  modalElement.addEventListener(
    "hidden.bs.modal",
    function () {
      modalElement.remove();
    },
    { once: true }
  );
}

// Funkcija za zatvaranje sedmičnog odmora modala
function closeSedmicniOdmorModal() {
  const modalElement = document.getElementById("sedmicniOdmorModal");
  if (modalElement) {
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    } else {
      // Ako nema Bootstrap instance, jednostavno ukloni element
      modalElement.remove();
    }
  }
}

function potvrdiSedmicniOdmor(radnikId, firmaId) {
  const specificniDatum = document.getElementById(
    "specificniDatumSedmicni"
  ).value;
  const danSelect = document.getElementById("danSedmicniSelect").value;

  let danOdmora;

  if (specificniDatum) {
    // Ako je unesen specifičan datum, formatuj ga
    const datum = new Date(specificniDatum);
    danOdmora = datum.toLocaleDateString("sr-RS");
  } else {
    // Inače koristi izabrani dan u nedelji
    danOdmora = danSelect;
  }

  // Otvori dokument sa parametrima
  const url = `sedmicni-odmor.html?radnikId=${radnikId}&firmaId=${firmaId}&danOdmora=${encodeURIComponent(
    danOdmora
  )}`;
  window.open(url, "_blank");

  // Zatvori modal i ukloni ga iz DOM-a
  const modalElement = document.getElementById("sedmicniOdmorModal");
  if (modalElement) {
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();

      // Ukloni modal iz DOM-a nakon animacije zatvaranja
      modalElement.addEventListener(
        "hidden.bs.modal",
        function () {
          modalElement.remove();
        },
        { once: true }
      );
    } else {
      // Ako nema Bootstrap instance, jednostavno ukloni element
      modalElement.remove();
    }
  }
}

// Funkcija za čitanje URL parametara i automatsko popunjavanje search polja
function checkURLSearchParam() {
  const urlParams = new URLSearchParams(window.location.search);
  const searchTerm = urlParams.get("search");
  const editId = urlParams.get("editId");

  if (searchTerm) {
    // Čeka da se radnici učitaju, zatim popuni search polje
    setTimeout(() => {
      const searchInput = document.getElementById("radniciSearchInput");
      if (searchInput) {
        searchInput.value = decodeURIComponent(searchTerm);
        searchInput.focus();

        // Trigger search funkcionalnost
        filterRadnici();
      }
    }, 500);
  }

  if (editId) {
    // Čeka da se radnici učitaju, zatim otvori edit modal
    setTimeout(() => {
      editRadnik(editId);

      // Ukloni editId iz URL-a da sprečiš ponovo otvaranje
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete("editId");
      window.history.replaceState({}, "", newUrl.toString());
    }, 1000); // Duži timeout da se učitaju i pozicije i firme
  }
}

// =================================================================
// OTKAZ FUNKCIONALNOSTI
// =================================================================

async function openOtkazModal(radnikId) {
  const radnik = radnici.find((r) => r.id == radnikId);
  if (!radnik) {
    alert("Radnik nije pronađen!");
    return;
  }

  const firma = firme.find((f) => f.id == radnik.firma_id);
  let pozicija = null;
  if (Array.isArray(pozicije)) {
    pozicija = pozicije.find((p) => p.id == radnik.pozicija_id);
  } else {
    console.error("Pozicije is not an array in openOtkazModal:", pozicije);
  }

  // Proveři da li radnik već ima otkaz
  let postojeciOtkaz = null;
  try {
    const otkazResponse = await fetch(`/api/otkazi/radnik/${radnikId}`);
    if (otkazResponse.ok) {
      const otkazData = await otkazResponse.json();
      if (otkazData.success && otkazData.otkaz) {
        postojeciOtkaz = otkazData.otkaz;
      }
    }
  } catch (error) {
    console.warn("Greška pri proveravanju postojećeg otkaza:", error);
  }

  // Popuni readonly polja
  document.getElementById("otkaz_radnik_id").value = radnik.id;
  document.getElementById(
    "otkaz_radnik_info"
  ).value = `${radnik.ime} ${radnik.prezime} (${radnik.jmbg})`;
  document.getElementById("otkaz_firma_info").value = firma
    ? firma.naziv
    : "N/A";
  document.getElementById("otkaz_datum_zaposlenja").value = formatDate(
    radnik.datum_zaposlenja
  );
  document.getElementById("otkaz_tip_ugovora").value = getVrstaUgovoraText(
    radnik.vrsta_ugovora
  );

  // Prikaži datum prestanka ako je ugovor na određeno i ima datum prestanka
  const datumPrestankaGroup = document.getElementById(
    "otkaz_datum_prestanka_group"
  );
  const datumPrestankaField = document.getElementById(
    "otkaz_datum_prestanka_ugovora"
  );

  if (radnik.tip_ugovora === "odredjeno" && radnik.datum_prestanka) {
    datumPrestankaGroup.style.display = "block";
    datumPrestankaField.value = formatDate(radnik.datum_prestanka);
  } else {
    datumPrestankaGroup.style.display = "none";
    datumPrestankaField.value = "";
  }

  // Dobij reference na form elementi i dugmad
  const tipOtkazaField = document.getElementById("tip_otkaza");
  const datumOtkazaField = document.getElementById("datum_otkaza");
  const razlogOtkazaField = document.getElementById("razlog_otkaza");
  const createBtn = document.getElementById("createOtkazBtn");
  const generateBtn = document.getElementById("generateOtkazBtn");
  const modalTitle = document.getElementById("otkazModalTitle");

  if (postojeciOtkaz) {
    // POSTOJEĆI OTKAZ - popuni podacima i omogući generisanje dokumenta
    console.log("Radnik već ima otkaz:", postojeciOtkaz);

    tipOtkazaField.value = postojeciOtkaz.tip_otkaza;
    datumOtkazaField.value = formatDate(postojeciOtkaz.datum_otkaza);
    razlogOtkazaField.value = postojeciOtkaz.razlog_otkaza || "";

    // Onemogući editovanje polja
    tipOtkazaField.disabled = true;
    datumOtkazaField.disabled = true;
    razlogOtkazaField.disabled = true;

    // Prikaži dugme za generisanje, sakrij kreiranje
    createBtn.style.display = "none";
    generateBtn.style.display = "inline-block";
    generateBtn.onclick = () => generateOtkazFromModal(postojeciOtkaz);

    modalTitle.textContent = "Pregled postojećeg otkaza";
  } else {
    // NOVI OTKAZ - resetuj polja i omogući kreiranje
    console.log("Radnik nema otkaz, prikazujem prazan form");

    tipOtkazaField.value = "";
    datumOtkazaField.value = new Date().toISOString().split("T")[0];
    razlogOtkazaField.value = "";

    // Omogući editovanje polja
    tipOtkazaField.disabled = false;
    datumOtkazaField.disabled = false;
    razlogOtkazaField.disabled = false;

    // Prikaži dugme za kreiranje, sakrij generisanje
    createBtn.style.display = "inline-block";
    generateBtn.style.display = "none";

    modalTitle.textContent = "Kreiranje otkaza radnika";
  }

  // Prikaži modal
  document.getElementById("otkazModal").style.display = "block";
}

function closeOtkazModal() {
  document.getElementById("otkazModal").style.display = "none";
}

function handleTipOtkazaChange() {
  const tipOtkaza = document.getElementById("tip_otkaza").value;
  const radnikId = document.getElementById("otkaz_radnik_id").value;
  const radnik = radnici.find((r) => r.id == radnikId);

  if (tipOtkaza === "istek_ugovora" && radnik && radnik.datum_prestanka) {
    // Ako je istek ugovora i postoji datum prestanka, postavi taj datum
    document.getElementById("datum_otkaza").value = radnik.datum_prestanka;
  }
}

function generateOtkazDocument() {
  const radnikId = document.getElementById("otkaz_radnik_id").value;
  const tipOtkaza = document.getElementById("tip_otkaza").value;

  if (!tipOtkaza) {
    alert("Molimo izaberite tip otkaza!");
    return;
  }

  // Za sada generišemo osnovni dokument - kasnije ćete dodati specifičan sadržaj
  if (tipOtkaza === "sporazumni_raskid") {
    generateDocument(radnikId, "sporazumni-raskid");
  } else if (tipOtkaza === "istek_ugovora") {
    generateDocument(radnikId, "istek-ugovora");
  }
}

// Funkcija za generisanje dokumenta iz postojećeg otkaza
function generateOtkazFromModal(otkaz) {
  console.log("Generišem dokument za postojeći otkaz:", otkaz);

  const radnikId = otkaz.radnik_id;
  const tipOtkaza = otkaz.tip_otkaza;

  // Generiši odgovarajući dokument na osnovu tipa otkaza
  if (tipOtkaza === "sporazumni_raskid") {
    const url = `sporazumni-raskid.html?radnikId=${radnikId}&firmaId=${otkaz.firma_id}&otkazId=${otkaz.id}`;
    window.open(url, "_blank");
  } else if (tipOtkaza === "istek_ugovora") {
    const url = `istek-ugovora.html?radnikId=${radnikId}&firmaId=${otkaz.firma_id}&otkazId=${otkaz.id}`;
    window.open(url, "_blank");
  } else {
    alert(`Tip otkaza "${tipOtkaza}" nije podržan za generisanje dokumenta.`);
  }

  // Zatvori modal
  document.getElementById("otkazModal").style.display = "none";
}

// Funkcija za snimanje novog otkaza u bazu
async function saveOtkaz() {
  try {
    // Uzmi vrednosti iz forme
    const radnikId = document.getElementById("otkaz_radnik_id").value;
    const tipOtkaza = document.getElementById("tip_otkaza").value;
    const datumOtkaza = document.getElementById("datum_otkaza").value;
    const razlogOtkaza = document.getElementById("razlog_otkaza").value;

    // Validacija
    if (!radnikId || !tipOtkaza || !datumOtkaza) {
      alert("Sva obavezna polja moraju biti popunjena!");
      return;
    }

    // Pripremi podatke za slanje
    const otkazData = {
      radnik_id: radnikId,
      tip_otkaza: tipOtkaza,
      datum_otkaza: datumOtkaza,
      razlog_otkaza: razlogOtkaza || "",
    };

    console.log("Šaljem otkaz podatke:", otkazData);

    // Pošalji POST zahtev
    const response = await fetch("/api/otkazi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(otkazData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert("Otkaz je uspešno sačuvan!");
      closeOtkazModal();
      loadRadnici(); // Osveži listu radnika
    } else {
      alert(
        "Greška pri snimanju otkaza: " + (result.message || "Nepoznata greška")
      );
    }
  } catch (error) {
    console.error("Greška pri snimanju otkaza:", error);
    alert("Greška pri snimanju otkaza: " + error.message);
  }
}
