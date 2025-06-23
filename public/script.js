document.addEventListener("DOMContentLoaded", function () {
  // Login forma
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const username = e.target.username.value;
      const password = e.target.password.value;

      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Uspješna prijava");
        window.location.href = "/dashboard";
      } else {
        alert(data.message || "Neispravni podaci");
      }
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
