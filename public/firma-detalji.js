/**
 * JavaScript modul za firmu-detalji.html
 * Sadrži funkcionalnosti za upravljanje detaljima firme, radnicima, pozajmicama i dokumentima
 */

// =============================================================================
// GLOBALNE PROMENLJIVE
// =============================================================================

let currentFirmaId = null;
let allRadnici = [];

// =============================================================================
// INICIJALIZACIJA
// =============================================================================

// Učitavanje podataka firme na osnovu URL parametra
document.addEventListener("DOMContentLoaded", function () {
  // Učitaj podatke firme
  loadFirmaData();

  // Setup tab navigation from URL
  setupTabNavigation();
});

// =============================================================================
// OSNOVNE FUNKCIJE UČITAVANJA
// =============================================================================

function loadFirmaData() {
  // Uzmi ID firme iz URL-a
  const urlParams = new URLSearchParams(window.location.search);
  const firmaId = urlParams.get("id");

  if (!firmaId) {
    console.error("Nema ID firme u URL-u");
    showError("Greška: Nedostaje ID firme");
    return;
  }

  currentFirmaId = firmaId;

  // Učitaj osnovne podatke firme
  fetch(`/api/firme/${firmaId}`, {
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Greška pri učitavanju firme");
      }
      return response.json();
    })
    .then((firma) => {
      updateFirmaHeader(firma);
      loadFirmaStats(firmaId);
      loadRadnici(firmaId);
    })
    .catch((error) => {
      console.error("Greška pri učitavanju firme:", error);
      showError("Greška pri učitavanju podataka firme");
    });
}

function updateFirmaHeader(firma) {
  document.getElementById("firmaNaziv").textContent = firma.naziv || "N/A";
  document.getElementById("firmaPIB").textContent = firma.pib || "N/A";
  document.getElementById("firmaGrad").textContent = firma.grad || "N/A";

  // Format datum osnivanja
  if (firma.datum_osnivanja) {
    const datum = new Date(firma.datum_osnivanja);
    document.getElementById("firmaOsnivanje").textContent =
      datum.toLocaleDateString("sr-RS");
  }
}

function loadFirmaStats(firmaId) {
  // Učitaj statistike firme
  Promise.all([
    fetch(`/api/firme/${firmaId}/radnici`, { credentials: "include" }),
    fetch(`/api/firme/${firmaId}/pozajmice`, { credentials: "include" }),
  ])
    .then((responses) =>
      Promise.all(responses.map((r) => (r.ok ? r.json() : [])))
    )
    .then(([radnici, pozajmice]) => {
      updateStats(radnici, pozajmice);
    })
    .catch((error) => {
      console.error("Greška pri učitavanju statistika:", error);
    });
}

function updateStats(radnici, pozajmice, otkaziMap = {}) {
  // Ukupno radnika
  document.getElementById("ukupnoRadnika").textContent = radnici.length || 0;

  // Aktivni ugovori (radnici bez otkaza ili datum_prestanka)
  const aktivniRadnici = radnici.filter((r) => {
    // Ako radnik ima otkaz, nije aktivan
    if (otkaziMap[r.id]) {
      return false;
    }
    // Inače koristi standardnu logiku
    return !r.datum_prestanka || new Date(r.datum_prestanka) > new Date();
  });
  document.getElementById("aktivniUgovori").textContent =
    aktivniRadnici.length || 0;

  // Aktivne pozajmice
  const aktivnePozajmice = pozajmice.filter((p) => p.status === "aktivna");
  document.getElementById("aktivnePozajmice").textContent =
    aktivnePozajmice.length || 0;

  // Rokovi koji ističu (ne računaj one koji imaju otkaz)
  const danas = new Date();
  const treziDana = new Date();
  treziDana.setDate(danas.getDate() + 30);
  const ugovoriIsteku = radnici.filter((r) => {
    // Ako radnik ima otkaz, ne računaj ga
    if (otkaziMap[r.id]) return false;

    if (!r.datum_prestanka) return false;
    const datumPrestanka = new Date(r.datum_prestanka);
    return datumPrestanka > danas && datumPrestanka <= treziDana;
  });
  document.getElementById("rokovi").textContent = ugovoriIsteku.length || 0;
}

