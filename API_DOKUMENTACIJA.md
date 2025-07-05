# API Dokumentacija - Summa Summarum

## 📋 Pregled

Ova dokumentacija opisuje sve dostupne API endpoint-e u Summa Summarum aplikaciji.
Aplikacija koristi multi-user arhitekturu sa MariaDB bazom podataka gde svaki korisnik ima izolovane podatke.

---

## 🔐 Autentifikacija

Svi endpoint-i označeni sa 🔒 zahtevaju da korisnik bude ulogovan putem sesije.

### Auth Endpoint-i

| Metoda | Ruta              | Opis                               | Zaštićeno |
| ------ | ----------------- | ---------------------------------- | --------- |
| `POST` | `/api/login`      | Prijava korisnika                  | ❌        |
| `POST` | `/api/logout`     | Odjava korisnika                   | ❌        |
| `GET`  | `/api/auth/check` | Provera da li je korisnik ulogovan | ❌        |
| `POST` | `/api/register`   | Registracija novog korisnika       | ❌        |

#### POST /api/login

**Zahtev:**

```json
{
  "username": "admin",
  "password": "12345"
}
```

**Uspešan odgovor:**

```json
{
  "success": true
}
```

**Neuspešan odgovor:**

```json
{
  "message": "Pogrešno korisničko ime ili lozinka"
}
```

#### GET /api/auth/check

**Uspešan odgovor:**

```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@summasummarum.me"
  }
}
```

#### POST /api/register

**Zahtev:**

```json
{
  "username": "novi_korisnik",
  "email": "novi@example.com",
  "password": "sigurna123",
  "phone": "+382 67 123 456",
  "address": "Nova adresa 123"
}
```

**Uspešan odgovor:**

```json
{
  "message": "Korisnik je uspešno registrovan",
  "user": {
    "id": 4,
    "username": "novi_korisnik",
    "email": "novi@example.com"
  }
}
```

---

## 🏢 Firme API

Svi endpoint-i za upravljanje firmama zahtevaju autentifikaciju.
**Važno:** Svaki korisnik vidi i upravlja samo svojim firmama.

### Osnovni Endpoint-i

| Metoda   | Ruta                 | Opis                              | Zaštićeno |
| -------- | -------------------- | --------------------------------- | --------- |
| `GET`    | `/api/firme`         | Sve firme trenutnog korisnika     | 🔒        |
| `GET`    | `/api/firme/aktivne` | Aktivne firme trenutnog korisnika | 🔒        |
| `GET`    | `/api/firme/nula`    | Firme na nuli trenutnog korisnika | 🔒        |
| `GET`    | `/api/firme/:pib`    | Jedna firma po PIB-u              | 🔒        |
| `POST`   | `/api/firme`         | Dodaj novu firmu                  | 🔒        |
| `PUT`    | `/api/firme/:pib`    | Ažuriraj postojeću firmu          | 🔒        |
| `DELETE` | `/api/firme/:pib`    | Obriši firmu                      | 🔒        |

### Fallback rute za hosting provajdere

| Metoda | Ruta                     | Opis                          | Zaštićeno |
| ------ | ------------------------ | ----------------------------- | --------- |
| `POST` | `/api/firme/:pib/edit`   | Fallback za PUT (editovanje)  | 🔒        |
| `POST` | `/api/firme/:pib/delete` | Fallback za DELETE (brisanje) | 🔒        |

### CRUD Operacije

| Metoda   | Ruta              | Opis                                      | Zaštićeno |
| -------- | ----------------- | ----------------------------------------- | --------- |
| `POST`   | `/api/firme`      | Dodavanje nove firme (bilo kojeg statusa) | 🔒        |
| `PUT`    | `/api/firme/:pib` | Ažuriranje postojeće firme                | 🔒        |
| `DELETE` | `/api/firme/:pib` | Brisanje firme                            | 🔒        |

---

## 📝 Detaljni Opisi Firme API

### GET /api/firme

Vraća sve firme trenutnog ulogovanog korisnika (aktivne + firme na nuli).

**Uspešan odgovor:**

