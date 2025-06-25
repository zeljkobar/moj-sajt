# 🗺️ Mapa Ruta - Summa Summarum

## Auth Rute

```
POST   /api/login           - Prijava
POST   /api/logout          - Odjava
GET    /api/check-auth      - Provera login statusa
```

## Firme API (🔒 zaštićeno)

```
GET    /api/firme           - Sve firme
GET    /api/firme/aktivne   - Aktivne firme
GET    /api/firme/nula      - Firme na nuli
GET    /api/firme/:pib      - Jedna firma

POST   /api/firme           - Dodaj aktivnu firmu
POST   /api/firme/nula      - Dodaj firmu na nuli

PUT    /api/firme/:pib      - Ažuriraj firmu
DELETE /api/firme/:pib      - Obriši firmu
```

## Users API (🔒 zaštićeno)

```
GET    /api/users           - Lista korisnika
POST   /api/users           - Dodaj korisnika
PUT    /api/users/:id       - Ažuriraj korisnika
DELETE /api/users/:id       - Obriši korisnika
```

## Static Rute

```
GET    /                    - Glavna stranica
GET    /kontakt.html        - Kontakt
GET    /protected.html      - Zaštićena stranica (🔒)
GET    /pdv_prijava/*       - PDV prijava (🔒)
GET    /pdv0.html           - Masovna PDV prijava (🔒)
```

## Legenda

- 🔒 = Zahteva autentifikaciju
- :pib = PIB parametar (npr. "12345678")
- :id = ID parametar
