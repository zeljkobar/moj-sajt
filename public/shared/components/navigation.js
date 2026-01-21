// Navigation Component - Jedinstvena navigacija za sve stranice
class Navigation {
  constructor() {
    this.currentUser = null;
    this.userRole = null;
    this.darkModeInitialized = false;
    this.themeToggleHandler = null;
    this.initialized = false;
  }

  // Generiše HTML za navigaciju
  generateNavHTML() {
    // Domain detection
    const host = window.location.host;
    const urlParams = new URLSearchParams(window.location.search);
    const domain = urlParams.get('domain');
    const isMojradnik = host.includes('mojradnik.me') || domain === 'mojradnik';
    const isPrijaviradnika = host.includes('prijaviradnika.com') || domain === 'prijaviradnika';

    // Domain detection completed

    // Domain-specific branding and paths
    let brandLogo, brandName;
    if (isMojradnik) {
      brandLogo = '/mojradnik/logo.png';
      brandName = 'Moj Radnik';
    } else if (isPrijaviradnika) {
      brandLogo = '/prijaviradnika/logo.png';
      brandName = 'Prijavi Radnika';
    } else {
      brandLogo = '/shared/images/summasummarum_logo.svg';
      brandName = 'Summa Summarum';
    }

    // Domain-specific paths
    const dashboardPath = (isMojradnik || isPrijaviradnika)
      ? '/mojradnik/dashboard.html'
      : '/shared/dashboard.html';
    const firmePath = (isMojradnik || isPrijaviradnika)
      ? 'javascript:void(0)' // JavaScript funkcija za mojradnik i prijaviradnika
      : '/shared/firme.html';
    const pdvPath = (isMojradnik || isPrijaviradnika)
      ? '/mojradnik/dashboard.html'
      : '/shared/pdv-pregled.html';

    // Različita navigacija za različne tipove korisnika i domene
    const zavrsniRacuniItem =
      !isMojradnik && this.userRole !== 'firma'
        ? `
              <!-- Završni Računi -->
              <li class="nav-item">
                <a class="nav-link" href="/shared/zavrsni-racuni.html">
                  <i class="fas fa-file-invoice-dollar me-1"></i>Završni Računi
                </a>
              </li>`
        : '';

    const pdvCalendarItem =
      !isMojradnik && this.userRole !== 'firma'
        ? `
              <!-- PDV Kalendar -->
              <li class="nav-item">
                <a class="nav-link" href="${pdvPath}">
                  <i class="fas fa-receipt me-1"></i>PDV Kalendar
                </a>
              </li>`
        : '';

    return `
      <nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm sticky-top">
        <div class="container-fluid">
          <!-- Brand -->
          <a class="navbar-brand fw-bold" href="${dashboardPath}">
            <img src="${brandLogo}" alt="Logo" width="30" height="30" class="me-2">
            ${brandName}
          </a>

          <!-- Toggle button for mobile -->
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>

          <!-- Navigation items -->
          <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav me-auto">
              <!-- Dashboard -->
              <li class="nav-item">
                <a class="nav-link" href="${dashboardPath}" data-page="dashboard">
                  <i class="fas fa-tachometer-alt me-1"></i>Dashboard
                </a>
              </li>

              <!-- Firme/Firma -->
              <li class="nav-item">
                <a class="nav-link" href="${firmePath}" ${
      isMojradnik ? 'onclick="navigateToFirmaDetalji(); return false;"' : ''
    }>
                  <i class="fas fa-building me-1"></i>${
                    isMojradnik ? 'Firma' : 'Firme'
                  }
                </a>
              </li>

              ${zavrsniRacuniItem}

              ${pdvCalendarItem}

              <!-- Pomoć (samo za mojradnik) -->
              ${
                isMojradnik
                  ? `
              <li class="nav-item">
                <a class="nav-link" href="/mojradnik/pomoc.html">
                  <i class="fas fa-question-circle me-1"></i>Pomoć
                </a>
              </li>`
                  : '<!-- Pomoć sakrivena za summasummarum -->'
              }

              <!-- Administrator dropdown (samo za admin korisnike) -->
              <li class="nav-item dropdown" id="adminMenu" style="display: none;">
                <a class="nav-link dropdown-toggle" href="#" id="adminDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="fas fa-cog me-1"></i>Administrator
                </a>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item" href="/admin-users.html"><i class="fas fa-users-cog me-2"></i>Korisnici</a></li>
                  <li><a class="dropdown-item" href="/admin-uplate.html"><i class="fas fa-credit-card me-2"></i>Uplate</a></li>
                  <li><a class="dropdown-item" href="/admin-pretplate.html"><i class="fas fa-subscription me-2"></i>Pretplate</a></li>
                  <li><a class="dropdown-item" href="/admin-database.html"><i class="fas fa-database me-2"></i>Baza podataka</a></li>
                  <li><a class="dropdown-item" href="/email-admin.html"><i class="fas fa-envelope-open-text me-2"></i>Email Admin</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item" href="/shared/email-marketing.html"><i class="fas fa-bullhorn me-2"></i>Marketing Email</a></li>
                  <li><a class="dropdown-item" href="#"><i class="fas fa-chart-line me-2"></i>Sistemski izveštaji</a></li>
                </ul>
              </li>
            </ul>

            <!-- Global Search -->
            <div class="navbar-search-container d-none d-lg-block me-3">
              <div class="navbar-search-wrapper">
                <input
                  type="text"
                  id="navbarSearchInput"
                  placeholder="Pretražite..."
                  class="navbar-search-input"
                />
                <button
                  id="navbarClearSearch"
                  class="navbar-clear-btn"
                  style="display: none;"
                >
                  ×
                </button>
                <div
                  id="navbarSearchResults"
                  class="navbar-search-results"
                  style="display: none"
                ></div>
              </div>
            </div>

            <!-- User info and logout -->
            <ul class="navbar-nav">
              <!-- Dark mode toggle -->
              <li class="nav-item">
                <button 
                  type="button" 
                  class="theme-toggle btn btn-link nav-link" 
                  style="border: none; background: none; color: inherit; text-decoration: none;">
                  <i class="fas fa-moon"></i> Dark
                </button>
              </li>
              <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="fas fa-user-circle me-1"></i>
                  <span id="navbar-username">Korisnik</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><a class="dropdown-item" href="${
                    isMojradnik
                      ? '/shared/moj-profil.html'
                      : '/shared/moj-profil.html'
                  }"><i class="fas fa-user-circle me-2"></i>Moj profil</a></li>
                  <li><a class="dropdown-item" href="${
                    isMojradnik
                      ? '/shared/edit-profil.html'
                      : '/shared/edit-profil.html'
                  }"><i class="fas fa-edit me-2"></i>Edituj profil</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item" href="#" id="logoutBtn"><i class="fas fa-sign-out-alt me-2"></i>Odjavi se</a></li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    `;
  }

