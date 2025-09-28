document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('obracunForm');
  const resultsContainer = document.getElementById('resultsContainer');
  const resultsContent = document.getElementById('resultsContent');
  const noResultsMessage = document.getElementById('noResultsMessage');
  const loadingSpinner = document.getElementById('loadingSpinner');

  // Postavi današnji datum kao default krajnji datum
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('krajnjiDatum').value = today;

  // Postavi početak meseca kao default početni datum
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  document.getElementById('pocetniDatum').value = firstDayOfMonth
    .toISOString()
    .split('T')[0];

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    izracunajObracun();
  });

  function izracunajObracun() {
    // Uzmi vrednosti iz forme
    const ostvareniPromet =
      parseFloat(document.getElementById('ostvareniPromet').value) || 0;
    const prosjecnaZarada =
      parseFloat(document.getElementById('prosjecnaZarada').value) || 1083;
    const pocetniDatum = document.getElementById('pocetniDatum').value;
    const krajnjiDatum = document.getElementById('krajnjiDatum').value;

    // Validacija
    if (
      !ostvareniPromet ||
      !prosjecnaZarada ||
      !pocetniDatum ||
      !krajnjiDatum
    ) {
      alert('Molimo unesite sve potrebne podatke!');
      return;
    }

    if (new Date(krajnjiDatum) < new Date(pocetniDatum)) {
      alert('Krajnji datum mora biti nakon početnog datuma!');
      return;
    }

    // Pokaži loading
    showLoading();

    // Simulacija async operacije
    setTimeout(() => {
      const rezultat = proracunajObracun(
        ostvareniPromet,
        prosjecnaZarada,
        pocetniDatum,
        krajnjiDatum
      );
      prikaziRezultat(rezultat);
    }, 800);
  }

  function proracunajObracun(promet, prosjecnaZarada, pocetni, krajnji) {
    // Izračunaj broj dana
    const pocetniDate = new Date(pocetni);
    const krajnjiDate = new Date(krajnji);
    const brojDana =
      Math.ceil((krajnjiDate - pocetniDate) / (1000 * 60 * 60 * 24)) + 1;

    // Proverava da li je prestupna godina
    function jePrestupnaGodina(godina) {
      return (godina % 4 === 0 && godina % 100 !== 0) || godina % 400 === 0;
    }

    // Uzmi godinu iz krajnjeg datuma
    const godina = krajnjiDate.getFullYear();
    const danaUGodini = jePrestupnaGodina(godina) ? 366 : 365;

    // Korak 1: Određi osnovicu na osnovu prometa
    let procenatOsnovice;
    if (promet <= 9000) {
      procenatOsnovice = 0.6; // 60%
    } else if (promet <= 15000) {
      procenatOsnovice = 1.0; // 100%
    } else {
      procenatOsnovice = 1.5; // 150%
    }

    // Korak 2: Izračunaj osnovicu za period
    const mesecnaOsnovica = prosjecnaZarada * procenatOsnovice;
    const godisnjaOsnovica = mesecnaOsnovica * 12;
    const dnevnaOsnovica = godisnjaOsnovica / danaUGodini;
    const osnovicaZaPeriod = dnevnaOsnovica * brojDana;

    // Korak 3: Izračunaj doprinose
    const pioDoprinos = osnovicaZaPeriod * 0.1; // 10%
    const nzpDoprinos = osnovicaZaPeriod * 0.01; // 1%
    const ukupnoDoprinosi = pioDoprinos + nzpDoprinos;

    const rezultat = {
      period: formatDateRange(pocetni, krajnji),
      brojDana: brojDana,
      danaUGodini: danaUGodini,
      ostvareniPromet: promet,
      prosjecnaZarada: prosjecnaZarada,
      procenatOsnovice: procenatOsnovice * 100 + '%',
      mesecnaOsnovica: parseFloat(mesecnaOsnovica.toFixed(2)),
      godisnjaOsnovica: parseFloat(godisnjaOsnovica.toFixed(2)),
      dnevnaOsnovica: parseFloat(dnevnaOsnovica.toFixed(2)),
      osnovicaZaPeriod: parseFloat(osnovicaZaPeriod.toFixed(2)),
      pioDoprinos: parseFloat(pioDoprinos.toFixed(2)),
      nzpDoprinos: parseFloat(nzpDoprinos.toFixed(2)),
      konacniRezultat: parseFloat(ukupnoDoprinosi.toFixed(2)),
      stopa: 'PIO 10% + NZP 1%',
      osnova: parseFloat(osnovicaZaPeriod.toFixed(2)),
    };

    return rezultat;
  }

  function prikaziRezultat(rezultat) {
    // Osnovni podaci
    document.getElementById('periodResult').textContent = rezultat.period;
    document.getElementById('brojDanaResult').textContent =
      rezultat.brojDana + ' dana (godina: ' + rezultat.danaUGodini + ' dana)';
    document.getElementById('prometResult').textContent = formatCurrency(
      rezultat.ostvareniPromet
    );
    document.getElementById('prosjecnaZaradaResult').textContent =
      formatCurrency(rezultat.prosjecnaZarada);

    // Detalji osnovice
    document.getElementById('procenatOsnoviceResult').textContent =
      rezultat.procenatOsnovice;
    document.getElementById('mesecnaOsnovicaResult').textContent =
      formatCurrency(rezultat.mesecnaOsnovica);
    document.getElementById('godisnjaOsnovicaResult').textContent =
      formatCurrency(rezultat.godisnjaOsnovica);
    document.getElementById('dnevnaOsnovicaResult').textContent =
      formatCurrency(rezultat.dnevnaOsnovica);
    document.getElementById('osnovaZaPeriodResult').textContent =
      formatCurrency(rezultat.osnovicaZaPeriod);

    // Doprinosi
    document.getElementById('pioDoprinosResult').textContent = formatCurrency(
      rezultat.pioDoprinos
    );
    document.getElementById('nzpDoprinosResult').textContent = formatCurrency(
      rezultat.nzpDoprinos
    );
    document.getElementById('konacniRezultat').textContent = formatCurrency(
      rezultat.konacniRezultat
    );

    // Pokaži rezultate
    hideLoading();
    showResults();
  }

  function showLoading() {
    noResultsMessage.style.display = 'none';
    resultsContent.classList.add('d-none');
    loadingSpinner.classList.remove('d-none');
    resultsContainer.classList.add('active');
  }

  function hideLoading() {
    loadingSpinner.classList.add('d-none');
  }

  function showResults() {
    resultsContent.classList.remove('d-none');
    document.getElementById('osnovicaPodaci').classList.remove('d-none');
    document.getElementById('doprinos').classList.remove('d-none');
    document.getElementById('stampanjeSekcija').style.display = 'block';
    resultsContainer.classList.add('active');
  }

  // Helper funkcije
  function formatCurrency(amount) {
    return new Intl.NumberFormat('me-ME', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  function formatDateRange(startDate, endDate) {
    const options = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    };

    const start = new Date(startDate).toLocaleDateString('me-ME', options);
    const end = new Date(endDate).toLocaleDateString('me-ME', options);

    return `${start} - ${end}`;
  }

  // Event listener za promenu datuma
  document
    .getElementById('pocetniDatum')
    .addEventListener('change', validateDates);
  document
    .getElementById('krajnjiDatum')
    .addEventListener('change', validateDates);

  function validateDates() {
    const pocetni = document.getElementById('pocetniDatum').value;
    const krajnji = document.getElementById('krajnjiDatum').value;

    if (pocetni && krajnji && new Date(krajnji) < new Date(pocetni)) {
      document
        .getElementById('krajnjiDatum')
        .setCustomValidity('Krajnji datum mora biti nakon početnog datuma');
    } else {
      document.getElementById('krajnjiDatum').setCustomValidity('');
    }
  }

  // Reset forme
  window.resetForm = function () {
    form.reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('krajnjiDatum').value = today;

    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    document.getElementById('pocetniDatum').value = firstDayOfMonth
      .toISOString()
      .split('T')[0];

    // Postavi default prosečnu zaradu
    document.getElementById('prosjecnaZarada').value = '1083';

    // Sakrij rezultate
    resultsContent.classList.add('d-none');
    noResultsMessage.style.display = 'block';
    document.getElementById('stampanjeSekcija').style.display = 'none';
    resultsContainer.classList.remove('active');
  };

  console.log('📊 Obračun preduzetnika - stranica učitana');
});

// Globalna funkcija za štampanje
function stampajRezultat() {
  // Sakrij dugme za štampanje pre štampanja
  const stampanjeSekcija = document.getElementById('stampanjeSekcija');
  const originalDisplay = stampanjeSekcija.style.display;
  stampanjeSekcija.style.display = 'none';

  // Dodaj naslov za štampanje
  const originalTitle = document.title;
  document.title =
    'Obračun doprinosa preduzetnika - ' +
    new Date().toLocaleDateString('me-ME');

  // Štampaj
  window.print();

  // Vrati dugme nakon štampanja
  setTimeout(() => {
    stampanjeSekcija.style.display = originalDisplay;
    document.title = originalTitle;
  }, 100);
}
