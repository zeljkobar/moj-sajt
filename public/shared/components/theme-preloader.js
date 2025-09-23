// =================================================================
// ANTI-FLASH SCRIPT - Sprečava bljeskanje pri učitavanju tema
// =================================================================
// NAPOMENA: Ovaj kod mora biti sinhron i uključen u <head>
// sekciju pre bilo kog CSS-a da spreči FOUC (Flash of Unstyled Content)

(function () {
  // Proveravamo localStorage za sačuvanu temu
  const savedTheme = localStorage.getItem("theme");

  // Ako je dark tema sačuvana, odmah je primenjujemo na html element
  if (savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    // Ako nema sačuvane teme ili je light, eksplicitno postavljamo light
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
