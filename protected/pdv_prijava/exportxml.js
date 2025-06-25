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

document.getElementById("xmlButton").addEventListener(
  "click",
  function () {
    const pib = document.getElementById("poreski_identifikacioni_broj").value;
    const period = document.getElementById("poreski_period_mesec").value;
    const naziv = document.getElementById("naziv_pravno_lice").value;

    var text = `<?xml version="1.0"?>
  <PortalVatReturn2025 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <PIB>${pib}</PIB>
  <Mjesec>${period}</Mjesec>
  <Godina>2025</Godina>
  <IzmijenjenaMjesecnaPrijava>false</IzmijenjenaMjesecnaPrijava>
  <Naziv>${naziv}</Naziv>
  <SifraDjelatnosti/>
  <Adresa></Adresa>
  <Telefon>067440040</Telefon>
  <OvlascenoLicePIB>1606981220012</OvlascenoLicePIB>
  <OvlascenoLicePrezimeIme>Željko Ðuranoviæ</OvlascenoLicePrezimeIme>
  <KontaktEmail>zeljkodj@t-com.me</KontaktEmail>
  <KontaktTelefon>067440040</KontaktTelefon>
  <PdvRegistracioniBroj></PdvRegistracioniBroj>
  <BezTransakcija>false</BezTransakcija>
  <Iznos10>${document.getElementsByClassName("field-10")[0].value}</Iznos10>
  <Iznos11>${
    document.getElementsByClassName("field-11")[0].value || 0
  }</Iznos11>
  <Iznos12>${
    document.getElementsByClassName("field-12")[0].value || 0
  }</Iznos12>
  <Iznos13>0</Iznos13>
  <Iznos14>0</Iznos14>
  <Iznos15>0</Iznos15>
  <Iznos16>${
    document.getElementsByClassName("field-16")[0].value || 0
  }</Iznos16>
  <Iznos17>${
    document.getElementsByClassName("field-17")[0].value || 0
  }</Iznos17>
  <Iznos18>${
    document.getElementsByClassName("field-18")[0].value || 0
  }</Iznos18>
  <Iznos19>${
    document.getElementsByClassName("field-19")[0].value || 0
  }</Iznos19>
  <Iznos20>${
    document.getElementsByClassName("field-20")[0].value || 0
  }</Iznos20>
  <Iznos21A>0</Iznos21A>
  <Iznos21B>0</Iznos21B>
  <Iznos22>0</Iznos22>
  <Iznos23A>0</Iznos23A>
  <Iznos23B>0</Iznos23B>
  <Iznos24>${
    document.getElementsByClassName("field-24")[0].value || 0
  }</Iznos24>
  <Iznos25>${
    document.getElementsByClassName("field-25")[0].value || 0
  }</Iznos25>
  <Iznos26>${
    document.getElementsByClassName("field-26")[0].value || 0
  }</Iznos26>
  <Iznos27>${
    document.getElementsByClassName("field-27")[0].value || 0
  }</Iznos27>
  <Iznos28>${
    document.getElementsByClassName("field-28")[0].value || 0
  }</Iznos28>
  <Iznos29>${
    document.getElementsByClassName("field-29")[0].value || 0
  }</Iznos29>
  <ZahtjevamPovracaj>false</ZahtjevamPovracaj>
  </PortalVatReturn2025>`;
    //   var filename = document.getElementById("filename").value;
    var filename = `${naziv}-00${period}.xml`;
    download(filename, text);
  },
  false
);
