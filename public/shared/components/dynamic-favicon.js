// Dynamic Favicon Loader - automatski podešava favicon putanje na osnovu domena
// Koristi se u shared HTML stranicama za multi-domain setup

(function () {
  // Detektuj domen
  const urlParams = new URLSearchParams(window.location.search);
  const domain = urlParams.get('domain');
  const hostname = window.location.hostname;
  
  const isMojradnik = hostname.includes('mojradnik') || domain === 'mojradnik';
  const isPrijaviradnika = hostname.includes('prijaviradnika') || domain === 'prijaviradnika';

  // Definiši base putanje za favikone
  let faviconBasePath;
  if (isMojradnik) {
    faviconBasePath = '/mojradnik/images/favicon/';
  } else if (isPrijaviradnika) {
    faviconBasePath = '/prijaviradnika/images/favicon/';
  } else {
    faviconBasePath = '/shared/images/favicon/';
  }

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
  const domainName = isMojradnik ? 'MojRadnik' : (isPrijaviradnika ? 'PrijaviRadnika' : 'SummaSum');
  console.log(`Favicon loaded for: ${domainName} domain`);
})();