  // Inicijalizuje navigaciju
  async init() {
    // Zaštita od duplih inicijalizacija
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    // Ukloni postojeće navigacije ako postoje
    const existingNavs = document.querySelectorAll('nav.navbar');
    existingNavs.forEach(nav => nav.remove());

    // Najprije učitaj informacije o korisniku da bi imali ulogu
    await this.loadUserInfo();

    // Sada generiši HTML sa pravilnom navigacijom na osnovu uloge
    const navHTML = this.generateNavHTML();

    // Pokušaj da koristiš navigation placeholder, a ako ne postoji, dodaj na vrh stranice
    const navPlaceholder = document.getElementById('navigation-placeholder');
    if (navPlaceholder) {
      navPlaceholder.innerHTML = navHTML;
    } else {
      document.body.insertAdjacentHTML('afterbegin', navHTML);
    }

    // Kratka pauza da se osiguramo da je HTML dodat u DOM
    await new Promise(resolve => setTimeout(resolve, 200));

    // Ponovo pozovi loadUserInfo da ažuriraš UI sa korisničkim podacima
    await this.loadUserInfo();

    // Postavi aktivnu stavku menija
    this.setActiveMenuItem();

    // Dodaj event listenere
    this.attachEventListeners();

    // Inicijalizuj dark mode sa dodatnim čekanjem
    setTimeout(() => {
      this.initializeDarkMode();
    }, 300);

    // Inicijalizuj Bootstrap komponente
    this.initializeBootstrap();
  }

