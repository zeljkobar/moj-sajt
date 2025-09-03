# 📧 Marketing Email System

Kompletni sistem za slanje marketing emailova za SummaSummarum.me

## 📁 Struktura

```
├── email-marketing-template.html    # HTML template za marketing mail
├── marketing-email.js               # Osnovni servis za slanje emailova
├── email-campaign.js               # Upravljanje kampanjama
├── email-lists/                    # Direktorij za CSV liste
└── campaign-results/               # Rezultati kampanja
```

## 🚀 Brzo pokretanje

### 1. Instalacija dependencies (već imaš)

```bash
npm install nodemailer
```

### 2. Podešavanje environment varijabli

U `.env` fajl dodaj:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 3. Kreiranje demo liste

```bash
node email-campaign.js demo
```

### 4. Test slanje

```bash
node email-campaign.js test demo-list.csv
```

### 5. Pokretanje kampanje

```bash
node email-campaign.js run demo-list.csv
```

## 📋 CSV Format za email liste

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

## 🎯 Komande

### Osnovne komande

```bash
# Kreiraj demo listu
node email-campaign.js demo

# Prikaži dostupne liste
node email-campaign.js list

# Test kampanja (šalje 1 email)
node email-campaign.js test lista.csv

# Pokreni kompletnu kampanju
node email-campaign.js run lista.csv

# Prikaži rezultate kampanje
node email-campaign.js results campaign-123456.json
```

### Test pojedinačnog emaila

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

- **Batch size**: 10 emailova po grupi (može se mijenjati)
- **Delay**: 3 sekunde između emailova
- **Batch pauza**: 30 sekundi između grupa

### Safety features

- **Rate limiting**: Pauze između slanja
- **Error handling**: Nastavlja rad iako neki email ne prođe
- **Rezultat tracking**: Sve se čuva u JSON fajlove
- **Test mod**: Sigurno testiranje

## 📊 Monitoring rezultata

Svaka kampanja kreira JSON fajl sa rezultatima:

```json
{
  "campaignName": "demo-list.csv",
  "timestamp": "2025-09-03T10:30:00.000Z",
  "totalEmails": 50,
  "successful": 48,
  "failed": 2,
  "results": [...],
  "options": {...}
}
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
