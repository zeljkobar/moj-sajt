let izabranaFirma, naziv, pib, adresa;
let isCheked = false;

let OvlascenoLicePrezimeIme = '';
let OvlascenoLicePIB = '';
let KontaktTelefon = '';
let KontaktEmail = '';

const form = document.querySelector('form');
const inputs = form.querySelectorAll('input');
const select = document.getElementById('mySelect');
const vrijednostiPolja = [];

// Funkcija za dobijanje godine iz input polja
function getGodina() {
  const godinaInput = document.getElementById('godina');
  return godinaInput ? parseInt(godinaInput.value) || 2024 : 2024;
}

// Funkcija za ažuriranje godina u labelima
function updateGodine() {
  const trenutnaGodina = getGodina();

  // Ažuriranje PG1 sekcije (poslovni gubici)
  for (let i = 1; i <= 5; i++) {
    const godina = trenutnaGodina - i;
    const label = document.querySelector(`label[for="pg1_2${i}"]`);
    if (label) {
      label.textContent = `${godina} godina`;
    }
  }

  // Ažuriranje PG2 sekcije (kapitalni gubici)
  for (let i = 1; i <= 5; i++) {
    const godina = trenutnaGodina - i;
    const label = document.querySelector(`label[for="pg2_2${i}"]`);
    if (label) {
      label.textContent = `${godina} godina`;
    }
  }
}

let rezultat,
  dobit9,
  dobit12,
  dobit15,
  ukupnaDobit,
  gubitak,
  dobit,
  ostatakOporeziveDobiti,
  gubPrethGod,
  kapDob,
  kapGub,
  kapDobitak,
  kapGubitak,
  ostKapDob,
  poreskaOsnovica,
  umanjenjePoreskeOsnovice,
  oporezivaDobitNakonUmanjenja,
  utvrdjenaPoreskaObaveza,
  ukupnoPlacenPorez,
  porezKojiSeDuguje,
  preplaceniPorez,
  mjesecnaAkontacija,
  ukupnoGubici,
  ukupnoKapGubici,
  x38_vrijednost,
  x40_vrijednost,
  x49_vrijednost,
  ukupnoUmanjenje55,
  ukupnoUmanjenje56,
  ukupnaPoreskaObaveza,
  prenijetiKapitalniGubici;

// Podaci o firmama iz baze
let firmeData = [];

// Učitavanje podataka kad se stranica učita
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded - pokušavam da učitam firme...');

  // Učitaj podatke o trenutno ulogovanom korisniku
  try {
    const authResponse = await fetch('/api/check-auth', {
      credentials: 'include',
    });
    if (authResponse.ok) {
      const authData = await authResponse.json();
      if (authData.authenticated && authData.user) {
        populateUserData(authData.user);
      }
    }
  } catch (error) {
    console.error('Greška pri učitavanju korisničkih podataka:', error);
  }

  // Učitaj firme iz baze
  try {
    const responseFirme = await fetch('/api/firme', {
      credentials: 'include',
    });
    if (responseFirme.ok) {
      const data = await responseFirme.json();
      firmeData = data.firme || [];
      console.log('Firme učitane:', firmeData.length);
      populateFirmeDropdown();

      // Provjeri URL parametre za automatsko biranje firme
      const urlParams = new URLSearchParams(window.location.search);
      const firmaId = urlParams.get('firmaId');
      if (firmaId) {
        console.log('Automatsko biranje firme ID:', firmaId);
        autoSelectFirma(firmaId);
      }
    }
  } catch (error) {
    console.error('Greška pri učitavanju firmi:', error);
  }

  // Ažuriraj godine pri učitavanju stranice
  updateGodine();

  // Dodaj event listener za promenu godine
  const godinaInput = document.getElementById('godina');
  if (godinaInput) {
    godinaInput.addEventListener('input', updateGodine);
    godinaInput.addEventListener('change', updateGodine);
  }
});

