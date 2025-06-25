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

  const ulazni_pdv = ulazniDomaci + ulazniUvozni;
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

// Postavljanje event listenera za oporezivi promet po stopama
setupPdvInput("oporezivi_promet_21", "izlazni_pdv_21", 0.173553);
setupPdvInput("oporezivi_promet_15", "izlazni_pdv_15", 0.130434782);
setupPdvInput("oporezivi_promet_7", "izlazni_pdv_7", 0.06542056);

// Event listeneri za ulazni PDV
document
  .getElementById("ulazni_pdv_domaci_promet")
  .addEventListener("input", updateUlazniPdv);
document.getElementById("pdv_uvoz").addEventListener("input", updateUlazniPdv);

// STAMPANJE PDF
document
  .getElementById("pdfButton")
  .addEventListener("click", async function () {
    const { jsPDF } = window.jspdf;
    const container = document.querySelector(".container");

    // Dodaj klasu da simulira izgled za štampu
    container.classList.add("pdf-export");

    // Sačekaj kratko da se stil primijeni
    await new Promise((r) => setTimeout(r, 100));

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

    // Ukloni klasu nakon eksportovanja
    container.classList.remove("pdf-export");
  });

// span
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
