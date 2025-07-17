// Globalne varijable
let otkazi = [];
let firme = [];
let originalOtkazi = [];

// DOMContentLoaded event
document.addEventListener("DOMContentLoaded", function () {
  loadOtkazi();
  loadFirme();

  // Event listeneri za filtere
  document
    .getElementById("filterTipOtkaza")
    .addEventListener("change", filterOtkazi);
  document
    .getElementById("filterFirma")
    .addEventListener("change", filterOtkazi);
  document
    .getElementById("searchRadnik")
    .addEventListener("input", filterOtkazi);
});

// Učitavanje otkaza
async function loadOtkazi() {
  try {
    showLoading();
    const response = await fetch("/api/otkazi");
    const data = await response.json();

    if (data.success) {
      otkazi = data.otkazi;
      originalOtkazi = [...otkazi];
      renderOtkazi(otkazi);
    } else {
      console.error("Greška pri učitavanju otkaza:", data.message);
      showNoData();
    }
  } catch (error) {
    console.error("Greška pri učitavanju otkaza:", error);
    showNoData();
  }
}

// Učitavanje firmi za filter
async function loadFirme() {
  try {
    const response = await fetch("/api/firme");
    const data = await response.json();
    firme = data.firme || data;
    populateFirmeFilter();
  } catch (error) {
    console.error("Greška pri učitavanju firmi:", error);
  }
}

// Popunjavanje filter dropdown-a za firme
function populateFirmeFilter() {
  const select = document.getElementById("filterFirma");
  select.innerHTML = '<option value="">Sve firme</option>';

  firme.forEach((firma) => {
    const option = document.createElement("option");
    option.value = firma.id;
    option.textContent = firma.naziv;
    select.appendChild(option);
  });
}

// Renderovanje tabele otkaza
function renderOtkazi(otkaziData) {
  const tbody = document.getElementById("otkaziTableBody");
  tbody.innerHTML = "";

  if (otkaziData.length === 0) {
    showNoData();
    return;
  }

  hideMessages();

  otkaziData.forEach((otkaz) => {
    const row = document.createElement("tr");

    // Formatiranje datuma
    const datumOtkaza = new Date(otkaz.datum_otkaza).toLocaleDateString(
      "sr-RS"
    );
    const datumKreiranja = new Date(otkaz.created_at).toLocaleDateString(
      "sr-RS"
    );

    // Formatiranje tipa otkaza
    const tipOtkazaText = {
      sporazumni_raskid: "Sporazumni raskid",
      istek_ugovora: "Istek ugovora",
    };

    row.innerHTML = `
            <td>
                <strong>${otkaz.ime} ${otkaz.prezime}</strong>
            </td>
            <td>${otkaz.jmbg}</td>
            <td>${otkaz.firma_naziv || "N/A"}</td>
            <td>${otkaz.pozicija_naziv || "N/A"}</td>
            <td>
                <span class="badge ${
                  otkaz.tip_otkaza === "sporazumni_raskid"
                    ? "bg-warning"
                    : "bg-info"
                }">
                    ${tipOtkazaText[otkaz.tip_otkaza] || otkaz.tip_otkaza}
                </span>
            </td>
            <td>${datumOtkaza}</td>
            <td>
                <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${
                  otkaz.razlog_otkaza || "Nije specificiran"
                }">
                    ${otkaz.razlog_otkaza || "Nije specificiran"}
                </div>
            </td>
            <td>${datumKreiranja}</td>
            <td>
                <button onclick="generateOtkazDocument(${otkaz.radnik_id}, '${
      otkaz.tip_otkaza
    }')" 
                        class="btn btn-sm btn-primary" title="Generiši dokument">
                    <i class="fas fa-file-pdf"></i>
                </button>
                <button onclick="deleteOtkaz(${otkaz.id})" 
                        class="btn btn-sm btn-danger ms-1" title="Obriši otkaz">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

    tbody.appendChild(row);
  });
}

// Filtriranje otkaza
function filterOtkazi() {
  const tipOtkaza = document.getElementById("filterTipOtkaza").value;
  const firmaId = document.getElementById("filterFirma").value;
  const searchText = document
    .getElementById("searchRadnik")
    .value.toLowerCase();

  let filteredOtkazi = [...originalOtkazi];

  // Filter po tipu otkaza
  if (tipOtkaza) {
    filteredOtkazi = filteredOtkazi.filter(
      (otkaz) => otkaz.tip_otkaza === tipOtkaza
    );
  }

  // Filter po firmi
  if (firmaId) {
    filteredOtkazi = filteredOtkazi.filter((otkaz) => {
      const firma = firme.find((f) => f.id == firmaId);
      return firma && otkaz.firma_naziv === firma.naziv;
    });
  }

  // Filter po search text-u
  if (searchText) {
    filteredOtkazi = filteredOtkazi.filter((otkaz) => {
      const fullName = `${otkaz.ime} ${otkaz.prezime}`.toLowerCase();
      const jmbg = otkaz.jmbg.toLowerCase();
      return fullName.includes(searchText) || jmbg.includes(searchText);
    });
  }

  renderOtkazi(filteredOtkazi);
}

// Brisanje svih filtera
function clearFilters() {
  document.getElementById("filterTipOtkaza").value = "";
  document.getElementById("filterFirma").value = "";
  document.getElementById("searchRadnik").value = "";
  renderOtkazi(originalOtkazi);
}

// Generisanje dokumenta za otkaz
function generateOtkazDocument(radnikId, tipOtkaza) {
  let documentType;
  if (tipOtkaza === "sporazumni_raskid") {
    documentType = "sporazumni-raskid";
  } else if (tipOtkaza === "istek_ugovora") {
    documentType = "istek-ugovora";
  } else {
    alert("Nepoznat tip otkaza!");
    return;
  }

  // Pronađi otkaz da dobijemo informacije o radniku
  const otkaz = otkazi.find((o) => o.radnik_id == radnikId);
  if (!otkaz) {
    alert("Otkaz nije pronađen!");
    return;
  }

  // Kreiramo URL sa otkazId parametrom da dokument može da učita pravi datum
  const url = `${documentType}.html?radnikId=${radnikId}&firmaId=${
    otkaz.firma_id || ""
  }&otkazId=${otkaz.id}`;
  console.log("Otvaramo otkaz dokument sa URL:", url);
  window.open(url, "_blank");
}

// Brisanje otkaza
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
      loadOtkazi(); // Osvežava listu
    } else {
      alert("Greška pri brisanju otkaza: " + data.message);
    }
  } catch (error) {
    console.error("Greška pri brisanju otkaza:", error);
    alert("Greška pri brisanju otkaza!");
  }
}

// UI helper funkcije
function showLoading() {
  document.getElementById("loadingMessage").style.display = "block";
  document.getElementById("noDataMessage").style.display = "none";
  document.querySelector(".table-responsive").style.display = "none";
}

function showNoData() {
  document.getElementById("loadingMessage").style.display = "none";
  document.getElementById("noDataMessage").style.display = "block";
  document.querySelector(".table-responsive").style.display = "none";
}

function hideMessages() {
  document.getElementById("loadingMessage").style.display = "none";
  document.getElementById("noDataMessage").style.display = "none";
  document.querySelector(".table-responsive").style.display = "block";
}