// Funkcija za popunjavanje podataka o ovlašćenom licu
function populateUserData(user) {
  if (!user) return;

  if (user.ime && user.prezime) {
    OvlascenoLicePrezimeIme = `${user.ime} ${user.prezime}`;
  }

  if (user.jmbg) {
    OvlascenoLicePIB = user.jmbg;
  }

  if (user.telefon) {
    KontaktTelefon = user.telefon;
  }

  if (user.email) {
    KontaktEmail = user.email;
  }

  console.log('Podaci o ovlašćenom licu popunjeni:', {
    ime: OvlascenoLicePrezimeIme,
    pib: OvlascenoLicePIB,
    telefon: KontaktTelefon,
    email: KontaktEmail,
  });
}

// Popunjavanje dropdown-a sa firmama iz baze
function populateFirmeDropdown() {
  console.log('populateFirmeDropdown pozvano');

  if (!select) {
    console.error('mySelect element nije pronađen!');
    return;
  }

  // Dodaj prazan option
  select.innerHTML = '<option value="">-- Izaberi firmu --</option>';

  // Dodaj sve firme
  firmeData.forEach(firma => {
    const option = document.createElement('option');
    option.value = firma.pib;
    option.textContent = `${firma.naziv} (PIB: ${firma.pib})`;
    select.appendChild(option);
  });

  console.log('Dropdown popunjen sa', firmeData.length, 'firmi');
}

// Funkcija za automatsko biranje firme na osnovu ID-ja
function autoSelectFirma(firmaId) {
  console.log('autoSelectFirma pozvano sa ID:', firmaId);

  // Pronađi firmu po ID-ju
  const firma = firmeData.find(f => f.id == firmaId);
  if (!firma) {
    console.warn('Firma sa ID', firmaId, 'nije pronađena');
    return;
  }

  console.log('Pronađena firma:', firma);

  // Selektuj firmu u dropdown-u (koristimo PIB kao value)
  if (select) {
    select.value = firma.pib;

    // Aktiviraj funkcionalnost za popunjavanje podataka firme
    // Postavi globalne varijable
    izabranaFirma = firma.pib;
    naziv = firma.naziv;
    pib = firma.pib;
    adresa = firma.adresa;

    console.log('Firma automatski izabrana:', firma.naziv);
  } else {
    console.error('mySelect element nije pronađen!');
  }
}