// Funkcija za ažuriranje statistika kada se učitaju otkazi
function updateStatsWithOtkazi(radnici, otkaziMap) {
  // Pozajmice učitaj zasebno
  fetch(`/api/firme/${currentFirmaId}/pozajmice`, { credentials: "include" })
    .then((response) => (response.ok ? response.json() : []))
    .then((pozajmice) => {
      updateStats(radnici, pozajmice, otkaziMap);
    })
    .catch((error) => {
      console.warn("Greška pri učitavanju pozajmica za statistike:", error);
      updateStats(radnici, [], otkaziMap);
    });
}

// =============================================================================
// RADNICI FUNKCIONALNOST
// =============================================================================

function loadRadnici(firmaId) {
  fetch(`/api/radnici/firma/${firmaId}`, {
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Greška pri učitavanju radnika");
      }
      return response.json();
    })
    .then(async (radnici) => {
      allRadnici = radnici;

      // Učitaj otkaze za ovu firmu
      let otkazi = [];
      try {
        const otkaziResponse = await fetch(`/api/otkazi/firma/${firmaId}`);
        const otkaziData = await otkaziResponse.json();
        if (otkaziData.success) {
          otkazi = otkaziData.data || [];
        }
      } catch (otkazError) {
        console.warn("Nema otkaza za ovu firmu:", otkazError);
      }

      // Kreiraj mapu otkaza po radnik_id za brzu pretragu
      const otkaziMap = {};
      otkazi.forEach((otkaz) => {
        otkaziMap[otkaz.radnik_id] = otkaz;
      });

      updateRadniciTable(radnici, otkaziMap);

      // Ažuriraj i statistike s obzirom na otkaze
      updateStatsWithOtkazi(radnici, otkaziMap);
    })
    .catch((error) => {
      console.error("Greška pri učitavanju radnika:", error);
      document.getElementById("aktivniRadniciTabela").innerHTML =
        '<tr><td colspan="6" class="text-center text-danger">Greška pri učitavanju radnika</td></tr>';
    });
}

function updateRadniciTable(radnici, otkaziMap = {}) {
  updateAktivniRadnici(radnici, otkaziMap);
  updateNeaktivniRadnici(radnici, otkaziMap);
  updateUgovoriIsteku(radnici, otkaziMap);
  updatePillTabCounts(radnici, otkaziMap);
}

