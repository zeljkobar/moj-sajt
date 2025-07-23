/**
 * JavaScript modul za firmu-detalji.html
 * Sadrži funkcionalnosti za upravljanje detaljima firme, radnicima, pozajmicama i dokumentima
 */

// =============================================================================
// GLOBALNE PROMENLJIVE
// =============================================================================

let currentFirmaId = null;
let currentFirmaPib = null; // Dodano za editovanje firme
let allRadnici = [];

// =============================================================================
// INICIJALIZACIJA
// =============================================================================

// Učitavanje podataka firme na osnovu URL parametra
document.addEventListener("DOMContentLoaded", function () {
  // Proveri da li se radi o stranici firma-detalji.html
  if (window.location.pathname.includes("firma-detalji.html")) {
    // Učitaj podatke firme
    loadFirmaData();

    // Setup tab navigation from URL
    setupTabNavigation();
  }

  // Ako se radi o stranici odluke o rasporedu radnog vremena
  if (
    window.location.pathname.includes("odluka-raspored-radnog-vremena.html")
  ) {
    initOdlukaRaspored();
  }
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
  fetch(`/api/firme/id/${firmaId}`, {
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
      // Sačuvaj PIB za editovanje
      currentFirmaPib = firma.pib;
      loadFirmaStats(firmaId);
      loadRadnici(firmaId);
      loadPozajmice(firmaId); // Dodano učitavanje pozajmica
      loadZadaci(firmaId); // Dodano učitavanje zadataka
    })
    .catch((error) => {
      console.error("Greška pri učitavanju firme:", error);
      showError("Greška pri učitavanju podataka firme");
    });
}

function updateFirmaHeader(firma) {
  document.getElementById("firmaNaziv").textContent = firma.naziv || "N/A";
  document.getElementById("firmaPIB").textContent = firma.pib || "N/A";
  document.getElementById("firmaAdresa").textContent =
    firma.adresa || "JOVANA TOMAŠEVIĆA G9";
  document.getElementById("firmaPDV").textContent =
    firma.pdv_broj || "80/31-01593-7";
  document.getElementById("firmaDirektor").textContent =
    firma.direktor || "SLAVICA MILOŠEVIĆ";
  document.getElementById("firmaJMBGDirektora").textContent =
    firma.jmbg_direktora || "1408992259992";
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

  // Aktivni ugovori (radnici bez otkaza)
  const aktivniRadnici = radnici.filter((r) => {
    // Ako radnik ima otkaz, nije aktivan
    if (otkaziMap[r.id]) {
      return false;
    }
    // Inače je aktivan (bez obzira na datum_prestanka)
    return true;
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
    // Radnik je aktivan ako NEMA otkaz
    return !otkaziMap[r.id];
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

      // Logika za tip ugovora i status
      let tipUgovora, badgeClass, statusText;

      if (!radnik.datum_prestanka) {
        tipUgovora = "Neodređeno";
        badgeClass = "bg-success";
        statusText = "Aktivan";
      } else {
        const danas = new Date();
        const prestanak = new Date(radnik.datum_prestanka);

        if (prestanak > danas) {
          // Ugovor još uvek važi
          const danaDoIsteka = Math.ceil(
            (prestanak - danas) / (1000 * 60 * 60 * 24)
          );
          if (danaDoIsteka <= 30) {
            tipUgovora = "Određeno";
            badgeClass = "bg-warning";
            statusText = `Ističe za ${danaDoIsteka} dana`;
          } else {
            tipUgovora = "Određeno";
            badgeClass = "bg-info";
            statusText = "Aktivan";
          }
        } else {
          // Ugovor je istekao
          const danaOdIsteka = Math.ceil(
            (danas - prestanak) / (1000 * 60 * 60 * 24)
          );
          tipUgovora = "Određeno";
          badgeClass = "bg-danger";
          statusText = `Istekao prije ${danaOdIsteka} dana`;
        }
      }

      return `
        <tr>
          <td>${radnik.ime} ${radnik.prezime}</td>
          <td>${radnik.pozicija_naziv || "Nespecifikovano"}</td>
          <td>${datumZaposlenja}</td>
          <td>
            <span class="badge ${badgeClass}">${tipUgovora}</span>
            <br><small class="text-muted">${statusText}</small>
          </td>
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
    // Neaktivan je samo ako ima otkaz
    return otkaziMap[r.id];
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
    // Radnik je aktivan ako NEMA otkaz
    return !otkaziMap[r.id];
  });

  const neaktivni = radnici.filter((r) => {
    // Radnik je neaktivan ako IMA otkaz
    return otkaziMap[r.id];
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

      // Generiši dokument na osnovu tipa otkaza - koristiti otkaz_id iz odgovora
      if (result.otkaz_id) {
        viewOtkaz(result.otkaz_id, otkazData.tip_otkaza, otkazData.radnik_id);
      } else {
        console.log(
          "Otkaz kreiran ali nema ID za generisanje dokumenta",
          result
        );
      }
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
// POZAJMICE FUNKCIONALNOST
// =============================================================================

let allPozajmice = [];
let pozajmiceStatistike = {};

function loadPozajmice(firmaId) {
  fetch(`/api/pozajmice/firma/${firmaId}`, {
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Greška pri učitavanju pozajmica");
      }
      return response.json();
    })
    .then((data) => {
      // API vraća objekat sa success i pozajmice svojstvom
      if (data.success) {
        allPozajmice = data.pozajmice || [];
      } else {
        allPozajmice = [];
      }
      updatePozajmiceTable(allPozajmice);
      loadPozajmiceStatistike(firmaId);
    })
    .catch((error) => {
      console.error("Greška pri učitavanju pozajmica:", error);
      document.getElementById("aktivnePozajmiceTabela").innerHTML =
        '<tr><td colspan="6" class="text-center text-danger">Greška pri učitavanju pozajmica</td></tr>';
    });
}

function updatePozajmiceTable(pozajmice) {
  updateAktivnePozajmice(pozajmice);
  updateZatvorenePozajmice(pozajmice);
  updatePozajmicePillCounts(pozajmice);
}

function updateAktivnePozajmice(pozajmice) {
  const tbody = document.getElementById("aktivnePozajmiceTabela");
  // Pozajmice koje nisu potpuno vraćene (status != "vraćena")
  const aktivne = pozajmice.filter((p) => p.status !== "vraćena");

  if (aktivne.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-muted">Nema aktivnih pozajmica</td></tr>';
    return;
  }

  const rows = aktivne
    .map((pozajmica) => {
      // Koristi pravi naziv kolone iz baze - datum_izdavanja
      const datumField = pozajmica.datum_izdavanja || pozajmica.created_at;
      const datumPozajmice = datumField
        ? new Date(datumField).toLocaleDateString("sr-RS")
        : "N/A";
      const statusBadge = getStatusBadge(pozajmica.status);

      // Koristi prave nazive kolona iz baze
      const ukupnoVraceno = parseFloat(pozajmica.ukupno_vraceno || 0);
      const preostaloDugovanje = parseFloat(pozajmica.preostalo_dugovanje || 0);
      const iznos = parseFloat(pozajmica.iznos || 0);

      // Imena radnika - različite varijante naziva kolona
      const radnikIme = pozajmica.radnik_ime || pozajmica.ime || "N/A";
      const radnikPrezime = pozajmica.radnik_prezime || pozajmica.prezime || "";

      return `
        <tr>
          <td>${pozajmica.broj_ugovora || "N/A"}</td>
          <td>${radnikIme} ${radnikPrezime}</td>
          <td>${datumPozajmice}</td>
          <td>${iznos.toFixed(2)}€</td>
          <td>${preostaloDugovanje.toFixed(2)}€</td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="viewPozajmicaDetalji(${
              pozajmica.id
            })" title="Detalji">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-info" onclick="toggleIstorijaPopracaja(${
              pozajmica.id
            })" title="Istorija povraćaja">
              <i class="fas fa-history"></i>
            </button>
            <button class="btn btn-sm btn-outline-success" onclick="dodajPovracaj(${
              pozajmica.id
            })" title="Dodaj povraćaj">
              <i class="fas fa-hand-holding-usd"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="kreirajOdlukuPovracaj(${
              pozajmica.id
            })" title="Kreiranje odluke">
              <i class="fas fa-gavel"></i>
            </button>
            <button class="btn btn-sm btn-outline-info" onclick="pregledajUgovor(${
              pozajmica.id
            })" title="Generiši ugovor">
              <i class="fas fa-file-contract"></i>
            </button>
            <button class="btn btn-sm btn-outline-warning" onclick="editPozajmica(${
              pozajmica.id
            })" title="Uredi">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deletePozajmica(${
              pozajmica.id
            })" title="Obriši">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
        <tr id="istorija-${pozajmica.id}" style="display: none;">
          <td colspan="7" class="bg-light">
            <div class="p-3">
              <h6><i class="fas fa-history me-2"></i>Istorija povraćaja</h6>
              <div id="povracaji-${pozajmica.id}">
                <div class="text-center text-muted">
                  <i class="fas fa-spinner fa-spin"></i> Učitavam povraćaje...
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.innerHTML = rows;
}

