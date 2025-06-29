# 📊 DEPLOYMENT PODATAKA - data_export.sql

## ✅ Uspešno eksportovano iz lokalne baze:

- **👥 Korisnika:** 3 (admin, ana, marko)
- **🏢 Firmi:** 31
- **📄 Fajl:** `data_export.sql`

## 🚀 KORACI ZA IMPORT NA SERVER:

### 1. Upload fajla na server

Upload `data_export.sql` na server (cPanel File Manager ili FTP)

### 2. Import kroz phpMyAdmin

1. **Logiraj se u cPanel → phpMyAdmin**
2. **Selektuj bazu `summasum_`** (levi panel)
3. **Import tab**
4. **Choose File → data_export.sql**
5. **Klikni GO**

### 3. Verifikacija importa

Nakon import-a proverite:

- **Tabela `users`:** 3 reda
- **Tabela `firme`:** 31 red
- **AUTO_INCREMENT values:** users=4, firme=32

## 🔐 TEST LOGIN-a na serveru:

### Korisnici za testiranje:

```
admin / 12345
ana / ana123
marko / marko123
```

### Test scenario:

1. Otvori aplikaciju na serveru
2. Login sa `admin` / `12345`
3. Proveri da vidiš 31 firmu u dashboard-u
4. Test dodavanje nove firme
5. Test editovanje postojeće firme

## ⚠️ VAŽNE NAPOMENE:

### Pre importa (opciono):

Ako želiš čistu instalaciju, možeš obrisati postojeće podatke:

```sql
DELETE FROM firme;  -- Prvo firme zbog foreign key
DELETE FROM users;
```

### Nakon importa:

- **Lozinke** su bcrypt hash-ovane ✅
- **Direktor polja** su uključena ✅
- **Status mapping** je ispravan ✅
- **Foreign key constraints** rade ✅

## 🎯 ZAVRŠNI TEST:

1. **Upload i import `data_export.sql`**
2. **Podesi `.env` sa bazom `summasum_`:**
   ```env
   DB_NAME=summasum_
   DB_USER=zeljko
   DB_PASSWORD=Vanesa3007#
   ```
3. **Pokreni aplikaciju**
4. **Login test sa admin/12345**
5. **Proveri da sve firme postoje**

## 🏁 Ready for production!

Svi lokalni podaci su spremni za server.
