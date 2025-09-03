# 📧 Marketing Email System

Kompletni web-based sistem za slanje marketing emailova za SummaSummarum.me

## 📁 Struktura

```
├── public/email-marketing.html           # Admin web interface
├── public/email-marketing-template.html  # HTML template za marketing mail
├── marketing-email.js                   # Core email servis sa tracking-om
├── app.js                               # API endpoints za marketing
└── database/add_marketing_tracking.js   # Database setup script
```

## 🚀 Brzo pokretanje

### 1. Instalacija dependencies (već imaš)

```bash
npm install nodemailer multer
```

### 2. Podešavanje environment varijabli

U `.env` fajl dodaj:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 3. Setup baze podataka

```bash
node database/add_marketing_tracking.js
```

### 4. Pristup web interfejsu

Otvori u browseru:

```
http://localhost:3000/email-marketing.html
```

### 5. Pokretanje kampanje

- Upload CSV fajl preko web interface-a
- Test kampanja ili kompletna kampanja
- Praćenje rezultata u realnom vremenu

## 📋 CSV Format za email liste

Upload preko web interface-a - podržava sljedeći format:

```csv
email,firstName,lastName,companyName,city,industry
ana@example.com,Ana,Petrović,Petrović d.o.o.,Podgorica,Računovodstvo
marko@example.com,Marko,Nikolić,Nikolić Finance,Nikšić,Finansije
```

**Obavezna polja:**

- `email` - email adresa (obavezno)

**Opciona polja:**

- `firstName` - ime (za personalizaciju)
- `lastName` - prezime
- `companyName` - naziv firme
- `city` - grad
- `industry` - industrija

## 🎯 Korišćenje

### Web Interface

Sve se radi preko admin panel-a:

1. **Pristup**: `http://localhost:3000/email-marketing.html`
2. **Test email**: Pošaljite test email na jednu adresu
3. **CSV Upload**: Drag & drop CSV fajl sa kontaktima
4. **Kampanja**: Pokretanje test ili kompletne kampanje
5. **Praćenje**: Real-time statistike i povijest kampanja

### Test pojedinačnog emaila

Preko web interface-a u "Brzi Test Email" sekciji ili direktno iz koda:

```bash
# Test sa default adresom
node marketing-email.js test

# Test sa custom adresom
node marketing-email.js test your-email@example.com
```

## ⚙️ Napredne opcije

### Personalizacija emaila

Template automatski personalizuje email na osnovu podataka:

- `{firstName}` - zamjenjuje "Poštovane koleginice i kolege" sa "Poštovani/a {ime}"
- `{companyName}` - dodaje naziv kompanije u tekst

### Batch processing

- **Batch size**: 10 emailova po grupi (automatski)
- **Delay**: 2-3 sekunde između emailova
- **Batch pauza**: 30 sekundi između grupa

### Safety features

- **Rate limiting**: Pauze između slanja
- **Error handling**: Nastavlja rad iako neki email ne prođe
- **Database tracking**: Sve se čuva u MySQL bazi
- **Test mod**: Sigurno testiranje

## 📊 Monitoring rezultata

Sve kampanje se prate u realnom vremenu kroz web interface:

- **Statistike**: Ukupno poslano, success rate
- **Kampanje povijest**: Tabela svih kampanja sa detaljima
- **Email level tracking**: Status svakog pojedinačnog emaila
- **Real-time updates**: Automatsko ažuriranje statistika

### Database tabele

```sql
marketing_campaigns  - Osnovne informacije o kampanjama
marketing_emails     - Tracking svakog emaila
marketing_stats      - Globalne statistike
```

## 🔧 Customizacija template-a

### HTML template

Edituj `email-marketing-template.html` za:

- Izmjenu dizajna
- Dodavanje novih sekcija
- Mijenjanje CTA dugmeta

### Text verzija

Automatski se generiše iz HTML verzije, ali možeš mijenjati u `createTextVersion()` funkciji.

## 📧 Email deliverability tips

### Gmail setup

1. Uključi 2FA na Gmail account
2. Generiši App Password za nodemailer
3. Koristi taj App Password u `EMAIL_PASS`

### Best practices

- **Subject line**: Kratko i jasno
- **From name**: "SummaSummarum Team"
- **Reply-to**: Postavi odgovarajući email
- **Unsubscribe**: Dodaj link za odjavu
- **Rate limiting**: Ne šalji previše odjednom

### Timing

- **Najbolje vrijeme**: Utorak-Četvrtak, 10-16h
- **Izbjegavaj**: Ponedjeljak ujutru, Petak popodne
- **Batch size**: Maksimalno 50-100 emailova po satu

## 🚨 Sigurnost

### Spam prevention

- Validni unsubscribe link
- Legitiman content
- Ne kupuj email liste
- Koristi opt-in liste

### Privacy

- GDPR compliance za EU klijente
- Čuvaj email liste sigurno
- Ne dijeli liste treće strane

## 📞 Support

Za pitanja oko email sistema:

- Email: admin@summasummarum.me
- Telefon: +382 67 440 040

## 🔄 Workflow za novu kampanju

1. **Pripremi listu**

   ```bash
   # Dodaj CSV fajl u email-lists/ direktorij
   cp nova-lista.csv email-lists/
   ```

2. **Test kampanja**

   ```bash
   node email-campaign.js test nova-lista.csv
   ```

3. **Pokreni kampanju**

   ```bash
   node email-campaign.js run nova-lista.csv
   ```

4. **Provjeri rezultate**

   ```bash
   node email-campaign.js results campaign-TIMESTAMP.json
   ```

5. **Analiza**
   - Success rate > 95% = odličo
   - Success rate 90-95% = dobro
   - Success rate < 90% = provjeri email listu

---

**Napomena**: Uvijek testiraj sa malim brojem adresa prije masovnog slanja!
