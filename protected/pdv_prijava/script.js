function updateIzlazniPdv() {
  const izlazni21 =
    parseFloat(document.getElementById("izlazni_pdv_21").value) || 0;
  const izlazni15 =
    parseFloat(document.getElementById("izlazni_pdv_15").value) || 0;
  const izlazni7 =
    parseFloat(document.getElementById("izlazni_pdv_7").value) || 0;

  const izlazni_pdv = izlazni21 + izlazni15 + izlazni7;
  document.getElementById("ukupan_izlazni_pdv").value = izlazni_pdv.toFixed(2);
  updateRezultat();
}

function updateUlazniPdv() {
  const ulazniDomaci =
    parseFloat(document.getElementById("ulazni_pdv_domaci_promet").value) || 0;
  const ulazniUvozni =
    parseFloat(document.getElementById("pdv_uvoz").value) || 0;
  const pdvUslugeInostranih =
    parseFloat(document.getElementById("pdv_usluge_inostranih_lica").value) ||
    0;
  const pausalnaNadoknada =
    parseFloat(document.getElementById("pausalna_nadoknada").value) || 0;
  const pdvPrometEnergije =
    parseFloat(document.getElementById("pdv_promet_energije").value) || 0;

  const ulazni_pdv =
    ulazniDomaci +
    ulazniUvozni +
    pdvUslugeInostranih +
    pausalnaNadoknada +
    pdvPrometEnergije;
  document.getElementById("ukupan_ulazni_pdv_pretporez").value =
    ulazni_pdv.toFixed(2);
  document.getElementById("ulazni_pdv_sa_pravom").value = ulazni_pdv.toFixed(2);
  updateRezultat();
}

function updateRezultat() {
  const izlazni_pdv =
    parseFloat(document.getElementById("ukupan_izlazni_pdv").value) || 0;
  const ulazni_pdv =
    parseFloat(document.getElementById("ukupan_ulazni_pdv_pretporez").value) ||
    0;
  const dospjeliPdvField = document.getElementById("dospjeli_pdv");
  const pdvKreditaField = document.getElementById("pdv_kredit");

  const rezultat = izlazni_pdv - ulazni_pdv;

  // Ispravna logika za popunjavanje polja
  if (rezultat < 0) {
    dospjeliPdvField.value = 0; // Postavi dospjeli PDV na 0
    pdvKreditaField.value = Math.abs(rezultat).toFixed(2); // Popuni PDV kredit
  } else {
    dospjeliPdvField.value = rezultat.toFixed(2); // Popuni dospjeli PDV
    pdvKreditaField.value = 0; // Postavi PDV kredit na 0
  }
}

function setupPdvInput(oporeziviId, izlazniId, koeficijent) {
  document.getElementById(oporeziviId).addEventListener("input", function () {
    const value = parseFloat(this.value) || 0;
    const pdvValue = value * koeficijent;
    document.getElementById(izlazniId).value = pdvValue.toFixed(2);
    updateIzlazniPdv();
  });
}

// STAMPANJE PDF
document
  .getElementById("pdfButton")
  .addEventListener("click", async function () {
    const { jsPDF } = window.jspdf;
    const container = document.querySelector(".container");

    // Kreiraj <span> verzije svih input polja
    const inputs = container.querySelectorAll("input.pdf-field");
    const originalStates = [];

    inputs.forEach((input) => {
      const span = document.createElement("span");
      span.textContent = input.value || "";
      span.style.fontSize = "12px";
      span.style.fontWeight = "bold";
      span.style.color = "#000";
      span.style.display = "inline-block";
      span.style.minWidth = input.offsetWidth + "px";

      // Sakrij input, ubaci span
      input.style.display = "none";
      input.parentNode.insertBefore(span, input.nextSibling);

      // Zapamti originalni input i span za kasnije vraćanje
      originalStates.push({ input, span });
    });

    // Sačekaj render
    await new Promise((r) => setTimeout(r, 100));

    // Renderuj kao canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save("pdv_obrazac.pdf");

    // Vrati sve inpute i ukloni span-ove
    originalStates.forEach(({ input, span }) => {
      span.remove();
      input.style.display = "";
    });
  });

// Dodavanje funkcionalnosti za firme
let firmeData = [];
let aktivneFirme = [];
let firme0 = [];