function updateAktivniRadnici(radnici, otkaziMap = {}) {
  const tbody = document.getElementById("aktivniRadniciTabela");
  const aktivniRadnici = radnici.filter((r) => {
    // Ako radnik ima otkaz, nije aktivan
    if (otkaziMap[r.id]) {
      return false;
    }
    // Inače koristi standardnu logiku
    return !r.datum_prestanka || new Date(r.datum_prestanka) > new Date();
  });

  if (aktivniRadnici.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-muted">Nema aktivnih radnika</td></tr>';
    return;
  }

  const rows = aktivniRadnici
    .map((radnik) => {
      const datumZaposlenja = new Date(
        radnik.datum_zaposlenja
      ).toLocaleDateString("sr-RS");
      const datumPrestanka = radnik.datum_prestanka
        ? new Date(radnik.datum_prestanka).toLocaleDateString("sr-RS")
        : "-";
      const tipUgovora = radnik.datum_prestanka ? "Određeno" : "Neodređeno";
      const badgeClass = radnik.datum_prestanka ? "bg-warning" : "bg-success";

      return `
        <tr>
          <td>${radnik.ime} ${radnik.prezime}</td>
          <td>${radnik.pozicija_naziv || "Nespecifikovano"}</td>
          <td>${datumZaposlenja}</td>
          <td><span class="badge ${badgeClass}">${tipUgovora}</span></td>
          <td>${datumPrestanka}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="viewRadnikDetalji(${
              radnik.id
            })" title="Detalji">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-warning" onclick="editRadnik(${
              radnik.id
            })" title="Uredi radnika">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-success" onclick="generisiUgovor(${
              radnik.id
            })" title="Generiši ugovor">
              <i class="fas fa-file-contract"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="openOtkazModalForRadnik(${
              radnik.id
            })" title="Otkaz radnika">
              <i class="fas fa-handshake"></i>
            </button>
            <button class="btn btn-sm btn-outline-dark" onclick="deleteRadnik(${
              radnik.id
            })" title="Obriši radnika">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.innerHTML = rows;
}

function updateNeaktivniRadnici(radnici, otkaziMap = {}) {
  const tbody = document.getElementById("neaktivniRadniciTabela");
  const neaktivniRadnici = radnici.filter((r) => {
    // Ako radnik ima otkaz, je neaktivan
    if (otkaziMap[r.id]) {
      return true;
    }
    // Inače koristi standardnu logiku
    return r.datum_prestanka && new Date(r.datum_prestanka) <= new Date();
  });

  if (neaktivniRadnici.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-muted">Nema bivših radnika</td></tr>';
    return;
  }

  const rows = neaktivniRadnici
    .map((radnik) => {
      const datumZaposlenja = new Date(
        radnik.datum_zaposlenja
      ).toLocaleDateString("sr-RS");

      // Provjeri da li radnik ima otkaz
      const otkaz = otkaziMap[radnik.id];
      let datumPrestanka, razlogPrestanka;

      if (otkaz) {
        datumPrestanka = new Date(otkaz.datum_otkaza).toLocaleDateString(
          "sr-RS"
        );
        razlogPrestanka =
          otkaz.tip_otkaza === "sporazumni_raskid"
            ? '<span class="badge bg-warning">Sporazumni raskid</span>'
            : '<span class="badge bg-info">Istek ugovora</span>';
      } else {
        datumPrestanka = new Date(radnik.datum_prestanka).toLocaleDateString(
          "sr-RS"
        );
        razlogPrestanka =
          '<span class="badge bg-secondary">Prestanak rada</span>';
      }

      return `
        <tr>
          <td>${radnik.ime} ${radnik.prezime}</td>
          <td>${radnik.pozicija_naziv || "Nespecifikovano"}</td>
          <td>${datumZaposlenja}</td>
          <td>${datumPrestanka}</td>
          <td>${razlogPrestanka}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="viewRadnikDetalji(${
              radnik.id
            })" title="Detalji">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-info" onclick="generisiPotvrdu(${
              radnik.id
            })" title="Potvrda o zaposlenju">
              <i class="fas fa-certificate"></i>
            </button>
            ${
              otkaz
                ? `
            <button class="btn btn-sm btn-outline-success" onclick="viewOtkaz(${otkaz.id}, '${otkaz.tip_otkaza}', ${radnik.id})" title="Pregled otkaza">
              <i class="fas fa-file-alt"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteOtkaz(${otkaz.id})" title="Obriši otkaz">
              <i class="fas fa-trash"></i>
            </button>
            `
                : ""
            }
            <button class="btn btn-sm btn-outline-dark" onclick="deleteRadnik(${
              radnik.id
            })" title="Obriši radnika">
              <i class="fas fa-user-times"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.innerHTML = rows;
}