```json
{
  "firme": [
    {
      "id": 1,
      "user_id": 1,
      "PIB": "02825767",
      "Naziv": "SUMMA SUMMARUM",
      "Adresa": "POPA DUKLJANINA 2",
      "PDVBroj": "80/31-02217-8",
      "direktor_ime_prezime": "ŽELJKO ĐURANOVIĆ",
      "direktor_jmbg": "1606981220012",
      "Telefon": "067440040",
      "Email": "zeljkodj@t-com.me",
      "created_at": "2025-07-05T10:30:00.000Z",
      "updated_at": "2025-07-05T10:30:00.000Z"
    }
  ]
}
```

### GET /api/firme/aktivne

Vraća samo aktivne firme trenutnog korisnika.

**Uspešan odgovor:**

```json
{
  "firme": [
    {
      "id": 1,
      "user_id": 1,
      "PIB": "02825767",
      "Naziv": "SUMMA SUMMARUM",
      "Adresa": "POPA DUKLJANINA 2",
      "PDVBroj": "80/31-02217-8",
      "direktor_ime_prezime": "ŽELJKO ĐURANOVIĆ",
      "direktor_jmbg": "1606981220012",
      "Telefon": "067440040",
      "Email": "zeljkodj@t-com.me"
    }
  ]
}
```

### GET /api/firme/nula

Vraća samo firme na nuli trenutnog korisnika (ako postoje).

### GET /api/firme/:pib

Vraća jednu specifičnu firmu po PIB-u.

**Uspešan odgovor:**

```json
{
  "firma": {
    "id": 1,
    "user_id": 1,
    "PIB": "02825767",
    "Naziv": "SUMMA SUMMARUM",
    "Adresa": "POPA DUKLJANINA 2",
    "PDVBroj": "80/31-02217-8",
    "direktor_ime_prezime": "ŽELJKO ĐURANOVIĆ",
    "direktor_jmbg": "1606981220012",
    "Telefon": "067440040",
    "Email": "zeljkodj@t-com.me",
    "created_at": "2025-07-05T10:30:00.000Z",
    "updated_at": "2025-07-05T10:30:00.000Z"
  }
}
```

**Neuspešan odgovor (404):**

```json
{
  "message": "Firma nije pronađena"
}
```

### POST /api/firme

Dodaje novu firmu za trenutnog korisnika.

**Zahtev:**

```json
{
  "PIB": "03123456",
  "Naziv": "NOVA FIRMA DOO",
  "Adresa": "NOVA ADRESA BB",
  "PDVBroj": "80/31-12345-6",
  "direktor_ime_prezime": "MARKO MARKOVIĆ",
  "direktor_jmbg": "1234567890123",
  "Telefon": "067123456",
  "Email": "info@novafirma.me"
}
```

**Uspešan odgovor:**

```json
{
  "message": "Firma je uspešno dodana",
  "firma": {
    "id": 2,
    "user_id": 1,
    "PIB": "03123456",
    "Naziv": "NOVA FIRMA DOO",
    "Adresa": "NOVA ADRESA BB",
    "PDVBroj": "80/31-12345-6",
    "direktor_ime_prezime": "MARKO MARKOVIĆ",
    "direktor_jmbg": "1234567890123",
    "Telefon": "067123456",
    "Email": "info@novafirma.me"
  }
}
```

### PUT /api/firme/:pib

Ažurira postojeću firmu.

**Zahtev:**

```json
{
  "Naziv": "AŽURIRANI NAZIV FIRME DOO",
  "Adresa": "NOVA ADRESA 123",
  "PDVBroj": "80/31-54321-9",
  "direktor_ime_prezime": "PETAR PETROVIĆ",
  "direktor_jmbg": "9876543210987",
  "Telefon": "067987654",
  "Email": "nova@email.me"
}
```

**Uspešan odgovor:**

```json
{
  "message": "Firma je uspešno ažurirana",
  "firma": {
    "id": 1,
    "user_id": 1,
    "PIB": "02825767",
    "Naziv": "AŽURIRANI NAZIV FIRME DOO",
    "Adresa": "NOVA ADRESA 123",
    "PDVBroj": "80/31-54321-9",
    "direktor_ime_prezime": "PETAR PETROVIĆ",
    "direktor_jmbg": "9876543210987",
    "Telefon": "067987654",
    "Email": "nova@email.me",
    "updated_at": "2025-07-05T12:00:00.000Z"
  }
}
```

### DELETE /api/firme/:pib

Briše firmu po PIB-u.

**Uspešan odgovor:**

```json
{
  "message": "Firma je uspešno obrisana",
  "firma": {
    "id": 1,
    "PIB": "02825767",
    "Naziv": "SUMMA SUMMARUM",
    "Adresa": "POPA DUKLJANINA 2"
  }
}
```

