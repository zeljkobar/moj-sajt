let izabranaFirma, naziv, pib, adresa;
let isCheked = false;

let OvlascenoLicePrezimeIme = "";
let OvlascenoLicePIB = "";
let KontaktTelefon = "";
let KontaktEmail = "";

const form = document.querySelector("form");
const inputs = form.querySelectorAll("input");
const select = document.getElementById("mySelect");
const vrijednostiPolja = [];

// Funkcija za dobijanje godine iz input polja
function getGodina() {
  const godinaInput = document.getElementById("godina");
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
  ostKapDob,
  poreskaOsnovica,
  utvrdjenaPoreskaObaveza,
  ukupnoPlacenPorez,
  porezKojiSeDuguje,
  preplaceniPorez,
  mjesecnaAkontacija,
  ukupnoGubici,
  ukupnoKapGubici,
  x38_vrijednost;

// Podaci o firmama iz baze
let firmeData = [];

// Učitavanje podataka kad se stranica učita
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded - pokušavam da učitam firme...");

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

  // Učitaj firme iz baze
  try {
    const responseFirme = await fetch("/api/firme", {
      credentials: "include",
    });
    if (responseFirme.ok) {
      const data = await responseFirme.json();
      firmeData = data.firme || [];
      console.log("Firme učitane:", firmeData.length);
      populateFirmeDropdown();

      // Provjeri URL parametre za automatsko biranje firme
      const urlParams = new URLSearchParams(window.location.search);
      const firmaId = urlParams.get("firmaId");
      if (firmaId) {
        console.log("Automatsko biranje firme ID:", firmaId);
        autoSelectFirma(firmaId);
      }
    }
  } catch (error) {
    console.error("Greška pri učitavanju firmi:", error);
  }

  // Ažuriraj godine pri učitavanju stranice
  updateGodine();

  // Dodaj event listener za promenu godine
  const godinaInput = document.getElementById("godina");
  if (godinaInput) {
    godinaInput.addEventListener("input", updateGodine);
    godinaInput.addEventListener("change", updateGodine);
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

  console.log("Podaci o ovlašćenom licu popunjeni:", {
    ime: OvlascenoLicePrezimeIme,
    pib: OvlascenoLicePIB,
    telefon: KontaktTelefon,
    email: KontaktEmail,
  });
}

// Popunjavanje dropdown-a sa firmama iz baze
function populateFirmeDropdown() {
  console.log("populateFirmeDropdown pozvano");

  if (!select) {
    console.error("mySelect element nije pronađen!");
    return;
  }

  // Dodaj prazan option
  select.innerHTML = '<option value="">-- Izaberi firmu --</option>';

  // Dodaj sve firme
  firmeData.forEach((firma) => {
    const option = document.createElement("option");
    option.value = firma.pib;
    option.textContent = `${firma.naziv} (PIB: ${firma.pib})`;
    select.appendChild(option);
  });

  console.log("Dropdown popunjen sa", firmeData.length, "firmi");
}

// Funkcija za automatsko biranje firme na osnovu ID-ja
function autoSelectFirma(firmaId) {
  console.log("autoSelectFirma pozvano sa ID:", firmaId);

  // Pronađi firmu po ID-ju
  const firma = firmeData.find((f) => f.id == firmaId);
  if (!firma) {
    console.warn("Firma sa ID", firmaId, "nije pronađena");
    return;
  }

  console.log("Pronađena firma:", firma);

  // Selektuj firmu u dropdown-u (koristimo PIB kao value)
  if (select) {
    select.value = firma.pib;

    // Aktiviraj funkcionalnost za popunjavanje podataka firme
    // Postavi globalne varijable
    izabranaFirma = firma.pib;
    naziv = firma.naziv;
    pib = firma.pib;
    adresa = firma.adresa;

    console.log("Firma automatski izabrana:", firma.naziv);
  } else {
    console.error("mySelect element nije pronađen!");
  }
}

// dodaje sve inpute u niz vrijednostiPolja
inputs.forEach(function (input) {
  vrijednostiPolja[input.name] = 0;
  input.addEventListener("blur", function () {
    vrijednostiPolja[input.name] = parseFloat(input.value);
    if (!input.value) vrijednostiPolja[input.name] = 0;
    console.log(vrijednostiPolja);
    preracun(vrijednostiPolja);
    update();
  });
});

function update() {
  document.getElementById("x36").value = dobit;
  document.getElementById("x37").value = gubitak;
  document.getElementById("x39").value = ostatakOporeziveDobiti;
  document.getElementById("x40").value = kapDob;
  document.getElementById("x41").value = kapGub;
  document.getElementById("x40").value > document.getElementById("x41").value
    ? (document.getElementById("x42").value =
        document.getElementById("x40").value -
        document.getElementById("x41").value)
    : (document.getElementById("x42").value = 0);
  document.getElementById("x40").value < document.getElementById("x41").value
    ? (document.getElementById("x43").value =
        document.getElementById("x41").value -
        document.getElementById("x40").value)
    : (document.getElementById("x43").value = 0);
  document.getElementById("x45").value = ostKapDob;
  document.getElementById("x46").value = poreskaOsnovica;
  document.getElementById("x48").value = poreskaOsnovica;
  document.getElementById("x49a").value = dobit9;
  document.getElementById("x49b").value = dobit12;
  document.getElementById("x49c").value = dobit15;
  document.getElementById("x50").value = ukupnaDobit;
  document.getElementById("x54").value = utvrdjenaPoreskaObaveza;
  document.getElementById("x57").value = ukupnoPlacenPorez;
  document.getElementById("x58").value = porezKojiSeDuguje;
  document.getElementById("x59").value = preplaceniPorez;
  document.getElementById("x62").value = mjesecnaAkontacija;
  document.getElementById("pg1_1").value = dobit;
  document.getElementById("pg1_2").value = ukupnoGubici;
  document.getElementById("x38").value = x38_vrijednost;
  document.getElementById("pg2_1").value = document.getElementById("x42").value;
  document.getElementById("pg2_2").value = ukupnoKapGubici;
  document.getElementById("x44").value = document.getElementById("pg2_3").value;
}

function preracun(vrijednosti) {
  if (vrijednosti["x01"]) {
    rezultat =
      vrijednosti["x01"] -
      vrijednosti["x03"] +
      vrijednosti["x04"] +
      vrijednosti["x05"] -
      vrijednosti["x06"] +
      vrijednosti["x07"] +
      vrijednosti["x08"] +
      vrijednosti["x09"] +
      vrijednosti["x10"] +
      vrijednosti["x11"] +
      vrijednosti["x12"] +
      vrijednosti["x13"] +
      vrijednosti["x14"] +
      vrijednosti["x15"] +
      vrijednosti["x16"] +
      vrijednosti["x17"] +
      vrijednosti["x18"] +
      vrijednosti["x19"] +
      vrijednosti["x20"] +
      vrijednosti["x21"] +
      vrijednosti["x22"] +
      vrijednosti["x23"] +
      vrijednosti["x24"] +
      vrijednosti["x27"] +
      vrijednosti["x28"] +
      vrijednosti["x29"] +
      vrijednosti["x32"] -
      vrijednosti["x33"] -
      vrijednosti["x34"] -
      vrijednosti["x35"];

    console.log("postoji dobit");
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
      vrijednosti["x02"] +
      vrijednosti["x03"] -
      vrijednosti["x04"] -
      vrijednosti["x05"] +
      vrijednosti["x06"] -
      vrijednosti["x07"] -
      vrijednosti["x08"] -
      vrijednosti["x09"] -
      vrijednosti["x10"] -
      vrijednosti["x11"] -
      vrijednosti["x12"] -
      vrijednosti["x13"] -
      vrijednosti["x14"] -
      vrijednosti["x15"] -
      vrijednosti["x16"] -
      vrijednosti["x17"] -
      vrijednosti["x18"] -
      vrijednosti["x19"] -
      vrijednosti["x20"] -
      vrijednosti["x21"] -
      vrijednosti["x22"] -
      vrijednosti["x23"] -
      vrijednosti["x24"] -
      vrijednosti["x27"] -
      vrijednosti["x28"] -
      vrijednosti["x29"] -
      vrijednosti["x32"] +
      vrijednosti["x33"] +
      vrijednosti["x34"] +
      vrijednosti["x35"];
    console.log("postoji gubitak");

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

  kapDob = vrijednosti["x03"];
  kapGub = vrijednosti["x04"];
  ostatakOporeziveDobiti = 0;

  // Izračunaj ukupne gubice za x38
  ukupnoGubici =
    vrijednostiPolja["pg1_21"] +
    vrijednostiPolja["pg1_22"] +
    vrijednostiPolja["pg1_23"] +
    vrijednostiPolja["pg1_24"] +
    vrijednostiPolja["pg1_25"];

  // x38 se automatski popunjava sa ukupnim gubicima ranijih godina
  x38_vrijednost = ukupnoGubici;

  // Ali ako je ta vrednost veća od dobiti (x36), onda je jednaka dobiti
  if (x38_vrijednost > dobit) {
    x38_vrijednost = dobit;
  }

  ostatakOporeziveDobiti = dobit - x38_vrijednost;
  ostKapDob = kapDob - vrijednosti["x44"];
  poreskaOsnovica = ostatakOporeziveDobiti + ostKapDob;

  switch (true) {
    case poreskaOsnovica < 100000:
      dobit9 = (poreskaOsnovica * 9) / 100;
      dobit12 = 0;
      dobit15 = 0;
      break;
    case poreskaOsnovica < 1500000:
      dobit9 = 9000;
      dobit12 = ((poreskaOsnovica - 100000) * 12) / 100;
      dobit15 = 0;
      break;
    default:
      dobit9 = 9000;
      dobit12 = 168000;
      dobit15 = ((poreskaOsnovica - 1500000) * 15) / 100;
      break;
  }

  ukupnaDobit = dobit9 + dobit12 + dobit15;
  utvrdjenaPoreskaObaveza =
    ukupnaDobit - vrijednosti["x51"] - vrijednosti["x52"] - vrijednosti["x53"];
  ukupnoPlacenPorez = vrijednosti["x55"] + vrijednosti["x56"];

  if (utvrdjenaPoreskaObaveza - ukupnoPlacenPorez > 0) {
    porezKojiSeDuguje = utvrdjenaPoreskaObaveza - ukupnoPlacenPorez;
    preplaceniPorez = 0;
  } else {
    porezKojiSeDuguje = 0;
    preplaceniPorez = ukupnoPlacenPorez - utvrdjenaPoreskaObaveza;
  }

  mjesecnaAkontacija = (utvrdjenaPoreskaObaveza / 12).toFixed(2);

  ukupnoKapGubici =
    vrijednostiPolja["pg2_21"] +
    vrijednostiPolja["pg2_22"] +
    vrijednostiPolja["pg2_23"] +
    vrijednostiPolja["pg2_24"] +
    vrijednostiPolja["pg2_25"];

  console.log("rezultatDobit ", rezultat);
  console.log("gubitak ", gubitak);
  console.log("dobit ", dobit);
  console.log("dobit9 je", dobit9, dobit12, dobit15);
  console.log(vrijednosti["38"]);
  console.log(ostatakOporeziveDobiti);
  console.log(kapDob, kapGub);
}

// funkcija za izvoz xml-a
function download(filename, text) {
  var element = document.createElement("a");
  element.style.display = "none";

  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// prelazak na enter na novo polje
form.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    const formElements = Array.from(form.querySelectorAll("input, select"));
    const currentIndex = formElements.indexOf(event.target);
    if (currentIndex < formElements.length - 1) {
      formElements[currentIndex + 1].focus();
    }
  }
});