  // Učitava informacije o trenutnom korisniku
  async loadUserInfo() {
    try {
      const response = await fetch('/api/check-auth', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.authenticated) {
        this.currentUser = data.user;
        this.userRole = data.user?.role;

        // Ažuriraj UI sa korisničkim podacima
        const usernameElement = document.getElementById('navbar-username');
        if (usernameElement && this.currentUser) {
          usernameElement.textContent = this.currentUser.username || 'Korisnik';
        }

        // Prikaži admin meni ako je korisnik admin
        if (this.userRole === 'admin') {
          const adminMenu = document.getElementById('adminMenu');
          if (adminMenu) {
            adminMenu.style.display = 'block';
          }
        }
      }
    } catch (error) {
      console.error('Greška pri učitavanju korisničkih podataka:', error);
    }
  }

  // Označava aktivnu stavku menija na osnovu trenutne stranice
  setActiveMenuItem() {
    const currentPage = window.location.pathname
      .split('/')
      .pop()
      .replace('.html', '');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(currentPage)) {
        link.classList.add('active');
      }
    });
  }

  // Dodaje event listenere
  attachEventListeners() {
    // Domain detection za logout
    const host = window.location.host;
    const urlParams = new URLSearchParams(window.location.search);
    const domain = urlParams.get('domain');
    const isMojradnik = host.includes('mojradnik.me') || domain === 'mojradnik';
    const logoutRedirect = isMojradnik
      ? '/mojradnik/index.html'
      : '/index.html';

    // Logout funkcionalnost
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async e => {
        e.preventDefault();
        try {
          const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include',
          });
          if (response.ok) {
            window.location.href = logoutRedirect;
          }
        } catch (error) {
          console.error('Greška pri odjavi:', error);
          window.location.href = logoutRedirect;
        }
      });
    }

    // Navbar search funkcionalnost
    this.setupNavbarSearch();
  }

  // Setup navbar search functionality
  setupNavbarSearch() {
    const searchInput = document.getElementById('navbarSearchInput');
    const clearButton = document.getElementById('navbarClearSearch');
    const searchResults = document.getElementById('navbarSearchResults');

    if (!searchInput || !clearButton || !searchResults) {
      return; // Elementi nisu pronađeni
    }

    let searchTimeout;

    searchInput.addEventListener('input', e => {
      const query = e.target.value.trim();

      if (query.length > 0) {
        clearButton.style.display = 'block';

        // Debounce search
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.performNavbarSearch(query);
        }, 300);
      } else {
        clearButton.style.display = 'none';
        searchResults.style.display = 'none';
      }
    });

    clearButton.addEventListener('click', () => {
      searchInput.value = '';
      clearButton.style.display = 'none';
      searchResults.style.display = 'none';
      searchInput.focus();
    });

    // Hide results when clicking outside
    document.addEventListener('click', e => {
      if (!e.target.closest('.navbar-search-container')) {
        searchResults.style.display = 'none';
      }
    });

    // Hide results when pressing escape
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        searchResults.style.display = 'none';
        searchInput.blur();
      }
    });
  }

  // Perform search in navbar
  async performNavbarSearch(query) {
    const searchResults = document.getElementById('navbarSearchResults');

    if (!searchResults) return;

    // Show loading
    searchResults.innerHTML =
      '<div class="navbar-search-item">Pretražujem...</div>';
    searchResults.style.display = 'block';

    try {
      // Fetch search results
      const [firmeResponse, radniciResponse] = await Promise.all([
        fetch(`/api/firme/search?q=${encodeURIComponent(query)}`, {
          credentials: 'include',
        }).catch(() => null),
        fetch(`/api/radnici/search?q=${encodeURIComponent(query)}`, {
          credentials: 'include',
        }).catch(() => null),
      ]);

      const firme =
        firmeResponse && firmeResponse.ok ? await firmeResponse.json() : [];
      const radnici =
        radniciResponse && radniciResponse.ok
          ? await radniciResponse.json()
          : [];

      this.displayNavbarSearchResults(firme, radnici, query);
    } catch (error) {
      console.error('Navbar search error:', error);
      this.displayNavbarSearchResults([], [], query);
    }
  }

  // Display search results in navbar
  displayNavbarSearchResults(firme, radnici, query) {
    const searchResults = document.getElementById('navbarSearchResults');

    if (!searchResults) return;

    let html = '';
    const totalResults = firme.length + radnici.length;

    if (totalResults === 0) {
      html = `<div class="navbar-search-item">
        <div class="navbar-search-title">Nema rezultata za "${query}"</div>
      </div>`;
    } else {
      // Firme results (limit to 3)
      if (firme.length > 0) {
        firme.slice(0, 3).forEach(firma => {
          html += `<div class="navbar-search-item" onclick="navigateToNavbarResult('firma', ${
            firma.id
          }, '${firma.naziv}')">
            <div class="navbar-search-category">Firma</div>
            <div class="navbar-search-title">${firma.naziv}</div>
            <div class="navbar-search-subtitle">${firma.grad || 'N/A'} • ${
            firma.aktivna ? 'Aktivna' : 'Neaktivna'
          }</div>
          </div>`;
        });
      }

      // Radnici results (limit to 3)
      if (radnici.length > 0) {
        radnici.slice(0, 3).forEach(radnik => {
          html += `<div class="navbar-search-item" onclick="navigateToNavbarResult('radnik', ${
            radnik.id
          }, '${radnik.ime} ${radnik.prezime}', ${radnik.firma_id || ''})">
            <div class="navbar-search-category">Radnik</div>
            <div class="navbar-search-title">${radnik.ime} ${
            radnik.prezime
          }</div>
            <div class="navbar-search-subtitle">${radnik.pozicija || 'N/A'} • ${
            radnik.firma || 'N/A'
          }</div>
          </div>`;
        });
      }

      // Show more results if needed
      if (totalResults > 6) {
        html += `<div class="navbar-search-item" onclick="showAllNavbarResults('${query}')">
          <div class="navbar-search-title text-primary">Prikaži sve rezultate (${totalResults})</div>
        </div>`;
      }
    }

    searchResults.innerHTML = html;
    searchResults.style.display = 'block';
  }

  // Inicijalizuje dark mode funkcionalnost
  initializeDarkMode() {
    // Zaštita od duplih poziva
    if (this.darkModeInitialized) {
      return;
    }
    this.darkModeInitialized = true;

    const savedTheme = localStorage.getItem('theme') || 'light';

    // Postaviće početnu temu
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Ukloni postojeće event listener-e da izbjegnem duplikate
    if (this.themeToggleHandler) {
      document.body.removeEventListener('click', this.themeToggleHandler);
    }

    // Kreiraj handler funkciju kao svojstvo klase
    this.themeToggleHandler = e => {
      if (e.target.closest('.theme-toggle')) {
        e.preventDefault();
        e.stopImmediatePropagation(); // Spriječi duple pozive

        const currentTheme =
          document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeToggleText(newTheme);
      }
    };

    // Dodaj event listener
    document.body.addEventListener('click', this.themeToggleHandler);

    // Ažuriraj tekst nakon kratke pauze
    setTimeout(() => {
      this.updateThemeToggleText(savedTheme);
    }, 200);
  }

  // Ažurira tekst theme toggle dugmeta
  updateThemeToggleText(theme) {
    const themeToggles = document.querySelectorAll('.theme-toggle');
    themeToggles.forEach(toggle => {
      toggle.innerHTML =
        theme === 'dark'
          ? '<i class="fas fa-sun"></i> Light'
          : '<i class="fas fa-moon"></i> Dark';
    });
  }

  // Inicijalizuje Bootstrap komponente
  initializeBootstrap() {
    // Proverava da li je Bootstrap dostupan
    if (typeof window.bootstrap === 'undefined') {
      // Pokušaj ponovo nakon kratke pauze
      setTimeout(() => this.initializeBootstrap(), 500);
      return;
    }

    // Čekaj da se DOM potpuno završi
    setTimeout(() => {
      // Inicijalizuj sve dropdown komponente
      const dropdownElements = document.querySelectorAll('.dropdown-toggle');

      dropdownElements.forEach((element, index) => {
        try {
          // Uništi postojeću instancu ako postoji
          const existingDropdown = bootstrap.Dropdown.getInstance(element);
          if (existingDropdown) {
            existingDropdown.dispose();
          }

          // Kreiraj novu instancu
          new bootstrap.Dropdown(element);
        } catch (error) {
          console.error(
            `❌ Greška pri inicijalizaciji dropdown ${index + 1}:`,
            error
          );
        }
      });

      // Inicijalizuj navbar toggle za mobile
      const navbarToggler = document.querySelector('.navbar-toggler');
      if (navbarToggler) {
        try {
          const navbarCollapse = document.querySelector('.navbar-collapse');
          if (navbarCollapse) {
            new bootstrap.Collapse(navbarCollapse, { toggle: false });
          }
        } catch (error) {
          console.error(
            '❌ Greška pri inicijalizaciji navbar collapse:',
            error
          );
        }
      }
    }, 100);
  }
}

