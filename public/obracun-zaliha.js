// Obračun zaliha - JavaScript funkcionalnost

// Check if loadNavigation exists before calling
if (typeof loadNavigation === "function") {
  loadNavigation();
} else {
  console.warn("Navigation system not loaded, using fallback");
  // Fallback navigation
  document.getElementById("navigation-container").innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm sticky-top">
      <div class="container-fluid">
        <a class="navbar-brand fw-bold" href="dashboard.html">
          <i class="fas fa-chart-line me-2"></i>Summa Summarum
        </a>
        <div class="navbar-nav ms-auto">
          <a class="nav-link" href="dashboard.html">
            <i class="fas fa-arrow-left me-1"></i>Dashboard
          </a>
        </div>
      </div>
    </nav>
  `;
}

// Form submission handler
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("obracunForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      calculateObracun();
    });
});

function calculateObracun() {
  // Collect form data
  const formData = {
    roba: parseFloat(document.getElementById("roba_duguje").value) || 0,
    uk_pdv_21: parseFloat(document.getElementById("uk_pdv_21").value) || 0,
    uk_pdv_15: parseFloat(document.getElementById("uk_pdv_15").value) || 0,
    uk_pdv_7: parseFloat(document.getElementById("uk_pdv_7").value) || 0,
    uk_razlika: parseFloat(document.getElementById("uk_razlika").value) || 0,
    prihod_21: parseFloat(document.getElementById("prihod_21").value) || 0,
    prihod_15: parseFloat(document.getElementById("prihod_15").value) || 0,
    prihod_7: parseFloat(document.getElementById("prihod_7").value) || 0,
    prihod_0: parseFloat(document.getElementById("prihod_0").value) || 0,
    pdv_21: parseFloat(document.getElementById("pdv_21").value) || 0,
    pdv_15: parseFloat(document.getElementById("pdv_15").value) || 0,
    pdv_7: parseFloat(document.getElementById("pdv_7").value) || 0,
    koeficijent_kalo:
      parseFloat(document.getElementById("koeficijent_kalo").value) || 0,
    stanje_robe_popis:
      parseFloat(document.getElementById("stanje_robe_popis").value) || 0,
  };

  // Send to server for calculation
  fetch("/api/obracun-zaliha", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(formData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        displayResults(data);
      } else {
        alert("Greška pri kalkulaciji: " + data.message);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Greška pri slanju zahteva: " + error.message);
    });
}

function displayResults(results) {
  const tbody = document.getElementById("resultsTableBody");
  const totalDuguje = document.getElementById("totalDuguje");
  const totalPotrazuje = document.getElementById("totalPotrazuje");
  const koeficijentElement = document.getElementById("koeficijentProdaje");

  tbody.innerHTML = "";
  let sumDuguje = 0;
  let sumPotrazuje = 0;

  // Calculate koeficijent prodaje i update results based on formula
  const koeficijent = results.koeficijentProdaje;
  const processedResults = results.results;

  processedResults.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
              <td class="fw-bold">${row.naziv}</td>
              <td class="duguje-column">${row.duguje.toFixed(2)}</td>
              <td class="potrazuje-column">${row.potrazuje.toFixed(2)}</td>
          `;
    tbody.appendChild(tr);

    sumDuguje += row.duguje;
    sumPotrazuje += row.potrazuje;
  });

  totalDuguje.textContent = sumDuguje.toFixed(2);
  totalPotrazuje.textContent = sumPotrazuje.toFixed(2);
  koeficijentElement.textContent = koeficijent.toFixed(2) + "%";

  // Show results section
  document.getElementById("resultsSection").style.display = "block";

  // Display kalo results if available
  if (results.kaloResults) {
    displayKaloResults(results);
  }
}

