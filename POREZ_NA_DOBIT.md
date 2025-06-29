# Porez na Dobit - Dokumentacija

## Pregled

Dodana je nova funkcionalnost za automatsko izračunavanje poreza na dobit sa dinamičkim učitavanjem podataka o firmama iz baze podataka.

## Nova Funkcionalnost

### 1. Dinamičko Učitavanje Firmi
- **Izvor podataka**: `/api/firme` endpoint
- **Autentifikacija**: Koristi se session-based authentication
- **Struktura podataka**: Firme se učitavaju sa sledećim podacima:
  - `naziv` - naziv firme
  - `pib` - PIB firme
  - `adresa` - adresa firme

### 2. Dropdown Lista Firmi
- Automatsko popunjavanje dropdown-a pri učitavanju stranice
- Format: "Naziv firme (PIB: 123456789)"
- Prazan option na vrhu za početnu selekciju

### 3. Automatski Podaci Ovlašćenog Lica
- Učitavaju se iz trenutno ulogovanog korisnika
- Popunjavaju se sledeći podaci:
  - Prezime i ime (iz `ime` i `prezime`)
  - PIB ovlašćenog lica (iz `jmbg`)
  - Kontakt telefon (iz `telefon`)
  - Email adresa (iz `email`)

### 4. Kalkulacija Poreza na Dobit

#### Progresivne Stope:
- **9%** - na deo osnovice do 100.000 KM
- **12%** - na deo osnovice od 100.001 do 1.500.000 KM  
- **15%** - na deo osnovice preko 1.500.000 KM

#### Automatski Izračuni:
- Dobit/Gubitak na osnovu bilansa stanja
- Povećanja i smanjenja poreske osnovice
- Kapitalni dobitak/gubitak
- Poreski kredit i olakšice
- Mesečna akontacija (1/12 godišnje obaveze)
- Razliku između obaveze i plaćenog poreza

### 5. XML Export
- Generiše se XML fajl u formatu `PortalCitReturn2025`
- Automatski se koristi naziv firme kao ime fajla
- Uključuje sve kalkulisane vrednosti

## Tehničke Karakteristike

### Frontend (script.js)
```javascript
// Učitavanje firmi iz baze
const responseFirme = await fetch("/api/firme", {
  credentials: "include",
});

// Progresivni izračun poreza
switch (true) {
  case poreskaOsnovica <= 100000:
    dobit9 = poreskaOsnovica * 0.09;
    break;
  case poreskaOsnovica > 100000 && poreskaOsnovica <= 1500000:
    dobit9 = 100000 * 0.09;
    dobit12 = (poreskaOsnovica - 100000) * 0.12;
    break;
  // ...
}
```

### Automatska Kalkulacija
- Svi izračuni se ažuriraju u realnom vremenu
- Event listeneri na `blur` za sve input polja
- Validacija podataka pre XML eksporta

### Navigacija
- Enter key omogućava prelazak na sledeće polje
- Fokus se automatski postavlja na sledeći element

## API Integracija

### Endpoint: `/api/check-auth`
- Proverava autentifikaciju korisnika
- Vraća podatke o korisniku za automatsko popunjavanje

### Endpoint: `/api/firme`
- Vraća listu firmi za trenutno ulogovanog korisnika
- Format odgovora:
```json
{
  "firme": [
    {
      "naziv": "Naziv firme",
      "pib": "123456789",
      "adresa": "Adresa firme"
    }
  ]
}
```

## Fajlovi

### Novi Fajlovi:
- `protected/dobit_prijava/index.html` - Forma za unos podataka
- `protected/dobit_prijava/script.js` - JavaScript funkcionalnost
- `protected/dobit_prijava/style.css` - Stilizovanje
- `protected/dobit_prijava/podaci.js` - Pomoćni podaci

### Glavne Funkcije:
1. `populateFirmeDropdown()` - Popunjava dropdown sa firmama
2. `populateUserData(user)` - Popunjava podatke ovlašćenog lica
3. `preracun(vrijednosti)` - Glavni izračun poreza
4. `update()` - Ažurira sve kalkulisane vrednosti
5. `download(filename, text)` - Generiše XML za download

## Commit Informacije

**Commit Hash**: f161a74  
**Commit Message**: "Dodana funkcionalnost za porez na dobit - dinamičko učitavanje firmi iz baze"  
**Datum**: 29. jun 2025.

## Sledeći Koraci

1. Testiranje sa različitim scenarijima
2. Dodavanje validacije za obavezna polja
3. Implementacija čuvanja drafta
4. Dodavanje preview XML-a pre download-a