// CSS stilovi za navigaciju
const navigationCSS = `
<style>
/* Sticky navigation styling */
* {
  margin: 0;
  padding: 0;
}

body {
  padding-top: 0 !important;
  margin-top: 0 !important;
}

.navbar.sticky-top {
  z-index: 1030;
  position: sticky;
  top: 0;
  margin: 0;
  padding: 0;
}

/* Kompenzacija za sadržaj ispod navigacije */
.container, .radnici-container, .global-container {
  padding-top: 20px;
}

.navbar .dropdown-menu {
  border: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  margin-top: 8px;
}

.navbar .dropdown-item {
  padding: 8px 16px;
  transition: all 0.2s ease;
}

.navbar .dropdown-item:hover {
  background-color: #f8f9fa;
  color: #667eea;
}

.navbar .dropdown-header {
  color: #6c757d;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.navbar .nav-link.active {
  color: #667eea !important;
  font-weight: 600;
}

.navbar .nav-link:hover {
  color: #667eea !important;
}

.navbar-brand:hover {
  color: #667eea !important;
}

.dropdown-divider {
  margin: 8px 0;
}

/* Mobile responsiveness */
@media (max-width: 991.98px) {
  .navbar-collapse {
    margin-top: 1rem;
  }
  
  .navbar-nav .dropdown-menu {
    border: none;
    box-shadow: none;
    background-color: transparent;
    margin-left: 1rem;
  }
  
  .navbar-nav .dropdown-item {
    color: rgba(255, 255, 255, 0.75);
    padding: 4px 8px;
  }
  
  .navbar-nav .dropdown-item:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
  }
}

/* Navbar Search Styles */
.navbar-search-container {
  position: relative;
  width: 300px;
}

.navbar-search-wrapper {
  position: relative;
}

.navbar-search-input {
  width: 100%;
  padding: 8px 35px 8px 15px;
  border: 1px solid #6c757d;
  border-radius: 20px;
  font-size: 0.9rem;
  outline: none;
  transition: all 0.3s ease;
  background-color: #d1e1eeff;
  color: white;
}

.navbar-search-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.navbar-search-input:focus {
  border-color: #667eea;
  background-color: white;
  color: #333;
  box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
}

.navbar-search-input:focus::placeholder {
  color: #999;
}

.navbar-clear-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: color 0.2s;
}

.navbar-clear-btn:hover {
  color: white;
}

.navbar-search-input:focus + .navbar-clear-btn {
  color: #999;
}

.navbar-search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1050;
  max-height: 400px;
  overflow-y: auto;
  margin-top: 5px;
}

.navbar-search-item {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
  color: #333;
}

.navbar-search-item:hover {
  background-color: #f8f9fa;
}

.navbar-search-item:last-child {
  border-bottom: none;
}

.navbar-search-category {
  font-size: 0.75rem;
  color: #666;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 2px;
}

.navbar-search-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.navbar-search-subtitle {
  font-size: 0.85rem;
  color: #666;
}

/* Dark mode styles for navbar search */
[data-theme="dark"] .navbar-search-input {
  background-color: #495057;
  border-color: #495057;
  color: white;
}

[data-theme="dark"] .navbar-search-input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}
</style>
`;