function updateZatvorenePozajmice(pozajmice) {
  const tbody = document.getElementById("zatvorenePozajmiceTabela");
  const zatvorene = pozajmice.filter((p) => p.status === "vraćena");

  if (zatvorene.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-muted">Nema zatvorenih pozajmica</td></tr>';
    return;
  }

  const rows = zatvorene
    .map((pozajmica) => {
      // Koristi pravi naziv kolone iz baze - datum_izdavanja
      const datumField = pozajmica.datum_izdavanja || pozajmica.created_at;
      const datumPozajmice = datumField
        ? new Date(datumField).toLocaleDateString("sr-RS")
        : "N/A";
      const datumZatvaranja = pozajmica.datum_zatvaranja
        ? new Date(pozajmica.datum_zatvaranja).toLocaleDateString("sr-RS")
        : "N/A";

      // Imena radnika - različite varijante naziva kolona
      const radnikIme = pozajmica.radnik_ime || pozajmica.ime || "N/A";
      const radnikPrezime = pozajmica.radnik_prezime || pozajmica.prezime || "";
      const iznos = parseFloat(pozajmica.iznos || 0);

      return `
        <tr>
          <td>${pozajmica.broj_ugovora || "N/A"}</td>
          <td>${radnikIme} ${radnikPrezime}</td>
          <td>${datumPozajmice}</td>
          <td>${datumZatvaranja}</td>
          <td>${iznos.toFixed(2)}€</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="viewPozajmicaDetalji(${
              pozajmica.id
            })" title="Detalji">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-info" onclick="toggleIstorijaPopracaja(${
              pozajmica.id
            })" title="Istorija povraćaja">
              <i class="fas fa-history"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="kreirajOdlukuPovracaj(${
              pozajmica.id
            })" title="Kreiranje odluke">
              <i class="fas fa-gavel"></i>
            </button>
            <button class="btn btn-sm btn-outline-info" onclick="pregledajUgovor(${
              pozajmica.id
            })" title="Generiši ugovor">
              <i class="fas fa-file-contract"></i>
            </button>
          </td>
        </tr>
        <tr id="istorija-${pozajmica.id}" style="display: none;">
          <td colspan="6" class="bg-light">
            <div class="p-3">
              <h6><i class="fas fa-history me-2"></i>Istorija povraćaja</h6>
              <div id="povracaji-${pozajmica.id}">
                <div class="text-center text-muted">
                  <i class="fas fa-spinner fa-spin"></i> Učitavam povraćaje...
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.innerHTML = rows;
}

function updatePozajmicePillCounts(pozajmice) {
  const aktivne = pozajmice.filter((p) => p.status === "aktivna");
  const zatvorene = pozajmice.filter((p) => p.status === "vraćena");

  // Ažuriraj tekstove tabova
  const aktivneTab = document.querySelector(
    '[data-bs-target="#aktivne-pozajmice"]'
  );
  const zatvoreneTab = document.querySelector(
    '[data-bs-target="#zatvorene-pozajmice"]'
  );

  if (aktivneTab)
    aktivneTab.textContent = `Aktivne pozajmice (${aktivne.length})`;
  if (zatvoreneTab)
    zatvoreneTab.textContent = `Zatvorene pozajmice (${zatvorene.length})`;
}

function getStatusBadge(status) {
  const statusMap = {
    aktivna: '<span class="badge bg-danger">Aktivna</span>',
    vraćena: '<span class="badge bg-success">Vraćena</span>',
  };
  return (
    statusMap[status] || `<span class="badge bg-secondary">${status}</span>`
  );
}

function loadPozajmiceStatistike(firmaId) {
  fetch(`/api/povracaji/statistike/firma/${firmaId}`, {
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        console.warn("Statistike pozajmica nisu dostupne");
        return null;
      }
      return response.json();
    })
    .then((data) => {
      if (data && data.success) {
        pozajmiceStatistike = data.statistike;
        updatePozajmiceStatistike();
      }
    })
    .catch((error) => {
      console.warn("Greška pri učitavanju statistika pozajmica:", error);
    });
}

function updatePozajmiceStatistike() {
  if (pozajmiceStatistike.ukupno_pozajmljeno !== undefined) {
    document.getElementById(
      "ukupnoPozajmljeno"
    ).textContent = `${pozajmiceStatistike.ukupno_pozajmljeno}€`;
  }
  if (pozajmiceStatistike.ukupno_vraceno !== undefined) {
    document.getElementById(
      "ukupnoVraceno"
    ).textContent = `${pozajmiceStatistike.ukupno_vraceno}€`;
  }
  if (pozajmiceStatistike.ukupno_preostalo !== undefined) {
    document.getElementById(
      "ukupnoPreostalo"
    ).textContent = `${pozajmiceStatistike.ukupno_preostalo}€`;
  }
  if (pozajmiceStatistike.ukupno_pozajmica !== undefined) {
    document.getElementById("brojPozajmica").textContent =
      pozajmiceStatistike.ukupno_pozajmica;
  }
}

// Pozajmice CRUD funkcije
async function dodajNovuPozajmnicu() {
  try {
    // Resetuj form za dodavanje nove pozajmice
    const form = document.getElementById("pozajmicaForm");
    if (form) form.reset();

    // Učitaj radnike prije otvaranja modala
    await loadRadniciForPozajmiceModal();

    // Postavi današnji datum kao default
    const today = new Date().toISOString().split("T")[0];
    const datumInput = document.getElementById("datum_izdavanja"); // Ispravljen ID
    if (datumInput) datumInput.value = today;

    // Generiši sledeći broj ugovora
    try {
      const nextBrojResponse = await fetch("/api/pozajmice/next-broj", {
        credentials: "include",
      });
      if (nextBrojResponse.ok) {
        const data = await nextBrojResponse.json();
        const brojInput = document.getElementById("broj_ugovora");
        if (brojInput) brojInput.value = data.nextBrojUgovora;
      }
    } catch (error) {
      console.warn("Greška pri generisanju broja ugovora:", error);
    }

    // Otvori modal
    const modal = new bootstrap.Modal(
      document.getElementById("pozajmicaModal")
    );
    modal.show();
  } catch (error) {
    console.error("Greška pri otvaranju pozajmice modala:", error);
    alert("Greška pri otvaranju modala za pozajmicu!");
  }
}

async function loadRadniciForPozajmiceModal() {
  try {
    const response = await fetch(`/api/radnici/firma/${currentFirmaId}`, {
      credentials: "include",
    });
    const radnici = await response.json();

    const select = document.getElementById("radnik_id");
    if (!select) return;

    select.innerHTML = '<option value="">Izaberite radnika...</option>';

    radnici.forEach((radnik) => {
      select.innerHTML += `<option value="${radnik.id}">${radnik.ime} ${radnik.prezime}</option>`;
    });
  } catch (error) {
    console.error("Greška pri učitavanju radnika za pozajmice:", error);
  }
}

async function submitPozajmica() {
  try {
    const form = document.getElementById("pozajmicaForm");
    const formData = new FormData(form);

    const pozajmicaData = {
      firma_id: currentFirmaId,
      radnik_id: formData.get("radnik_id"),
      broj_ugovora: formData.get("broj_ugovora"),
      datum_izdavanja: formData.get("datum_izdavanja"),
      iznos: parseFloat(formData.get("iznos")),
      svrha: formData.get("svrha"),
      datum_dospeca: formData.get("datum_dospeca") || null,
      napomene: formData.get("napomene") || null,
    };

    console.log("Šalje se pozajmica sa podacima:", pozajmicaData);

    const response = await fetch("/api/pozajmice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(pozajmicaData),
    });

    const result = await response.json();
    console.log("Odgovor servera:", result);

    if (response.ok && result.success) {
      alert("Pozajmica je uspešno kreirana!");

      // Zatvori modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("pozajmicaModal")
      );
      modal.hide();

      // Reload pozajmice
      loadPozajmice(currentFirmaId);
    } else {
      alert(
        "Greška pri kreiranju pozajmice: " + (result.message || result.error)
      );
    }
  } catch (error) {
    console.error("Greška pri slanju pozajmice:", error);
    alert("Greška pri kreiranju pozajmice!");
  }
}

function viewPozajmicaDetalji(pozajmicaId) {
  const pozajmica = allPozajmice.find((p) => p.id == pozajmicaId);

  if (!pozajmica) {
    alert("Greška: Pozajmica nije pronađena");
    return;
  }

  // Popuni modal sa podacima
  populatePozajmicaModal(pozajmica);

  // Prikaži modal
  const modal = new bootstrap.Modal(
    document.getElementById("pozajmicaDetaljModal")
  );
  modal.show();
}

function populatePozajmicaModal(pozajmica) {
  // Osnovni podaci
  document.getElementById("modalPozajmicaBroj").textContent =
    pozajmica.broj_ugovora || "N/A";

  // Imena radnika - različite varijante naziva kolona
  const radnikIme = pozajmica.radnik_ime || pozajmica.ime || "N/A";
  const radnikPrezime = pozajmica.radnik_prezime || pozajmica.prezime || "";
  document.getElementById(
    "modalPozajmicaRadnik"
  ).textContent = `${radnikIme} ${radnikPrezime}`;

  // Datum izdavanja - koristi pravi naziv kolone
  const datumField = pozajmica.datum_izdavanja || pozajmica.created_at;
  const datumPozajmice = datumField
    ? new Date(datumField).toLocaleDateString("sr-RS")
    : "N/A";
  document.getElementById("modalPozajmicaDatum").textContent = datumPozajmice;

  const iznos = parseFloat(pozajmica.iznos || 0);
  document.getElementById("modalPozajmicaIznos").textContent = `${iznos.toFixed(
    2
  )}€`;
  document.getElementById("modalPozajmicaSvrha").textContent =
    pozajmica.svrha || "N/A";

  // Koristi pravu kolonu preostalo_dugovanje
  const preostaloDugovanje = parseFloat(pozajmica.preostalo_dugovanje || 0);
  document.getElementById(
    "modalPozajmicaPreostalo"
  ).textContent = `${preostaloDugovanje.toFixed(2)}€`;

  const statusBadge = getStatusBadge(pozajmica.status || "aktivna");
  document.getElementById("modalPozajmicaStatus").innerHTML = statusBadge;
}

async function dodajPovracaj(pozajmicaId) {
  try {
    // Resetuj form
    const form = document.getElementById("povracajForm");
    if (form) form.reset();

    // Postavi pozajmica ID
    document.getElementById("pozajmica_id").value = pozajmicaId;

    // Postavi današnji datum
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("datum_povracaja").value = today;

    // Otvori modal
    const modal = new bootstrap.Modal(document.getElementById("povracajModal"));
    modal.show();
  } catch (error) {
    console.error("Greška pri otvaranju povraćaj modala:", error);
    alert("Greška pri otvaranju modala za povraćaj!");
  }
}

async function submitPovracaj() {
  try {
    const form = document.getElementById("povracajForm");
    const formData = new FormData(form);

    const povracajData = {
      pozajmica_id: formData.get("pozajmica_id"),
      datum_povracaja: formData.get("datum_povracaja"),
      iznos_povracaja: formData.get("iznos_povracaja"),
      napomena: formData.get("napomena"),
    };

    const response = await fetch("/api/povracaji", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(povracajData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert("Povraćaj je uspešno evidentiran!");

      // Zatvori modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("povracajModal")
      );
      modal.hide();

      // Reload pozajmice
      loadPozajmice(currentFirmaId);
    } else {
      alert(
        "Greška pri evidentiranju povraćaja: " +
          (result.message || result.error)
      );
    }
  } catch (error) {
    console.error("Greška pri slanju povraćaja:", error);
    alert("Greška pri evidentiranju povraćaja!");
  }
}

function pregledajUgovor(pozajmicaId) {
  console.log("=== PREGLED UGOVORA ===");
  console.log("pozajmicaId:", pozajmicaId);
  console.log("firmaId:", currentFirmaId);

  if (!pozajmicaId) {
    alert("Greška: pozajmicaId je undefined ili null");
    return;
  }

  const url = `/ugovor-o-zajmu-novca.html?pozajmnicaId=${pozajmicaId}&firmaId=${currentFirmaId}`;
  console.log("Opening URL:", url);
  window.open(url, "_blank");
}

function editPozajmica(pozajmicaId) {
  // TODO: Implementirati edit pozajmice
  alert("Edit pozajmice funkcionalnost će biti implementirana");
}

async function deletePozajmica(pozajmicaId) {
  const pozajmica = allPozajmice.find((p) => p.id == pozajmicaId);

  if (!pozajmica) {
    alert("Greška: Pozajmica nije pronađena");
    return;
  }

  const confirmMessage = `Da li ste sigurni da želite da obrišete pozajmnicu:\n\nBroj ugovora: ${pozajmica.broj_ugovora}\nIznos: ${pozajmica.iznos}€\n\nOva akcija se ne može vratiti!`;

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    const response = await fetch(`/api/pozajmice/${pozajmicaId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      alert("Pozajmica je uspešno obrisana!");
      loadPozajmice(currentFirmaId);
    } else {
      alert("Greška pri brisanju pozajmice: " + data.message);
    }
  } catch (error) {
    console.error("Greška pri brisanju pozajmice:", error);
    alert("Greška pri brisanju pozajmice!");
  }
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

// Funkcija za uređivanje trenutne firme
function editCurrentFirma() {
  if (!currentFirmaPib) {
    console.error("PIB firme nije dostupan");
    alert("Greška: PIB firme nije dostupan");
    return;
  }

  // Preusmeri na edit-firmu.html sa PIB parametrom
  window.location.href = `/edit-firmu.html?pib=${currentFirmaPib}`;
}

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

// =============================================================================
// POVRAĆAJI FUNKCIONALNOST
// =============================================================================

// Funkcija za prikazivanje/sakrivanje istorije povraćaja
async function toggleIstorijaPopracaja(pozajmicaId) {
  const istorijaRow = document.getElementById(`istorija-${pozajmicaId}`);

  if (istorijaRow.style.display === "none") {
    istorijaRow.style.display = "table-row";
    // Učitaj povraćaje ako nisu već učitani
    await loadPovracajeForPozajmica(pozajmicaId);
  } else {
    istorijaRow.style.display = "none";
  }
}

// Funkcija za učitavanje povraćaja za pozajmicu
async function loadPovracajeForPozajmica(pozajmicaId) {
  try {
    const response = await fetch(`/api/povracaji/pozajmica/${pozajmicaId}`, {
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      renderPovracajeList(pozajmicaId, data.povracaji || []);
    } else {
      renderPovracajeList(pozajmicaId, []);
    }
  } catch (error) {
    console.error("Greška pri učitavanju povraćaja:", error);
    renderPovracajeList(pozajmicaId, []);
  }
}

// Funkcija za renderovanje liste povraćaja
function renderPovracajeList(pozajmicaId, povracaji) {
  const container = document.getElementById(`povracaji-${pozajmicaId}`);

  if (povracaji.length === 0) {
    container.innerHTML =
      '<div class="alert alert-light">Nema zabeleženih povraćaja.</div>';
    return;
  }

  let html = "";
  povracaji.forEach((povracaj) => {
    const datumPovracaja = new Date(
      povracaj.datum_povracaja
    ).toLocaleDateString("sr-RS");
    html += `
      <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
        <div>
          <strong>${povracaj.iznos_povracaja}€</strong> - ${datumPovracaja}
          ${
            povracaj.napomena
              ? `<br><small class="text-muted">${povracaj.napomena}</small>`
              : ""
          }
        </div>
        <div>
          <button class="btn btn-danger btn-sm" onclick="obrisiPovracaj(${
            povracaj.id
          })" title="Obriši povraćaj">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Funkcija za brisanje povraćaja
async function obrisiPovracaj(povracajId) {
  if (!confirm("Da li ste sigurni da želite da obrišete ovaj povraćaj?")) {
    return;
  }

  try {
    const response = await fetch(`/api/povracaji/${povracajId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const result = await response.json();

    if (result.success) {
      // Osvezi prikaz pozajmica
      loadPozajmice(currentFirmaId);
      alert("Povraćaj je uspešno obrisan!");
    } else {
      alert(
        "Greška pri brisanju povraćaja: " + (result.message || result.error)
      );
    }
  } catch (error) {
    console.error("Greška pri brisanju povraćaja:", error);
    alert("Greška pri brisanju povraćaja!");
  }
}

// Funkcija za kreiranje odluke o povraćaju
async function kreirajOdlukuPovracaj(pozajmicaId) {
  try {
    const pozajmica = allPozajmice.find((p) => p.id == pozajmicaId);

    if (!pozajmica) {
      alert("Pozajmica nije pronađena");
      return;
    }

    // Učitaj povraćaje direktno iz API-ja
    const response = await fetch(`/api/povracaji/pozajmica/${pozajmicaId}`, {
      credentials: "include",
    });
    const data = await response.json();
    const povracaji = data.success ? data.povracaji : [];

    if (!povracaji || povracaji.length === 0) {
      alert(
        "Ne možete kreirati odluku jer pozajmica nema evidentirane povraćaje"
      );
      return;
    }

    // Uzmi poslednji povraćaj (najnoviji)
    const poslednjiPovracaj = povracaji.sort(
      (a, b) => new Date(b.datum_povracaja) - new Date(a.datum_povracaja)
    )[0];

    if (!poslednjiPovracaj) {
      alert("Ne možete kreirati odluku jer pozajmica nema validne povraćaje");
      return;
    }

    // Otvori odluku u novom tabu
    const url = `/odluka-o-povracaju.html?povracajId=${poslednjiPovracaj.id}`;
    window.open(url, "_blank");
  } catch (error) {
    console.error("Greška pri otvaranju odluke:", error);
    alert("Greška pri otvaranju odluke o povraćaju");
  }
}

// =============================================================================
// TODO LISTA FUNKCIONALNOST
// =============================================================================

// Globalna varijabla za čuvanje zadataka
let zadaciData = [];

// Funkcija za učitavanje zadataka firme
async function loadZadaci(firmaId) {
  try {
    const response = await fetch(`/api/zadaci/${firmaId}`);
    if (response.ok) {
      zadaciData = await response.json();
      renderZadaci();
    } else {
      console.error("Greška pri učitavanju zadataka");
      document.getElementById("zadaciLista").innerHTML =
        '<div class="text-center text-muted py-4"><p>Nema zadataka za ovu firmu</p></div>';
    }
  } catch (error) {
    console.error("Greška:", error);
    document.getElementById("zadaciLista").innerHTML =
      '<div class="text-center text-muted py-4"><p>Greška pri učitavanju zadataka</p></div>';
  }
}

// Funkcija za renderovanje zadataka u HTML
function renderZadaci() {
  const container = document.getElementById("zadaciLista");

  if (zadaciData.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-4">
        <i class="fas fa-clipboard-list fa-2x mb-2"></i>
        <p>Nema zadataka. Dodajte prvi zadatak!</p>
      </div>
    `;
    return;
  }

  const zadaciHTML = zadaciData
    .map(
      (zadatak) => `
    <div class="todo-item ${zadatak.je_zavrsen ? "completed" : ""}" data-id="${
        zadatak.id
      }">
      <div class="d-flex align-items-center">
        <input 
          type="checkbox" 
          class="form-check-input todo-checkbox" 
          ${zadatak.je_zavrsen ? "checked" : ""} 
          onchange="toggleZadatak(${zadatak.id})"
        >
        <p class="todo-text">${escapeHtml(zadatak.tekst_zadatka)}</p>
        <span class="todo-delete" onclick="obrisiZadatak(${
          zadatak.id
        })" title="Obriši zadatak">
          <i class="fas fa-trash"></i>
        </span>
      </div>
    </div>
  `
    )
    .join("");

  container.innerHTML = zadaciHTML;
}

// Funkcija za dodavanje novog zadatka
async function dodajZadatak() {
  const input = document.getElementById("noviZadatak");
  const tekst = input.value.trim();

  if (!tekst) {
    alert("Unesite tekst zadatka");
    return;
  }

  if (!currentFirmaId) {
    alert("Greška: nije izabrana firma");
    return;
  }

  try {
    const response = await fetch("/api/zadaci", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firma_id: currentFirmaId,
        tekst_zadatka: tekst,
      }),
    });

    if (response.ok) {
      const noviZadatak = await response.json();
      zadaciData.push(noviZadatak);
      renderZadaci();
      input.value = "";
    } else {
      alert("Greška pri dodavanju zadatka");
    }
  } catch (error) {
    console.error("Greška:", error);
    alert("Greška pri dodavanju zadatka");
  }
}

// Funkcija za označavanje/odznačavanje zadatka kao završen
async function toggleZadatak(id) {
  const zadatak = zadaciData.find((z) => z.id === id);
  if (!zadatak) return;

  const novoStanje = !zadatak.je_zavrsen;

  try {
    const response = await fetch(`/api/zadaci/${id}/toggle`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        je_zavrsen: novoStanje,
      }),
    });

    if (response.ok) {
      zadatak.je_zavrsen = novoStanje;
      if (novoStanje) {
        zadatak.datum_zavrsen = new Date().toISOString();
      } else {
        zadatak.datum_zavrsen = null;
      }
      renderZadaci();
    } else {
      alert("Greška pri ažuriranju zadatka");
      // Vrati checkbox na prethodno stanje
      const checkbox = document.querySelector(
        `[data-id="${id}"] .todo-checkbox`
      );
      if (checkbox) checkbox.checked = zadatak.je_zavrsen;
    }
  } catch (error) {
    console.error("Greška:", error);
    alert("Greška pri ažuriranju zadatka");
  }
}

// Funkcija za brisanje zadatka
async function obrisiZadatak(id) {
  if (!confirm("Da li ste sigurni da želite da obrišete ovaj zadatak?")) {
    return;
  }

  try {
    const response = await fetch(`/api/zadaci/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      zadaciData = zadaciData.filter((z) => z.id !== id);
      renderZadaci();
    } else {
      alert("Greška pri brisanju zadatka");
    }
  } catch (error) {
    console.error("Greška:", error);
    alert("Greška pri brisanju zadatka");
  }
}

// Pomoćna funkcija za escape HTML karaktera
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Globalna funkcija za toggle datum prestanka u edit modalu
function toggleEditDatumPrestanka() {
  const tipUgovora = document.getElementById("edit_tip_ugovora").value;
  const datumPrestankaGroup = document.getElementById(
    "edit_datum_prestanka_group"
  );

  if (tipUgovora === "na_odredjeno") {
    datumPrestankaGroup.style.display = "block";
    document.getElementById("edit_datum_prestanka").required = true;
  } else {
    datumPrestankaGroup.style.display = "none";
    document.getElementById("edit_datum_prestanka").required = false;
    document.getElementById("edit_datum_prestanka").value = "";
  }
}

// =============================================================================
// ODLUKA O RASPOREDU RADNOG VREMENA
// =============================================================================

function openOdlukaRaspored() {
  if (!currentFirmaId) {
    showError("Greška: Nedostaje ID firme");
    return;
  }

  // Otvori modal za konfiguraciju odluke o rasporedu radnog vremena
  openOdlukaModal();
}

// Otvaranje modala za konfiguraciju odluke
function openOdlukaModal() {
  // Postavi današnji datum kao default
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("odlukaDecisionDate").value = today;
  document.getElementById("odlukaPeriodStart").value = today;

  // Postavi datum kraja kao 6 meseci od danas
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
  document.getElementById("odlukaPeriodEnd").value = sixMonthsLater
    .toISOString()
    .split("T")[0];

  // Učitaj radnike trenutne firme
  loadWorkersForOdlukaModal();

  // Setup event listeneri za radio dugmad
  document
    .querySelectorAll('input[name="odlukaShiftAssignment"]')
    .forEach((radio) => {
      radio.addEventListener("change", function () {
        const manualDiv = document.getElementById("odlukaManualAssignment");
        if (this.value === "manual") {
          manualDiv.classList.remove("d-none");
          loadWorkersForOdlukaManualAssignment();
        } else {
          manualDiv.classList.add("d-none");
        }
      });
    });

  // Otvori modal
  const modal = new bootstrap.Modal(
    document.getElementById("odlukaRasporedModal")
  );
  modal.show();
}

// Učitavanje radnika za modal
async function loadWorkersForOdlukaModal() {
  if (!currentFirmaId) return;

  try {
    const response = await fetch(`/api/radnici/firma/${currentFirmaId}`);
    const workers = await response.json();

    // Filtriraj samo aktivne radnike
    const activeWorkers = workers.filter(
      (worker) => worker.status === "aktivan"
    );

    // Sacuvaj radnike u globalnoj promenljivoj
    window.odlukaWorkers = activeWorkers;

    console.log("Učitani radnici za odluku:", activeWorkers);
  } catch (error) {
    console.error("Greška pri učitavanju radnika:", error);
  }
}

// Učitavanje radnika za ručnu dodelu u modalu
function loadWorkersForOdlukaManualAssignment() {
  const workerList = document.getElementById("odlukaWorkerList");
  if (!workerList || !window.odlukaWorkers) return;

  workerList.innerHTML = "";

  window.odlukaWorkers.forEach((worker) => {
    const workerDiv = document.createElement("div");
    workerDiv.className =
      "d-flex justify-content-between align-items-center mb-2 p-2 border rounded";

    workerDiv.innerHTML = `
      <div>
        <strong>${worker.prezime} ${worker.ime}</strong><br>
        <small class="text-muted">${
          worker.pozicija_naziv || "Nema poziciju"
        }</small>
      </div>
      <select class="form-select form-select-sm" data-worker-id="${
        worker.id
      }" style="width: 150px;">
        <option value="alternate">Naizmenično</option>
        <option value="first">Uvek prva smjena</option>
        <option value="second">Uvek druga smjena</option>
        <option value="empty">Prazno</option>
      </select>
    `;

    workerList.appendChild(workerDiv);
  });
}

// Generisanje odluke o rasporedu
function generateOdlukaRaspored() {
  const decisionDate = document.getElementById("odlukaDecisionDate").value;
  const periodStart = document.getElementById("odlukaPeriodStart").value;
  const periodEnd = document.getElementById("odlukaPeriodEnd").value;
  const firstShiftTime = document.getElementById("odlukaFirstShift").value;
  const secondShiftTime = document.getElementById("odlukaSecondShift").value;
  const assignmentType = document.querySelector(
    'input[name="odlukaShiftAssignment"]:checked'
  ).value;

  if (!decisionDate || !periodStart || !periodEnd) {
    alert("Molimo popunite sva obavezna polja.");
    return;
  }

  // Pripremi parametre za URL
  const params = new URLSearchParams({
    firmaId: currentFirmaId,
    decisionDate: decisionDate,
    periodStart: periodStart,
    periodEnd: periodEnd,
    firstShiftTime: firstShiftTime,
    secondShiftTime: secondShiftTime,
    assignmentType: assignmentType,
  });

  // Ako je ručna dodela, dodaj i podatke o radnicima
  if (assignmentType === "manual") {
    const workerAssignments = {};
    document.querySelectorAll("#odlukaWorkerList select").forEach((select) => {
      const workerId = select.getAttribute("data-worker-id");
      const assignment = select.value;
      workerAssignments[workerId] = assignment;
    });
    params.append("workerAssignments", JSON.stringify(workerAssignments));
  }

  // Zatvori modal
  const modal = bootstrap.Modal.getInstance(
    document.getElementById("odlukaRasporedModal")
  );
  modal.hide();

  // Otvori stranicu odluke sa parametrima
  window.open(
    `odluka-raspored-radnog-vremena.html?${params.toString()}`,
    "_blank"
  );
}

// =============================================================================
// FUNKCIJE ZA ODLUKU O RASPOREDU RADNOG VREMENA (za odluka-raspored-radnog-vremena.html)
// =============================================================================

// Promenljive za odluku o rasporedu
let companies = [];
let workers = [];
let selectedWorkers = [];

// Inicijalizacija stranice odluke o rasporedu radnog vremena
function initOdlukaRaspored() {
  // Provjeri URL parametre
  const urlParams = new URLSearchParams(window.location.search);
  const firmaId = urlParams.get("firmaId");
  const decisionDate = urlParams.get("decisionDate");
  const periodStart = urlParams.get("periodStart");
  const periodEnd = urlParams.get("periodEnd");
  const firstShiftTime = urlParams.get("firstShiftTime");
  const secondShiftTime = urlParams.get("secondShiftTime");
  const assignmentType = urlParams.get("assignmentType");
  const workerAssignments = urlParams.get("workerAssignments");

  if (firmaId && decisionDate && periodStart && periodEnd) {
    // Automatski generiši odluku na osnovu prosleđenih parametara
    loadCompanyAndGenerateOdluka(firmaId, {
      decisionDate,
      periodStart,
      periodEnd,
      firstShiftTime: firstShiftTime || "07:00 do 14:00h",
      secondShiftTime: secondShiftTime || "14:00 do 20:00h",
      assignmentType: assignmentType || "alternate",
      workerAssignments: workerAssignments
        ? JSON.parse(workerAssignments)
        : null,
    });
  }
}

// Učitaj firmu i generiši odluku
async function loadCompanyAndGenerateOdluka(firmaId, config) {
  try {
    // Učitaj podatke firme
    const companyResponse = await fetch(`/api/firme/id/${firmaId}`);
    const company = await companyResponse.json();

    // Učitaj radnike firme
    const workersResponse = await fetch(`/api/radnici/firma/${firmaId}`);
    const allWorkers = await workersResponse.json();
    const activeWorkers = allWorkers.filter(
      (worker) => worker.status === "aktivan"
    );

    // Popuni osnovne podatke
    fillBasicInfoFromConfig(company, config);

    // Generiši tabelu radnika
    generateWorkersTableFromConfig(activeWorkers, config);
  } catch (error) {
    console.error("Greška pri učitavanju podataka:", error);
    alert("Greška pri učitavanju podataka firme.");
  }
}

// Popunjavanje osnovnih informacija iz konfiguracije
function fillBasicInfoFromConfig(company, config) {
  // Format datuma
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("sr-RS");
  };

  // Popuni nazive firme
  const companyNames = ["company-name", "company-name-2", "company-name-3"];
  companyNames.forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.textContent = company.naziv;
  });

  // Popuni lokaciju
  const companyLocations = ["company-location", "company-location-2"];
  companyLocations.forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.textContent = company.grad || "Bar";
  });

  // Popuni datum odluke
  const decisionElement = document.getElementById("decision-date");
  if (decisionElement)
    decisionElement.textContent = formatDate(config.decisionDate);

  // Popuni period
  const periodStartElement = document.getElementById("period-start");
  const periodEndElement = document.getElementById("period-end");
  if (periodStartElement)
    periodStartElement.textContent = formatDate(config.periodStart);
  if (periodEndElement)
    periodEndElement.textContent = formatDate(config.periodEnd);

  // Popuni vremena smjena
  const firstShiftElement = document.getElementById("first-shift-time");
  const secondShiftElement = document.getElementById("second-shift-time");
  if (firstShiftElement) firstShiftElement.textContent = config.firstShiftTime;
  if (secondShiftElement)
    secondShiftElement.textContent = config.secondShiftTime;

  // Popuni ime direktora
  const directorElement = document.getElementById("director-name");
  if (directorElement)
    directorElement.textContent =
      company.direktor_ime_prezime || "Selloviq Isat";

  // Generiši broj odluke (npr. 001/2024)
  const year = new Date(config.decisionDate).getFullYear();
  const companyNumber = String(company.id).padStart(3, "0");
  const companyNumberElement = document.getElementById("company-number");
  if (companyNumberElement)
    companyNumberElement.textContent = `${companyNumber}/${year}`;
}