// selektuje izabranu firmu
select.addEventListener("change", (event) => {
  const selectedPib = event.target.value;
  if (selectedPib) {
    izabranaFirma = firmeData.find((firma) => firma.pib === selectedPib);
    if (izabranaFirma) {
      naziv = izabranaFirma.naziv;
      pib = izabranaFirma.pib;
      adresa = izabranaFirma.adresa;
      console.log("Izabrana firma:", izabranaFirma);
    }
  }
});

// Checkbox za izmenjenu prijavu
document.getElementById("checkbox").addEventListener("change", function () {
  isCheked = this.checked;
});

// kreira xml - IDENTIČAN ORIGINAL EXPORT
document.getElementById("download-btn").addEventListener(
  "click",
  function () {
    if (!izabranaFirma) {
      alert("Molimo izaberite firmu pre eksportovanja XML-a");
      return;
    }

    const godina = getGodina();

    if (godina < 2020 || godina > 2030) {
      alert("Molimo unesite validnu godinu (2020-2030)");
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
    <PortalCitReturn2025 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
      <PIB>${pib}</PIB>
      <Godina>${godina}</Godina>
      <Od>${godina}-01-01T00:00:00</Od>
      <Do>${godina}-12-31T00:00:00</Do>
      <Izmijenjena>${isCheked}</Izmijenjena>
      <Naziv>${izabranaFirma.naziv}</Naziv>
      <Rezident>true</Rezident>
      <Adresa>${izabranaFirma.adresa}</Adresa>
      <OvlascenoLicePIB>${OvlascenoLicePIB}</OvlascenoLicePIB>
      <OvlascenoLicePrezimeIme>${OvlascenoLicePrezimeIme}</OvlascenoLicePrezimeIme>
      <KontaktEmail>${KontaktEmail}</KontaktEmail>
      <KontaktTelefon>${KontaktTelefon}</KontaktTelefon>
      <KonsOdobreno>ne</KonsOdobreno>
      <KonsDatumRjesenja xsi:nil="true" />
      <Iznos1>${vrijednostiPolja["x01"]}</Iznos1>
      <Iznos2>${vrijednostiPolja["x02"]}</Iznos2>
      <Iznos3>${vrijednostiPolja["x03"]}</Iznos3>
      <Iznos4>${vrijednostiPolja["x04"]}</Iznos4>
      <Iznos5>${vrijednostiPolja["x05"]}</Iznos5>
      <Iznos6>${vrijednostiPolja["x06"]}</Iznos6>
      <Iznos7>${vrijednostiPolja["x07"]}</Iznos7>
      <Iznos8>${vrijednostiPolja["x08"]}</Iznos8>
      <Iznos9>${vrijednostiPolja["x09"]}</Iznos9>
      <Iznos10>${vrijednostiPolja["x10"]}</Iznos10>
      <Iznos11>${vrijednostiPolja["x11"]}</Iznos11>
      <Iznos12>${vrijednostiPolja["x12"]}</Iznos12>
      <Iznos13>${vrijednostiPolja["x13"]}</Iznos13>
      <Iznos14>${vrijednostiPolja["x14"]}</Iznos14>
      <Iznos15a>${vrijednostiPolja["x15"]}</Iznos15a>
      <Iznos15b>${vrijednostiPolja["x15"]}</Iznos15b>
      <Iznos16>${vrijednostiPolja["x16"]}</Iznos16>
      <Iznos17>${vrijednostiPolja["x17"]}</Iznos17>
      <Iznos18a>${vrijednostiPolja["x18"]}</Iznos18a>
      <Iznos18b>${vrijednostiPolja["x18"]}</Iznos18b>
      <Iznos19>${vrijednostiPolja["x19"]}</Iznos19>
      <Iznos20>${vrijednostiPolja["x20"]}</Iznos20>
      <Iznos21a>${vrijednostiPolja["x21"]}</Iznos21a>
      <Iznos21b>${vrijednostiPolja["x21"]}</Iznos21b>
      <Iznos22>0</Iznos22>
      <Iznos23>${vrijednostiPolja["x22"]}</Iznos23>
      <Iznos24>${vrijednostiPolja["x24"]}</Iznos24>
      <Iznos25>0</Iznos25>
      <Iznos26>${vrijednostiPolja["x25"]}</Iznos26>
      <Iznos27>${vrijednostiPolja["x26"]}</Iznos27>
      <Iznos28>${vrijednostiPolja["x27"]}</Iznos28>
      <Iznos29>${vrijednostiPolja["x28"]}</Iznos29>
      <Iznos30>${vrijednostiPolja["x29"]}</Iznos30>
      <Iznos31>0</Iznos31>
      <Iznos32>${vrijednostiPolja["x30"]}</Iznos32>
      <Iznos33>${vrijednostiPolja["x31"]}</Iznos33>
      <Iznos34>${vrijednostiPolja["x32"]}</Iznos34>
      <Iznos35>${vrijednostiPolja["x33"]}</Iznos35>
      <Iznos36>${vrijednostiPolja["x34"]}</Iznos36>
      <Iznos37>${vrijednostiPolja["x35"]}</Iznos37>
      <Iznos38>${vrijednostiPolja["x36"]}</Iznos38>
      <Iznos39>${vrijednostiPolja["x37"]}</Iznos39>
      <Iznos40>${vrijednostiPolja["x38"]}</Iznos40>
      <Iznos41>${vrijednostiPolja["x39"]}</Iznos41>
      <Iznos42>${vrijednostiPolja["x40"]}</Iznos42>
      <Iznos43>${vrijednostiPolja["x41"]}</Iznos43>
      <Iznos44>${vrijednostiPolja["x42"]}</Iznos44>
      <Iznos45>${vrijednostiPolja["x43"]}</Iznos45>
      <Iznos46>${vrijednostiPolja["x44"]}</Iznos46>
      <Iznos47>${vrijednostiPolja["x45"]}</Iznos47>
      <Iznos48>${vrijednostiPolja["x46"]}</Iznos48>
      <Iznos49a>${vrijednostiPolja["x47"]}</Iznos49a>
      <Iznos49b>${vrijednostiPolja["x47"]}</Iznos49b>
      <Iznos50>${vrijednostiPolja["x48"]}</Iznos50>
      <Iznos51a>${vrijednostiPolja["x49a"]}</Iznos51a>
      <Iznos51b>${vrijednostiPolja["x49b"]}</Iznos51b>
      <Iznos51c>${vrijednostiPolja["x49c"]}</Iznos51c>
      <Iznos52>${vrijednostiPolja["x50"]}</Iznos52>
      <Iznos53>${vrijednostiPolja["x51"]}</Iznos53>
      <Iznos54>${vrijednostiPolja["x52"]}</Iznos54>
      <Iznos55a>${vrijednostiPolja["x53"]}</Iznos55a>
      <Iznos55b>${vrijednostiPolja["x53"]}</Iznos55b>
      <Iznos55c>${vrijednostiPolja["x53"]}</Iznos55c>
      <Iznos56>${vrijednostiPolja["x54"]}</Iznos56>
      <Iznos57>${vrijednostiPolja["x56"]}</Iznos57>
      <Iznos58>${vrijednostiPolja["x58"]}</Iznos58>
      <IznosPG1_1>${vrijednostiPolja["pg1_1"]}</IznosPG1_1>
      <IznosPG1_2>${vrijednostiPolja["pg1_2"]}</IznosPG1_2>
      <IznosPG1_21>${vrijednostiPolja["pg1_21"]}</IznosPG1_21>
      <IznosPG1_22>${vrijednostiPolja["pg1_22"]}</IznosPG1_22>
      <IznosPG1_23>${vrijednostiPolja["pg1_23"]}</IznosPG1_23>
      <IznosPG1_24>${vrijednostiPolja["pg1_24"]}</IznosPG1_24>
      <IznosPG1_25>${vrijednostiPolja["pg1_25"]}</IznosPG1_25>
      <IznosPG1_3>${vrijednostiPolja["pg1_3"]}</IznosPG1_3>
      <IznosPG2_1>${vrijednostiPolja["pg2_1"]}</IznosPG2_1>
      <IznosPG2_2>${vrijednostiPolja["pg2_2"]}</IznosPG2_2>
      <IznosPG2_21>${vrijednostiPolja["pg2_21"]}</IznosPG2_21>
      <IznosPG2_22>${vrijednostiPolja["pg2_22"]}</IznosPG2_22>
      <IznosPG2_23>${vrijednostiPolja["pg2_23"]}</IznosPG2_23>
      <IznosPG2_24>${vrijednostiPolja["pg2_24"]}</IznosPG2_24>
      <IznosPG2_25>${vrijednostiPolja["pg2_25"]}</IznosPG2_25>
      <IznosPG2_3>${vrijednostiPolja["pg2_3"]}</IznosPG2_3>
      <BrojDokumentaOrgId></BrojDokumentaOrgId>
      <BrojDokumentaRbr>0</BrojDokumentaRbr>
      <Akcija>new</Akcija>
      <Message>
        <Show>false</Show>
        <Message />
      </Message>
      <Error>
        <Show>false</Show>
        <Message />
      </Error>
    </PortalCitReturn2025>
    `;
    console.log(izabranaFirma.naziv);
    var filename = `${izabranaFirma.naziv}_${godina}.xml`;
    download(filename, text);
  },
  false
);
