# 🗺️ Mapa Ruta - Summa Summarum

## Auth Rute

```
POST   /api/login           - Prijava korisnika
POST   /api/logout          - Odjava korisnika
GET    /api/auth/check      - Provera login statusa
POST   /api/register        - Registracija novog korisnika
```

## Firme API (🔒 zaštićeno)

```
GET    /api/firme           - Sve firme trenutnog korisnika
GET    /api/firme/aktivne   - Aktivne firme trenutnog korisnika
GET    /api/firme/nula      - Firme na nuli trenutnog korisnika
GET    /api/firme/:pib      - Jedna firma po PIB-u

POST   /api/firme           - Dodaj novu firmu
PUT    /api/firme/:pib      - Ažuriraj postojeću firmu
DELETE /api/firme/:pib      - Obriši firmu
```

## Users API (🔒 admin zaštićeno)

```
GET    /api/users           - Lista svih korisnika
POST   /api/users           - Dodaj korisnika (admin)
PUT    /api/users/:id       - Ažuriraj korisnika (admin)
DELETE /api/users/:id       - Obriši korisnika (admin)
```

## Static Rute

```
GET    /                    - Glavna stranica
GET    /kontakt.html        - Kontakt stranica
GET    /registracija.html   - Registracija korisnika
GET    /firme.html          - Pregled firmi (🔒)
GET    /dodaj-firmu.html    - Dodavanje firme (🔒)
GET    /edit-firmu.html     - Editovanje firme (🔒)
GET    /dashboard.html      - Dashboard (🔒)
GET    /protected.html      - Zaštićena stranica (🔒)
GET    /pdv_prijava/*       - PDV prijava (🔒)
GET    /pdv0.html           - Masovna PDV prijava (🔒)
```

## Legenda

- 🔒 = Zahteva autentifikaciju
- 🔒 admin = Zahteva admin prava
- :pib = PIB parametar (npr. "12345678")
- :id = ID parametar

## Napomene

### Multi-user sistem

- Svaki korisnik vidi samo svoje firme
- Podaci su izolovani po korisničkim JSON fajlovima
- Automatska izolacija kroz auth middleware

### Struktura podataka

- Korisnici: `src/data/users.json`
- Firme po korisniku: `src/data/users/{username}_firme.json`
- Status firmi: `active` ili `zero`

### Registracija

- Dostupna javno na `/registracija.html`
- Validacija korisničkog imena, email-a i lozinke
- Automatsko kreiranje JSON fajla za firme