// Učitavanje podataka o firmama kad se stranica učita
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded - pokušavam da učitam firme...");

  // Prvo postavi event listenere za PDV kalkulacije
  setupPdvInput("oporezivi_promet_21", "izlazni_pdv_21", 0.173553719);
  setupPdvInput("oporezivi_promet_15", "izlazni_pdv_15", 0.1304347826);
  setupPdvInput("oporezivi_promet_7", "izlazni_pdv_7", 0.06542050747);

  // Event listeneri za ulazni PDV
  document
    .getElementById("ulazni_pdv_domaci_promet")
    .addEventListener("input", updateUlazniPdv);
  document
    .getElementById("pdv_uvoz")
    .addEventListener("input", updateUlazniPdv);
  document
    .getElementById("pdv_usluge_inostranih_lica")
    .addEventListener("input", updateUlazniPdv);
  document
    .getElementById("pausalna_nadoknada")
    .addEventListener("input", updateUlazniPdv);
  document
    .getElementById("pdv_promet_energije")
    .addEventListener("input", updateUlazniPdv);

  // Učitaj podatke o trenutno ulogovanom korisniku
  try {
    const authResponse = await fetch("/api/check-auth", {
      credentials: "include",
    });
    if (authResponse.ok) {
      const authData = await authResponse.json();
      if (authData.authenticated && authData.user) {
        populateUserData(authData.user);
      }
    }
  } catch (error) {
    console.error("Greška pri učitavanju korisničkih podataka:", error);
  }

  // Zatim učitaj firme dinamički sa backend-a
  try {
    // Učitaj sve firme (za kompatibilnost)
    const responseAll = await fetch("/api/firme", {
      credentials: "include",
    });
    if (responseAll.ok) {
      const data = await responseAll.json();
      firmeData = data.firme || [];
    }

    // Učitaj aktivne firme
    const responseAktivne = await fetch("/api/firme/aktivne", {
      credentials: "include",
    });
    if (responseAktivne.ok) {
      aktivneFirme = await responseAktivne.json();
      console.log("Aktivne firme učitane:", aktivneFirme.length);
    }

    // Učitaj firme na nuli
    const responseFirme0 = await fetch("/api/firme/nula", {
      credentials: "include",
    });
    if (responseFirme0.ok) {
      firme0 = await responseFirme0.json();
      console.log("Firme na nuli učitane:", firme0.length);
    }

    populateFirmeDropdown();
  } catch (error) {
    console.error("Greška pri učitavanju firmi:", error);
  }
});

// Popunjavanje dropdown-a sa firmama
function populateFirmeDropdown() {
  console.log("populateFirmeDropdown pozvano");
  const select = document.getElementById("firma_select");
  console.log("Select element:", select);

  if (!select) {
    console.error("firma_select element nije pronađen!");
    return;
  }

  // Dodaj prazan option
  select.innerHTML = '<option value="">-- Izaberi firmu --</option>';

  // Kreiraj PIB set-ove za lakše filtriranje
  const firme0Pib = new Set(firme0.map((f) => f.pib));
  console.log("PIB-ovi firmi na nuli:", firme0Pib);

  // Dodaj optgroup za aktivne firme PRVO
  const aktivneGroup = document.createElement("optgroup");
  aktivneGroup.label = "✅ Aktivne firme";
  select.appendChild(aktivneGroup);

  // Dodaj optgroup za firme na nuli DRUGO
  const firme0Group = document.createElement("optgroup");
  firme0Group.label = "⭕ Firme na nuli";
  select.appendChild(firme0Group);

  // Dodaj firme u odgovarajuće grupe
  firmeData.forEach((firma) => {
    const option = document.createElement("option");
    option.value = firma.pib;
    option.textContent = `${firma.naziv} (PIB: ${firma.pib})`;

    if (firme0Pib.has(firma.pib)) {
      firme0Group.appendChild(option);
    } else {
      aktivneGroup.appendChild(option);
    }
  });

  console.log("Dropdown popunjen sa", firmeData.length, "firmi");
}

// Funkcija za popunjavanje podataka o ovlašćenom licu
function populateUserData(user) {
  if (!user) return;

  // Popuni polja za ovlašćeno lice
  const ovlascenoLicePibField = document.getElementById("ovlasteno_lice_pib");
  const ovlascenoLiceImeField = document.getElementById("ovlasteno_lice_ime");

  if (ovlascenoLicePibField && user.jmbg) {
    ovlascenoLicePibField.value = user.jmbg;
  }

  if (ovlascenoLiceImeField && user.ime && user.prezime) {
    ovlascenoLiceImeField.value = `${user.ime} ${user.prezime}`;
  }

  console.log("Podaci o ovlašćenom licu popunjeni:", {
    ime: user.ime,
    prezime: user.prezime,
    jmbg: user.jmbg,
  });
}

// Funkcija za automatsko popunjavanje podataka firme
function populateCompanyData(pib) {
  if (!pib) return;

  const firma = firmeData.find((f) => f.pib === pib);
  if (!firma) return;

  // Popuni polja (prilagodi prema vašim poljima u formi)
  const nazivField = document.getElementById("naziv_firme");
  const pibField = document.getElementById("pib_firme");
  const adresaField = document.getElementById("adresa_firme");
  const pdvField = document.getElementById("pdv_broj");

  if (nazivField) nazivField.value = firma.naziv;
  if (pibField) pibField.value = firma.pib;
  if (adresaField) adresaField.value = firma.adresa;
  if (pdvField) pdvField.value = firma.pdvBroj;
}

// Event listener za dropdown - kada korisnik izabere firmu
document.addEventListener("DOMContentLoaded", () => {
  const firmaSelect = document.getElementById("firma_select");
  if (firmaSelect) {
    firmaSelect.addEventListener("change", function () {
      populateCompanyData(this.value);
    });
  }
});
