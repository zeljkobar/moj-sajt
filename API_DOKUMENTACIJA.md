# API Dokumentacija - Summa Summarum

## 📋 Pregled

Ova dokumentacija opisuje sve dostupne API endpoint-e u Summa Summarum aplikaciji.

---

## 🔐 Autentifikacija

Svi endpoint-i označeni sa 🔒 zahtevaju da korisnik bude ulogovan putem sesije.

### Auth Endpoint-i

| Metoda | Ruta              | Opis                               | Zaštićeno |
| ------ | ----------------- | ---------------------------------- | --------- |
| `POST` | `/api/login`      | Prijava korisnika                  | ❌        |
| `POST` | `/api/logout`     | Odjava korisnika                   | ❌        |
| `GET`  | `/api/check-auth` | Provera da li je korisnik ulogovan | ❌        |

#### POST /api/login

```json
{
  "username": "admin",
  "password": "12345"
}
```

**Odgovor:**

```json
{
  "success": true
}
```

---

## 🏢 Firme API

Svi endpoint-i za upravljanje firmama zahtevaju autentifikaciju.

### Osnovni Endpoint-i

| Metoda | Ruta                 | Opis                                     | Zaštićeno |
| ------ | -------------------- | ---------------------------------------- | --------- |
| `GET`  | `/api/firme`         | Dobijanje svih firmi (aktivne + na nuli) | 🔒        |
| `GET`  | `/api/firme/aktivne` | Dobijanje samo aktivnih firmi            | 🔒        |
| `GET`  | `/api/firme/nula`    | Dobijanje firmi na nuli                  | 🔒        |
| `GET`  | `/api/firme/:pib`    | Dobijanje jedne firme po PIB-u           | 🔒        |

### CRUD Operacije

| Metoda   | Ruta              | Opis                         | Zaštićeno |
| -------- | ----------------- | ---------------------------- | --------- |
| `POST`   | `/api/firme`      | Dodavanje nove aktivne firme | 🔒        |
| `POST`   | `/api/firme/nula` | Dodavanje nove firme na nuli | 🔒        |
| `PUT`    | `/api/firme/:pib` | Ažuriranje postojeće firme   | 🔒        |
| `DELETE` | `/api/firme/:pib` | Brisanje firme               | 🔒        |

---

## 📝 Detaljni Opisi

### GET /api/firme

Vraća kombinovanu listu svih firmi (aktivne + firme na nuli).

**Odgovor:**

```json
[
  {
    "ime": "Nova aktivna firma d.o.o.",
    "pib": "12345678",
    "adresa": "Adresa bb",
    "pdv": "80/31-12345-0"
  },
  {
    "ime": "Zavet d.o.o.",
    "pib": "02793253",
    "adresa": "VUKA KARADZICA BB",
    "pdv": "80/31-02314-8"
  }
]
```

### GET /api/firme/aktivne

Vraća samo aktivne firme.

### GET /api/firme/nula

Vraća samo firme na nuli (za masovno generiranje XML-a sa nulama).

### GET /api/firme/:pib

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

Dodaje novu aktivnu firmu.

**Body:**

```json
{
  "ime": "Nova firma d.o.o.",
  "pib": "98765432",
  "adresa": "Neka adresa 123",
  "pdv": "80/31-98765-4"
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

### POST /api/firme/nula

Dodaje novu firmu na nuli (isti format kao gore).

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

## 👥 Users API

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