// Generisanje tabele radnika iz konfiguracije
function generateWorkersTableFromConfig(workers, config) {
  const tbody = document.getElementById("schedule-table-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (workers.length === 0) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 9;
    cell.style.textAlign = "center";
    cell.style.padding = "20px";
    cell.textContent = "Nema aktivnih radnika u odabranoj firmi.";
    return;
  }

  workers.forEach((worker, index) => {
    const row = tbody.insertRow();

    // Ime i prezime
    const nameCell = row.insertCell();
    nameCell.className = "name-column";
    nameCell.textContent = `${worker.prezime} ${worker.ime}`;

    // Radno mesto
    const positionCell = row.insertCell();
    positionCell.className = "position-column";
    positionCell.textContent = worker.pozicija_naziv || "Nema poziciju";

    // Dani u sedmici (Ponedeljak - Nedelja)
    const days = [
      "Ponedeljak",
      "Utorak",
      "Sreda",
      "Četvrtak",
      "Petak",
      "Subota",
      "Nedelja",
    ];

    days.forEach((day, dayIndex) => {
      const dayCell = row.insertCell();
      dayCell.className = "shift-cell";

      let shiftText = "";
      let shiftClass = "";

      if (config.assignmentType === "empty") {
        shiftText = "";
      } else if (config.assignmentType === "alternate") {
        if (dayIndex === 6) {
          // Nedelja
          shiftText = "/";
        } else {
          // Naizmenično: parni dani prva smjena, neparni druga smjena
          if ((index + dayIndex) % 2 === 0) {
            shiftText = "I smjena";
            shiftClass = "first-shift";
          } else {
            shiftText = "II smjena";
            shiftClass = "second-shift";
          }
        }
      } else if (
        config.assignmentType === "manual" &&
        config.workerAssignments
      ) {
        // Ručna dodela
        const assignment = config.workerAssignments[worker.id];
        if (dayIndex === 6) {
          // Nedelja
          shiftText = "/";
        } else if (assignment === "first") {
          shiftText = "I smjena";
          shiftClass = "first-shift";
        } else if (assignment === "second") {
          shiftText = "II smjena";
          shiftClass = "second-shift";
        } else if (assignment === "alternate") {
          if ((index + dayIndex) % 2 === 0) {
            shiftText = "I smjena";
            shiftClass = "first-shift";
          } else {
            shiftText = "II smjena";
            shiftClass = "second-shift";
          }
        }
      }

      dayCell.textContent = shiftText;
      if (shiftClass) {
        dayCell.classList.add(shiftClass);
      }
    });
  });
}