Vraća jednu firmu na osnovu PIB-a.

**Primer:** `GET /api/firme/12345678`

**Odgovor:**

```json
{
  "PIB": "02825767",
  "Naziv": "SUMMA SUMMARUM",
  "Adresa": "POPA DUKLJANINA 2",
  "PDVBroj": "80/31-02217-8",
  "direktor_ime_prezime": "ŽELJKO ĐURANOVIĆ",
  "direktor_jmbg": "1606981220012",
  "Telefon": "067440040",
  "Email": "zeljkodj@t-com.me"
}
```

### POST /api/firme

Dodaje novu firmu bilo kojeg statusa (aktivna ili na nuli).

**Body:**

```json
{
  "PIB": "03987654",
  "Naziv": "NOVA TEST FIRMA DOO",
  "Adresa": "TEST ADRESA 123",
  "PDVBroj": "80/31-98765-4",
  "direktor_ime_prezime": "ANA ANIĆ",
  "direktor_jmbg": "1122334455667",
  "Telefon": "067111222",
  "Email": "test@firma.me"
}
```

**Odgovor:**

```json
{
  "message": "Firma je uspešno dodana",
  "firma": {
    "id": 3,
    "PIB": "03987654",
    "Naziv": "NOVA TEST FIRMA DOO",
    "Adresa": "TEST ADRESA 123",
    "PDVBroj": "80/31-98765-4",
    "direktor_ime_prezime": "ANA ANIĆ",
    "direktor_jmbg": "1122334455667",
    "Telefon": "067111222",
    "Email": "test@firma.me"
  }
}
```

### PUT /api/firme/:pib

Ažurira postojeću firmu.

**Body:**

```json
{
  "Naziv": "AŽURIRANO IME FIRME DOO",
  "Adresa": "NOVA ADRESA 456",
  "PDVBroj": "80/31-11111-1",
  "direktor_ime_prezime": "NOVI DIREKTOR",
  "direktor_jmbg": "5555666677889",
  "Telefon": "067555666",
  "Email": "novo@email.me"
}
```

### DELETE /api/firme/:pib

Briše firmu na osnovu PIB-a.

**Odgovor:**

```json
{
  "message": "Firma je uspešno obrisana",
  "firma": {
    "PIB": "02825767",
    "Naziv": "SUMMA SUMMARUM",
    "Adresa": "POPA DUKLJANINA 2"
  }
}
```

---

## 🔒 Bezbednost i Multi-user Arhitektura

### Izolacija podataka

- Svaki korisnik vidi i upravlja **samo svojim firmama** (`user_id` filtriranje)
- Podaci su čuvani u **MariaDB bazi podataka**
- Auth middleware automatski filtrira pristup na osnovu sesije

### Struktura baze podataka

- **Tabela `users`**: Korisnici sistema
- **Tabela `firme`**: Firme sa `user_id` foreign key
- **Tabela `radnici`**: Radnici povezani sa firmama (opciono)

### Kolone tabele `firme`

| Kolona                | Tip          | Opis                           |
| --------------------- | ------------ | ------------------------------ |
| `id`                  | INT          | Primary key (auto increment)   |
| `user_id`             | INT          | Foreign key na users tabelu    |
| `PIB`                 | VARCHAR(20)  | Poreski identifikacioni broj   |
| `Naziv`               | VARCHAR(255) | Naziv firme                    |
| `Adresa`              | VARCHAR(255) | Adresa firme                   |
| `PDVBroj`             | VARCHAR(50)  | PDV broj (može biti NULL)      |
| `direktor_ime_prezime`| VARCHAR(255) | Ime i prezime direktora        |
| `direktor_jmbg`       | VARCHAR(20)  | JMBG direktora                 |
| `Telefon`             | VARCHAR(50)  | Kontakt telefon                |
| `Email`               | VARCHAR(255) | Email adresa                   |
| `created_at`          | TIMESTAMP    | Datum kreiranja                |
| `updated_at`          | TIMESTAMP    | Datum poslednje izmene         |

### Status kodovi

| Kod | Značenje              | Razlog                      |
| --- | --------------------- | --------------------------- |
| 200 | OK                    | Uspešna operacija           |
| 401 | Unauthorized          | Korisnik nije ulogovan      |
| 404 | Not Found             | Firma/resurs nije pronađen  |
| 400 | Bad Request           | Neispravni podaci u zahtevu |
| 500 | Internal Server Error | Greška na serveru           |

