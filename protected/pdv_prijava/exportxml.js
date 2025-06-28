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

// Globalna promenljiva za korisničke podatke
let currentUser = null;

// Funkcija za učitavanje podataka o trenutno ulogovanom korisniku
async function loadCurrentUser() {
  try {
    const response = await fetch("/api/check-auth", {
      credentials: "include",
    });
    if (response.ok) {
      const data = await response.json();
      if (data.authenticated && data.user) {
        currentUser = data.user;
        console.log("Korisnički podaci učitani za XML:", currentUser);
      }
    }
  } catch (error) {
    console.error("Greška pri učitavanju korisničkih podataka:", error);
  }
}

// Učitaj korisničke podatke kad se stranica učita
document.addEventListener("DOMContentLoaded", loadCurrentUser);

document.getElementById("xmlButton").addEventListener(
  "click",
  function () {
    // Bezbedne funkcije za dohvatanje vrednosti
    const getValue = (id) => {
      const element = document.getElementById(id);
      return element ? element.value : "";
    };

    const getValueByClass = (className) => {
      const element = document.getElementsByClassName(className)[0];
      return element ? element.value || 0 : 0;
    };

    const pib = getValue("pib_firme");
    const period = getValue("poreski_period_mesec");
    const naziv = getValue("naziv_firme");
    const adresa = getValue("adresa_firme");
    const pdvBroj = getValue("pdv_broj");

    // Proveri da li su osnovni podaci popunjeni
    if (!pib || !period || !naziv) {
      alert("Molimo popunite osnovne podatke (PIB, period, naziv firme)");
      return;
    }

    // Proveri da li su korisnički podaci učitani
    if (!currentUser) {
      alert("Korisnički podaci nisu učitani. Molimo osvežite stranicu.");
      return;
    }

    // Pripremi korisničke podatke za XML
    const telefon = currentUser.phone;
    const ovlascenoLicePIB = currentUser.jmbg;
    const ovlascenoLicePrezimeIme = `${currentUser.ime || "Ime"} ${
      currentUser.prezime || "Prezime"
    }`;
    const kontaktEmail = currentUser.email || "email@example.com";
    const kontaktTelefon = currentUser.phone || "067111111";

    var text = `<?xml version="1.0"?>
  <PortalVatReturn2025 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <PIB>${pib}</PIB>
  <Mjesec>${period}</Mjesec>
  <Godina>2025</Godina>
  <IzmijenjenaMjesecnaPrijava>false</IzmijenjenaMjesecnaPrijava>
  <Naziv>${naziv}</Naziv>
  <SifraDjelatnosti/>
  <Adresa>${adresa}</Adresa>
  <Telefon>${telefon}</Telefon>
  <OvlascenoLicePIB>${ovlascenoLicePIB}</OvlascenoLicePIB>
  <OvlascenoLicePrezimeIme>${ovlascenoLicePrezimeIme}</OvlascenoLicePrezimeIme>
  <KontaktEmail>${kontaktEmail}</KontaktEmail>
  <KontaktTelefon>${kontaktTelefon}</KontaktTelefon>
  <PdvRegistracioniBroj>${pdvBroj}</PdvRegistracioniBroj>
  <BezTransakcija>false</BezTransakcija>
  <Iznos10>${getValueByClass("field-10")}</Iznos10>
  <Iznos11>${getValueByClass("field-11")}</Iznos11>
  <Iznos12>${getValueByClass("field-12")}</Iznos12>
  <Iznos13>0</Iznos13>
  <Iznos14>0</Iznos14>
  <Iznos15>0</Iznos15>
  <Iznos16>${getValueByClass("field-16")}</Iznos16>
  <Iznos17>${getValueByClass("field-17")}</Iznos17>
  <Iznos18>${getValueByClass("field-18")}</Iznos18>
  <Iznos19>${getValueByClass("field-19")}</Iznos19>
  <Iznos20>${getValueByClass("field-20")}</Iznos20>
  <Iznos21A>0</Iznos21A>
  <Iznos21B>0</Iznos21B>
  <Iznos22>0</Iznos22>
  <Iznos23A>0</Iznos23A>
  <Iznos23B>0</Iznos23B>
  <Iznos24>${getValueByClass("field-24")}</Iznos24>
  <Iznos25>${getValueByClass("field-25")}</Iznos25>
  <Iznos26>${getValueByClass("field-26")}</Iznos26>
  <Iznos27>${getValueByClass("field-27")}</Iznos27>
  <Iznos28>${getValueByClass("field-28")}</Iznos28>
  <Iznos29>${getValueByClass("field-29")}</Iznos29>
  <ZahtjevamPovracaj>false</ZahtjevamPovracaj>
  </PortalVatReturn2025>`;
    //   var filename = document.getElementById("filename").value;
    var filename = `${naziv}-00${period}.xml`;
    download(filename, text);
  },
  false
);
