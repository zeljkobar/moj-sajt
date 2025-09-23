/**
 * ExportUtils - Univerzalni modul za eksportovanje dokumenata
 * Optimizovan za PDF i Word eksport sa naprednim formatiranjem
 */

class ExportUtils {
  /**
   * Eksportuje sadržaj u PDF format sa optimizovanim postavkama
   * @param {Object} options - konfiguracija za export
   * @param {string} options.containerSelector - CSS selektor za container (default: '.container')
   * @param {string} options.filePrefix - prefiks za ime fajla (default: 'Dokument')
   * @param {function} options.getFileName - funkcija za generisanje imena fajla
   */
  static async exportToPDF(options = {}) {
    const {
      containerSelector = '.container',
      filePrefix = 'Dokument',
      getFileName = null,
    } = options;

    try {
      // Sakrij dugmad tokom eksporta
      this.hideButtons();

      const { jsPDF } = window.jspdf;
      const container = document.querySelector(containerSelector);

      if (!container) {
        throw new Error(
          `Element sa selektorom ${containerSelector} nije pronađen`
        );
      }

      // Anti-sivilo tehnike
      this.applyShadowRemoval();

      // Kreiranje canvas-a sa optimizovanim postavkama
      const canvas = await html2canvas(container, {
        scale: 1, // Optimizovano za manjue fajlove
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        removeContainer: true,
        foreignObjectRendering: false,
        imageTimeout: 0,
        logging: false,
      });

      // Vraćanje originalnih stilova
      this.restoreOriginalStyles();

      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 8; // 8mm margine
      const imgWidth = 210 - 2 * margin; // A4 širina minus margine
      const pageHeight = 297 - 2 * margin; // A4 visina minus margine
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let sourceY = 0;
      let remainingHeight = imgHeight;
      let yPosition = margin;

      // Pametan algoritam za podelu stranica
      while (remainingHeight > 0) {
        const sliceHeight = Math.min(
          remainingHeight,
          pageHeight - yPosition + margin
        );

        // Kreiranje privremenog canvas-a za deo slike
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = (sliceHeight * canvas.width) / imgWidth;

        // Kopiranje odgovarajućeg dela originalne slike
        tempCtx.drawImage(
          canvas,
          0,
          (sourceY * canvas.width) / imgWidth,
          canvas.width,
          tempCanvas.height,
          0,
          0,
          canvas.width,
          tempCanvas.height
        );

        const sliceData = tempCanvas.toDataURL('image/jpeg', 0.95);

        if (sourceY > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          sliceData,
          'JPEG',
          margin,
          yPosition,
          imgWidth,
          sliceHeight
        );

        sourceY += sliceHeight;
        remainingHeight -= sliceHeight;
        yPosition = margin; // Nova stranica počinje od vrha
      }

      // Generisanje imena fajla
      let fileName;
      if (getFileName && typeof getFileName === 'function') {
        fileName = getFileName();
      } else {
        fileName = this.generateSimpleFileName(filePrefix, 'pdf');
      }

      pdf.save(fileName);

      // Pokaži dugmad ponovo
      this.showButtons();

      return { success: true, fileName, size: pdf.internal.pageSize };
    } catch (error) {
      console.error('Greška pri kreiranju PDF-a:', error);
      alert('Greška pri kreiranju PDF-a. Pokušajte ponovo.');
      this.showButtons();
      this.restoreOriginalStyles();
      return { success: false, error: error.message };
    }
  }