// Učitavanje firmi za odluku
async function loadCompaniesForOdluka() {
  try {
    const response = await fetch("/api/firme");
    companies = await response.json();

    const select = document.getElementById("companySelect");
    if (select) {
      select.innerHTML = '<option value="">-- Izaberite firmu --</option>';

      companies.forEach((company) => {
        const option = document.createElement("option");
        option.value = company.id;
        option.textContent = company.naziv;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Greška pri učitavanju firmi:", error);
  }
}

// Učitavanje radnika za odluku
async function loadWorkersForOdluka() {
  const companyId = document.getElementById("companySelect").value;
  if (!companyId) return;

  try {
    const response = await fetch(`/api/radnici/firma/${companyId}`);
    workers = await response.json();

    // Filtriraj samo aktivne radnike
    workers = workers.filter((worker) => worker.status === "aktivan");

    console.log("Učitani radnici:", workers);
  } catch (error) {
    console.error("Greška pri učitavanju radnika:", error);
  }
}

// Učitavanje radnika za ručnu dodelu
function loadWorkersForManualAssignment() {
  const workerList = document.getElementById("workerList");
  if (!workerList) return;

  workerList.innerHTML = "";

  workers.forEach((worker) => {
    const workerDiv = document.createElement("div");
    workerDiv.className = "worker-item";

    workerDiv.innerHTML = `
      <div>
        <span class="worker-name">${worker.prezime} ${worker.ime}</span><br>
        <small>${worker.pozicija_naziv || "Nema poziciju"}</small>
      </div>
      <select class="shift-select" data-worker-id="${worker.id}">
        <option value="alternate">Naizmenično</option>
        <option value="first">Uvek prva smjena</option>
        <option value="second">Uvek druga smjena</option>
        <option value="empty">Prazno</option>
      </select>
    `;

    workerList.appendChild(workerDiv);
  });
}

// Otvaranje modala
function openConfigModal() {
  const modal = document.getElementById("configModal");
  if (modal) {
    modal.style.display = "block";
  }
}

// Zatvaranje modala
function closeConfigModal() {
  const modal = document.getElementById("configModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// Generisanje rasporea
function generateSchedule() {
  const companyId = document.getElementById("companySelect").value;
  const decisionDate = document.getElementById("decisionDate").value;
  const periodStart = document.getElementById("periodStart").value;
  const periodEnd = document.getElementById("periodEnd").value;
  const firstShiftTime = document.getElementById("firstShiftTime").value;
  const secondShiftTime = document.getElementById("secondShiftTime").value;
  const assignmentType = document.querySelector(
    'input[name="shiftAssignment"]:checked'
  ).value;

  if (!companyId || !decisionDate || !periodStart || !periodEnd) {
    alert("Molimo popunite sva obavezna polja.");
    return;
  }

  // Pronađi odabranu firmu
  const selectedCompany = companies.find((c) => c.id == companyId);
  if (!selectedCompany) {
    alert("Firma nije pronađena.");
    return;
  }

  // Popuni osnovne podatke
  fillBasicInfo(
    selectedCompany,
    decisionDate,
    periodStart,
    periodEnd,
    firstShiftTime,
    secondShiftTime
  );

  // Generiši tabelu radnika
  generateWorkersTable(assignmentType);

  // Zatvori modal
  closeConfigModal();
}

// Popunjavanje osnovnih informacija
function fillBasicInfo(
  company,
  decisionDate,
  periodStart,
  periodEnd,
  firstShiftTime,
  secondShiftTime
) {
  // Format datuma
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("sr-RS");
  };

  // Popuni nazive firme
  const companyNames = ["company-name", "company-name-2", "company-name-3"];
  companyNames.forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.textContent = company.naziv;
  });

  // Popuni lokaciju
  const companyLocations = ["company-location", "company-location-2"];
  companyLocations.forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.textContent = company.grad || "Bar";
  });

  // Popuni datum odluke
  const decisionElement = document.getElementById("decision-date");
  if (decisionElement) decisionElement.textContent = formatDate(decisionDate);

  // Popuni period
  const periodStartElement = document.getElementById("period-start");
  const periodEndElement = document.getElementById("period-end");
  if (periodStartElement)
    periodStartElement.textContent = formatDate(periodStart);
  if (periodEndElement) periodEndElement.textContent = formatDate(periodEnd);

  // Popuni vremena smjena
  const firstShiftElement = document.getElementById("first-shift-time");
  const secondShiftElement = document.getElementById("second-shift-time");
  if (firstShiftElement) firstShiftElement.textContent = firstShiftTime;
  if (secondShiftElement) secondShiftElement.textContent = secondShiftTime;

  // Popuni ime direktora
  const directorElement = document.getElementById("director-name");
  if (directorElement)
    directorElement.textContent =
      company.direktor_ime_prezime || "Selloviq Isat";

  // Generiši broj odluke (npr. 001/2024)
  const year = new Date(decisionDate).getFullYear();
  const companyNumber = String(company.id).padStart(3, "0");
  const companyNumberElement = document.getElementById("company-number");
  if (companyNumberElement)
    companyNumberElement.textContent = `${companyNumber}/${year}`;
}

