# 🚀 DEPLOYMENT CHECKLIST - Baza: summasum\_

## Pre deploya na server:

### 1. 📁 Fajlovi za upload:

- [ ] Sav source kod (osim node_modules/)
- [ ] package.json i package-lock.json
- [ ] .env (sa podacima za server, ne .env.production)
- [ ] database/schema_server.sql

### 2. 🗄️ Baza podataka `summasum_`:

- [ ] Dobio podatke od hosting provajdera (host, user, password)
- [ ] **Ime baze:** `summasum_` ✅
- [ ] Upload schema_server.sql kroz phpMyAdmin
- [ ] Proverim da su tabele kreane (users, firme)

### 3. ⚙️ Server konfiguracija:

```bash
# Na serveru:
cd /path/to/your/app
npm install
cp .env.production .env
# Uredi .env - DB_NAME=summasum_
node app.js
```

### 4. 📋 .env template za server:

```env
DB_HOST=localhost
DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=summasum_
DB_PORT=3306
SESSION_SECRET=your_super_secret_key_here
NODE_ENV=production
PORT=3000
```

### 5. ✅ Test funkcionalnosti:

- [ ] Pristup aplikaciji kroz browser
- [ ] Registracija novog korisnika
- [ ] Login sa novim korisnikom
- [ ] Dodavanje firme
- [ ] CRUD operacije rade

## 🔧 phpMyAdmin import koraci:

1. **Logiraj se u cPanel → phpMyAdmin**
2. **Selektuj bazu `summasum_`** (levi panel)
3. **Import tab**
4. **Choose File → schema_server.sql → GO**
5. **Proveri da su kreane tabele:**
   - ✅ `users` (8 kolona)
   - ✅ `firme` (11 kolona + direktor polja)

## 🔍 Troubleshooting:

### "Can't connect to database"

- Proverite DB*NAME=summasum* u .env
- Proverite ostale database podatke

### "Table doesn't exist"

- Re-import schema_server.sql
- Proveri da li je baza `summasum_` selektovana

### "Access denied"

- Kontaktiraj hosting support za MySQL privilegije na `summasum_`

## 🌐 Ready for production!

Aplikacija je potpuno pripremljena za deployment sa bazom `summasum_`.