function updateUgovoriIsteku(radnici, otkaziMap = {}) {
  const tbody = document.getElementById("ugovoriIstekuTabela");
  const danas = new Date();
  const treziDana = new Date();
  treziDana.setDate(danas.getDate() + 30);

  const ugovoriIsteku = radnici.filter((r) => {
    // Ako radnik ima otkaz, ne prikazuj ga ovdje
    if (otkaziMap[r.id]) return false;

    if (!r.datum_prestanka) return false;
    const datumPrestanka = new Date(r.datum_prestanka);
    return datumPrestanka > danas && datumPrestanka <= treziDana;
  });

  if (ugovoriIsteku.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-muted">Nema ugovora koji ističu u narednih 30 dana</td></tr>';
    return;
  }

  const rows = ugovoriIsteku
    .map((radnik) => {
      const datumZaposlenja = new Date(
        radnik.datum_zaposlenja
      ).toLocaleDateString("sr-RS");
      const datumPrestanka = new Date(radnik.datum_prestanka);
      const datumPrestankaStr = datumPrestanka.toLocaleDateString("sr-RS");
      const daniDoIsteka = Math.ceil(
        (datumPrestanka - danas) / (1000 * 60 * 60 * 24)
      );
      const warningClass =
        daniDoIsteka <= 7
          ? "bg-danger"
          : daniDoIsteka <= 14
          ? "bg-warning"
          : "bg-info";

      return `
        <tr>
          <td>${radnik.ime} ${radnik.prezime}</td>
          <td>${radnik.pozicija_naziv || "Nespecifikovano"}</td>
          <td>${datumZaposlenja}</td>
          <td>${datumPrestankaStr}</td>
          <td><span class="badge ${warningClass}">${daniDoIsteka} dana</span></td>
          <td>
            <button class="btn btn-sm btn-outline-success" onclick="produzUgovor(${
              radnik.id
            })" title="Produži ugovor">
              <i class="fas fa-calendar-plus"></i>
            </button>
            <button class="btn btn-sm btn-outline-primary" onclick="viewRadnikDetalji(${
              radnik.id
            })" title="Detalji">
              <i class="fas fa-eye"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.innerHTML = rows;
}

function updatePillTabCounts(radnici, otkaziMap = {}) {
  const aktivni = radnici.filter((r) => {
    // Ako radnik ima otkaz, nije aktivan
    if (otkaziMap[r.id]) {
      return false;
    }
    // Inače koristi standardnu logiku
    return !r.datum_prestanka || new Date(r.datum_prestanka) > new Date();
  });

  const neaktivni = radnici.filter((r) => {
    // Ako radnik ima otkaz, je neaktivan
    if (otkaziMap[r.id]) {
      return true;
    }
    // Inače koristi standardnu logiku
    return r.datum_prestanka && new Date(r.datum_prestanka) <= new Date();
  });

  const danas = new Date();
  const treziDana = new Date();
  treziDana.setDate(danas.getDate() + 30);
  const ugovoriIsteku = radnici.filter((r) => {
    // Ako radnik ima otkaz, ne prikazuj ga ovdje
    if (otkaziMap[r.id]) return false;

    if (!r.datum_prestanka) return false;
    const datumPrestanka = new Date(r.datum_prestanka);
    return datumPrestanka > danas && datumPrestanka <= treziDana;
  });

  // Ažuriraj tekstove tabova
  const aktivniTab = document.querySelector(
    '[data-bs-target="#aktivni-radnici"]'
  );
  const neaktivniTab = document.querySelector(
    '[data-bs-target="#neaktivni-radnici"]'
  );
  const ugovoriTab = document.querySelector(
    '[data-bs-target="#ugovori-detalji"]'
  );

  if (aktivniTab)
    aktivniTab.textContent = `Aktivni radnici (${aktivni.length})`;
  if (neaktivniTab)
    neaktivniTab.textContent = `Bivši radnici (${neaktivni.length})`;
  if (ugovoriTab)
    ugovoriTab.textContent = `Ističu ugovori (${ugovoriIsteku.length})`;
}

// =============================================================================
// NAVIGACIJA I UTILITY FUNKCIJE
// =============================================================================

function setupTabNavigation() {
  // Tab aktivacija sa URL parametrima
  const urlParams = new URLSearchParams(window.location.search);
  const activeTab = urlParams.get("tab");
  if (activeTab) {
    const tabButton = document.querySelector(`#${activeTab}-tab`);
    if (tabButton) {
      tabButton.click();
    }
  }
}

function showError(message) {
  // Prikaži poruku greške
  const container = document.querySelector(".container");
  const errorDiv = document.createElement("div");
  errorDiv.className = "alert alert-danger";
  errorDiv.textContent = message;
  container.insertBefore(errorDiv, container.firstChild);
}

// =============================================================================
// AKCIJE ZA RADNIKE
// =============================================================================

function viewRadnikDetalji(radnikId) {
  // Pronađi radnika iz cached podataka
  const radnik = allRadnici.find((r) => r.id == radnikId);

  if (!radnik) {
    console.error("Radnik nije pronađen:", radnikId);
    alert("Greška: Radnik nije pronađen");
    return;
  }

  // Debug - ispiši sve podatke o radniku
  // Popuni modal sa podacima
  populateRadnikModal(radnik);

  // Prikaži modal
  const modal = new bootstrap.Modal(
    document.getElementById("radnikDetaljModal")
  );
  modal.show();
}

function populateRadnikModal(radnik) {
  // Osnovni podaci
  document.getElementById(
    "modalRadnikIme"
  ).textContent = `${radnik.ime} ${radnik.prezime}`;
  document.getElementById(
    "modalRadnikImePrezime"
  ).textContent = `${radnik.ime} ${radnik.prezime}`;
  document.getElementById("modalRadnikJMBG").textContent =
    radnik.jmbg || "Nije uneseno";
  document.getElementById("modalRadnikAdresa").textContent =
    radnik.adresa || "Nije unesena";
  document.getElementById("modalRadnikPozicija").textContent =
    radnik.pozicija_naziv || "Nespecifikovano";

  // Finansijski podaci - koristi polje 'visina_zarade' kao na radnici-firma.html
  let zarada =
    radnik.visina_zarade || radnik.zarada || radnik.plata || radnik.salary;
  if (zarada) {
    zarada = `${zarada}€`;
  } else {
    zarada = "Nije unesena";
  }
  document.getElementById("modalRadnikZarada").textContent = zarada;

  // Radno vreme - mapiranje tipova radnog vremena
  let radnoVreme;
  const radnoVremeText = {
    puno: "Puno radno vreme (8 sati dnevno / 40 sati nedeljno)",
    nepuno: "Nepuno radno vreme",
    skraceno: "Skraćeno radno vreme",
  };

  radnoVreme =
    radnoVremeText[radnik.tip_radnog_vremena] ||
    radnik.radno_vreme ||
    radnik.radno_vrijeme ||
    "Puno radno vreme (8 sati dnevno / 40 sati nedeljno)";

  document.getElementById("modalRadnikRadnoVreme").textContent = radnoVreme;

  // Podaci o zaposlenju
  document.getElementById("modalRadnikFirma").textContent =
    radnik.firma_naziv || document.getElementById("firmaNaziv").textContent;

  const datumZaposlenja = radnik.datum_zaposlenja
    ? new Date(radnik.datum_zaposlenja).toLocaleDateString("sr-RS")
    : "Nije uneseno";
  document.getElementById("modalRadnikDatumZaposlenja").textContent =
    datumZaposlenja;

  // Tip ugovora - mapiranje iz baze
  const tipUgovoraText = {
    na_neodredjeno: "Na neodređeno vreme",
    na_odredjeno: "Na određeno vreme",
  };
  const tipUgovora =
    tipUgovoraText[radnik.tip_ugovora] ||
    (radnik.datum_prestanka ? "Na određeno vreme" : "Na neodređeno vreme");
  document.getElementById("modalRadnikTipUgovora").textContent = tipUgovora;

  const vaziDo = radnik.datum_prestanka
    ? new Date(radnik.datum_prestanka).toLocaleDateString("sr-RS")
    : "-";
  document.getElementById("modalRadnikVaziDo").textContent = vaziDo;

  // Dodatne informacije
  const napomene = radnik.napomene || radnik.notes || "Nema dodatnih napomena";
  document.getElementById("modalRadnikNapomene").textContent = napomene;

  // Opis poslova - direktno iz baze (tabela pozicije spojena sa radnici)
  const opisPoslova =
    radnik.opis_poslova ||
    radnik.pozicija_opis ||
    "Opis poslova nije definisan za ovu poziciju.";
  document.getElementById("modalRadnikOpisPoslova").textContent = opisPoslova;
}

// Modal akcije
async function generisiUgovorModal() {
  const radnikId = getCurrentRadnikIdFromModal();
  try {
    // Prvo dohvati podatke o radniku da vidiš vrstu ugovora
    const radnikResponse = await fetch(`/api/radnici/id/${radnikId}`);
    const radnik = await radnikResponse.json();

    // Na osnovu vrste ugovora otvori odgovarajući template
    let ugovorUrl;

    if (radnik.vrsta_ugovora === "ugovor_o_dopunskom_radu") {
      ugovorUrl = `/ugovor-o-dopunskom-radu.html?radnikId=${radnikId}&firmaId=${currentFirmaId}`;
    } else {
      // Default - ugovor o radu (ili bilo koja druga vrsta)
      ugovorUrl = `/ugovor-o-radu.html?radnikId=${radnikId}&firmaId=${currentFirmaId}`;
    }

    window.open(ugovorUrl, "_blank");
  } catch (error) {
    console.error("Greška pri dohvaćanju podataka o radniku:", error);
    // Fallback - otvori ugovor o radu
    window.open(
      `/ugovor-o-radu.html?radnikId=${radnikId}&firmaId=${currentFirmaId}`,
      "_blank"
    );
  }
}

function sedmicniOdmorModal() {
  const radnikId = getCurrentRadnikIdFromModal();
  openSedmicniOdmorModal(radnikId, currentFirmaId);
}

function mobingModal() {
  const radnikId = getCurrentRadnikIdFromModal();
  window.open(
    `/mobing.html?radnikId=${radnikId}&firmaId=${currentFirmaId}`,
    "_blank"
  );
}

function potvrdaZaposlenjaModal() {
  const radnikId = getCurrentRadnikIdFromModal();
  openPotvrdaModal(radnikId, currentFirmaId);
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
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Otkaži</button>
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
  const url = `/sedmicni-odmor.html?radnikId=${radnikId}&firmaId=${firmaId}&danOdmora=${encodeURIComponent(
    danOdmora
  )}`;
  window.open(url, "_blank");

  // Zatvori modal
  const modal = bootstrap.Modal.getInstance(
    document.getElementById("sedmicniOdmorModal")
  );
  modal.hide();
}

function getCurrentRadnikIdFromModal() {
  // Uzmi ime iz modal naslova i pronađi ID
  const imePrezime = document.getElementById(
    "modalRadnikImePrezime"
  ).textContent;
  const radnik = allRadnici.find((r) => `${r.ime} ${r.prezime}` === imePrezime);
  return radnik ? radnik.id : null;
}

function generisiUgovor(radnikId) {
  window.open(
    `/ugovor-o-radu.html?radnikId=${radnikId}&firmaId=${currentFirmaId}`,
    "_blank"
  );
}

function sporazumniRaskid(radnikId) {
  window.open(
    `/sporazumni-raskid.html?radnikId=${radnikId}&firmaId=${currentFirmaId}`,
    "_blank"
  );
}

function generisiPotvrdu(radnikId) {
  window.open(
    `/potvrda-zaposlenja.html?radnikId=${radnikId}&firmaId=${currentFirmaId}`,
    "_blank"
  );
}

function produzUgovor(radnikId) {
  if (confirm("Da li želite da produžite ugovor za ovog radnika?")) {
    // TODO: Implementirati logiku za produžavanje ugovora
    alert("Funkcionalnost će biti implementirana");
  }
}

// =============================================================================
// OTKAZI FUNKCIONALNOST
// =============================================================================

// Funkcija za slanje otkaz podataka
async function submitOtkaz() {
  try {
    const form = document.getElementById("otkazForm");
    const formData = new FormData(form);

    const otkazData = {
      radnik_id: formData.get("radnik_id"),
      tip_otkaza: formData.get("tip_otkaza"),
      datum_otkaza: formData.get("datum_otkaza"),
      razlog_otkaza: formData.get("razlog_otkaza"),
    };

    const response = await fetch("/api/otkazi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(otkazData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert("Otkaz je uspešno kreiran!");

      // Zatvori modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("otkazModal")
      );
      modal.hide();

      // Reload radnike da prikaži promenu
      loadRadnici(currentFirmaId);

      // Generiši dokument na osnovu tipa otkaza
      viewOtkaz(result.data.id, otkazData.tip_otkaza, otkazData.radnik_id);
    } else {
      alert("Greška pri kreiranju otkaza: " + (result.message || result.error));
    }
  } catch (error) {
    console.error("Greška pri slanju otkaza:", error);
    alert("Greška pri kreiranju otkaza!");
  }
}

