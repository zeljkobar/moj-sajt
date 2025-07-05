// Globalne varijable
let pozicije = [];
let firme = [];
let radnici = [];
let filteredRadnici = []; // Za filtriranu listu radnika

// Učitavanje podataka na početku
document.addEventListener("DOMContentLoaded", function () {
  loadPozicije();
  loadFirme();
  loadRadnici();
  setupSearchFunctionality();
});

// Učitavanje pozicija (samo za dropdown u formi)
async function loadPozicije() {
  try {
    const response = await fetch("/api/pozicije");
    pozicije = await response.json();
    populatePozicijeSelect();
  } catch (error) {
    console.error("Greška pri učitavanju pozicija:", error);
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

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${radnik.ime} ${radnik.prezime}</td>
            <td>${radnik.jmbg}</td>
            <td>${radnik.pozicija_naziv || "N/A"}</td>
            <td>${radnik.firma_naziv || "N/A"}</td>
            <td>${datumZaposlenja}</td>
            <td>${radnik.visina_zarade || 0}€</td>
            <td>${radnoVremeText[radnik.tip_radnog_vremena] || "N/A"}</td>
            <td>${tipUgovoraText[radnik.tip_ugovora] || "N/A"}</td>
            <td>
                <button class="btn" onclick="editRadnik(${
                  radnik.id
                })">Uredi</button>
                <button class="btn" onclick="deleteRadnik(${
                  radnik.id
                })" style="background-color: #dc3545;">Obriši</button>
                <button class="btn" onclick="generateUgovorFromTable(${
                  radnik.id
                }, ${
      radnik.firma_id
    })" style="background-color: #28a745;">Ugovor</button>
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

// Modal funkcije za radnike
function openRadnikModal() {
  document.getElementById("radnikModal").style.display = "block";
}

function closeRadnikModal() {
  document.getElementById("radnikModal").style.display = "none";
  document.getElementById("radnikForm").reset();
}

// Zatvaranje modala klikom van njega
window.onclick = function (event) {
  const radnikModal = document.getElementById("radnikModal");
  if (event.target === radnikModal) {
    closeRadnikModal();
  }
};

// Form submit za dodavanje radnika
document
  .getElementById("radnikForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = Object.fromEntries(formData);

    try {
      const response = await fetch("/api/radnici", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        alert("Radnik je uspešno dodan!");
        closeRadnikModal();
        loadRadnici();
      } else {
        alert("Greška: " + result.message);
      }
    } catch (error) {
      console.error("Greška pri dodavanju radnika:", error);
      alert("Greška pri dodavanju radnika");
    }
  });

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
function editRadnik(id) {
  alert("Funkcija editovanja radnika će biti implementirana");
}

// Funkcija za generisanje ugovora iz tabele radnika
async function generateUgovorFromTable(radnikId, firmaId) {
  // Jednostavno otvori ugovor - ugovor-o-radu.html će sam da učita podatke
  // i neće kreirati novi red u bazi svaki put
  window.open(
    `/ugovor-o-radu.html?radnikId=${radnikId}&firmaId=${firmaId}`,
    "_blank"
  );
}
