# Export Utils - Dokumentacija

Univerzalni modul za export dokumenata u PDF i Word format. Optimizovan za male fajlove i čist prelom teksta.

## Uključivanje modula

```html
<script src="components/export-utils.js"></script>
```

## Osnovne funkcije

### PDF Export

```javascript
// Osnovni PDF export
await ExportUtils.exportToPDF();

// Sa custom opcijama
await ExportUtils.exportToPDF({
  containerSelector: '.document-container', // CSS selektor
  filePrefix: 'Ugovor', // Prefiks imena fajla
  getFileName: () => 'Moj_Dokument.pdf', // Custom funkcija za ime fajla
});
```

### Word Export

```javascript
// Kompaktni Word export (default)
ExportUtils.exportToWord();

// Sa custom opcijama
ExportUtils.exportToWord({
  containerSelector: '.document-container',
  filePrefix: 'Odluka',
  compact: false, // Normalno formatiranje
  getFileName: () => 'Moja_Odluka.doc',
});
```

## Opcije

### PDF Export opcije:

- `containerSelector` - CSS selektor kontejnera za export (default: `.container`)
- `filePrefix` - prefiks za ime fajla (default: `'Dokument'`)
- `getFileName` - custom funkcija za kreiranje imena fajla

### Word Export opcije:

- `containerSelector` - CSS selektor kontejnera za export (default: `.container`)
- `filePrefix` - prefiks za ime fajla (default: `'Dokument'`)
- `compact` - kompaktno formatiranje sa manjim marginama (default: `true`)
- `getFileName` - custom funkcija za kreiranje imena fajla

## Helper funkcije

```javascript
// Standardno ime fajla sa radnikom i firmom
const fileName = ExportUtils.generateFileName('Ugovor', 'pdf');

// Jednostavno ime sa datumom
const fileName = ExportUtils.generateSimpleFileName('Dokument', 'pdf');
```

## Primeri korišćenja

### Za Ugovor o radu:

```javascript
async function downloadPDF() {
  await ExportUtils.exportToPDF({
    containerSelector: '.container',
    filePrefix: 'Ugovor',
    getFileName: () => {
      const radnik =
        document.getElementById('radnik-ime-prezime')?.textContent || 'Radnik';
      const firma =
        document.getElementById('firma-naziv')?.textContent || 'Firma';
      return `Ugovor_${radnik.replace(/\s+/g, '_')}_${firma.replace(
        /\s+/g,
        '_'
      )}.pdf`;
    },
  });
}
```

### Za Odluke:

```javascript
async function downloadDecisionPDF() {
  await ExportUtils.exportToPDF({
    containerSelector: '.decision-container',
    filePrefix: 'Odluka',
    getFileName: () =>
      ExportUtils.generateSimpleFileName('Odluka_Raspored_Rada', 'pdf'),
  });
}
```

### Za ostale dokumente:

```javascript
// PDF export bilo kog dokumenta
await ExportUtils.exportToPDF({
  containerSelector: '#my-document',
  filePrefix: 'Dokument',
});

// Word export sa normalnim formatiranjem
ExportUtils.exportToWord({
  containerSelector: '#my-document',
  compact: false,
});
```

## PDF Optimizacije

Modul koristi sledeće optimizacije:

- Scale = 1 (umesto 2) za drastično smanjenje veličine fajla
- JPEG kompresija (95% kvalitet) umesto PNG
- Anti-sivilo tehnike (uklanja box-shadow i forsira belu pozadinu)
- Pametan algoritam podele stranica (bez preklapanja)
- 5mm margine za profesionalan izgled

## Word Optimizacije

- Kompaktni format sa manjim marginama (0.7cm)
- Optimizovan font (11pt umesto 12pt)
- Tightly spaced line-height (1.2)
- Professional Word formatting
- Cross-browser kompatibilnost

## Error Handling

Obe funkcije vraćaju objekat sa rezultatom:

```javascript
const result = await ExportUtils.exportToPDF();
if (result.success) {
  console.log('PDF kreiran:', result.fileName);
} else {
  console.error('Greška:', result.error);
}
```
