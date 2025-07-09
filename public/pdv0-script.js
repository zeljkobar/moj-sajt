let firmeData = [];

// Funkcija za čišćenje naziva firme za ime fajla
function cleanFilename(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '') // Ukloni nedozvoljene karaktere za fajlove
    .replace(/\s+/g, '_') // Zameni razmake sa _
    .replace(/[čćžđš]/gi, function(match) {
      const replacements = {'č': 'c', 'ć': 'c', 'ž': 'z', 'đ': 'd', 'š': 's'};
      return replacements[match.toLowerCase()];
    }) // Zameni srpska slova
    .substring(0, 50); // Ograniči na 50 karaktera
}

// Funkcija za download XML fajla
function download(filename, text) {
  const element = document.createElement("a");
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

// Funkcija za kreiranje XML-a sa nulama
function createZeroXML(firma, mjesec) {
  return `<?xml version="1.0"?>
<PortalVatReturn2025 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
<PIB>${firma.pib}</PIB>
<Mjesec>${mjesec}</Mjesec>
<Godina>2025</Godina>
<IzmijenjenaMjesecnaPrijava>false</IzmijenjenaMjesecnaPrijava>
<Naziv>${firma.naziv}</Naziv>
<SifraDjelatnosti/>
<Adresa>${firma.adresa}</Adresa>
<Telefon>067440040</Telefon>
<OvlascenoLicePIB>1606981220012</OvlascenoLicePIB>
<OvlascenoLicePrezimeIme>Željko Ðuranoviæ</OvlascenoLicePrezimeIme>
<KontaktEmail>zeljkodj@t-com.me</KontaktEmail>
<KontaktTelefon>067440040</KontaktTelefon>
<PdvRegistracioniBroj>${firma.pdvBroj}</PdvRegistracioniBroj>
<BezTransakcija>false</BezTransakcija>
<Iznos10>0</Iznos10>
<Iznos11>0</Iznos11>
<Iznos12>0</Iznos12>
<Iznos13>0</Iznos13>
<Iznos14>0</Iznos14>
<Iznos15>0</Iznos15>
<Iznos16>0</Iznos16>
<Iznos17>0</Iznos17>
<Iznos18>0</Iznos18>
<Iznos19>0</Iznos19>
<Iznos20>0</Iznos20>
<Iznos21A>0</Iznos21A>
<Iznos21B>0</Iznos21B>
<Iznos22>0</Iznos22>
<Iznos23A>0</Iznos23A>
<Iznos23B>0</Iznos23B>
<Iznos24>0</Iznos24>
<Iznos25>0</Iznos25>
<Iznos26>0</Iznos26>
<Iznos27>0</Iznos27>
<Iznos28>0</Iznos28>
<Iznos29>0</Iznos29>
<ZahtjevamPovracaj>false</ZahtjevamPovracaj>
</PortalVatReturn2025>`;
}

// Funkcija za učitavanje firmi
async function loadFirme() {
  try {
    const response = await fetch("/api/firme/nula", {
      credentials: "include",
    });
    if (response.ok) {
      firmeData = await response.json();
      displayFirmeList();
      updateUIWithFirmeCount();
      console.log("Firme učitane:", firmeData.length);
    } else {
      console.error("Greška pri učitavanju firmi:", response.status);
      document.getElementById("firme-lista").innerHTML =
        '<p style="color: red;">Greška pri učitavanju firmi. Molimo prijavite se.</p>';
    }
  } catch (error) {
    console.error("Greška:", error);
    document.getElementById("firme-lista").innerHTML =
      '<p style="color: red;">Greška pri komunikaciji sa serverom.</p>';
  }
}

// Funkcija za ažuriranje UI-ja sa brojem firmi
function updateUIWithFirmeCount() {
  const brojFirmiEl = document.getElementById("broj-firmi");
  const ukupnoFirmiEl = document.getElementById("ukupno-firmi");
  const count = firmeData.length;

  if (brojFirmiEl) {
    brojFirmiEl.textContent = count;
  }
  if (ukupnoFirmiEl) {
    ukupnoFirmiEl.textContent = count;
  }
}

// Funkcija za prikaz liste firmi
function displayFirmeList() {
  const listaEl = document.getElementById("firme-lista");
  if (firmeData.length === 0) {
    listaEl.innerHTML = "<p>Nema dostupnih firmi.</p>";
    return;
  }

  let html =
    '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 10px;">';
  firmeData.forEach((firma, index) => {
    html += `
            <div style="padding: 8px; background: #f9f9f9; border-radius: 4px; font-size: 14px;">
                <strong>${index + 1}.</strong> ${firma.naziv}<br>
                <small>PIB: ${firma.pib}</small>
            </div>
        `;
  });
  html += "</div>";
  listaEl.innerHTML = html;
}

// Funkcija za ažuriranje progress bara
function updateProgress(current, total) {
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const percentage = (current / total) * 100;

  progressFill.style.width = percentage + "%";
  progressText.innerHTML = `${current} / <span id="ukupno-firmi">${total}</span> firmi obrađeno`;
}

// Glavna funkcija za download svih PDV prijava
async function downloadAllPDV() {
  const mjesecInput = document.getElementById("mjesec");
  const mjesec = mjesecInput.value;
  const downloadBtn = document.getElementById("download-btn");
  const progressContainer = document.getElementById("progressContainer");

  // Validacija
  if (!mjesec || mjesec < 1 || mjesec > 12) {
    alert("Molimo unesite valjan broj mjeseca (1-12)");
    return;
  }

  if (firmeData.length === 0) {
    alert("Firme nisu učitane. Molimo sačekajte ili se prijavite.");
    return;
  }

  // Pripremi UI za download
  downloadBtn.disabled = true;
  downloadBtn.textContent = "Obrađujem firme...";
  progressContainer.style.display = "block";
  updateProgress(0, firmeData.length);

  try {
    // Obradi svaku firmu
    for (let i = 0; i < firmeData.length; i++) {
      const firma = firmeData[i];
      console.log(`Obrađujem: ${firma.naziv}`);

      // Kreiraj XML
      const xmlContent = createZeroXML(firma, mjesec);
      const cleanNaziv = cleanFilename(firma.naziv);
      const filename = `${cleanNaziv}-00${mjesec.padStart(2, "0")}.xml`;

      // Download fajl
      download(filename, xmlContent);

      // Ažuriraj progress
      updateProgress(i + 1, firmeData.length);

      // Kratka pauza između download-ova da browser ne blokira
      if (i < firmeData.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Završeno
    alert(
      `✅ Uspešno! Preuzeto je ${firmeData.length} PDV prijava za mjesec ${mjesec}.`
    );
  } catch (error) {
    console.error("Greška pri download-u:", error);
    alert("❌ Greška pri kreiranju fajlova!");
  } finally {
    // Resetuj UI
    downloadBtn.disabled = false;
    downloadBtn.textContent = "📁 Preuzmi PDV prijave za sve firme";
    setTimeout(() => {
      progressContainer.style.display = "none";
    }, 2000);
  }
}

// Event listener-i
document.addEventListener("DOMContentLoaded", () => {
  loadFirme();

  // Download dugme
  document
    .getElementById("download-btn")
    .addEventListener("click", downloadAllPDV);

  // Enter key u input polju
  document.getElementById("mjesec").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      downloadAllPDV();
    }
  });
});

// Proveri da li je korisnik prijavljen
fetch("/api/check-auth", {
  credentials: "include",
})
  .then((response) => response.json())
  .then((data) => {
    if (!data.authenticated) {
      document.querySelector(".pdv-zero-container").innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h2>🔒 Pristup zabranjen</h2>
                    <p>Morate biti prijavljeni da biste pristupili ovoj stranici.</p>
                    <a href="/" style="color: #4CAF50; font-weight: bold;">← Nazad na početnu</a>
                </div>
            `;
    }
  })
  .catch((error) => {
    console.error("Greška pri proveri autentifikacije:", error);
  });