// Generisanje tabele radnika
function generateWorkersTable(assignmentType) {
  const tbody = document.getElementById("schedule-table-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (workers.length === 0) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 9;
    cell.style.textAlign = "center";
    cell.style.padding = "20px";
    cell.textContent = "Nema aktivnih radnika u odabranoj firmi.";
    return;
  }

  workers.forEach((worker, index) => {
    const row = tbody.insertRow();

    // Ime i prezime
    const nameCell = row.insertCell();
    nameCell.className = "name-column";
    nameCell.textContent = `${worker.prezime} ${worker.ime}`;

    // Radno mesto
    const positionCell = row.insertCell();
    positionCell.className = "position-column";
    positionCell.textContent = worker.pozicija_naziv || "Nema poziciju";

    // Dani u sedmici (Ponedeljak - Nedelja)
    const days = [
      "Ponedeljak",
      "Utorak",
      "Sreda",
      "Četvrtak",
      "Petak",
      "Subota",
      "Nedelja",
    ];

    days.forEach((day, dayIndex) => {
      const dayCell = row.insertCell();
      dayCell.className = "shift-cell";

      let shiftText = "";
      let shiftClass = "";

      if (assignmentType === "empty") {
        shiftText = "";
      } else if (assignmentType === "alternate") {
        if (dayIndex === 6) {
          // Nedelja
          shiftText = "/";
        } else {
          // Naizmenično: parni dani prva smjena, neparni druga smjena
          if ((index + dayIndex) % 2 === 0) {
            shiftText = "I smjena";
            shiftClass = "first-shift";
          } else {
            shiftText = "II smjena";
            shiftClass = "second-shift";
          }
        }
      } else if (assignmentType === "manual") {
        // Pronađi ručnu dodelu za ovog radnika
        const workerSelect = document.querySelector(
          `select[data-worker-id="${worker.id}"]`
        );
        if (workerSelect) {
          const assignment = workerSelect.value;
          if (dayIndex === 6) {
            // Nedelja
            shiftText = "/";
          } else if (assignment === "first") {
            shiftText = "I smjena";
            shiftClass = "first-shift";
          } else if (assignment === "second") {
            shiftText = "II smjena";
            shiftClass = "second-shift";
          } else if (assignment === "alternate") {
            if ((index + dayIndex) % 2 === 0) {
              shiftText = "I smjena";
              shiftClass = "first-shift";
            } else {
              shiftText = "II smjena";
              shiftClass = "second-shift";
            }
          }
        }
      }

      dayCell.textContent = shiftText;
      if (shiftClass) {
        dayCell.classList.add(shiftClass);
      }
    });
  });
}

