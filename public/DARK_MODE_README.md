# Dark Mode Implementacija - Summa Summarum

## Pregled

Dark mode funkcionalnost je implementirana korišćenjem CSS varijabli i JavaScript localStorage-a za čuvanje korisničkih preferencija.

## Implementirane funkcionalnosti

### 1. CSS Varijable (global-components.css)

Sve boje su organizovane kroz CSS varijable koje se automatski menjaju na osnovu `data-theme` atributa:

**Light Mode (default):**

- `--bg-color: #ffffff` - pozadina stranice
- `--text-color: #333333` - glavni tekst
- `--card-bg: #ffffff` - pozadina kartica
- `--border-color: #e0e0e0` - boje okvira

**Dark Mode:**

- `--bg-color: #1a1a1a` - tamna pozadina
- `--text-color: #e0e0e0` - svetao tekst
- `--card-bg: #2d2d2d` - tamne kartice
- `--border-color: #404040` - tamni okviri

### 2. JavaScript funkcionalnost (script.js)

- Automatsko čuvanje preferencije u `localStorage`
- Podrška za više toggle dugmeta na istoj stranici
- Smooth animacije između tema
- Ikone se menjaju (mesec/sunce) u zavisnosti od trenutne tema

### 3. Komponente sa podrškom za dark mode

Sve Bootstrap komponente su stilizovane za dark mode:

- ✅ Navbar
- ✅ Forme (input, select, textarea)
- ✅ Kartice (cards)
- ✅ Tabele
- ✅ Modali
- ✅ Dropdown menui
- ✅ Alert komponente
- ✅ Pagination
- ✅ List groups
- ✅ Accordions
- ✅ Progress bars

## Kako dodati dark mode na novu stranicu

### 1. Dodaj CSS linkove u `<head>`:

```html
<link rel="stylesheet" href="global-components.css" />
<link rel="stylesheet" href="style.css" />
```

### 2. Dodaj toggle dugme u navbar:

```html
<button id="themeToggle" class="theme-toggle">
  <i class="fas fa-moon"></i> Dark
</button>
```

### 3. Dodaj JavaScript:

```html
<script src="script.js"></script>
```

### 4. Koristi CSS varijable za custom stilove:

```css
.my-custom-component {
  background-color: var(--card-bg);
  color: var(--text-color);
  border: 1px solid var(--border-color);
}
```

## Test stranica

Kreirana je `dark-mode-template.html` stranica za testiranje svih komponenti u oba mode-a.

## Dostupne CSS varijable

### Boje za tema

- `var(--bg-color)` - glavna pozadina
- `var(--text-color)` - glavni tekst
- `var(--card-bg)` - pozadina kartica/komponenti
- `var(--border-color)` - boje okvira
- `var(--navbar-bg)` - pozadina navbar-a
- `var(--navbar-text)` - tekst u navbar-u
- `var(--input-bg)` - pozadina input polja
- `var(--input-border)` - okvir input polja
- `var(--shadow-color)` - boja senki

### Glavne boje (ostaju iste u oba mode-a)

- `var(--primary-color)` - glavna plava
- `var(--success-color)` - zelena
- `var(--danger-color)` - crvena
- `var(--warning-color)` - žuta
- `var(--info-color)` - svetlo plava

### Spacing i border radius

- `var(--spacing-sm)`, `var(--spacing-md)`, itd.
- `var(--border-radius)`, `var(--border-radius-lg)`, itd.

## Browser podrška

- Chrome/Edge: ✅ Potpuna podrška
- Firefox: ✅ Potpuna podrška
- Safari: ✅ Potpuna podrška
- IE11: ❌ Ograničena podrška za CSS varijable

## Dodatne mogućnosti

### Automatska detekcija system theme:

```javascript
// Dodaj ovo u script.js ako želiš da se poštuje system theme
const systemPrefersDark = window.matchMedia(
  "(prefers-color-scheme: dark)"
).matches;
const savedTheme =
  localStorage.getItem("theme") || (systemPrefersDark ? "dark" : "light");
```

### Custom animacije:

```css
/* Dodaj smooth transition za sve elemente */
* {
  transition: background-color 0.3s ease, color 0.3s ease,
    border-color 0.3s ease;
}
```

## Troubleshooting

**Problem:** Neke komponente se ne prilagođavaju dark mode-u
**Rešenje:** Proveri da li koriste CSS varijable umesto fiksnih boja

**Problem:** Toggle dugme se ne vidi u navbar-u
**Rešenje:** Proveri da li je dodata `.theme-toggle` CSS klasa

**Problem:** Tema se ne čuva između sesija
**Rešenje:** Proveri da li JavaScript ima pristup localStorage-u (ne radi u file:// protokolu)

## Implementacija završena! 🎉

Sada možeš:

1. Otvoriti bilo koju stranicu sajta
2. Kliknuti na "Dark" dugme u navbar-u
3. Tema će se automatski promeniti i sačuvati
4. Koristiti `dark-mode-template.html` za testiranje novih komponenti
