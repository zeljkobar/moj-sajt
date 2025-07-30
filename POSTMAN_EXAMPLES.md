# Konkretni primeri za testiranje u Postman-u

## Postavljanje Environment-a

U Postman-u:

1. Klikni na gear ikonu (Environment quick look)
2. Klikni "Add" za novi environment
3. Naziv: "Moj Sajt Local"
4. Dodaj varijable:
   - `baseUrl`: `http://localhost:3000`
   - `token`: (ostaće prazno, biće automatski popunjen)

## Test scenariji po redu

### 1. Registracija i prijava

#### Test 1: Uspešna registracija

```http
POST {{baseUrl}}/api/register
Content-Type: application/json

{
  "username": "testuser1",
  "email": "test@example.com",
  "password": "password123",
  "ime": "Marko",
  "prezime": "Petrović",
  "jmbg": "1234567890123",
  "userType": "firma"
}
```

#### Test 2: Login sa novim korisnikom

```http
POST {{baseUrl}}/api/login
Content-Type: application/json

{
  "username": "testuser1",
  "password": "password123"
}
```

### 2. Testiranje firmi

#### Test 3: Kreiranje firme

```http
POST {{baseUrl}}/api/firme
Content-Type: application/json

{
  "naziv": "Tech Solutions d.o.o.",
  "pib": "12345678",
  "adresa": "Knez Mihailova 1",
  "grad": "Beograd",
  "pdv_broj": "RS123456789",
  "direktor": "Ana Marković",
  "jmbg_direktora": "2345678901234"
}
```

#### Test 4: Kreiranje druge firme

```http
POST {{baseUrl}}/api/firme
Content-Type: application/json

{
  "naziv": "Digital Agency j.d.o.o.",
  "pib": "87654321",
  "adresa": "Strahinića Bana 35",
  "grad": "Novi Sad",
  "pdv_broj": "RS987654321",
  "direktor": "Petar Nikolić",
  "jmbg_direktora": "3456789012345"
}
```

#### Test 5: Pregled svih firmi

```http
GET {{baseUrl}}/api/firme
```

### 3. Testiranje pozicija

#### Test 6: Kreiranje pozicija

```http
POST {{baseUrl}}/api/pozicije
Content-Type: application/json

{
  "naziv": "Frontend Developer",
  "opis_poslova": "Razvoj korisničkih interfejsa koristeći React, Vue.js i Angular framework. Odgovoran za kreiranje responzivnih web stranica."
}
```

```http
POST {{baseUrl}}/api/pozicije
Content-Type: application/json

{
  "naziv": "Backend Developer",
  "opis_poslova": "Razvoj server-side aplikacija koristeći Node.js, Express i baze podataka. Kreiranje API-ja i mikroservisa."
}
```

```http
POST {{baseUrl}}/api/pozicije
Content-Type: application/json

{
  "naziv": "Project Manager",
  "opis_poslova": "Upravljanje projektima, koordinacija timova, komunikacija sa klijentima i praćenje rokova."
}
```

### 4. Testiranje radnika

#### Test 7: Dodavanje radnika - Frontend Developer

```http
POST {{baseUrl}}/api/radnici
Content-Type: application/json

{
  "ime": "Stefan",
  "prezime": "Jovanović",
  "jmbg": "1234567890123",
  "adresa": "Bulevar oslobođenja 10",
  "grad": "Beograd",
  "pozicija_id": 1,
  "firma_id": 1,
  "datum_zaposlenja": "2024-01-15",
  "visina_zarade": 80000,
  "tip_radnog_vremena": "puno_8h",
  "tip_ugovora": "na_neodredjeno",
  "vrsta_ugovora": "ugovor_o_radu"
}
```

#### Test 8: Dodavanje radnika - Backend Developer

```http
POST {{baseUrl}}/api/radnici
Content-Type: application/json

{
  "ime": "Milica",
  "prezime": "Stojanović",
  "jmbg": "2345678901234",
  "adresa": "Francuska 15",
  "grad": "Beograd",
  "pozicija_id": 2,
  "firma_id": 1,
  "datum_zaposlenja": "2024-02-01",
  "visina_zarade": 90000,
  "tip_radnog_vremena": "puno_8h",
  "tip_ugovora": "na_neodredjeno",
  "vrsta_ugovora": "ugovor_o_radu"
}
```

#### Test 9: Dodavanje radnika na određeno vreme