// PDF Export funkcija
async function downloadPDF() {
  try {
    // Sakrij dugmad tokom snimanja
    const buttons = [
      ".print-button",
      ".pdf-button",
      ".word-button",
      ".configure-button",
    ];
    buttons.forEach((selector) => {
      const button = document.querySelector(selector);
      if (button) button.style.display = "none";
    });

    const { jsPDF } = window.jspdf;
    const element = document.querySelector(".container");

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4"); // Landscape orientation

    const imgWidth = 297; // A4 landscape width
    const pageHeight = 210; // A4 landscape height
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const companyName =
      document.getElementById("company-name")?.textContent || "Firma";
    const decisionDate =
      document.getElementById("decision-date")?.textContent || "Datum";
    const fileName = `Odluka_Raspored_${companyName.replace(
      /\s+/g,
      "_"
    )}_${decisionDate.replace(/\./g, "_")}.pdf`;

    pdf.save(fileName);

    // Pokaži dugmad ponovo
    buttons.forEach((selector) => {
      const button = document.querySelector(selector);
      if (button) button.style.display = "flex";
    });
  } catch (error) {
    console.error("Greška pri kreiranju PDF-a:", error);
    alert("Greška pri kreiranju PDF-a. Pokušajte ponovo.");
    // Pokaži dugmad ponovo u slučaju greške
    const buttons = [
      ".print-button",
      ".pdf-button",
      ".word-button",
      ".configure-button",
    ];
    buttons.forEach((selector) => {
      const button = document.querySelector(selector);
      if (button) button.style.display = "flex";
    });
  }
}

