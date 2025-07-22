document.addEventListener("DOMContentLoaded", function () {
  // Elementi za autentifikaciju
  const loginForm = document.getElementById("loginForm");
  const userPanel = document.getElementById("userPanel");
  const logoutBtn = document.getElementById("logoutBtn");
  const welcomeMsg = document.getElementById("welcomeMsg");
  const pdvLink = document.getElementById("pdvLink");
  const pdv0Link = document.getElementById("pdv0Link");

  // Dugmići za login/registraciju u navbar-u
  const loginButtons = document.querySelector(
    ".d-flex.align-items-center.ms-lg-3"
  );

  // Provera statusa autentifikacije
  fetch("/api/check-auth", {
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Autentifikacija:", data);
      if (data.authenticated) {
        const userRole = data.user.role;

        // Sakrij login dugmiće, prikaži user panel
        if (loginButtons) loginButtons.classList.add("d-none");
        if (userPanel) userPanel.classList.remove("d-none");
        if (welcomeMsg)
          welcomeMsg.textContent = `Dobrodošao, ${data.user.username}!`;

        // Show navigation links based on role permissions
        if (pdvLink && ["pdv", "full", "admin"].includes(userRole)) {
          pdvLink.classList.remove("d-none");
        }
        if (pdv0Link && ["pdv", "full", "admin"].includes(userRole)) {
          pdv0Link.classList.remove("d-none");
        }
      } else {
        // Prikaži login dugmiće, sakrij user panel
        if (loginButtons) loginButtons.classList.remove("d-none");
        if (userPanel) userPanel.classList.add("d-none");
        if (welcomeMsg) welcomeMsg.textContent = "";
        if (pdvLink) pdvLink.classList.add("d-none");
        if (pdv0Link) pdv0Link.classList.add("d-none");
      }
    });

  // Login submit (samo za login stranicu)
  if (loginForm && window.location.pathname === "/prijava.html") {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const username = e.target.username.value;
      const password = e.target.password.value;

      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
          credentials: "include",
        });

        const data = await res.json();

        if (res.ok) {
          // Uspešna prijava - preusmeri na dashboard
          window.location.href = "/dashboard1.html";
        } else {
          alert(data.message || "Neispravni podaci za prijavu");
        }
      } catch (error) {
        console.error("Greška pri prijavi:", error);
        alert("Greška pri povezivanju sa serverom");
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      location.reload();
    });
  }

  // Sticky navbar
  function handleNavbarScroll() {
    const navbar = document.querySelector(".navbar");
    if (navbar) {
      navbar.classList.toggle("scrolled", window.scrollY > 50);
    }
  }
  window.addEventListener("scroll", handleNavbarScroll);

  // Validacija kontakt forme
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      const ime = contactForm.querySelector('[name="ime"]').value.trim();
      const email = contactForm.querySelector('[name="_replyto"]').value.trim();
      const poruka = contactForm.querySelector('[name="poruka"]').value.trim();

      if (!ime || !email || !poruka) {
        alert("Sva polja su obavezna.");
        e.preventDefault();
      }
    });
  }
});
