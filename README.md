# Summa Summarum - Sistem za upravljanje firmama

## 📋 Opis

Web aplikacija za upravljanje firmama sa funkcionalnostima dodavanja, editovanja, brisanja i praćenja statusa firmi.

## 🚀 Migracija na bazu podataka

**Datum migracije:** 29. jun 2025

Aplikacija je uspešno migrirane sa JSON fajlova na MySQL/MariaDB bazu podataka.

### ✅ Migrirane funkcionalnosti:

- **Korisnici** - registracija, login, autentifikacija
- **Firme** - CRUD operacije, status praćenje
- **Direktorske informacije** - ime/prezime i JMBG direktora

## 📦 Tehnologije

- **Backend:** Node.js, Express.js
- **Baza:** MySQL/MariaDB
- **Frontend:** HTML, CSS, JavaScript, Bootstrap
- **Autentifikacija:** Express Session
- **Sigurnost:** bcrypt hash lozinki

## 🛠 Postavka

1. **Baza podataka:**

   ```bash
   # Kreiraj lokalnu bazu
   mysql -u root -p
   CREATE DATABASE summasum_local;
   ```

2. **Environment varijable:**

   ```bash
   # .env fajl
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=summasum_local
   ```

3. **Instalacija:**
   ```bash
   npm install
   npm start
   ```

## 📊 Struktura baze

### Tabela `users`

- id, username, password, email, phone, ime, prezime, jmbg
- Indeksi na username, email, jmbg

### Tabela `firme`

- id, user_id, pib, naziv, adresa, pdvBroj
- **direktor_ime_prezime**, **direktor_jmbg** (nova polja)
- status ENUM('aktivan', 'nula')
- Indeksi na user_id, pib, status, direktor_jmbg

## 🗃 Backup

**✅ Migracija završena - JSON fajlovi uklonjeni**

Stari JSON podaci su sigurno migrirani u bazu i sačuvani u `backup/json_data_backup/`:

- users.json
- admin_firme.json, ana_firme.json, marko_firme.json

Originalni `src/data/` direktorijum je uklonjen nakon uspešne migracije.

## 🔐 Korisnici

- **admin** - lozinka: 12345
- **ana** - lozinka: ana123
- **marko** - lozinka: marko123

## 📋 API Endpointi

- `POST /api/login` - prijava
- `POST /api/register` - registracija
- `GET /api/firme` - sve firme korisnika
- `POST /api/firme` - dodaj firmu
- `PUT /api/firme/:pib` - ažuriraj firmu
- `DELETE /api/firme/:pib` - obriši firmu
- `GET /api/firme/:pib` - dobij firmu po PIB-u