  /**
   * Export dokumenta u Word format sa poboljšanim formatiranjem
   * @param {Object} options - opcije za Word export
   * @param {string} options.containerSelector - CSS selektor kontejnera (default: '.container')
   * @param {string} options.filePrefix - prefiks za ime fajla (default: 'Dokument')
   * @param {Function} options.getFileName - funkcija za kreiranje imena fajla
   * @param {boolean} options.compact - da li koristiti kompaktni format (default: true)
   */
  static exportToWord(options = {}) {
    const {
      containerSelector = '.container',
      filePrefix = 'Dokument',
      getFileName = null,
      compact = true,
    } = options;

    try {
      // Uzmi sadržaj dokumenta
      const container = document.querySelector(containerSelector);

      if (!container) {
        throw new Error(
          `Element sa selektorom ${containerSelector} nije pronađen`
        );
      }

      let content = container.innerHTML;

      // Očisti sadržaj od nepotrebnih elemenata
      content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      content = content.replace(/class="[^"]*print-button[^"]*"/gi, '');
      content = content.replace(/class="[^"]*pdf-button[^"]*"/gi, '');
      content = content.replace(/class="[^"]*word-button[^"]*"/gi, '');

      // Za kompaktni format, optimizuj samo duplikate <br> tagova
      if (compact) {
        content = content.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>');
      }

      // Generisanje naziva fajla
      let fileName;
      if (getFileName && typeof getFileName === 'function') {
        fileName = getFileName();
      } else {
        // Default logika za generisanje imena
        const radnikIme =
          document.getElementById('radnik-ime-prezime')?.textContent ||
          'Radnik';
        const firmaNaziv =
          document.getElementById('firma-naziv')?.textContent || 'Firma';
        const suffix = compact ? '_Kompakt' : '';
        fileName = `${filePrefix}${suffix}_${radnikIme.replace(
          /\s+/g,
          '_'
        )}_${firmaNaziv.replace(/\s+/g, '_')}.doc`;
      }

      // Kreiranje Word dokumenta sa poboljšanim stilovima
      const wordContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${filePrefix}</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>90</w:Zoom>
              <w:DoNotPromptForConvert/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            @page {
              size: A4;
              margin: ${
                compact ? '1.5cm 1cm 1.5cm 1cm' : '2cm 1.5cm 2cm 1.5cm'
              };
            }
            body { 
              font-family: 'Times New Roman', serif; 
              font-size: ${compact ? '11pt' : '12pt'};
              line-height: ${compact ? '1.4' : '1.6'};
              margin: 0;
              padding: 0;
              color: #000;
              background: white;
            }
            
            /* Naslovi i zaglavlja */
            h1, .header, .naslov, .ugovor-naslov { 
              font-size: ${compact ? '14pt' : '16pt'}; 
              font-weight: bold;
              margin: ${compact ? '10px 0 15px 0' : '20px 0 30px 0'}; 
              text-align: center !important;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            h2 { 
              font-size: ${compact ? '12pt' : '14pt'}; 
              margin: ${compact ? '10px 0 5px 0' : '15px 0 10px 0'}; 
              text-align: center !important;
              font-weight: bold;
            }
            h3 {
              font-size: ${compact ? '11pt' : '12pt'};
              margin: ${compact ? '8px 0 5px 0' : '12px 0 8px 0'};
              text-align: center !important;
              font-weight: bold;
            }
            
            /* Paragraf i tekst */
            p {
              margin: ${compact ? '6px 0' : '10px 0'};
              text-align: left;
              text-indent: 0;
            }
            
            /* CSS klase za poravnavanje */
            .text-center {
              text-align: center !important;
            }
            .text-left {
              text-align: left !important;
            }
            .text-right {
              text-align: right !important;
            }
            .text-end {
              text-align: right !important;
            }
            
            /* Bootstrap klase za poravnavanje */
            .text-center, .text-center * {
              text-align: center !important;
            }
            .text-end, .text-end * {
              text-align: right !important;
            }
            
            /* Članci i sekcije */
            .article, .clan { 
              margin: ${compact ? '8px 0' : '15px 0'};
              page-break-inside: avoid;
            }
            .article-title, .naslov-clana { 
              font-weight: bold; 
              text-align: center !important; 
              margin: ${compact ? '8px 0 4px 0' : '15px 0 8px 0'}; 
              font-size: ${compact ? '11pt' : '12pt'};
              text-decoration: underline;
            }
            
            /* Potpisi i datumi */
            .signature-section, .potpis-sekcija { 
              display: table;
              width: 100%;
              margin-top: ${compact ? '25px' : '40px'};
              page-break-inside: avoid;
            }
            .signature, .potpis { 
              display: table-cell;
              text-align: center !important; 
              width: 45%; 
              vertical-align: bottom;
              padding: 0 10px;
            }
            .signature-line, .linija-potpis { 
              border-bottom: 1px solid #000; 
              margin-bottom: 3px; 
              height: ${compact ? '25px' : '30px'};
              width: ${compact ? '160px' : '180px'};
              margin-left: auto;
              margin-right: auto;
            }
            
            /* Datum i mesto */
            .datum, .mesto {
              text-align: right !important;
              margin: ${compact ? '8px 0' : '15px 0'};
            }
            
            /* Flex elementi pretvoreni za Word */
            .d-flex, .flex {
              display: table;
              width: 100%;
            }
            .justify-content-between {
              display: table;
              width: 100%;
            }
            .justify-content-between > *:first-child {
              display: table-cell;
              width: 50%;
              text-align: left !important;
              vertical-align: top;
            }
            .justify-content-between > *:last-child {
              display: table-cell;
              width: 50%;
              text-align: right !important;
              vertical-align: top;
            }
            
            /* Formatiranje teksta */
            strong, b {
              font-weight: bold;
            }
            em, i {
              font-style: italic;
            }
            u {
              text-decoration: underline;
            }
            
            /* Liste */
            ul, ol {
              margin: ${compact ? '6px 0' : '10px 0'};
              padding-left: 20px;
            }
            li {
              margin: ${compact ? '2px 0' : '4px 0'};
              line-height: ${compact ? '1.2' : '1.4'};
              text-align: left;
            }
            
            /* Tabele */
            table {
              width: 100%;
              border-collapse: collapse;
              margin: ${compact ? '8px 0' : '15px 0'};
            }
            td, th {
              border: 1px solid #000;
              padding: ${compact ? '4px' : '8px'};
              text-align: left;
              vertical-align: top;
            }
            th {
              font-weight: bold;
              text-align: center !important;
              background-color: #f0f0f0;
            }
            
            /* Specifični elementi */
            .firma-naziv {
              font-weight: bold;
              text-align: center !important;
            }
            .ugovor-container, .odluka-container {
              width: 100%;
            }
            
            /* Kompaktni format dodatni stilovi */
            ${
              compact
                ? `
            .article p, .clan p {
              margin: 3px 0;
            }
            h1, .header {
              margin: 8px 0 12px 0;
            }
            `
                : ''
            }
            
            /* Prisilno centriranje za sve elemente koji imaju text-center klasu */
            *[class*="text-center"], *[class*="center"] {
              text-align: center !important;
            }
            *[class*="text-right"], *[class*="text-end"] {
              text-align: right !important;
            }
            
          </style>
        </head>
        <body>
          <div class="document-content">
            ${content}
          </div>
        </body>
        </html>
      `;

      // Kreiranje blob-a i download-a
      const blob = new Blob([wordContent], {
        type: 'application/msword;charset=utf-8',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true, fileName };
    } catch (error) {
      console.error('Greška pri kreiranju Word dokumenta:', error);
      alert('Greška pri kreiranju Word dokumenta. Pokušajte ponovo.');
      return { success: false, error: error.message };
    }
  }

  /**
   * Sakrij dugmad tokom exporta
   */
  static hideButtons() {
    const buttons = document.querySelectorAll(
      '.print-button, .pdf-button, .word-button'
    );
    buttons.forEach(button => {
      button.style.display = 'none';
    });
  }

  /**
   * Prikaži dugmad nakon exporta
   */
  static showButtons() {
    const buttons = document.querySelectorAll(
      '.print-button, .pdf-button, .word-button'
    );
    buttons.forEach(button => {
      button.style.display = 'flex';
    });
  }

  /**
   * Anti-sivilo tehnike - uklanja box-shadow i postavlja belu pozadinu
   */
  static applyShadowRemoval() {
    const style = document.createElement('style');
    style.id = 'export-anti-shadow';
    style.innerHTML = `
      * {
        box-shadow: none !important;
        -webkit-box-shadow: none !important;
        background-color: white !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Vraća originalne stilove nakon exporta
   */
  static restoreOriginalStyles() {
    const style = document.getElementById('export-anti-shadow');
    if (style) {
      style.remove();
    }
  }

  /**
   * Generiše jednostavno ime fajla sa datumom
   * @param {string} prefix - prefiks za ime fajla
   * @param {string} extension - ekstenzija fajla
   * @returns {string} generisano ime fajla
   */
  static generateSimpleFileName(prefix, extension = 'pdf') {
    const timestamp = new Date().toISOString().slice(0, 10);
    return `${prefix}_${timestamp}.${extension}`;
  }
}

// Export za korišćenje kao modul
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportUtils;
} else if (typeof window !== 'undefined') {
  window.ExportUtils = ExportUtils;
}
