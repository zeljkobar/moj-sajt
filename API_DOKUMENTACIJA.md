# API Dokumentacija - Summa Summarum

## 📋 Pregled

Ova dokumentacija opisuje sve dostupne API endpoint-e u Summa Summarum aplikaciji.
Aplikacija koristi multi-user arhitekturu gde svaki korisnik ima izolovane podatke.

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

| Metoda | Ruta                   | Opis                              | Zaštićeno |
| ------ | ---------------------- | --------------------------------- | --------- |
| `POST` | `/api/firme/:pib/edit` | Fallback za PUT (editovanje)      | 🔒        |
| `POST` | `/api/firme/:pib/delete` | Fallback za DELETE (brisanje)   | 🔒        |

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
      "naziv": "Nova aktivna firma d.o.o.",
      "pib": "12345678",
      "adresa": "Adresa bb",
      "pdvBroj": "80/31-12345-0",
      "status": "active"
    },
    {
      "naziv": "Firma na nuli d.o.o.",
      "pib": "87654321",
      "adresa": "Druga adresa bb",
      "pdvBroj": "80/31-87654-1",
      "status": "zero"
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
      "naziv": "Nova aktivna firma d.o.o.",
      "pib": "12345678",
      "adresa": "Adresa bb",
      "pdvBroj": "80/31-12345-0",
      "status": "active"
    }
  ]
}
```

### GET /api/firme/nula

Vraća samo firme na nuli trenutnog korisnika.

### GET /api/firme/:pib

Vraća jednu specifičnu firmu po PIB-u.

**Uspešan odgovor:**

```json
{
  "firma": {
    "naziv": "Nova aktivna firma d.o.o.",
    "pib": "12345678",
    "adresa": "Adresa bb",
    "pdvBroj": "80/31-12345-0",
    "status": "active"
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
  "naziv": "Nova firma d.o.o.",
  "pib": "12345678",
  "adresa": "Adresa firme bb",
  "pdvBroj": "80/31-12345-0",
  "status": "active"
}
```

**Uspešan odgovor:**

```json
{
  "message": "Firma je uspešno dodana",
  "firma": {
    "naziv": "Nova firma d.o.o.",
    "pib": "12345678",
    "adresa": "Adresa firme bb",
    "pdvBroj": "80/31-12345-0",
    "status": "active"
  }
}
```

### PUT /api/firme/:pib

Ažurira postojeću firmu.

**Zahtev:**

```json
{
  "naziv": "Ažurirani naziv d.o.o.",
  "adresa": "Nova adresa bb",
  "pdvBroj": "80/31-12345-1",
  "status": "zero"
}
```

**Uspešan odgovor:**

```json
{
  "message": "Firma je uspešno ažurirana",
  "firma": {
    "naziv": "Ažurirani naziv d.o.o.",
    "pib": "12345678",
    "adresa": "Nova adresa bb",
    "pdvBroj": "80/31-12345-1",
    "status": "zero"
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
    "naziv": "Obrisana firma d.o.o.",
    "pib": "12345678",
    "adresa": "Adresa bb",
    "pdvBroj": "80/31-12345-0",
    "status": "active"
  }
}
```

Vraća jednu firmu na osnovu PIB-a.

**Primer:** `GET /api/firme/12345678`

**Odgovor:**

```json
{
  "ime": "Nova aktivna firma d.o.o.",
  "pib": "12345678",
  "adresa": "Adresa bb",
  "pdv": "80/31-12345-0"
}
```

### POST /api/firme

Dodaje novu firmu bilo kojeg statusa (aktivna ili na nuli).

**Body:**

```json
{
  "naziv": "Nova firma d.o.o.",
  "pib": "98765432",
  "adresa": "Neka adresa 123",
  "pdvBroj": "80/31-98765-4",
  "status": "active"
}
```

ili za firmu na nuli:

```json
{
  "naziv": "Firma na nuli d.o.o.",
  "pib": "11111111",
  "adresa": "Adresa na nuli 456",
  "pdvBroj": "",
  "status": "zero"
}
```

**Odgovor:**

```json
{
  "message": "Firma je uspešno dodana",
  "firma": {
    "ime": "Nova firma d.o.o.",
    "pib": "98765432",
    "adresa": "Neka adresa 123",
    "pdv": "80/31-98765-4"
  }
}
```

### PUT /api/firme/:pib

Ažurira postojeću firmu.

**Body:**

```json
{
  "ime": "Ažurirano ime firme",
  "adresa": "Nova adresa",
  "pdv": "80/31-11111-1",
  "noviPib": "11111111" // opciono - za menjanje PIB-a
}
```

### DELETE /api/firme/:pib

Briše firmu na osnovu PIB-a.

**Odgovor:**

```json
{
  "message": "Aktivna firma je uspešno obrisana",
  "firma": {
    "ime": "Obrisana firma",
    "pib": "12345678",
    "adresa": "Adresa",
    "pdv": "80/31-12345-0"
  }
}
```

---

## � Bezbednost i Multi-user Arhitektura

### Izolacija podataka

- Svaki korisnik vidi i upravlja **samo svojim firmama**
- Podaci su fizički izolovani u posebnim JSON fajlovima
- Auth middleware automatski filtrira pristup na osnovu sesije

### Struktura fajlova

- Korisnici: `src/data/users.json`
- Firme po korisniku: `src/data/users/{username}_firme.json`

### Status kodovi

| Kod | Značenje              | Razlog                      |
| --- | --------------------- | --------------------------- |
| 200 | OK                    | Uspešna operacija           |
| 401 | Unauthorized          | Korisnik nije ulogovan      |
| 404 | Not Found             | Firma/resurs nije pronađen  |
| 400 | Bad Request           | Neispravni podaci u zahtevu |
| 500 | Internal Server Error | Greška na serveru           |

### Validacija

- **PIB**: Mora biti jedinstven po korisniku
- **Status**: Samo "active" ili "zero"
- **Naziv**: Obavezan
- **Adresa**: Obavezna

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
  "message": "Ime, PIB i adresa su obavezni"
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

## 📁 Struktura Fajlova

```
src/
├── controllers/
│   ├── authController.js     # Login/logout logika
│   ├── firmeController.js    # CRUD operacije za firme
│   └── userController.js     # CRUD operacije za korisnike
├── routes/
│   ├── authRoutes.js         # Auth endpoint-i
│   ├── firmeRoutes.js        # Firme endpoint-i
│   └── userRoutes.js         # Users endpoint-i
├── middleware/
│   └── auth.js               # Middleware za autentifikaciju
└── data/
    ├── firme.js              # Aktivne firme
    └── firme0.js             # Firme na nuli
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
  -d '{"ime":"Test firma","pib":"12345678","adresa":"Test adresa"}'
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
2. **Perzistencija**: Podaci se čuvaju u `.js` fajlovima (ne u bazi)
3. **CORS**: Konfigurisan za `http://localhost:3000`
4. **Validacija**: PIB mora biti jedinstven kroz sve firme
5. **Auto-save**: Sve izmene se automatski čuvaju u fajlove

---

_Poslednja izmena: 25. jun 2025._
