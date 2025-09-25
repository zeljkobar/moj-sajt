// Dynamic Favicon Loader - automatski podešava favicon putanje na osnovu domena
// Koristi se u shared HTML stranicama za multi-domain setup

(function () {
  // Detektuj da li je mojradnik domen
  const isMojradnik = window.location.hostname.includes('mojradnik');

  // Definiši base putanje za favikone
  const faviconBasePath = isMojradnik
    ? '/mojradnik/images/favicon/'
    : '/shared/images/favicon/';

  // Lista favicon linkova koje treba ažurirati
  const faviconSelectors = [
    'link[rel="icon"][type="image/x-icon"]',
    'link[rel="icon"][sizes="16x16"]',
    'link[rel="icon"][sizes="32x32"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="shortcut icon"]',
  ];

  // Ažuriraj sve favicon linkove
  faviconSelectors.forEach(selector => {
    const links = document.querySelectorAll(selector);
    links.forEach(link => {
      const currentHref = link.getAttribute('href');
      if (currentHref) {
        // Izvuci ime fajla iz postojeće putanje
        const fileName = currentHref.split('/').pop();
        // Postavi novu putanju
        link.setAttribute('href', faviconBasePath + fileName);
      }
    });
  });

  // Debug info (možeš ukloniti u produkciji)
  console.log(
    `Favicon loaded for: ${isMojradnik ? 'MojRadnik' : 'SummaSum'} domain`
  );
})();
