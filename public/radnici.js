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

    // Formatiranje vrste ugovora
    const vrstaUgovoraText = {
      ugovor_o_radu: "Ugovor o radu",
      ugovor_o_djelu: "Ugovor o djelu",
      ugovor_o_dopunskom_radu: "Dopunski rad",
      autorski_ugovor: "Autorski ugovor",
      ugovor_o_pozajmnici: "Pozajmica",
    };

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${
              vrstaUgovoraText[radnik.vrsta_ugovora] || "Nije definisano"
            }</td>
            <td>${radnik.ime} ${radnik.prezime}</td>
            <td>${radnik.jmbg}</td>
            <td>${radnik.grad || "N/A"}</td>
            <td>${radnik.adresa || "N/A"}</td>
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
// Funkcija za otvaranje modala za kreiranje novog radnika
function openRadnikModal() {
  resetModalForNew();
  document.getElementById("radnikModal").style.display = "block";
}

// Funkcija za resetovanje modala za kreiranje novog radnika
function resetModalForNew() {
  // Reset naslov i dugme
  document.getElementById("modalTitle").textContent = "Dodaj novog radnika";
  document.getElementById("submitBtn").textContent = "Dodaj radnika";

  // Reset formu
  document.getElementById("radnikForm").reset();

  // Sakrij datum prestanka polje
  document.getElementById("datum_prestanka_group").style.display = "none";
  document.getElementById("datum_prestanka").required = false;

  // Resetuj help text
  document.getElementById("radnoVremeHelp").style.display = "none";

  // Postavi današnji datum
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("datum_zaposlenja").value = today;
}

function closeRadnikModal() {
  document.getElementById("radnikModal").style.display = "none";
  // Reset formu i sve što treba
  resetModalForNew();
}

// Zatvaranje modala klikom van njega
window.onclick = function (event) {
  const radnikModal = document.getElementById("radnikModal");
  if (event.target === radnikModal) {
    closeRadnikModal();
  }
};

// Form submit za dodavanje/uređivanje radnika
document
  .getElementById("radnikForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = Object.fromEntries(formData);

    // Proveri da li je uređivanje ili kreiranje
    const radnikId = data.radnik_id;
    const isEditing = radnikId && radnikId !== "";

    // Ukloni radnik_id iz podataka ako je prazan (za kreiranje)
    if (!isEditing) {
      delete data.radnik_id;
    }

    try {
      let response;
      let successMessage;

      if (isEditing) {
        // Uređivanje postojećeg radnika
        response = await fetch(`/api/radnici/${radnikId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        successMessage = "Radnik je uspešno ažuriran!";
      } else {
        // Kreiranje novog radnika
        response = await fetch("/api/radnici", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        successMessage = "Radnik je uspešno dodan!";
      }

      const result = await response.json();

      if (result.success) {
        alert(successMessage);
        closeRadnikModal();
        loadRadnici();
      } else {
        alert("Greška: " + result.message);
      }
    } catch (error) {
      console.error("Greška pri obradi radnika:", error);
      alert("Greška pri obradi radnika");
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
    document.getElementById("datum_zaposlenja").value =
      radnik.datum_zaposlenja || "";
    document.getElementById("visina_zarade").value = radnik.visina_zarade || "";
    document.getElementById("tip_radnog_vremena").value =
      radnik.tip_radnog_vremena || "";
    document.getElementById("tip_ugovora").value = radnik.tip_ugovora || "";

    // Ako je datum prestanka setovan, prikaži polje
    if (radnik.datum_prestanka) {
      document.getElementById("datum_prestanka").value = radnik.datum_prestanka;
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