// Funkcija za pregled otkaz dokumenta
function viewOtkaz(otkazId, tipOtkaza, radnikId) {
  let documentUrl;

  if (tipOtkaza === "sporazumni_raskid") {
    documentUrl = `/sporazumni-raskid.html?radnikId=${radnikId}&firmaId=${currentFirmaId}&otkazId=${otkazId}`;
  } else if (tipOtkaza === "istek_ugovora") {
    documentUrl = `/istek-ugovora.html?radnikId=${radnikId}&firmaId=${currentFirmaId}&otkazId=${otkazId}`;
  } else {
    console.error("Nepoznat tip otkaza:", tipOtkaza);
    return;
  }

  window.open(documentUrl, "_blank");
}

// Funkcija za brisanje otkaza
async function deleteOtkaz(otkazId) {
  if (!confirm("Da li ste sigurni da želite da obrišete ovaj otkaz?")) {
    return;
  }

  try {
    const response = await fetch(`/api/otkazi/${otkazId}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (data.success) {
      alert("Otkaz je uspešno obrisan!");

      // Osvježi prikaz radnika da se radnik vrati u aktivne
      loadRadnici(currentFirmaId);
    } else {
      alert("Greška pri brisanju otkaza: " + data.message);
    }
  } catch (error) {
    console.error("Greška pri brisanju otkaza:", error);
    alert("Greška pri brisanju otkaza!");
  }
}

// Funkcija za brisanje radnika
async function deleteRadnik(radnikId) {
  // Pronađi radnika za potvrdu
  const radnik = allRadnici.find((r) => r.id == radnikId);

  if (!radnik) {
    alert("Greška: Radnik nije pronađen");
    return;
  }

  const confirmMessage = `Da li ste sigurni da želite da TRAJNO OBRIŠETE radnika:\n\n${radnik.ime} ${radnik.prezime}\n\nOva akcija se ne može vratiti!`;

  if (!confirm(confirmMessage)) {
    return;
  }

  // Dodatna potvrda zbog ozbiljnosti akcije
  const finalConfirm = confirm(
    "POSLEDNJA POTVRDA: Da li zaista želite da obrišete ovog radnika?\n\nSvi podaci o radniku će biti trajno izgubljeni!"
  );

  if (!finalConfirm) {
    return;
  }

  try {
    const response = await fetch(`/api/radnici/${radnikId}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (data.success) {
      alert("Radnik je uspešno obrisan!");

      // Osvježi prikaz radnika
      loadRadnici(currentFirmaId);
    } else {
      alert("Greška pri brisanju radnika: " + data.message);
    }
  } catch (error) {
    console.error("Greška pri brisanju radnika:", error);
    alert("Greška pri brisanju radnika!");
  }
}

// =============================================================================
// POZAJMICE FUNKCIONALNOST (za buduću implementaciju)
// =============================================================================

function loadPozajmice(firmaId) {
  // TODO: Implementirati učitavanje pozajmica
}

function updatePozajmiceTable(pozajmice) {
  // TODO: Implementirati ažuriranje tabele pozajmica
}

// =============================================================================
// DOKUMENTI FUNKCIONALNOST (za buduću implementaciju)
// =============================================================================

function initDokumenti() {
  // TODO: Implementirati funkcionalnost dokumenata
}

// =============================================================================
// DODATNE POMOĆNE FUNKCIJE
// =============================================================================

// Funkcija za uređivanje radnika - preusmrava na radnici.html sa editId
function editRadnik(radnikId) {
  // Pronađi radnika iz cached podataka
  const radnik = allRadnici.find((r) => r.id == radnikId);

  if (!radnik) {
    console.error("Radnik nije pronađen:", radnikId);
    alert("Greška: Radnik nije pronađen");
    return;
  }

  // Popuni edit modal sa podacima radnika
  populateEditModal(radnik);

  // Otvori edit modal
  const editModal = new bootstrap.Modal(
    document.getElementById("editRadnikModal")
  );
  editModal.show();
}

// Funkcija za popunjavanje edit modala
async function populateEditModal(radnik) {
  // Osnovni podaci
  document.getElementById("edit_radnik_id").value = radnik.id;
  document.getElementById("edit_ime").value = radnik.ime || "";
  document.getElementById("edit_prezime").value = radnik.prezime || "";
  document.getElementById("edit_jmbg").value = radnik.jmbg || "";
  document.getElementById("edit_grad").value = radnik.grad || "";
  document.getElementById("edit_adresa").value = radnik.adresa || "";

  // Finansijski podaci - formatiranje datuma za date input
  if (radnik.datum_zaposlenja) {
    const datumZaposlenja = new Date(radnik.datum_zaposlenja);
    const formatiranDatum = datumZaposlenja.toISOString().split("T")[0];
    document.getElementById("edit_datum_zaposlenja").value = formatiranDatum;
  } else {
    document.getElementById("edit_datum_zaposlenja").value = "";
  }

  document.getElementById("edit_visina_zarade").value =
    radnik.visina_zarade || "";
  document.getElementById("edit_tip_radnog_vremena").value =
    radnik.tip_radnog_vremena || "puno_8h";
  document.getElementById("edit_tip_ugovora").value =
    radnik.tip_ugovora || "na_neodredjeno";

  // Formatiranje datuma prestanka
  if (radnik.datum_prestanka) {
    const datumPrestanka = new Date(radnik.datum_prestanka);
    document.getElementById("edit_datum_prestanka").value = datumPrestanka
      .toISOString()
      .split("T")[0];
  } else {
    document.getElementById("edit_datum_prestanka").value = "";
  }

  document.getElementById("edit_napomene").value = radnik.napomene || "";

  // Učitaj pozicije i firme PRVO
  await loadEditSelectOptions();

  // ZATIM postavi trenutne vrednosti nakon što su opcije učitane
  document.getElementById("edit_pozicija_id").value = radnik.pozicija_id || "";
  document.getElementById("edit_firma_id").value = radnik.firma_id || "";

  // Pokaži/sakrij datum prestanka
  toggleEditDatumPrestanka();
}

// Funkcija za učitavanje opcija u select elementima
async function loadEditSelectOptions() {
  try {
    // Učitaj pozicije
    const pozicijeResponse = await fetch("/api/pozicije");
    const pozicijeData = await pozicijeResponse.json();

    const pozicijeSelect = document.getElementById("edit_pozicija_id");
    pozicijeSelect.innerHTML = '<option value="">Izaberite poziciju</option>';

    // Koristi isti pattern kao za firme
    const pozicije = pozicijeData.pozicije || pozicijeData;

    if (Array.isArray(pozicije)) {
      pozicije.forEach((pozicija) => {
        pozicijeSelect.innerHTML += `<option value="${pozicija.id}">${pozicija.naziv}</option>`;
      });
    } else {
      console.error("Pozicije nisu u nizu formatu:", pozicije);
    }

    // Učitaj firme
    const firmeResponse = await fetch("/api/firme");
    const firmeData = await firmeResponse.json();

    const firmeSelect = document.getElementById("edit_firma_id");
    firmeSelect.innerHTML = '<option value="">Izaberite firmu</option>';

    // Koristi isti pattern kao stara implementacija: data.firme || data
    const firme = firmeData.firme || firmeData;

    if (Array.isArray(firme)) {
      firme.forEach((firma) => {
        firmeSelect.innerHTML += `<option value="${firma.id}">${firma.naziv}</option>`;
      });
    } else {
      console.error("Firme nisu u nizu formatu:", firme);
    }
  } catch (error) {
    console.error("Greška pri učitavanju opcija:", error);
  }
}

// Funkcija za slanje edit podataka
async function submitEditRadnik() {
  try {
    const form = document.getElementById("editRadnikForm");
    const formData = new FormData(form);

    const radnikData = {
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

    const radnikId = formData.get("radnik_id");
    const response = await fetch(`/api/radnici/${radnikId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(radnikData),
    });

    const result = await response.json();

    if (result.success) {
      alert("Radnik je uspešno ažuriran!");

      // Zatvori modal
      const editModal = bootstrap.Modal.getInstance(
        document.getElementById("editRadnikModal")
      );
      editModal.hide();

      // Osvježi prikaz radnika
      loadRadnici(currentFirmaId);
    } else {
      alert("Greška pri ažuriranju radnika: " + result.message);
    }
  } catch (error) {
    console.error("Greška pri ažuriranju radnika:", error);
    alert("Greška pri ažuriranju radnika!");
  }
}

// Funkcija za otvaranje otkaz modal-a direktno za određenog radnika (iz tabele)
function openOtkazModalForRadnik(radnikId) {
  const modalHtml = `
    <div class="modal fade" id="otkazModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-user-times me-2"></i>Otkaz radnika
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="otkazForm">
              <input type="hidden" name="radnik_id" value="${radnikId}">
              
              <div class="mb-3">
                <label for="tipOtkaza" class="form-label">Tip otkaza:</label>
                <select class="form-select" name="tip_otkaza" id="tipOtkaza" required>
                  <option value="">Izaberite tip otkaza</option>
                  <option value="sporazumni_raskid">Sporazumni raskid</option>
                  <option value="istek_ugovora">Istek ugovora na određeno</option>
                </select>
              </div>
              
              <div class="mb-3">
                <label for="datumOtkaza" class="form-label">Datum otkaza:</label>
                <input type="date" class="form-control" name="datum_otkaza" id="datumOtkaza" required>
              </div>
              
              <div class="mb-3">
                <label for="razlogOtkaza" class="form-label">Razlog otkaza (opciono):</label>
                <textarea class="form-control" name="razlog_otkaza" id="razlogOtkaza" rows="3" 
                          placeholder="Unesite razlog otkaza..."></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Otkaži</button>
            <button type="button" class="btn btn-danger" onclick="submitOtkaz()">
              <i class="fas fa-check me-2"></i>Kreiraj otkaz
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Ukloni postojeći modal ako postoji
  const existingModal = document.getElementById("otkazModal");
  if (existingModal) {
    existingModal.remove();
  }

  // Dodaj novi modal
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // Postavi današnji datum kao default
  document.getElementById("datumOtkaza").value = new Date()
    .toISOString()
    .split("T")[0];

  // Prikaži modal
  const modal = new bootstrap.Modal(document.getElementById("otkazModal"));
  modal.show();
}