### Validacija

- **PIB**: Mora biti jedinstven u celoj bazi
- **user_id**: Automatski se postavlja na osnovu ulogovanog korisnika
- **Naziv**: Obavezan
- **Adresa**: Obavezna
- **direktor_ime_prezime**: Obavezan
- **direktor_jmbg**: Obavezan
- **Velika slova**: Sva polja osim Email-a se čuvaju velikim slovima

---

## �👥 Users API (Admin funkcionalnost)

| Metoda   | Ruta             | Opis                             | Zaštićeno |
| -------- | ---------------- | -------------------------------- | --------- |
| `GET`    | `/api/users`     | Lista korisnika (in-memory CRUD) | 🔒        |
| `POST`   | `/api/users`     | Dodavanje korisnika              | 🔒        |
| `PUT`    | `/api/users/:id` | Ažuriranje korisnika             | 🔒        |
| `DELETE` | `/api/users/:id` | Brisanje korisnika               | 🔒        |

---

## 🌐 Static Rute

| Ruta                      | Opis                          | Zaštićeno |
| ------------------------- | ----------------------------- | --------- |
| `/`                       | Glavna stranica               | ❌        |
| `/kontakt.html`           | Kontakt stranica              | ❌        |
| `/protected.html`         | Zaštićena stranica            | 🔒        |
| `/pdv_prijava/index.html` | PDV prijava forma             | 🔒        |
| `/pdv_prijava/:file`      | PDV prijava resursi (CSS, JS) | 🔒        |
| `/pdv0.html`              | Masovna PDV prijava (nule)    | 🔒        |

---

## ❌ Error Responses

### 400 Bad Request

```json
{
  "message": "PIB, Naziv, Adresa, direktor_ime_prezime i direktor_jmbg su obavezni"
}
```

### 401 Unauthorized

```json
{
  "message": "pristup zabranjen. ulogujte se"
}
```

### 404 Not Found

```json
{
  "message": "Firma nije pronađena"
}
```

### 500 Internal Server Error

```json
{
  "message": "Greška pri čuvanju firme"
}
```

---

## 📁 Struktura Projekta

```
src/
├── controllers/
│   ├── userController.js     # CRUD operacije za korisnike
└── routes/
    └── userRoutes.js         # Auth i user endpoint-i
app.js                        # Glavna Express aplikacija
database/
├── firme.csv                 # CSV fajl sa firmama za import
├── firme_mariadb_update.sql  # SQL skripta za masovni import/update
├── create_firme_table.sql    # SQL skripta za kreiranje tabele
└── generate_mariadb_sql.py   # Python skripta za generisanje SQL-a
```

---

## 🧪 Testiranje

### Primer cURL komandi:

```bash
# Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"12345"}'

# Dobijanje firmi (zahteva sesiju)
curl -X GET http://localhost:3000/api/firme \
  -H "Cookie: connect.sid=your-session-cookie"

# Dodavanje nove firme
curl -X POST http://localhost:3000/api/firme \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session-cookie" \
  -d '{"PIB":"03123456","Naziv":"TEST FIRMA DOO","Adresa":"TEST ADRESA","direktor_ime_prezime":"MARKO MARKOVIĆ","direktor_jmbg":"1234567890123","Telefon":"067123456","Email":"test@firma.me"}'
```

### PowerShell primer:

```powershell
# Testiranje endpoint-a
Invoke-WebRequest -Uri "http://localhost:3000/api/check-auth" -Method GET

# Sa sesijom
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-WebRequest -Uri "http://localhost:3000/api/firme" -WebSession $session
```

---

## 📝 Napomene

1. **Sesije**: Aplikacija koristi express-session za čuvanje stanja login-a
2. **Baza podataka**: MariaDB sa UTF-8 podrškom za crnogorska slova
3. **CORS**: Konfigurisan za development i production
4. **Validacija**: PIB mora biti jedinstven u celoj bazi
5. **Auto-uppercase**: Sva polja osim Email-a se automatski pretvaraju u velika slova
6. **Timestamps**: Automatsko čuvanje vremena kreiranja i izmene
7. **Foreign keys**: user_id se automatski postavlja na osnovu sesije

---

_Poslednja izmena: 5. jul 2025._
