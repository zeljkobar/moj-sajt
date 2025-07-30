# Uputstvo za testiranje API-ja sa Postman-om

## Podešavanje

### 1. Import kolekcije u Postman

1. Otvori Postman
2. Klikni na "Import" dugme
3. Selektuj file `postman_collection.json` iz root direktorijuma projekta
4. Kolekcija "Moj Sajt API Collection" će biti dostupna

### 2. Environment varijable

Kolekcija koristi `{{baseUrl}}` varijablu koja je podešena na `http://localhost:3000`

## Redosled testiranja

### KORAK 1: Autentifikacija

**Obavezno prvi korak - bez njega ostale rute neće raditi!**

1. **Register** (ako nemaš nalog):

   ```json
   POST /api/register
   {
     "username": "test_user",
     "email": "test@example.com",
     "password": "password123",
     "ime": "Marko",
     "prezime": "Petrović",
     "jmbg": "1234567890123",
     "userType": "firma"
   }
   ```

2. **Login**:

   ```json
   POST /api/login
   {
     "username": "admin",
     "password": "123456"
   }
   ```

   **VAŽNO**: Session cookie se automatski čuva u Postman-u!

3. **Check Auth** (proveri da li si ulogovan):
   ```
   GET /api/check-auth
   ```

### KORAK 2: Kreiranje firme

**Obavezno pre testiranja radnika!**

```json
POST /api/firme
{
  "naziv": "Test Firma d.o.o.",
  "pib": "12345678",
  "adresa": "Glavna ulica 1",
  "grad": "Beograd",
  "pdv_broj": "RS123456789",
  "direktor": "Marko Petrović",
  "jmbg_direktora": "1234567890123"
}
```

### KORAK 3: Kreiranje pozicije

**Potrebno za dodavanje radnika!**

```json
POST /api/pozicije
{
  "naziv": "Software Developer",
  "opis_poslova": "Razvoj web aplikacija, rad sa JavaScript, Node.js i React tehnologijama."
}
```

### KORAK 4: Kreiranje radnika

```json
POST /api/radnici
{
  "ime": "Marko",
  "prezime": "Petrović",
  "jmbg": "1234567890123",
  "adresa": "Ulica 1, broj 1",
  "grad": "Beograd",
  "pozicija_id": 1,
  "firma_id": 1,
  "datum_zaposlenja": "2024-01-01",
  "visina_zarade": 50000,
  "tip_radnog_vremena": "puno_8h",
  "tip_ugovora": "na_neodredjeno",
  "vrsta_ugovora": "ugovor_o_radu"
}
```

## Validaciona pravila

### Firme:

- `naziv`: 2-100 karaktera, obavezno
- `pib`: 8 ili 13 cifara, samo brojevi
- `adresa`: maksimalno 200 karaktera
- `grad`: maksimalno 50 karaktera
- `jmbg_direktora`: tačno 13 cifara

### Radnici:

- `ime`, `prezime`: 2-50 karaktera, samo slova
- `jmbg`: tačno 13 cifara, samo brojevi
- `tip_radnog_vremena`: "puno_8h", "skraceno_6h", "skraceno_4h", "skraceno_2h"
- `tip_ugovora`: "na_neodredjeno", "na_odredjeno"
- `vrsta_ugovora`: "ugovor_o_radu", "ugovor_o_djelu", "ugovor_o_dopunskom_radu", "autorski_ugovor", "ugovor_o_pozajmnici"
- `visina_zarade`: pozitivan broj

### Pozicije:

- `naziv`: 2-100 karaktera
- `opis_poslova`: 10-1000 karaktera

## Česti HTTP status kodovi

- `200 OK`: Uspešan zahtev
- `201 Created`: Uspešno kreiran resurs
- `400 Bad Request`: Validacijska greška
- `401 Unauthorized`: Nisi ulogovan
- `403 Forbidden`: Nemaš dozvolu
- `404 Not Found`: Resurs ne postoji
- `500 Internal Server Error`: Greška na serveru

## Testiranje različitih scenarija

### Testiranje validacije:

1. Pošalji zahtev sa manjkajućim poljima
2. Pošalji nevaljan JMBG (kraći/duži od 13 cifara)
3. Pošalji nevaljan PIB
4. Koristi nedozvoljene vrednosti za enum polja

### Testiranje autorizacije:

1. Pošalji zahtev bez login-a
2. Pokušaj pristup admin rutama kao običan korisnik

### Testiranje search funkcionalnosti:

1. Search sa kratkim termom (< 2 karaktera)
2. Search sa dugim termom
3. Search sa specijalnim karakterima

## Debug saveti

1. **Proveri session cookie**: Idi u Postman Cookies tab i proveri da li postoji session cookie
2. **Proveri Headers**: Content-Type treba da bude "application/json"
3. **Proveri Response Body**: Pogledaj error poruke za debugging
4. **Console Output**: Pogledaj Node.js konzolu za server-side greške

## Korisni testovi za load testing

- Napravi više zahteva istovremeno
- Testuj rate limiting (brzi uzastopni zahtevi)
- Testuj sa velikim JSON payloadovima

## Environment za production

Kad budeš testirao na production serveru, promeni `baseUrl` na:

```
https://summasummarum.me
```