// dodaje sve inpute u niz vrijednostiPolja
inputs.forEach(function (input) {
  vrijednostiPolja[input.name] = 0;
  input.addEventListener('blur', function () {
    vrijednostiPolja[input.name] = parseFloat(input.value);
    if (!input.value) vrijednostiPolja[input.name] = 0;
    if (input.name === 'x15a' || input.name === 'x15b') {
      const x15a = vrijednostiPolja['x15a'] || 0;
      const x15b = vrijednostiPolja['x15b'] || 0;
      const x15Total = x15a + x15b;
      vrijednostiPolja['x15'] = x15Total;
      const x15Input = document.getElementById('x15');
      if (x15Input) {
        x15Input.value = x15Total;
      }
    }
    if (
      input.name === 'x18a' ||
      input.name === 'x18b' ||
      input.name === 'x18c'
    ) {
      const x18a = vrijednostiPolja['x18a'] || 0;
      const x18b = vrijednostiPolja['x18b'] || 0;
      const x18c = vrijednostiPolja['x18c'] || 0;
      const x18Total = x18a + x18b + x18c;
      vrijednostiPolja['x18'] = x18Total;
      const x18Input = document.getElementById('x18');
      if (x18Input) {
        x18Input.value = x18Total;
      }
    }
    if (input.name === 'x21a' || input.name === 'x21b') {
      const x21a = vrijednostiPolja['x21a'] || 0;
      const x21b = vrijednostiPolja['x21b'] || 0;
      const x21Total = x21a + x21b;
      vrijednostiPolja['x21'] = x21Total;
      const x21Input = document.getElementById('x21');
      if (x21Input) {
        x21Input.value = x21Total;
      }
    }
    if (input.name === 'x26' || input.name === 'x27') {
      const x26 = vrijednostiPolja['x26'] || 0;
      const x27 = vrijednostiPolja['x27'] || 0;
      const x28 = x26 - x27 > 0 ? x26 - x27 : 0;
      vrijednostiPolja['x28'] = x28;
      const x28Input = document.getElementById('x28');
      if (x28Input) {
        x28Input.value = x28;
      }
    }
    if (input.name === 'x32' || input.name === 'x33') {
      const x32 = vrijednostiPolja['x32'] || 0;
      const x33 = vrijednostiPolja['x33'] || 0;
      const x34 = x33 - x32 > 0 ? x33 - x32 : 0;
      vrijednostiPolja['x34'] = x34;
      const x34Input = document.getElementById('x34');
      if (x34Input) {
        x34Input.value = x34;
      }
    }
    if (input.name === 'x49a' || input.name === 'x49b') {
      const x49a = vrijednostiPolja['x49a'] || 0;
      const x49b = vrijednostiPolja['x49b'] || 0;
      const x49Total = x49a + x49b;
      vrijednostiPolja['x49'] = x49Total;
      const x49Input = document.getElementById('x49');
      if (x49Input) {
        x49Input.value = x49Total;
      }
    }
    if (
      input.name === 'x55a' ||
      input.name === 'x55b' ||
      input.name === 'x55c'
    ) {
      const x55a = vrijednostiPolja['x55a'] || 0;
      const x55b = vrijednostiPolja['x55b'] || 0;
      const x55c = vrijednostiPolja['x55c'] || 0;
      const x55Total = x55a + x55b + x55c;
      vrijednostiPolja['x55'] = x55Total;
      const x55Input = document.getElementById('x55');
      if (x55Input) {
        x55Input.value = x55Total;
      }
    }
    if (input.name === 'x56a' || input.name === 'x56b') {
      const x56a = vrijednostiPolja['x56a'] || 0;
      const x56b = vrijednostiPolja['x56b'] || 0;
      const x56Total = x56a + x56b;
      vrijednostiPolja['x56'] = x56Total;
      const x56Input = document.getElementById('x56');
      if (x56Input) {
        x56Input.value = x56Total;
      }
    }
    console.log(vrijednostiPolja);
    preracun(vrijednostiPolja);
    update();
  });
});

function update() {
  document.getElementById('x38').value = dobit;
  document.getElementById('x39').value = gubitak;
  document.getElementById('x40').value = x40_vrijednost;
  document.getElementById('x41').value = ostatakOporeziveDobiti;

  document.getElementById('x42').value = kapDob;
  document.getElementById('x43').value = kapGub;
  document.getElementById('x44').value = kapDobitak;
  document.getElementById('x45').value = kapGubitak;
  document.getElementById('x47').value = ostKapDob;
  document.getElementById('x48').value = poreskaOsnovica;

  document.getElementById('x49').value = x49_vrijednost;
  document.getElementById('x50').value = oporezivaDobitNakonUmanjenja;
  const x51Input = document.getElementById('x51');
  if (x51Input) {
    x51Input.value = 0;
  }
  document.getElementById('x51a').value = dobit9;
  document.getElementById('x51b').value = dobit12;
  document.getElementById('x51c').value = dobit15;
  document.getElementById('x52').value = ukupnaDobit;
  document.getElementById('x55').value = ukupnoUmanjenje55;
  document.getElementById('x56').value = ukupnoUmanjenje56;
  document.getElementById('x57').value = utvrdjenaPoreskaObaveza;
  document.getElementById('x59').value = ukupnaPoreskaObaveza;

  document.getElementById('pg1_1').value = dobit;
  document.getElementById('pg1_2').value = ukupnoGubici;
  document.getElementById('pg2_1').value = kapDobitak;
  document.getElementById('pg2_2').value = ukupnoKapGubici;
  document.getElementById('x46').value = prenijetiKapitalniGubici;
  vrijednostiPolja['x46'] = prenijetiKapitalniGubici;
}