// Automatska inicijalizacija navigacije kada se stranica učita
document.addEventListener('DOMContentLoaded', async () => {
  // Globalna zaštita od duple inicijalizacije
  if (window.navigationInitialized) {
    return;
  }
  window.navigationInitialized = true;

  // Dodaj CSS stilove
  document.head.insertAdjacentHTML('beforeend', navigationCSS);

  // Inicijalizuj navigaciju
  const nav = new Navigation();
  await nav.init();

  // Dodatno čekanje da se svi drugi skriptovi završe
  setTimeout(() => {
    nav.initializeBootstrap();
  }, 1000);
});

// Globalna funkcija za manuelno pokretanje navigacije
window.loadNavigation = async function () {
  try {
    // Dodaj CSS stilove ako već nisu dodani
    if (!document.querySelector('style[data-navigation-css]')) {
      const style = document.createElement('style');
      style.setAttribute('data-navigation-css', 'true');
      style.innerHTML = navigationCSS;
      document.head.appendChild(style);
    }

    // Inicijalizuj navigaciju
    const nav = new Navigation();
    await nav.init();

    // Inicijalizuj Bootstrap komponente
    setTimeout(() => {
      nav.initializeBootstrap();
    }, 100);

    return true;
  } catch (error) {
    console.error('Greška pri učitavanju navigacije:', error);
    return false;
  }
};

