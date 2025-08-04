// =============================================================================
// JPR FORM SCRIPT - Automatsko popunjavanje JPR obrasca
// =============================================================================

/**
 * Funkcija za dobijanje konteksta (odakle je pozvan JPR)
 */
function getContextFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("context") || "pregled";
}

/**
 * Funkcija za popunjavanje napomena na osnovu konteksta
 */
function fillNotesBasedOnContext(context) {
  const notesElement = document.querySelector("h4.napomena");

  if (!notesElement) return;

  switch (context) {
    case "pregled":
      // Za pregled tab - ostavi prazno
      notesElement.textContent = "";
      break;
    case "radnik":
      // Za radnik kontekst - popuni sa podacima radnika
      const radnikInfo = getRadnikInfoFromURL();
      if (radnikInfo) {
        notesElement.textContent = `Prijava radnika - ${radnikInfo.ime} ${radnikInfo.prezime} JMBG ${radnikInfo.jmbg}`;
      } else {
        notesElement.textContent = "Prijava radnika";
      }
      break;
    case "odjava":
      // Za odjavu radnika kontekst - popuni sa podacima radnika
      const odjavRadnikInfo = getRadnikInfoFromURL();
      if (odjavRadnikInfo) {
        notesElement.textContent = `Odjava radnika - ${odjavRadnikInfo.ime} ${odjavRadnikInfo.prezime} JMBG ${odjavRadnikInfo.jmbg}`;
      } else {
        notesElement.textContent = "Odjava radnika";
      }
      break;
    case "ovlascenje":
      // Za ovlašćenje za knjigovođu
      notesElement.textContent = "Ovlašćenje za elektronski potpis";
      break;
    // Ovde ćemo dodati ostale kontekste kasnije
    default:
      notesElement.textContent = "";
  }
}

/**
 * Dobija informacije o radniku iz URL parametara
 */
function getRadnikInfoFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const ime = urlParams.get("radnikIme");
  const prezime = urlParams.get("radnikPrezime");
  const jmbg = urlParams.get("radnikJmbg");

  if (ime && prezime && jmbg) {
    return { ime, prezime, jmbg };
  }
  return null;
}

/**
 * Dobija ID firme iz URL parametara
 */
function getFirmaIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("firmaId");
}

/**
 * API poziv za dobijanje podataka firme iz baze
 */
