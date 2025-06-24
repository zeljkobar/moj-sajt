document.addEventListener("DOMContentLoaded", function () {
  // Elementi za autentifikaciju
  const loginForm = document.getElementById("loginForm");
  const userPanel = document.getElementById("userPanel");
  const logoutBtn = document.getElementById("logoutBtn");
  const welcomeMsg = document.getElementById("welcomeMsg");

  // Provera statusa autentifikacije
  fetch("/api/check-auth")
    .then((res) => res.json())
    .then((data) => {
      console.log("Autentifikacija:", data);
      if (data.authenticated) {
        if (loginForm) loginForm.classList.add("d-none");
        if (userPanel) userPanel.classList.remove("d-none");
        if (welcomeMsg)
          welcomeMsg.textContent = `Dobrodošao, ${data.user.username}!`;
      } else {
        if (loginForm) loginForm.classList.remove("d-none");
        if (userPanel) userPanel.classList.add("d-none");
        if (welcomeMsg) welcomeMsg.textContent = "";
      }
    });

  // Login submit
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const username = e.target.username.value;
      const password = e.target.password.value;

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Osveži prikaz
        location.reload();
      } else {
        alert(data.message || "Neispravni podaci");
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
      await fetch("/api/logout", { method: "POST" });
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