// Globalne funkcije za navbar search navigaciju
window.navigateToNavbarResult = function (type, id, title = '', firmaId = '') {
  // Domain detection
  const host = window.location.host;
  const urlParams = new URLSearchParams(window.location.search);
  const domain = urlParams.get('domain');
  const isMojradnik = host.includes('mojradnik.me') || domain === 'mojradnik';

  const searchResults = document.getElementById('navbarSearchResults');
  if (searchResults) {
    searchResults.style.display = 'none';
  }

  // Clear search input
  const searchInput = document.getElementById('navbarSearchInput');
  if (searchInput) {
    searchInput.value = '';
  }

  // Hide clear button
  const clearButton = document.getElementById('navbarClearSearch');
  if (clearButton) {
    clearButton.style.display = 'none';
  }

  switch (type) {
    case 'firma':
      if (isMojradnik) {
        // Za mojradnik, idi na dashboard
        window.location.href = `/mojradnik/dashboard.html`;
      } else {
        // Za glavni sajt, otvori firma detalji stranicu
        window.location.href = `/shared/firma-detalji.html?id=${id}`;
      }
      break;
    case 'radnik':
      if (isMojradnik) {
        // Za mojradnik, idi na dashboard
        window.location.href = `/mojradnik/dashboard.html`;
      } else {
        // Za radnika, otvori radnik modal sa podacima
        if (firmaId && firmaId !== '') {
          // Idi na firmu sa radnici tabom i automatski otvori modal za radnika
          window.location.href = `/shared/firma-detalji.html?id=${firmaId}&radnikId=${id}#radnici`;
        } else {
          // Fallback: idi na firme stranicu
          console.warn('Nema firmaId za radnika, fallback na firme stranicu');
          window.location.href = `/shared/firme.html`;
        }
      }
      break;
    default:
      console.log('Unknown result type:', type);
  }
};

window.showAllNavbarResults = function (query) {
  // Domain detection
  const host = window.location.host;
  const urlParams = new URLSearchParams(window.location.search);
  const domain = urlParams.get('domain');
  const isMojradnik = host.includes('mojradnik.me') || domain === 'mojradnik';

  // Hide search results
  const searchResults = document.getElementById('navbarSearchResults');
  if (searchResults) {
    searchResults.style.display = 'none';
  }

  // Clear search input
  const searchInput = document.getElementById('navbarSearchInput');
  if (searchInput) {
    searchInput.value = '';
  }

  // Hide clear button
  const clearButton = document.getElementById('navbarClearSearch');
  if (clearButton) {
    clearButton.style.display = 'none';
  }

  // Navigate to appropriate page with search
  if (isMojradnik) {
    // Za mojradnik, idi na dashboard
    window.location.href = `/mojradnik/dashboard.html`;
  } else {
    // Navigate to firme page with search
    window.location.href = `/shared/firme.html?search=${encodeURIComponent(
      query
    )}`;
  }
};

// Globalna funkcija za navigaciju na firma detalji (mojradnik)
window.navigateToFirmaDetalji = async function () {
  try {
    // Pozovi API da dobije trenutnu firmu korisnika
    const response = await fetch('/api/firme', {
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.firme && data.firme.length > 0) {
        const currentFirma = data.firme[0]; // Prva firma je trenutna
        window.location.href = `/shared/firma-detalji.html?id=${currentFirma.id}`;
      } else {
        console.error('Nema firme za korisnika');
        alert('Nema registrovane firme. Registruj firmu prvo.');
      }
    } else {
      console.error('Greška pri učitavanju firme');
      alert('Greška pri učitavanju podataka o firmi.');
    }
  } catch (error) {
    console.error('Greška:', error);
    alert('Greška pri komunikaciji sa serverom.');
  }
};

// Export za module sisteme
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Navigation;
}