```http
POST {{baseUrl}}/api/radnici
Content-Type: application/json

{
  "ime": "Nemanja",
  "prezime": "Milanović",
  "jmbg": "3456789012345",
  "adresa": "Svetog Save 25",
  "grad": "Novi Sad",
  "pozicija_id": 3,
  "firma_id": 2,
  "datum_zaposlenja": "2024-03-01",
  "visina_zarade": 70000,
  "tip_radnog_vremena": "puno_8h",
  "tip_ugovora": "na_odredjeno",
  "vrsta_ugovora": "ugovor_o_radu",
  "datum_prestanka": "2024-12-31"
}
```

### 5. Testiranje pretraga

#### Test 10: Pretraga firmi

```http
GET {{baseUrl}}/api/firme/search?q=Tech
```

#### Test 11: Pretraga radnika

```http
GET {{baseUrl}}/api/radnici/search?q=Stefan
```

#### Test 12: Globalna pretraga

```http
GET {{baseUrl}}/api/search?q=Beograd
```

### 6. Testiranje pozajmica

#### Test 13: Kreiranje pozajmice

```http
POST {{baseUrl}}/api/pozajmice
Content-Type: application/json

{
  "broj_ugovora": "POZ-001-2024",
  "datum_izdavanja": "2024-07-15",
  "radnik_id": 1,
  "iznos": 100000,
  "svrha": "obaveze_zarade",
  "datum_dospeca": "2024-12-31"
}
```

### 7. Testiranje Update operacija

#### Test 14: Ažuriranje firme

```http
PUT {{baseUrl}}/api/firme/12345678
Content-Type: application/json

{
  "naziv": "Tech Solutions Plus d.o.o.",
  "pib": "12345678",
  "adresa": "Knez Mihailova 5",
  "grad": "Beograd",
  "pdv_broj": "RS123456789",
  "direktor": "Ana Marković",
  "jmbg_direktora": "2345678901234"
}
```

#### Test 15: Ažuriranje radnika (bez vrsta_ugovora)

```http
PUT {{baseUrl}}/api/radnici/1
Content-Type: application/json

{
  "ime": "Stefan",
  "prezime": "Jovanović",
  "jmbg": "1234567890123",
  "adresa": "Novi Bulevar 15",
  "grad": "Beograd",
  "pozicija_id": 1,
  "firma_id": 1,
  "datum_zaposlenja": "2024-01-15",
  "visina_zarade": 95000,
  "tip_radnog_vremena": "puno_8h",
  "tip_ugovora": "na_neodredjeno"
}
```

## Testiranje grešaka

### Test 16: Nevalidan PIB (prekratak)

```http
POST {{baseUrl}}/api/firme
Content-Type: application/json

{
  "naziv": "Test Firma",
  "pib": "123",
  "adresa": "Test adresa",
  "grad": "Test grad"
}
```

**Očekivana greška**: 400 Bad Request - PIB mora imati 8 ili 13 cifara

### Test 17: Nevaljan JMBG

```http
POST {{baseUrl}}/api/radnici
Content-Type: application/json

{
  "ime": "Test",
  "prezime": "User",
  "jmbg": "123",
  "adresa": "Test",
  "grad": "Test",
  "pozicija_id": 1,
  "firma_id": 1,
  "datum_zaposlenja": "2024-01-01",
  "visina_zarade": 50000,
  "tip_radnog_vremena": "puno_8h",
  "tip_ugovora": "na_neodredjeno",
  "vrsta_ugovora": "ugovor_o_radu"
}
```

**Očekivana greška**: 400 Bad Request - JMBG mora imati tačno 13 cifara

### Test 18: Pristup bez autentifikacije

Prvo se odjavi:

```http
POST {{baseUrl}}/api/logout
```

Zatim pokušaj pristup:

```http
GET {{baseUrl}}/api/firme
```

**Očekivana greška**: 401 Unauthorized

## Korisni Postman saveti

1. **Pre-request Script** za automatsko login:

```javascript
// U Pre-request Script tab-u
pm.sendRequest(
  {
    url: pm.environment.get("baseUrl") + "/api/login",
    method: "POST",
    header: { "Content-Type": "application/json" },
    body: {
      mode: "raw",
      raw: JSON.stringify({
        username: "testuser1",
        password: "password123",
      }),
    },
  },
  function (err, res) {
    console.log("Auto login completed");
  }
);
```

2. **Tests script** za validaciju odgovora:

```javascript
// U Tests tab-u
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response has success property", function () {
  var jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("success");
  pm.expect(jsonData.success).to.be.true;
});
```

3. **Environment setup** za ID-jeve:

```javascript
// Čuvanje ID-ja iz response-a
if (pm.response.code === 201) {
  var responseJson = pm.response.json();
  pm.environment.set("lastCreatedId", responseJson.data.id);
}
```
