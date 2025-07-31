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
    return `
      <nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm sticky-top">
        <div class="container-fluid">
          <!-- Brand -->
          <a class="navbar-brand fw-bold" href="dashboard.html">
            <img src="images/summasummarum_logo.svg" alt="Logo" width="30" height="30" class="me-2">
            Summa Summarum
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
                <a class="nav-link" href="dashboard.html" data-page="dashboard">
                  <i class="fas fa-tachometer-alt me-1"></i>Dashboard
                </a>
              </li>

              <!-- Firme -->
              <li class="nav-item">
                <a class="nav-link" href="firme.html">
                  <i class="fas fa-building me-1"></i>Firme
                </a>
              </li>

              <!-- PDV Kalendar -->
              <li class="nav-item">
                <a class="nav-link" href="pdv-pregled.html">
                  <i class="fas fa-receipt me-1"></i>PDV Kalendar
                </a>
              </li>

              <!-- Administrator dropdown (samo za admin korisnike) -->
              <li class="nav-item dropdown" id="adminMenu" style="display: none;">
                <a class="nav-link dropdown-toggle" href="#" id="adminDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="fas fa-cog me-1"></i>Administrator
                </a>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item" href="admin-users.html"><i class="fas fa-users-cog me-2"></i>Korisnici</a></li>
                  <li><a class="dropdown-item" href="admin-database.html"><i class="fas fa-database me-2"></i>Baza podataka</a></li>
                  <li><a class="dropdown-item" href="email-admin.html"><i class="fas fa-envelope-open-text me-2"></i>Email Admin</a></li>
                  <li><a class="dropdown-item" href="#"><i class="fas fa-chart-line me-2"></i>Sistemski izveštaji</a></li>
                </ul>
              </li>
            </ul>

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
                  <li><a class="dropdown-item" href="edit-profil.html"><i class="fas fa-edit me-2"></i>Edituj profil</a></li>
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
    const existingNavs = document.querySelectorAll("nav.navbar");
    existingNavs.forEach((nav) => nav.remove());

    // Generiši HTML
    const navHTML = this.generateNavHTML();

    // Dodaj navigaciju na vrh stranice
    document.body.insertAdjacentHTML("afterbegin", navHTML);

    // Kratka pauza da se osiguramo da je HTML dodat u DOM
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Učitaj informacije o korisniku
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
      const response = await fetch("/api/check-auth", {
        credentials: "include",
      });
      const data = await response.json();

      if (data.authenticated) {
        this.currentUser = data.user;
        this.userRole = data.user?.role;

        // Ažuriraj UI sa korisničkim podacima
        const usernameElement = document.getElementById("navbar-username");
        if (usernameElement && this.currentUser) {
          usernameElement.textContent = this.currentUser.username || "Korisnik";
        }

        // Prikaži admin meni ako je korisnik admin
        if (this.userRole === "admin") {
          const adminMenu = document.getElementById("adminMenu");
          if (adminMenu) {
            adminMenu.style.display = "block";
          }
        }
      }
    } catch (error) {
      console.error("Greška pri učitavanju korisničkih podataka:", error);
    }
  }

  // Označava aktivnu stavku menija na osnovu trenutne stranice
  setActiveMenuItem() {
    const currentPage = window.location.pathname
      .split("/")
      .pop()
      .replace(".html", "");
    const navLinks = document.querySelectorAll(".navbar-nav .nav-link");

    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (href && href.includes(currentPage)) {
        link.classList.add("active");
      }
    });
  }

  // Dodaje event listenere
  attachEventListeners() {
    // Logout funkcionalnost
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          const response = await fetch("/api/logout", {
            method: "POST",
            credentials: "include",
          });
          if (response.ok) {
            window.location.href = "/index.html";
          }
        } catch (error) {
          console.error("Greška pri odjavi:", error);
          window.location.href = "/index.html";
        }
      });
    }
  }

  // Inicijalizuje dark mode funkcionalnost
  initializeDarkMode() {
    // Zaštita od duplih poziva
    if (this.darkModeInitialized) {
      return;
    }
    this.darkModeInitialized = true;

    const savedTheme = localStorage.getItem("theme") || "light";

    // Postaviće početnu temu
    document.documentElement.setAttribute("data-theme", savedTheme);

    // Ukloni postojeće event listener-e da izbjegnem duplikate
    if (this.themeToggleHandler) {
      document.body.removeEventListener("click", this.themeToggleHandler);
    }

    // Kreiraj handler funkciju kao svojstvo klase
    this.themeToggleHandler = (e) => {
      if (e.target.closest(".theme-toggle")) {
        e.preventDefault();
        e.stopImmediatePropagation(); // Spriječi duple pozive

        const currentTheme =
          document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";

        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
        this.updateThemeToggleText(newTheme);
      }
    };

    // Dodaj event listener
    document.body.addEventListener("click", this.themeToggleHandler);

    // Ažuriraj tekst nakon kratke pauze
    setTimeout(() => {
      this.updateThemeToggleText(savedTheme);
    }, 200);
  }

  // Ažurira tekst theme toggle dugmeta
  updateThemeToggleText(theme) {
    const themeToggles = document.querySelectorAll(".theme-toggle");
    themeToggles.forEach((toggle) => {
      toggle.innerHTML =
        theme === "dark"
          ? '<i class="fas fa-sun"></i> Light'
          : '<i class="fas fa-moon"></i> Dark';
    });
  }

  // Inicijalizuje Bootstrap komponente
  initializeBootstrap() {
    // Proverava da li je Bootstrap dostupan
    if (typeof window.bootstrap === "undefined") {
      // Pokušaj ponovo nakon kratke pauze
      setTimeout(() => this.initializeBootstrap(), 500);
      return;
    }

    // Čekaj da se DOM potpuno završi
    setTimeout(() => {
      // Inicijalizuj sve dropdown komponente
      const dropdownElements = document.querySelectorAll(".dropdown-toggle");

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
      const navbarToggler = document.querySelector(".navbar-toggler");
      if (navbarToggler) {
        try {
          const navbarCollapse = document.querySelector(".navbar-collapse");
          if (navbarCollapse) {
            new bootstrap.Collapse(navbarCollapse, { toggle: false });
          }
        } catch (error) {
          console.error(
            "❌ Greška pri inicijalizaciji navbar collapse:",
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
</style>
`;

// Automatska inicijalizacija navigacije kada se stranica učita
document.addEventListener("DOMContentLoaded", async () => {
  // Dodaj CSS stilove
  document.head.insertAdjacentHTML("beforeend", navigationCSS);

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
    if (!document.querySelector("style[data-navigation-css]")) {
      const style = document.createElement("style");
      style.setAttribute("data-navigation-css", "true");
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
    console.error("Greška pri učitavanju navigacije:", error);
    return false;
  }
};

// Export za module sisteme
if (typeof module !== "undefined" && module.exports) {
  module.exports = Navigation;
}
