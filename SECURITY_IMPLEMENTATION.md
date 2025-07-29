# 🔒 Implementacija sigurnosnih funkcionalnosti

## ✅ Implementirano (FAZA 1)

### 1. Input Validation Middleware

- **Lokacija**: `src/middleware/validation.js`
- **Funkcionalnost**: Validacija svih input podataka pre obrade
- **Pokrivenost**:
  - ✅ Firme (PIB 8 ili 13 cifara, naziv, adresa, itd.)
  - ✅ Radnici (JMBG, ime/prezime, pozicija, zarada)
  - ✅ Pozajmice (iznos, svrha, datum)
  - ✅ Auth (login/registracija sa jakim lozinkama)
  - ✅ Pozicije (naziv, opis poslova)

### 2. Centralizovano Error Handling

- **Lokacija**: `src/middleware/errorHandler.js`
- **Funkcionalnost**: Jedinstveno rukovanje greškama kroz celu aplikaciju
- **Features**:
  - Automatsko logovanje grešaka
  - Sigurne error poruke za korisnike
  - Stack trace samo u development modu

### 3. Logging Sistem (Winston)

- **Lokacija**: `src/utils/logger.js`
- **Funkcionalnost**: Strukturirano logovanje aktivnosti
- **Tipovi logova**:
  - `info` - Opšte informacije
  - `warn` - Upozorenja
  - `error` - Greške sa stack trace
  - `security` - Sigurnosni događaji
- **Izlaz**:
  - Console (development)
  - Fajlovi: `logs/error.log`, `logs/combined.log`

### 4. Rate Limiting

- **Lokacija**: `src/middleware/rateLimiter.js`
- **Konfiguracija**:
  - **Auth rute**: 5 pokušaja / 15 minuta
  - **API rute**: 100 zahteva / 15 minuta
  - **Generalno**: 1000 zahteva / 15 minuta
- **Funkcionalnost**: Sprečava brute force napade i DDoS

## 📝 Kako koristiti

### Dodavanje validacije u nove rute:

```javascript
const { validateFirma } = require("../middleware/validation");
router.post("/firme", validateFirma, controller.createFirma);
```

### Logovanje u kontrolerima:

```javascript
const { logInfo, logError, logSecurity } = require("../utils/logger");

// Uspešna operacija
logInfo("Firma kreirana", { firmaId: 123, userId: req.user.id });

// Greška
logError("Greška pri kreiranju firme", error, { userId: req.user.id });

// Sigurnosni događaj
logSecurity("Neuspešan login pokušaj", { email: req.body.email, ip: req.ip });
```

### Rate limiting za specifične rute:

```javascript
const rateLimiter = require("../middleware/rateLimiter");
router.post("/sensitive", rateLimiter.auth, controller.sensitiveOperation);
```

## 🔧 Konfiguracija

### Environment varijable (.env):

```
NODE_ENV=production
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📊 Monitoring

### Log fajlovi za praćenje:

- `logs/error.log` - Sve greške
- `logs/combined.log` - Svi logovi
- `logs/security.log` - Sigurnosni događaji (dodati po potrebi)

### Metrlike koje se prate:

- Broj neuspešnih login pokušaja
- Rate limit prekršaji
- Validation errors
- Server greške

## 🚀 Sledeći koraci (FAZA 2)

- [ ] HTTPS implementacija
- [ ] CORS konfiguracija
- [ ] Helmet.js za dodatnu sigurnost
- [ ] JWT token refresh mehanizam
- [ ] Database backup strategija

## ⚠️ Napomene

1. **PIB validacija**: Podržava 8 cifara (standardni PIB) ili 13 cifara (JMBG kao PIB)
2. **Logovi**: Automatski se dodaju u `.gitignore` da se ne commituju
3. **Rate limiting**: Aktivno na svim rutama, prilagođeno po tipovima
4. **Error handling**: Svi stack trace-ovi se skrivaju u production modu

---

_Implementirano: 30. jul 2025._