function preracun(vrijednosti) {
  if (vrijednosti['x01']) {
    rezultat =
      vrijednosti['x01'] -
      vrijednosti['x03'] +
      vrijednosti['x04'] +
      vrijednosti['x05'] -
      vrijednosti['x06'] +
      vrijednosti['x07'] +
      vrijednosti['x08'] +
      vrijednosti['x09'] +
      vrijednosti['x10'] +
      vrijednosti['x11'] +
      vrijednosti['x12'] +
      vrijednosti['x13'] +
      vrijednosti['x14'] +
      vrijednosti['x15'] +
      vrijednosti['x16'] +
      vrijednosti['x17'] +
      vrijednosti['x18'] +
      vrijednosti['x19'] +
      vrijednosti['x20'] +
      vrijednosti['x21'] +
      vrijednosti['x22'] +
      vrijednosti['x23'] +
      vrijednosti['x24'] +
      -vrijednosti['x25'] +
      vrijednosti['x28'] +
      vrijednosti['x29'] +
      vrijednosti['x30'] +
      vrijednosti['x31'] +
      vrijednosti['x34'] -
      vrijednosti['x35'] -
      vrijednosti['x36'] -
      vrijednosti['x37'];

    console.log('postoji dobit');
    if (rezultat < 0) {
      gubitak = Math.abs(rezultat);
      dobit9 = 0;
      dobit12 = 0;
      dobit15 = 0;
      dobit = 0;
    } else {
      dobit = rezultat;
      gubitak = 0;
    }
  } else {
    rezultat =
      vrijednosti['x02'] +
      vrijednosti['x03'] -
      vrijednosti['x04'] -
      vrijednosti['x05'] +
      vrijednosti['x06'] -
      vrijednosti['x07'] -
      vrijednosti['x08'] -
      vrijednosti['x09'] -
      vrijednosti['x10'] -
      vrijednosti['x11'] -
      vrijednosti['x12'] -
      vrijednosti['x13'] -
      vrijednosti['x14'] -
      vrijednosti['x15'] -
      vrijednosti['x16'] -
      vrijednosti['x17'] -
      vrijednosti['x18'] -
      vrijednosti['x19'] -
      vrijednosti['x20'] -
      vrijednosti['x21'] -
      vrijednosti['x22'] -
      vrijednosti['x23'] -
      vrijednosti['x24'] -
      +vrijednosti['x25'] -
      vrijednosti['x28'] -
      vrijednosti['x29'] -
      vrijednosti['x30'] -
      vrijednosti['x31'] -
      vrijednosti['x34'] +
      vrijednosti['x35'] +
      vrijednosti['x36'] +
      vrijednosti['x37'];
    console.log('postoji gubitak');

    if (rezultat < 0) {
      dobit = Math.abs(rezultat);
      gubitak = 0;
    } else {
      gubitak = rezultat;
      dobit = 0;
      dobit9 = 0;
      dobit12 = 0;
      dobit15 = 0;
    }
  }

  kapDob = vrijednosti['x03'];
  kapGub = vrijednosti['x04'];
  ostatakOporeziveDobiti = 0;

  // Izračunaj ukupne gubice za x38
  ukupnoGubici =
    vrijednostiPolja['pg1_21'] +
    vrijednostiPolja['pg1_22'] +
    vrijednostiPolja['pg1_23'] +
    vrijednostiPolja['pg1_24'] +
    vrijednostiPolja['pg1_25'];

  // x40 se automatski popunjava sa ukupnim gubicima ranijih godina
  x40_vrijednost = ukupnoGubici;

  // Ali ako je ta vrednost veća od dobiti (x38), onda je jednaka dobiti
  if (x40_vrijednost > dobit) {
    x40_vrijednost = dobit;
  }

  ostatakOporeziveDobiti = dobit - x40_vrijednost;

  kapDobitak = Math.max(kapDob - kapGub, 0);
  kapGubitak = Math.max(kapGub - kapDob, 0);

  prenijetiKapitalniGubici = vrijednostiPolja['pg2_3'] || 0;
  ostKapDob = Math.max(kapDobitak - prenijetiKapitalniGubici, 0);
  poreskaOsnovica = ostatakOporeziveDobiti + ostKapDob;

  umanjenjePoreskeOsnovice =
    (vrijednosti['x49a'] || 0) + (vrijednosti['x49b'] || 0);
  x49_vrijednost = umanjenjePoreskeOsnovice;

  oporezivaDobitNakonUmanjenja = Math.max(
    poreskaOsnovica - umanjenjePoreskeOsnovice,
    0
  );

  switch (true) {
    case oporezivaDobitNakonUmanjenja < 100000:
      dobit9 = (oporezivaDobitNakonUmanjenja * 9) / 100;
      dobit12 = 0;
      dobit15 = 0;
      break;
    case oporezivaDobitNakonUmanjenja < 1500000:
      dobit9 = 9000;
      dobit12 = ((oporezivaDobitNakonUmanjenja - 100000) * 12) / 100;
      dobit15 = 0;
      break;
    default:
      dobit9 = 9000;
      dobit12 = 168000;
      dobit15 = ((oporezivaDobitNakonUmanjenja - 1500000) * 15) / 100;
      break;
  }

  ukupnaDobit = dobit9 + dobit12 + dobit15;
  ukupnoUmanjenje55 =
    (vrijednosti['x55a'] || 0) +
    (vrijednosti['x55b'] || 0) +
    (vrijednosti['x55c'] || 0);
  ukupnoUmanjenje56 = (vrijednosti['x56a'] || 0) + (vrijednosti['x56b'] || 0);

  utvrdjenaPoreskaObaveza =
    ukupnaDobit -
    (vrijednosti['x53'] || 0) -
    (vrijednosti['x54'] || 0) -
    ukupnoUmanjenje55 -
    ukupnoUmanjenje56;

  ukupnaPoreskaObaveza = Math.max(
    utvrdjenaPoreskaObaveza - (vrijednosti['x58'] || 0),
    0
  );

  ukupnoKapGubici =
    vrijednostiPolja['pg2_21'] +
    vrijednostiPolja['pg2_22'] +
    vrijednostiPolja['pg2_23'] +
    vrijednostiPolja['pg2_24'] +
    vrijednostiPolja['pg2_25'];

  console.log('rezultatDobit ', rezultat);
  console.log('gubitak ', gubitak);
  console.log('dobit ', dobit);
  console.log('dobit9 je', dobit9, dobit12, dobit15);
  console.log(vrijednosti['38']);
  console.log(ostatakOporeziveDobiti);
  console.log(kapDob, kapGub);
}

