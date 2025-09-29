document.addEventListener('DOMContentLoaded', function () {
  // Elementi za autentifikaciju
  const loginForm = document.getElementById('loginForm');
  const userPanel = document.getElementById('userPanel');
  const logoutBtn = document.getElementById('logoutBtn');
  const welcomeMsg = document.getElementById('welcomeMsg');
  const dashboardLink = document.getElementById('dashboardLink');

  // Dugmići za login/registraciju u navbar-u
  const loginButtons = document.querySelector(
    '.d-flex.align-items-center.ms-lg-3'
  );

  // Provera statusa autentifikacije
  fetch('/api/check-auth', {
    credentials: 'include',
  })
    .then(res => res.json())
    .then(data => {
      if (data.authenticated) {
        const userRole = data.user.role;

        // Sakrij login dugmiće, prikaži user panel
        if (loginButtons) loginButtons.classList.add('d-none');
        if (userPanel) userPanel.classList.remove('d-none');
        if (welcomeMsg)
          welcomeMsg.textContent = `Dobrodošao, ${data.user.username}!`;

        // Show dashboard link for all authenticated users
        if (dashboardLink) {
          dashboardLink.classList.remove('d-none');
        }
      } else {
        // Prikaži login dugmiće, sakrij user panel
        if (loginButtons) loginButtons.classList.remove('d-none');
        if (userPanel) userPanel.classList.add('d-none');
        if (welcomeMsg) welcomeMsg.textContent = '';

        // Hide dashboard link for unauthenticated users
        if (dashboardLink) dashboardLink.classList.add('d-none');
      }
    });

  // Login submit (samo za login stranicu)
  if (
    loginForm &&
    (window.location.pathname === '/prijava.html' ||
      window.location.pathname === '/shared/prijava.html')
  ) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const username = e.target.username.value;
      const password = e.target.password.value;

      try {
        const res = await fetch('https://www.mojradnik.me/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
          credentials: 'include',
        });

        const data = await res.json();

        if (res.ok && data.success) {
          // Uspešna prijava - preusmeri na odgovarajući dashboard na osnovu domena
          const host = window.location.host;
          const urlParams = new URLSearchParams(window.location.search);
          const domain = urlParams.get('domain');

          if (host.includes('mojradnik.me') || domain === 'mojradnik') {
            // Za mojradnik.me - uvek dashboard.html (single tenant)
            // Prenesi domain parametar ako smo na localhost-u
            const dashboardURL = host.includes('localhost') && domain === 'mojradnik' 
              ? '/dashboard.html?domain=mojradnik'
              : '/dashboard.html';
            window.location.href = dashboardURL;
          } else {
            // Za summasummarum.me - svi korisnici idu na opšti dashboard
            window.location.href = '/shared/dashboard.html';
          }
        } else {
          // Proveravamo da li je odgovor 403 (subscription expired)
          if (res.status === 403 && data.action === 'subscription_expired') {
            // Pretplata je istekla - redirect na account-suspended
            window.location.href = data.redirect || '/account-suspended';
          } else {
            alert(data.message || 'Neispravni podaci za prijavu');
          }
        }
      } catch (error) {
        console.error('Greška pri prijavi:', error);
        if (error.message && error.message.includes('429')) {
          alert(
            'Previše pokušaja prijave. Sačekajte malo pa pokušajte ponovo.'
          );
        } else {
          alert('Greška pri povezivanju sa serverom');
        }
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      console.log('Logout clicked - starting logout process');
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      console.log('Logout API call completed - redirecting to /');
      // Redirect to home page instead of reload
      window.location.href = '/';
    });
  }

  // Sticky navbar
  function handleNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    }
  }
  window.addEventListener('scroll', handleNavbarScroll);

  // Validacija kontakt forme
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      const ime = contactForm.querySelector('[name="ime"]').value.trim();
      const email = contactForm.querySelector('[name="_replyto"]').value.trim();
      const poruka = contactForm.querySelector('[name="poruka"]').value.trim();

      if (!ime || !email || !poruka) {
        alert('Sva polja su obavezna.');
        e.preventDefault();
      }
    });
  }

  // =====================================
  // DARK MODE LOGIKA (kopirano iz navigation.js)
  // =====================================

  // Inicijalizuj dark mode
  function initializeDarkMode() {
    const savedTheme = localStorage.getItem('theme') || 'light';

    // Postaviće početnu temu
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Handler funkcija za toggle
    const themeToggleHandler = e => {
      if (e.target.closest('.theme-toggle')) {
        e.preventDefault();
        e.stopImmediatePropagation();

        const currentTheme =
          document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeToggleText(newTheme);
      }
    };

    // Dodaj event listener
    document.body.addEventListener('click', themeToggleHandler);

    // Ažuriraj tekst nakon kratke pauze
    setTimeout(() => {
      updateThemeToggleText(savedTheme);
    }, 200);
  }

  // Ažurira tekst theme toggle dugmeta
  function updateThemeToggleText(theme) {
    const themeToggles = document.querySelectorAll('.theme-toggle');
    themeToggles.forEach(toggle => {
      toggle.innerHTML =
        theme === 'dark'
          ? '<i class="fas fa-sun"></i> Light'
          : '<i class="fas fa-moon"></i> Dark';
    });
  }

  // Inicijalizuj dark mode
  initializeDarkMode();
});