async function fetchFirmaData(firmaId) {
  try {
    const response = await fetch(`/api/firme/id/${firmaId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Greška pri dobijanju podataka firme:", error);
    return null;
  }
}

/**
 * Funkcija za popunjavanje PIB kockica na dnu - tu ide JMBG direktora
 */
function fillPIBBoxes(jmbgDirektora) {
  if (!jmbgDirektora) return;

  const pibContainer = document.getElementById("pib-container");
  if (!pibContainer) return;

  const pibBoxes = pibContainer.querySelectorAll("div");
  const cleanJMBG = jmbgDirektora.replace(/\s/g, "").substring(0, 13);

  pibBoxes.forEach((box, index) => {
    box.textContent = cleanJMBG[index] || "";
  });
}

/**
 * Funkcija za popunjavanje matičnog broja/JMBG polja (1.2) - tu ide PIB firme
 */
function fillMaticniBrojBoxes(pib) {
  if (!pib) return;

  const maticniBoxes = document.querySelectorAll(".maticni-box div");
  const cleanPIB = pib.replace(/\s/g, "").substring(0, 13);

  maticniBoxes.forEach((box, index) => {
    box.textContent = cleanPIB[index] || "";
  });
}

/**
 * Funkcija za popunjavanje svih podataka firme u JPR obrazac
 */
function fillFirmaData(firmaData) {
  if (!firmaData) {
    return;
  }

  // Pronađi sekciju koja sadrži "Adresa sjedišta"
  const allSections = document.querySelectorAll("div.form-section");
  const adresaSection = Array.from(allSections).find((section) =>
    section.querySelector("h3")?.textContent?.includes("Adresa sjedišta")
  );

  // 1.2 Matični broj/JMBG - tu ide PIB firme
  if (firmaData.pib) {
    fillMaticniBrojBoxes(firmaData.pib);
  }

  // PIB polje na dnu - tu ide JMBG direktora ili matični broj direktora
  if (firmaData.direktor_jmbg) {
    fillPIBBoxes(firmaData.direktor_jmbg);
  } else if (firmaData.jmbg_direktora) {
    fillPIBBoxes(firmaData.jmbg_direktora);
  } else if (firmaData.maticni_broj_direktora) {
    fillPIBBoxes(firmaData.maticni_broj_direktora);
  }

  // 1.3 Puni naziv firme
  const nazivInput = document.querySelector(
    'table tr:nth-child(3) td input[type="text"]'
  );
  if (nazivInput && firmaData.naziv) {
    nazivInput.value = firmaData.naziv;
  }

  // 1.4 Skraćeni naziv firme - isti kao puni naziv
  const skraceniNazivInput = document.querySelector(
    'table tr:nth-child(4) td input[type="text"]'
  );
  if (skraceniNazivInput && firmaData.naziv) {
    skraceniNazivInput.value = firmaData.naziv;
  }

  // 2.2 Opština - tu ide grad
  const adresaSectionForFilling = Array.from(
    document.querySelectorAll("div.form-section")
  ).find((section) =>
    section.querySelector("h3")?.textContent?.includes("Adresa sjedišta")
  );

  if (adresaSectionForFilling) {
    // 2.2 Opština - tu ide grad
    const opstinaInput = adresaSectionForFilling.querySelector(
      'tr:nth-child(2) td input[type="text"]'
    );
    if (opstinaInput && firmaData.grad) {
      opstinaInput.value = firmaData.grad.toUpperCase();
    }

    // 2.3 Mjesto - tu ide grad
    const mjestoInput = adresaSectionForFilling.querySelector(
      'tr:nth-child(3) td input[type="text"]'
    );
    if (mjestoInput && firmaData.grad) {
      mjestoInput.value = firmaData.grad.toUpperCase();
    }

    // 2.4 Ulica i broj - tu ide adresa
    const adresaInput = adresaSectionForFilling.querySelector(
      'tr:nth-child(4) td input[type="text"]'
    );

    if (adresaInput && firmaData.adresa) {
      // Uzmi samo prvi deo adrese (bez grada)
      const adresaParts = firmaData.adresa.split(",");
      const finalAdresa = adresaParts[0]
        ? adresaParts[0].trim()
        : firmaData.adresa;
      adresaInput.value = finalAdresa;
    }

    // 2.5 Broj telefona/fax - tu ide telefon
    const telefonInput = adresaSectionForFilling.querySelector(
      'tr:nth-child(5) td input[type="text"]'
    );
    if (telefonInput && firmaData.telefon) {
      telefonInput.value = firmaData.telefon;
    }

    // 2.6 e-mail - tu ide email
    const emailInput = adresaSectionForFilling.querySelector(
      'tr:nth-child(6) td input[type="text"]'
    );
    if (emailInput && firmaData.email) {
      emailInput.value = firmaData.email;
    }
  }
}

/**
 * Funkcija za formatiranje trenutnog datuma
 */
function formatCurrentDate() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Funkcija za popunjavanje trenutnog datuma
 */
function fillCurrentDate() {
  const datumElements = document.querySelectorAll(".section p");
  datumElements.forEach((element) => {
    if (element.textContent.includes("Datum:")) {
      element.innerHTML = `Datum: ${formatCurrentDate()}`;
    }
  });
}

/**
 * Glavna funkcija za inicijalizaciju JPR obrasca
 */
async function initializeJPRForm() {
  // Dobij ID firme iz URL-a
  const firmaId = getFirmaIdFromURL();

  // Dobij kontekst (odakle je pozvan JPR)
  const context = getContextFromURL();

  if (!firmaId) {
    fillCurrentDate();
    // Popuni napomene na osnovu konteksta čak i bez ID firme
    fillNotesBasedOnContext(context);
    return;
  }

  // Dobij podatke firme iz baze
  const firmaData = await fetchFirmaData(firmaId);

  if (firmaData) {
    // Popuni obrazac sa podacima firme
    fillFirmaData(firmaData);
  }

  // Popuni napomene na osnovu konteksta
  fillNotesBasedOnContext(context);

  // Popuni trenutni datum
  fillCurrentDate();
} // =============================================================================
// INICIJALIZACIJA
// =============================================================================

// Automatsko popunjavanje prilikom učitavanja stranice
document.addEventListener("DOMContentLoaded", initializeJPRForm);