function displayKaloResults(results) {
  const kaloTbody = document.getElementById("kaloTableBody");
  const totalDugujeKalo = document.getElementById("totalDugujeKalo");
  const totalPotrazujeKalo = document.getElementById("totalPotrazujeKalo");
  const koeficijentKaloElement = document.getElementById("koeficijentKalo");

  kaloTbody.innerHTML = "";
  let sumDugujeKalo = 0;
  let sumPotrazujeKalo = 0;

  const kaloResults = results.kaloResults;
  const koeficijentKaloValue = results.koeficijentKalo || 0;

  kaloResults.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
              <td class="fw-bold">${row.naziv}</td>
              <td class="duguje-column">${row.duguje.toFixed(2)}</td>
              <td class="potrazuje-column">${row.potrazuje.toFixed(2)}</td>
          `;
    kaloTbody.appendChild(tr);

    sumDugujeKalo += row.duguje;
    sumPotrazujeKalo += row.potrazuje;
  });

  totalDugujeKalo.textContent = sumDugujeKalo.toFixed(2);
  totalPotrazujeKalo.textContent = sumPotrazujeKalo.toFixed(2);
  koeficijentKaloElement.textContent = koeficijentKaloValue.toFixed(2) + "%";

  // Show kalo section
  document.getElementById("kaloSection").style.display = "block";

  // Display manjak results if available
  if (results.manjakResults) {
    displayManjakResults(results);
  }
}

function displayManjakResults(results) {
  const tbody = document.getElementById("manjakTableBody");
  const totalDuguje = document.getElementById("totalDugujeManjak");
  const totalPotrazuje = document.getElementById("totalPotrazujeManjak");

  tbody.innerHTML = "";
  let sumDuguje = 0;
  let sumPotrazuje = 0;

  const manjakResults = results.manjakResults;

  manjakResults.forEach((row) => {
    const tr = document.createElement("tr");

    // Ensure values are numbers, default to 0 if null/undefined
    const dugujeValue = row.duguje || 0;
    const potrazujeValue = row.potrazuje || 0;

    tr.innerHTML = `
              <td class="fw-bold">${row.naziv}</td>
              <td class="duguje-column">${dugujeValue.toFixed(2)}</td>
              <td class="potrazuje-column">${potrazujeValue.toFixed(2)}</td>
          `;
    tbody.appendChild(tr);

    sumDuguje += dugujeValue;
    sumPotrazuje += potrazujeValue;
  });

  totalDuguje.textContent = sumDuguje.toFixed(2);
  totalPotrazuje.textContent = sumPotrazuje.toFixed(2);

  // Show manjak section
  document.getElementById("manjakSection").style.display = "block";
}

function resetForm() {
  document.getElementById("obracunForm").reset();

  // Hide all result sections
  document.getElementById("resultsSection").style.display = "none";
  document.getElementById("kaloSection").style.display = "none";
  document.getElementById("manjakSection").style.display = "none";

  // Clear results and restore placeholder
  const tbody = document.getElementById("resultsTableBody");
  const totalDuguje = document.getElementById("totalDuguje");
  const totalPotrazuje = document.getElementById("totalPotrazuje");
  const koeficijentElement = document.getElementById("koeficijentProdaje");

  // Restore placeholder content
  tbody.innerHTML = `
    <tr class="text-muted">
      <td class="fw-bold">Roba</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Ukalkulisani PDV 21%</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Ukalkulisani PDV 15%</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Ukalkulisani PDV 7%</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Ukalkulisana razlika u cijeni</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Nabavna vrijednost prodate robe</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
  `;

  totalDuguje.textContent = "0.00";
  totalPotrazuje.textContent = "0.00";
  koeficijentElement.textContent = "0.00%";

  // Clear kalo results
  const kaloTbody = document.getElementById("kaloTableBody");
  const totalDugujeKalo = document.getElementById("totalDugujeKalo");
  const totalPotrazujeKalo = document.getElementById("totalPotrazujeKalo");
  const koeficijentKaloElement = document.getElementById("koeficijentKalo");

  kaloTbody.innerHTML = `
    <tr class="text-muted">
      <td class="fw-bold">Roba</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Ukalkulisani PDV 21%</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Ukalkulisani PDV 15%</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Ukalkulisani PDV 7%</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Ukalkulisana razlika u cijeni</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Troškovi kala, rastura i loma</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
  `;

  totalDugujeKalo.textContent = "0.00";
  totalPotrazujeKalo.textContent = "0.00";
  koeficijentKaloElement.textContent = "0.00%";

  // Clear manjak results and hide section
  const manjakTbody = document.getElementById("manjakTableBody");
  const totalDugujeManjak = document.getElementById("totalDugujeManjak");
  const totalPotrazujeManjak = document.getElementById("totalPotrazujeManjak");

  manjakTbody.innerHTML = `
    <tr class="text-muted">
      <td class="fw-bold">Roba</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Ukalkulisani PDV 21%</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Ukalkulisani PDV 15%</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Ukalkulisani PDV 7%</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Ukalkulisana razlika u cijeni</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Izlazni PDV 21%</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Izlazni PDV 15%</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Izlazni PDV 7%</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
    <tr class="text-muted">
      <td class="fw-bold">Troškovi manjka</td>
      <td class="duguje-column">-</td>
      <td class="potrazuje-column">-</td>
    </tr>
  `;

  totalDugujeManjak.textContent = "0.00";
  totalPotrazujeManjak.textContent = "0.00";
}

function exportResults() {
  // TODO: Implement export functionality
  alert("Eksport funkcionalnost će biti implementirana uskoro");
}

function printResults() {
  window.print();
}