// Word Export funkcija
function downloadWordCompact() {
  try {
    const container = document.querySelector(".container");
    let content = container.innerHTML;

    const companyName =
      document.getElementById("company-name")?.textContent || "Firma";
    const decisionDate =
      document.getElementById("decision-date")?.textContent || "Datum";
    const fileName = `Odluka_Raspored_${companyName.replace(
      /\s+/g,
      "_"
    )}_${decisionDate.replace(/\./g, "_")}.doc`;

    const wordContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Odluka o rasporedu radnog vremena</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          body { 
            font-family: 'Times New Roman', serif; 
            font-size: 11pt;
            line-height: 1.3;
            margin: 0;
            padding: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
          }
          th, td {
            border: 1px solid #000;
            padding: 4px;
            text-align: center;
            vertical-align: middle;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .name-column, .position-column {
            text-align: left;
          }
          .first-shift {
            background-color: #e3f2fd;
          }
          .second-shift {
            background-color: #fff3e0;
          }
          .signature-section {
            margin-top: 30px;
          }
          .signature {
            text-align: center;
            float: right;
            width: 200px;
          }
          .signature-line {
            border-bottom: 1px solid #000;
            margin: 10px 0;
            height: 25px;
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;

    const blob = new Blob([wordContent], {
      type: "application/msword;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Greška pri kreiranju Word dokumenta:", error);
    alert("Greška pri kreiranju Word dokumenta. Pokušajte ponovo.");
  }
}