// funkcija za izvoz xml-a
function download(filename, text) {
  var element = document.createElement('a');
  element.style.display = 'none';

  element.setAttribute(
    'href',
    'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
  );
  element.setAttribute('download', filename);
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// prelazak na enter na novo polje
form.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const formElements = Array.from(form.querySelectorAll('input, select'));
    const currentIndex = formElements.indexOf(event.target);
    if (currentIndex < formElements.length - 1) {
      formElements[currentIndex + 1].focus();
    }
  }
});

// selektuje izabranu firmu
select.addEventListener('change', event => {
  const selectedPib = event.target.value;
  if (selectedPib) {
    izabranaFirma = firmeData.find(firma => firma.pib === selectedPib);
    if (izabranaFirma) {
      naziv = izabranaFirma.naziv;
      pib = izabranaFirma.pib;
      adresa = izabranaFirma.adresa;
      console.log('Izabrana firma:', izabranaFirma);
    }
  }
});

// Checkbox za izmenjenu prijavu
document.getElementById('checkbox').addEventListener('change', function () {
  isCheked = this.checked;
});

// kreira xml - IDENTIČAN ORIGINAL EXPORT
document.getElementById('download-btn').addEventListener(
  'click',
  function () {
    if (!izabranaFirma) {
      alert('Molimo izaberite firmu pre eksportovanja XML-a');
      return;
    }

    const godina = getGodina();

    if (godina < 2020 || godina > 2030) {
      alert('Molimo unesite validnu godinu (2020-2030)');
      return;
    }

    inputs.forEach(function (input) {
      vrijednostiPolja[input.name] = parseFloat(input.value);
      if (!vrijednostiPolja[input.name]) {
        vrijednostiPolja[input.name] = 0;
      }
      console.log(vrijednostiPolja);
    });

    var text = `<?xml version="1.0" encoding="utf-8"?>
    <PD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
      <PoreskiPeriodOd />
      <PoreskiPeriodDo />
      <Iznos1>${vrijednostiPolja['x01']}</Iznos1>
      <Iznos2>${vrijednostiPolja['x02']}</Iznos2>
      <Iznos3>${vrijednostiPolja['x03']}</Iznos3>
      <Iznos4>${vrijednostiPolja['x04']}</Iznos4>
      <Iznos5>${vrijednostiPolja['x05']}</Iznos5>
      <Iznos6>${vrijednostiPolja['x06']}</Iznos6>
      <Iznos7>${vrijednostiPolja['x07']}</Iznos7>
      <Iznos8>${vrijednostiPolja['x08']}</Iznos8>
      <Iznos9>${vrijednostiPolja['x09']}</Iznos9>
      <Iznos10>${vrijednostiPolja['x10']}</Iznos10>
      <Iznos11>${vrijednostiPolja['x11']}</Iznos11>
      <Iznos12>${vrijednostiPolja['x12']}</Iznos12>
      <Iznos13>${vrijednostiPolja['x13']}</Iznos13>
      <Iznos14>${vrijednostiPolja['x14']}</Iznos14>
      <Iznos15>${vrijednostiPolja['x15']}</Iznos15>
      <Iznos15a>${vrijednostiPolja['x15a']}</Iznos15a>
      <Iznos15b>${vrijednostiPolja['x15b']}</Iznos15b>
      <Iznos16>${vrijednostiPolja['x16']}</Iznos16>
      <Iznos17>${vrijednostiPolja['x17']}</Iznos17>
      <Iznos18>${vrijednostiPolja['x18']}</Iznos18>
      <Iznos18a>${vrijednostiPolja['x18a']}</Iznos18a>
      <Iznos18b>${vrijednostiPolja['x18b']}</Iznos18b>
      <Iznos18c>${vrijednostiPolja['x18c']}</Iznos18c>
      <Iznos19>${vrijednostiPolja['x19']}</Iznos19>
      <Iznos20>${vrijednostiPolja['x20']}</Iznos20>
      <Iznos21>${vrijednostiPolja['x21']}</Iznos21>
      <Iznos21a>${vrijednostiPolja['x21a']}</Iznos21a>
      <Iznos21b>${vrijednostiPolja['x21b']}</Iznos21b>
      <Iznos22>${vrijednostiPolja['x22']}</Iznos22>
      <Iznos23>${vrijednostiPolja['x23']}</Iznos23>
      <Iznos24>${vrijednostiPolja['x24']}</Iznos24>
      <Iznos25>${vrijednostiPolja['x25']}</Iznos25>
      <Iznos26>${vrijednostiPolja['x26']}</Iznos26>
      <Iznos27>${vrijednostiPolja['x27']}</Iznos27>
      <Iznos28>${vrijednostiPolja['x28']}</Iznos28>
      <Iznos29>${vrijednostiPolja['x29']}</Iznos29>
      <Iznos30>${vrijednostiPolja['x30']}</Iznos30>
      <Iznos31>${vrijednostiPolja['x31']}</Iznos31>
      <Iznos32>${vrijednostiPolja['x32']}</Iznos32>
      <Iznos33>${vrijednostiPolja['x33']}</Iznos33>
      <Iznos34>${vrijednostiPolja['x34']}</Iznos34>
      <Iznos35>${vrijednostiPolja['x35']}</Iznos35>
      <Iznos36>${vrijednostiPolja['x36']}</Iznos36>
      <Iznos37>${vrijednostiPolja['x37']}</Iznos37>
      <Iznos38>${vrijednostiPolja['x38']}</Iznos38>
      <Iznos39>${vrijednostiPolja['x39']}</Iznos39>
      <Iznos40>${vrijednostiPolja['x40']}</Iznos40>
      <Iznos41>${vrijednostiPolja['x41']}</Iznos41>
      <Iznos42>${vrijednostiPolja['x42']}</Iznos42>
      <Iznos43>${vrijednostiPolja['x43']}</Iznos43>
      <Iznos44>${vrijednostiPolja['x44']}</Iznos44>
      <Iznos45>${vrijednostiPolja['x45']}</Iznos45>
      <Iznos46>${vrijednostiPolja['x46']}</Iznos46>
      <Iznos47>${vrijednostiPolja['x47']}</Iznos47>
      <Iznos48>${vrijednostiPolja['x48']}</Iznos48>
      <Iznos49>${vrijednostiPolja['x49']}</Iznos49>
      <Iznos49a>${vrijednostiPolja['x49a']}</Iznos49a>
      <Iznos49b>${vrijednostiPolja['x49b']}</Iznos49b>
      <Iznos50>${vrijednostiPolja['x50']}</Iznos50>
      <Iznos51>${vrijednostiPolja['x51']}</Iznos51>
      <Iznos51a>${vrijednostiPolja['x51a']}</Iznos51a>
      <Iznos51b>${vrijednostiPolja['x51b']}</Iznos51b>
      <Iznos51c>${vrijednostiPolja['x51c']}</Iznos51c>
      <Iznos52>${vrijednostiPolja['x52']}</Iznos52>
      <Iznos53>${vrijednostiPolja['x53']}</Iznos53>
      <Iznos54>${vrijednostiPolja['x54']}</Iznos54>
      <Iznos55>${vrijednostiPolja['x55']}</Iznos55>
      <Iznos55a>${vrijednostiPolja['x55a']}</Iznos55a>
      <Iznos55b>${vrijednostiPolja['x55b']}</Iznos55b>
      <Iznos55c>${vrijednostiPolja['x55c']}</Iznos55c>
      <Iznos56>${vrijednostiPolja['x56']}</Iznos56>
      <Iznos56a>${vrijednostiPolja['x56a']}</Iznos56a>
      <Iznos56b>${vrijednostiPolja['x56b']}</Iznos56b>
      <Iznos57>${vrijednostiPolja['x57']}</Iznos57>
      <Iznos58>${vrijednostiPolja['x58']}</Iznos58>
      <Iznos59>${vrijednostiPolja['x59']}</Iznos59>
      <IznosPG1_1>${vrijednostiPolja['pg1_1']}</IznosPG1_1>
      <IznosPG1_2>${vrijednostiPolja['pg1_2']}</IznosPG1_2>
      <IznosPG1_21>${vrijednostiPolja['pg1_21']}</IznosPG1_21>
      <IznosPG1_22>${vrijednostiPolja['pg1_22']}</IznosPG1_22>
      <IznosPG1_23>${vrijednostiPolja['pg1_23']}</IznosPG1_23>
      <IznosPG1_24>${vrijednostiPolja['pg1_24']}</IznosPG1_24>
      <IznosPG1_25>${vrijednostiPolja['pg1_25']}</IznosPG1_25>
      <IznosPG1_3>${vrijednostiPolja['pg1_3']}</IznosPG1_3>
      <IznosPG2_1>${vrijednostiPolja['pg2_1']}</IznosPG2_1>
      <IznosPG2_2>${vrijednostiPolja['pg2_2']}</IznosPG2_2>
      <IznosPG2_21>${vrijednostiPolja['pg2_21']}</IznosPG2_21>
      <IznosPG2_22>${vrijednostiPolja['pg2_22']}</IznosPG2_22>
      <IznosPG2_23>${vrijednostiPolja['pg2_23']}</IznosPG2_23>
      <IznosPG2_24>${vrijednostiPolja['pg2_24']}</IznosPG2_24>
      <IznosPG2_25>${vrijednostiPolja['pg2_25']}</IznosPG2_25>
      <IznosPG2_3>${vrijednostiPolja['pg2_3']}</IznosPG2_3>
    </PD>
    `;
    console.log(izabranaFirma.naziv);
    var filename = `${izabranaFirma.naziv}_${godina}.xml`;
    download(filename, text);
  },
  false
);
