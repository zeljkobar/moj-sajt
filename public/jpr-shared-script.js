// =============================================================================
// JPR SHARED SCRIPT - Zajednički JavaScript za JPR koricu i dodatak B
// =============================================================================

// =============================================================================
// ZAJEDNIČKE POMOĆNE FUNKCIJE
// =============================================================================

/**
 * Funkcija za dobijanje konteksta (odakle je pozvan JPR)
 */
function getContextFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('context') || 'pregled';
}

/**
 * Dobija informacije o radniku iz URL parametara
 */
function getRadnikInfoFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const ime = urlParams.get('radnikIme');
  const prezime = urlParams.get('radnikPrezime');
  const jmbg = urlParams.get('radnikJmbg');

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
  return urlParams.get('firmaId');
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
    console.error('Greška pri dobijanju podataka firme:', error);
    return null;
  }
}

/**
 * API poziv za dobijanje radnika firme
 */
async function fetchRadniciData(firmaId) {
  try {
    console.log(`Učitavam podatke radnika: firmaId=${firmaId}`);

    const response = await fetch(`/api/radnici/firma/${firmaId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Podaci o radnicima:', data);
    return data;
  } catch (error) {
    console.error('Greška pri učitavanju podataka radnika:', error);
    return null;
  }
}

/**
 * API poziv za dobijanje podataka o otkazu radnika
 */
async function fetchOtkazData(radnikId) {
  try {
    console.log(`Učitavam podatke o otkazu: radnikId=${radnikId}`);

    const response = await fetch(`/api/otkazi/radnik/${radnikId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Podaci o otkazu:', data);

    if (data.success && data.otkaz) {
      return data.otkaz;
    }
    return null;
  } catch (error) {
    console.error('Greška pri učitavanju podataka o otkazu:', error);
    return null;
  }
}

/**
 * Funkcija za formatiranje trenutnog datuma
 */
function formatCurrentDate() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
}

// =============================================================================
// JPR KORICA SPECIFIČNE FUNKCIJE
// =============================================================================

/**
 * Funkcija za popunjavanje napomena na osnovu konteksta (JPR KORICA)
 */
function fillNotesBasedOnContext(context) {
  const notesElement = document.querySelector('h4.napomena');

  if (!notesElement) return;

  switch (context) {
    case 'pregled':
      // Za pregled tab - ostavi prazno
      notesElement.textContent = '';
      break;
    case 'radnik':
      // Za radnik kontekst - popuni sa podacima radnika
      const radnikInfo = getRadnikInfoFromURL();
      if (radnikInfo) {
        notesElement.textContent = `Prijava radnika - ${radnikInfo.ime} ${radnikInfo.prezime} JMBG ${radnikInfo.jmbg}`;
      } else {
        notesElement.textContent = 'Prijava radnika';
      }
      break;
    case 'odjava':
      // Za odjavu radnika kontekst - popuni sa podacima radnika
      const odjavRadnikInfo = getRadnikInfoFromURL();
      if (odjavRadnikInfo) {
        notesElement.textContent = `Odjava radnika - ${odjavRadnikInfo.ime} ${odjavRadnikInfo.prezime} JMBG ${odjavRadnikInfo.jmbg}`;
      } else {
        notesElement.textContent = 'Odjava radnika';
      }
      break;
    case 'ovlascenje':
      // Za ovlašćenje za knjigovođu
      notesElement.textContent = 'Ovlašćenje za elektronski potpis';
      break;
    default:
      notesElement.textContent = '';
  }
}

/**
 * Funkcija za popunjavanje PIB kockica na dnu - tu ide JMBG direktora (JPR KORICA)
 */
function fillPIBBoxes(jmbgDirektora) {
  if (!jmbgDirektora) return;

  const pibContainer = document.getElementById('pib-container');
  if (!pibContainer) return;

  const pibBoxes = pibContainer.querySelectorAll('div');
  const cleanJMBG = jmbgDirektora.replace(/\s/g, '').substring(0, 13);

  pibBoxes.forEach((box, index) => {
    box.textContent = cleanJMBG[index] || '';
  });
}

/**
 * Funkcija za popunjavanje matičnog broja/JMBG polja (1.2) - tu ide PIB firme (JPR KORICA)
 */
function fillMaticniBrojBoxes(pib) {
  if (!pib) return;

  const maticniBoxes = document.querySelectorAll('.maticni-box div');
  const cleanPIB = pib.replace(/\s/g, '').substring(0, 13);

  maticniBoxes.forEach((box, index) => {
    box.textContent = cleanPIB[index] || '';
  });
}

/**
 * Funkcija za popunjavanje svih podataka firme u JPR obrazac (JPR KORICA)
 */
function fillFirmaData(firmaData) {
  if (!firmaData) {
    return;
  }

  // Pronađi sekciju koja sadrži "Adresa sjedišta"
  const allSections = document.querySelectorAll('div.form-section');
  const adresaSection = Array.from(allSections).find(section =>
    section.querySelector('h3')?.textContent?.includes('Adresa sjedišta')
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
    document.querySelectorAll('div.form-section')
  ).find(section =>
    section.querySelector('h3')?.textContent?.includes('Adresa sjedišta')
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
      const adresaParts = firmaData.adresa.split(',');
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
 * Funkcija za popunjavanje trenutnog datuma (JPR KORICA)
 */
function fillCurrentDate() {
  const datumElements = document.querySelectorAll('.section p');
  datumElements.forEach(element => {
    if (element.textContent.includes('Datum:')) {
      element.innerHTML = `Datum: ${formatCurrentDate()}`;
    }
  });
}

// =============================================================================
// JPR DODATAK B SPECIFIČNE FUNKCIJE
// =============================================================================

/**
 * Funkcija za izvlačenje datuma rođenja iz JMBG-a (JPR DODATAK B)
 */
function extractBirthDateFromJMBG(jmbg) {
  if (!jmbg || jmbg.length !== 13) {
    console.warn('Neispravan JMBG:', jmbg);
    return null;
  }

  const dan = jmbg.substring(0, 2);
  const mesec = jmbg.substring(2, 4);
  const godinaKod = jmbg.substring(4, 7);

  // Dekodiranje godine prema JMBG standardu
  let godina;
  if (godinaKod.startsWith('0')) {
    godina = '2' + godinaKod; // 2000-2099
  } else if (godinaKod.startsWith('9')) {
    godina = '1' + godinaKod; // 1900-1999
  } else {
    // Za ostale slučajeve, pretpostavljamo 20. vek
    godina = '1' + godinaKod;
  }

  console.log(`JMBG ${jmbg} -> Datum rođenja: ${dan}.${mesec}.${godina}`);
  return {
    dan: dan,
    mesec: mesec,
    godina: godina,
  };
}

/**
 * Funkcija za popunjavanje osnovnih polja u JPR Dodatak B
 */
function populateBasicFieldsJPRDodatakB() {
  const urlParams = new URLSearchParams(window.location.search);

  const radnikIme = urlParams.get('radnikIme');
  const radnikPrezime = urlParams.get('radnikPrezime');
  const radnikJmbg = urlParams.get('radnikJmbg');
  const firmaId = urlParams.get('firmaId');

  console.log('URL parametri:', {
    ime: radnikIme,
    prezime: radnikPrezime,
    jmbg: radnikJmbg,
    firmaId: firmaId,
  });

  // Popunjavanje imena i prezimena
  if (radnikPrezime) {
    const prezimeField = document.querySelector('.field-prezime');
    if (prezimeField) prezimeField.value = radnikPrezime.toUpperCase();
  }

  if (radnikIme) {
    const imeField = document.querySelector('.field-ime');
    if (imeField) imeField.value = radnikIme.toUpperCase();
  }

  // Popunjavanje JMBG-a
  if (radnikJmbg && radnikJmbg.length === 13) {
    const jmbgDigits = document.querySelectorAll('.jmbg-digit');
    for (let i = 0; i < Math.min(radnikJmbg.length, jmbgDigits.length); i++) {
      jmbgDigits[i].value = radnikJmbg[i];
    }

    // Izvlačenje datuma rođenja iz JMBG-a
    const birthDate = extractBirthDateFromJMBG(radnikJmbg);
    if (birthDate) {
      // Popunjavanje dana
      const danDigits = document.querySelectorAll('.dan-digit');
      if (danDigits.length >= 2) {
        danDigits[0].value = birthDate.dan[0];
        danDigits[1].value = birthDate.dan[1];
      }

      // Popunjavanje meseca
      const mesecDigits = document.querySelectorAll('.mjesec-digit');
      if (mesecDigits.length >= 2) {
        mesecDigits[0].value = birthDate.mesec[0];
        mesecDigits[1].value = birthDate.mesec[1];
      }

      // Popunjavanje godine
      const godinaDigits = document.querySelectorAll('.godina-digit');
      if (godinaDigits.length >= 4) {
        godinaDigits[0].value = birthDate.godina[0];
        godinaDigits[1].value = birthDate.godina[1];
        godinaDigits[2].value = birthDate.godina[2];
        godinaDigits[3].value = birthDate.godina[3];
      }
    }
  }

  // Učitavanje dodatnih podataka radnika iz baze
  if (firmaId && radnikJmbg) {
    loadRadnikDataForJPRDodatakB(firmaId, radnikJmbg);
  }
}

/**
 * Funkcija za učitavanje i popunjavanje podataka radnika u JPR Dodatak B
 */
async function loadRadnikDataForJPRDodatakB(firmaId, jmbg) {
  try {
    const data = await fetchRadniciData(firmaId);
    if (!data) return;

    // Pronađi radnika po JMBG-u (data je direktno niz radnika)
    const radnik = data.find(r => r.jmbg === jmbg);
    if (!radnik) {
      console.warn('Radnik nije pronađen u bazi podataka');
      return;
    }

    console.log('Pronašao radnika:', radnik);

    // Dobij kontekst da znaš da li je prijava ili odjava
    const context = getContextFromURL();

    // Popunjavanje podataka na osnovu konteksta
    await fillRadnikDataBasedOnContext(radnik, context);
  } catch (error) {
    console.error('Greška pri učitavanju podataka radnika:', error);
  }
}

/**
 * Funkcija za popunjavanje podataka radnika na osnovu konteksta (prijava/odjava)
 */
async function fillRadnikDataBasedOnContext(radnik, context) {
  // Zajedničko popunjavanje (za oba konteksta)
  fillCommonRadnikData(radnik);

  // Specifično popunjavanje na osnovu konteksta
  if (context === 'radnik') {
    // Prijava radnika - popuni datum zaposlenja u PIO i ZDO polja
    fillDateFieldsForPrijava(radnik);
  } else if (context === 'odjava') {
    // Odjava radnika - dohvati podatke o otkazu za pravi datum prestanka
    const otkazData = await fetchOtkazData(radnik.id);
    fillDateFieldsForOdjava(radnik, otkazData);
  }
}

/**
 * Popunjavanje zajedničkih podataka radnika (za oba konteksta)
 */
function fillCommonRadnikData(radnik) {
  // Popuni poziciju
  const zanimanjeField = document.querySelector('.field-zanimanje');
  if (zanimanjeField && radnik.pozicija_naziv) {
    zanimanjeField.value = radnik.pozicija_naziv.toUpperCase();
  }

  // Popuni radno vrijeme
  const radnoVrijemeField = document.querySelector('.field-radno-vrijeme');
  if (radnoVrijemeField && radnik.tip_radnog_vremena) {
    radnoVrijemeField.value = radnik.tip_radnog_vremena.toUpperCase();
  }

  // Popuni mesto i opštinu rođenja (koristimo grad iz baze)
  if (radnik.grad) {
    const mestoRodjenjaField = document.querySelector('.field-mjesto-rodjenja');
    if (mestoRodjenjaField) {
      mestoRodjenjaField.value = radnik.grad.toUpperCase();
    }

    const opstinaRodjenjaField = document.querySelector(
      '.field-opstina-rodjenja'
    );
    if (opstinaRodjenjaField) {
      opstinaRodjenjaField.value = radnik.grad.toUpperCase();
    }
  }

  // Popuni adresu (ako postoji)
  if (radnik.adresa) {
    const adresaParts = radnik.adresa.split(',');
    const ulicaField = document.querySelector('.field-ulica');
    if (ulicaField && adresaParts[0]) {
      ulicaField.value = adresaParts[0].trim().toUpperCase();
    }
  }

  // Popuni grad stanovanja u dodatnim poljima
  if (radnik.grad) {
    const mjestoField = document.querySelector('.field-mjesto');
    if (mjestoField) {
      mjestoField.value = radnik.grad.toUpperCase();
    }

    const opstinaField = document.querySelector('.field-opstina');
    if (opstinaField) {
      opstinaField.value = radnik.grad.toUpperCase();
    }

    const opstinaDodatnoField = document.querySelector(
      '.field-opstina-dodatno'
    );
    if (opstinaDodatnoField) {
      opstinaDodatnoField.value = radnik.grad.toUpperCase();
    }
  }
}

/**
 * Popunjavanje datum polja za prijavu radnika
 */
function fillDateFieldsForPrijava(radnik) {
  if (!radnik.datum_zaposlenja) return;

  const datum = new Date(radnik.datum_zaposlenja);
  const dan = String(datum.getDate()).padStart(2, '0');
  const mesec = String(datum.getMonth() + 1).padStart(2, '0');
  const godina = String(datum.getFullYear());

  // PIO datum polja
  const pioDigits = document.querySelectorAll('.pio-digit');
  if (pioDigits.length >= 8) {
    pioDigits[0].value = dan[0];
    pioDigits[1].value = dan[1];
    pioDigits[2].value = mesec[0];
    pioDigits[3].value = mesec[1];
    pioDigits[4].value = godina[0];
    pioDigits[5].value = godina[1];
    pioDigits[6].value = godina[2];
    pioDigits[7].value = godina[3];
  }

  // ZDO datum polja (isti datum)
  const zdoDanDigits = document.querySelectorAll('.zdo-dan-digit');
  if (zdoDanDigits.length >= 2) {
    zdoDanDigits[0].value = dan[0];
    zdoDanDigits[1].value = dan[1];
  }

  const zdoMesecDigits = document.querySelectorAll('.zdo-mjesec-digit');
  if (zdoMesecDigits.length >= 2) {
    zdoMesecDigits[0].value = mesec[0];
    zdoMesecDigits[1].value = mesec[1];
  }

  const zdoGodinaDigits = document.querySelectorAll('.zdo-godina-digit');
  if (zdoGodinaDigits.length >= 4) {
    zdoGodinaDigits[0].value = godina[0];
    zdoGodinaDigits[1].value = godina[1];
    zdoGodinaDigits[2].value = godina[2];
    zdoGodinaDigits[3].value = godina[3];
  }

  // VAŽNO: Za prijavu radnika - očisti polja za prestanak osiguranja
  clearPrestankFields();
}

/**
 * Funkcija za čišćenje polja za prestanak osiguranja (za prijavu radnika)
 */
function clearPrestankFields() {
  // Očisti prestanak zdravstvo kockicu
  const prestanakZdravstvoDigits = document.querySelectorAll(
    '.prestanak-zdravstvo-digit'
  );
  prestanakZdravstvoDigits.forEach(digit => {
    digit.value = '';
  });

  // Očisti prestanak PIO kockicu
  const prestanakPioDigits = document.querySelectorAll('.prestanak-pio-digit');
  prestanakPioDigits.forEach(digit => {
    digit.value = '';
  });
}

/**
 * Popunjavanje datum polja za odjavu radnika
 */
function fillDateFieldsForOdjava(radnik, otkazData = null) {
  // Za odjavu radnika - popuni prestanak polja sa "1" i koristi datum otkaza

  let datumPrestanka = null;

  // Prioritet: datum_otkaza iz tabele otkazi, zatim datum_prestanka iz radnici
  if (otkazData && otkazData.datum_otkaza) {
    datumPrestanka = otkazData.datum_otkaza;
    console.log('Koristim datum_otkaza iz tabele otkazi:', datumPrestanka);
  } else if (radnik.datum_prestanka) {
    datumPrestanka = radnik.datum_prestanka;
    console.log('Koristim datum_prestanka iz tabele radnici:', datumPrestanka);
  } else {
    console.warn('Nema dostupnog datuma prestanka/otkaza');
  }

  if (datumPrestanka) {
    const datum = new Date(datumPrestanka);
    const dan = String(datum.getDate()).padStart(2, '0');
    const mesec = String(datum.getMonth() + 1).padStart(2, '0');
    const godina = String(datum.getFullYear());

    console.log(`Formatiran datum prestanka: ${dan}.${mesec}.${godina}`);

    // Popuni PIO datum polja sa datumom prestanka
    const pioDigits = document.querySelectorAll('.pio-digit');
    if (pioDigits.length >= 8) {
      pioDigits[0].value = dan[0];
      pioDigits[1].value = dan[1];
      pioDigits[2].value = mesec[0];
      pioDigits[3].value = mesec[1];
      pioDigits[4].value = godina[0];
      pioDigits[5].value = godina[1];
      pioDigits[6].value = godina[2];
      pioDigits[7].value = godina[3];
    }

    // Popuni ZDO datum polja sa datumom prestanka
    const zdoDanDigits = document.querySelectorAll('.zdo-dan-digit');
    if (zdoDanDigits.length >= 2) {
      zdoDanDigits[0].value = dan[0];
      zdoDanDigits[1].value = dan[1];
    }

    const zdoMesecDigits = document.querySelectorAll('.zdo-mjesec-digit');
    if (zdoMesecDigits.length >= 2) {
      zdoMesecDigits[0].value = mesec[0];
      zdoMesecDigits[1].value = mesec[1];
    }

    const zdoGodinaDigits = document.querySelectorAll('.zdo-godina-digit');
    if (zdoGodinaDigits.length >= 4) {
      zdoGodinaDigits[0].value = godina[0];
      zdoGodinaDigits[1].value = godina[1];
      zdoGodinaDigits[2].value = godina[2];
      zdoGodinaDigits[3].value = godina[3];
    }
  }

  // VAŽNO: Za odjavu radnika - popuni prestanak polja sa "1"
  fillPrestankFields();

  // VAŽNO: Za odjavu radnika - očisti dodatna polja koja trebaju biti prazna
  clearFieldsForOdjava();
}

/**
 * Funkcija za čišćenje polja koja trebaju biti prazna pri odjavi radnika
 */
function clearFieldsForOdjava() {
  // Očisti field-opstina-dodatno
  const opstinaDodatnoField = document.querySelector('.field-opstina-dodatno');
  if (opstinaDodatnoField) {
    opstinaDodatnoField.value = '';
  }

  // Očisti osnov osiguranja (zdravstvo kockicu)
  const zdravstvoDigits = document.querySelectorAll('.zdravstvo-digit');
  zdravstvoDigits.forEach(digit => {
    digit.value = '';
  });

  // Očisti osnov osiguranja (osnov-digit kockice)
  const osnovDigits = document.querySelectorAll('.osnov-digit');
  osnovDigits.forEach(digit => {
    digit.value = '';
  });

  // Očisti radno vrijeme
  const radnoVrijemeField = document.querySelector('.field-radno-vrijeme');
  if (radnoVrijemeField) {
    radnoVrijemeField.value = '';
  }
}

/**
 * Funkcija za popunjavanje polja za prestanak osiguranja sa "1" (za odjavu radnika)
 */
function fillPrestankFields() {
  // Popuni prestanak zdravstvo kockicu sa "1"
  const prestanakZdravstvoDigits = document.querySelectorAll(
    '.prestanak-zdravstvo-digit'
  );
  prestanakZdravstvoDigits.forEach(digit => {
    digit.value = '1';
  });

  // Popuni prestanak PIO kockicu sa "1"
  const prestanakPioDigits = document.querySelectorAll('.prestanak-pio-digit');
  prestanakPioDigits.forEach(digit => {
    digit.value = '1';
  });
}

// =============================================================================
// INICIJALIZACIJA
// =============================================================================

/**
 * Inicijalizacija za JPR Koricu
 */
async function initializeJPRKorica() {
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
}

/**
 * Inicijalizacija za JPR Dodatak B
 */
function initializeJPRDodatakB() {
  populateBasicFieldsJPRDodatakB();
}

/**
 * Glavna inicijalizacija - detektuje koji dokument je učitan
 */
function initializeJPR() {
  // Detektuj koji dokument je učitan na osnovu naslova ili elemenata
  const title = document.title;

  if (
    title.includes('DODATAK B') ||
    document.querySelector('.jmbg-container')
  ) {
    // JPR Dodatak B
    initializeJPRDodatakB();
  } else if (
    title.includes('JPR Obrazac') ||
    document.querySelector('.maticni-box')
  ) {
    // JPR Korica
    initializeJPRKorica();
  }
}

// Automatsko pokretanje prilikom učitavanja stranice
document.addEventListener('DOMContentLoaded', initializeJPR);
