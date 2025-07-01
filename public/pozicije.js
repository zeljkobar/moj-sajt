// Globalne varijable
let pozicije = [];

// Učitavanje podataka na početku
document.addEventListener("DOMContentLoaded", function () {
  loadPozicije();
});

// Učitavanje pozicija
async function loadPozicije() {
  try {
    const response = await fetch("/api/pozicije");
    pozicije = await response.json();
    displayPozicije();
  } catch (error) {
    console.error("Greška pri učitavanju pozicija:", error);
  }
}

// Prikaz pozicija
function displayPozicije() {
  const tbody = document.querySelector("#pozicijeTable tbody");
  tbody.innerHTML = "";

  pozicije.forEach((pozicija) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${pozicija.naziv}</td>
            <td>${pozicija.opis_poslova.substring(0, 100)}${
      pozicija.opis_poslova.length > 100 ? "..." : ""
    }</td>
            <td>
                <button class="btn" onclick="editPozicija(${
                  pozicija.id
                })">Uredi</button>
                <button class="btn" onclick="deletePozicija(${
                  pozicija.id
                })" style="background-color: #dc3545;">Obriši</button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

// Modal funkcije za pozicije
function openPozicijaModal() {
  document.getElementById("pozicijaModal").style.display = "block";
}

function closePozicijaModal() {
  document.getElementById("pozicijaModal").style.display = "none";
  document.getElementById("pozicijaForm").reset();
}

// Zatvaranje modala klikom van njega
window.onclick = function (event) {
  const pozicijaModal = document.getElementById("pozicijaModal");
  if (event.target === pozicijaModal) {
    closePozicijaModal();
  }
};

// Form submit za dodavanje pozicije
document
  .getElementById("pozicijaForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = Object.fromEntries(formData);

    try {
      const response = await fetch("/api/pozicije", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        alert("Pozicija je uspešno dodana!");
        closePozicijaModal();
        loadPozicije();
      } else {
        alert("Greška: " + result.message);
      }
    } catch (error) {
      console.error("Greška pri dodavanju pozicije:", error);
      alert("Greška pri dodavanju pozicije");
    }
  });

// Funkcije za brisanje
async function deletePozicija(id) {
  if (confirm("Da li ste sigurni da želite da obrišete ovu poziciju?")) {
    try {
      const response = await fetch(`/api/pozicije/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert("Pozicija je uspešno obrisana!");
        loadPozicije();
      } else {
        alert("Greška: " + result.message);
      }
    } catch (error) {
      console.error("Greška pri brisanju pozicije:", error);
      alert("Greška pri brisanju pozicije");
    }
  }
}

// Funkcija za edit pozicije
async function editPozicija(id) {
  try {
    // Prvo učitamo podatke o poziciji
    const response = await fetch(`/api/pozicije/${id}`);
    const pozicija = await response.json();

    if (response.ok && pozicija) {
      // Popunimo edit modal sa postojećim podacima
      document.getElementById("editPozicijaId").value = pozicija.id;
      document.getElementById("editNaziv").value = pozicija.naziv;
      document.getElementById("editOpisPoslova").value = pozicija.opis_poslova;

      // Pokažemo edit modal
      document.getElementById("editPozicijaModal").style.display = "block";
    } else {
      alert(
        "Greška pri učitavanju podataka: " +
          (pozicija.message || "Nepoznata greška")
      );
    }
  } catch (error) {
    console.error("Greška pri učitavanju pozicije:", error);
    alert("Greška pri učitavanju pozicije");
  }
}

// Funkcija za zatvaranje edit modal-a
function closeEditPozicijaModal() {
  document.getElementById("editPozicijaModal").style.display = "none";
}

// Event listener za edit formu
document
  .getElementById("editPozicijaForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const id = document.getElementById("editPozicijaId").value;
    const naziv = document.getElementById("editNaziv").value;
    const opis_poslova = document.getElementById("editOpisPoslova").value;

    try {
      const response = await fetch(`/api/pozicije/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          naziv: naziv,
          opis_poslova: opis_poslova,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert("Pozicija je uspešno ažurirana!");
        closeEditPozicijaModal();
        loadPozicije(); // Osvežimo listu
      } else {
        alert("Greška: " + result.message);
      }
    } catch (error) {
      console.error("Greška pri ažuriranju pozicije:", error);
      alert("Greška pri ažuriranju pozicije");
    }
  });

// Zatvaranje modal-a klikom van njega
window.onclick = function (event) {
  const pozicijaModal = document.getElementById("pozicijaModal");
  const editPozicijaModal = document.getElementById("editPozicijaModal");

  if (event.target == pozicijaModal) {
    pozicijaModal.style.display = "none";
  }
  if (event.target == editPozicijaModal) {
    editPozicijaModal.style.display = "none";
  }
};
