/**
 * Oglasi za Poslove - JavaScript funkcionalnost
 * MojRadnik.me platform
 */

class OglasiApp {
  constructor() {
    this.currentPage = 1;
    this.itemsPerPage = 12;
    this.filters = {};
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadOglasi();
    this.loadFilterOptions();
  }

  bindEvents() {
    // Search button
    document.getElementById('searchBtn').addEventListener('click', () => {
      this.applyFilters();
    });

    // Enter key na search input
    document.getElementById('searchInput').addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        this.applyFilters();
      }
    });

    // Filter change events
    ['filterLokacija', 'filterTipPosla', 'filterObrazovanje'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        this.applyFilters();
      });
    });

    // Salary inputs
    ['plataMin', 'plataMax'].forEach(id => {
      document.getElementById(id).addEventListener(
        'input',
        this.debounce(() => this.applyFilters(), 1000)
      );
    });
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async loadOglasi(page = 1) {
    try {
      this.showLoading(true);

      const params = new URLSearchParams({
        page: page,
        limit: this.itemsPerPage,
        ...this.filters,
      });

      const response = await fetch(`/api/oglasi?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      this.renderOglasi(data.oglasi);
      this.renderPagination(data.pagination);
      this.updateResultsCount(data.pagination.totalItems);

      this.currentPage = page;
    } catch (error) {
      console.error('Greška pri učitavanju oglasa:', error);
      this.showError('Greška pri učitavanju oglasa. Molim pokušajte ponovo.');
    } finally {
      this.showLoading(false);
    }
  }

  async loadFilterOptions() {
    try {
      // Učitaj sve lokacije za filter
      const response = await fetch('/api/oglasi');
      const data = await response.json();

      if (data.oglasi && data.oglasi.length > 0) {
        const lokacije = [
          ...new Set(data.oglasi.map(o => o.lokacija).filter(Boolean)),
        ];
        this.populateLocationFilter(lokacije);
      }
    } catch (error) {
      console.error('Greška pri učitavanju filter opcija:', error);
    }
  }

  populateLocationFilter(lokacije) {
    const select = document.getElementById('filterLokacija');

    // Očisti postojeće opcije osim prve
    while (select.children.length > 1) {
      select.removeChild(select.lastChild);
    }

    lokacije.sort().forEach(lokacija => {
      const option = document.createElement('option');
      option.value = lokacija;
      option.textContent = lokacija;
      select.appendChild(option);
    });
  }

  applyFilters() {
    this.filters = {};

    const lokacija = document.getElementById('filterLokacija').value;
    const tipPosla = document.getElementById('filterTipPosla').value;
    const obrazovanje = document.getElementById('filterObrazovanje').value;
    const search = document.getElementById('searchInput').value;
    const plataMin = document.getElementById('plataMin').value;
    const plataMax = document.getElementById('plataMax').value;

    if (lokacija) this.filters.lokacija = lokacija;
    if (tipPosla) this.filters.tip_posla = tipPosla;
    if (obrazovanje) this.filters.obrazovanje = obrazovanje;
    if (search) this.filters.search = search;
    if (plataMin) this.filters.plata_min = plataMin;
    if (plataMax) this.filters.plata_max = plataMax;

    this.currentPage = 1;
    this.loadOglasi(1);
  }

  renderOglasi(oglasi) {
    const container = document.getElementById('oglasiContainer');
    const noResults = document.getElementById('noResults');

    if (!oglasi || oglasi.length === 0) {
      container.innerHTML = '';
      noResults.classList.remove('d-none');
      return;
    }

    noResults.classList.add('d-none');

    container.innerHTML = oglasi
      .map(oglas => this.createOglasCard(oglas))
      .join('');

    // Bind click events for cards
    container.querySelectorAll('.oglas-card').forEach(card => {
      card.addEventListener('click', () => {
        const oglasId = card.getAttribute('data-oglas-id');
        this.showOglasDetails(oglasId);
      });
    });
  }

  createOglasCard(oglas) {
    const datumObjave = new Date(oglas.datum_objave).toLocaleDateString(
      'sr-RS'
    );
    const plataText = this.formatPlata(oglas.plata_od, oglas.plata_do);
    const tipPoslaText = this.formatTipPosla(oglas.tip_posla);

    // Proverava da li je oglas istaknut i još uvek aktivan
    const isFeatured =
      oglas.istaknut === 1 &&
      (!oglas.istaknut_do || new Date(oglas.istaknut_do) > new Date());

    const featuredClass = isFeatured ? ' featured' : '';
    const featuredBadge = isFeatured
      ? '<div class="featured-badge"><i class="fas fa-star me-1"></i>ISTAKNUT</div>'
      : '';

    return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card oglas-card h-100${featuredClass}" data-oglas-id="${
      oglas.id
    }" style="cursor: pointer;">
                    ${featuredBadge}
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge job-type-badge bg-primary">${tipPoslaText}</span>
                            ${
                              oglas.lokacija
                                ? `<span class="location-badge">${oglas.lokacija}</span>`
                                : ''
                            }
                        </div>
                        
                        <h5 class="card-title job-title mb-2">${this.escapeHtml(
                          oglas.naslov
                        )}</h5>
                        <p class="company-name mb-2">
                            <i class="fas fa-building me-1"></i>${this.escapeHtml(
                              oglas.firma_naziv
                            )}
                        </p>
                        
                        <p class="card-text text-muted mb-3">
                            ${this.truncateText(oglas.opis, 120)}
                        </p>
                        
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-calendar me-1"></i>${datumObjave}
                            </small>
                            ${
                              plataText
                                ? `<span class="badge salary-badge">${plataText}</span>`
                                : ''
                            }
                        </div>
                        
                        <div class="mt-2">
                            <small class="text-muted">
                                <i class="fas fa-eye me-1"></i>${
                                  oglas.broj_pregleda || 0
                                } pregleda
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  async showOglasDetails(oglasId) {
    try {
      const response = await fetch(`/api/oglasi/${oglasId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const oglas = await response.json();

      document.getElementById('modalTitle').textContent = oglas.naslov;
      document.getElementById('modalBody').innerHTML =
        this.createOglasDetails(oglas);

      // Setup apply button
      const applyBtn = document.getElementById('applyBtn');
      applyBtn.onclick = () => this.sendApplication(oglas);

      const modal = new bootstrap.Modal(document.getElementById('oglasModal'));
      modal.show();
    } catch (error) {
      console.error('Greška pri učitavanju detalja oglasa:', error);
      this.showError('Greška pri učitavanju detalja oglasa.');
    }
  }

  createOglasDetails(oglas) {
    const plataText = this.formatPlata(oglas.plata_od, oglas.plata_do);
    const tipPoslaText = this.formatTipPosla(oglas.tip_posla);
    const datumObjave = new Date(oglas.datum_objave).toLocaleDateString(
      'sr-RS'
    );
    const datumIsteka = oglas.datum_isteka
      ? new Date(oglas.datum_isteka).toLocaleDateString('sr-RS')
      : 'Nije specificiran';

    return `
            <div class="row">
                <div class="col-md-8">
                    <h6 class="fw-bold">Opis posla:</h6>
                    <p class="mb-3">${this.escapeHtml(oglas.opis).replace(
                      /\n/g,
                      '<br>'
                    )}</p>
                    
                    <h6 class="fw-bold">Pozicija:</h6>
                    <p class="mb-3">${this.escapeHtml(oglas.pozicija)}</p>
                </div>
                
                <div class="col-md-4">
                    <div class="bg-light p-3 rounded">
                        <h6 class="fw-bold mb-3">Informacije o oglasu</h6>
                        
                        <div class="mb-2">
                            <strong>Firma:</strong><br>
                            ${this.escapeHtml(oglas.firma_naziv)}
                        </div>
                        
                        ${
                          oglas.lokacija
                            ? `
                            <div class="mb-2">
                                <strong>Lokacija:</strong><br>
                                ${this.escapeHtml(oglas.lokacija)}
                            </div>
                        `
                            : ''
                        }
                        
                        <div class="mb-2">
                            <strong>Tip posla:</strong><br>
                            ${tipPoslaText}
                        </div>
                        
                        ${
                          plataText
                            ? `
                            <div class="mb-2">
                                <strong>Plata:</strong><br>
                                ${plataText}
                            </div>
                        `
                            : ''
                        }
                        
                        ${
                          oglas.iskustvo_godine
                            ? `
                            <div class="mb-2">
                                <strong>Iskustvo:</strong><br>
                                ${oglas.iskustvo_godine} godina
                            </div>
                        `
                            : ''
                        }
                        
                        ${
                          oglas.obrazovanje
                            ? `
                            <div class="mb-2">
                                <strong>Obrazovanje:</strong><br>
                                ${this.formatObrazovanje(oglas.obrazovanje)}
                            </div>
                        `
                            : ''
                        }
                        
                        <div class="mb-2">
                            <strong>Objavljeno:</strong><br>
                            ${datumObjave}
                        </div>
                        
                        <div class="mb-2">
                            <strong>Važi do:</strong><br>
                            ${datumIsteka}
                        </div>
                        
                        ${
                          oglas.kontakt_email || oglas.kontakt_telefon
                            ? `
                            <hr>
                            <h6 class="fw-bold">Kontakt:</h6>
                            ${
                              oglas.kontakt_email
                                ? `<div class="mb-1"><i class="fas fa-envelope me-2"></i>${oglas.kontakt_email}</div>`
                                : ''
                            }
                            ${
                              oglas.kontakt_telefon
                                ? `<div class="mb-1"><i class="fas fa-phone me-2"></i>${oglas.kontakt_telefon}</div>`
                                : ''
                            }
                        `
                            : ''
                        }
                    </div>
                </div>
            </div>
        `;
  }

  renderPagination(pagination) {
    const container = document.getElementById('paginationContainer');

    if (pagination.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let paginationHtml = '<nav><ul class="pagination">';

    // Previous button
    paginationHtml += `
            <li class="page-item ${!pagination.hasPrev ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${
                  pagination.currentPage - 1
                }">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

    // Page numbers
    const startPage = Math.max(1, pagination.currentPage - 2);
    const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);

    if (startPage > 1) {
      paginationHtml +=
        '<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>';
      if (startPage > 2) {
        paginationHtml +=
          '<li class="page-item disabled"><span class="page-link">...</span></li>';
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `
                <li class="page-item ${
                  i === pagination.currentPage ? 'active' : ''
                }">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
    }

    if (endPage < pagination.totalPages) {
      if (endPage < pagination.totalPages - 1) {
        paginationHtml +=
          '<li class="page-item disabled"><span class="page-link">...</span></li>';
      }
      paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${pagination.totalPages}">${pagination.totalPages}</a></li>`;
    }

    // Next button
    paginationHtml += `
            <li class="page-item ${!pagination.hasNext ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${
                  pagination.currentPage + 1
                }">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

    paginationHtml += '</ul></nav>';

    container.innerHTML = paginationHtml;

    // Bind pagination click events
    container.querySelectorAll('.page-link[data-page]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const page = parseInt(link.getAttribute('data-page'));
        if (page && page !== this.currentPage) {
          this.loadOglasi(page);
        }
      });
    });
  }

  updateResultsCount(total) {
    const counter = document.getElementById('resultsCount');
    if (total > 0) {
      counter.textContent = `Pronađeno ${total} oglas${
        total === 1 ? '' : total < 5 ? 'a' : 'a'
      }`;
      counter.classList.remove('d-none');
    } else {
      counter.classList.add('d-none');
    }
  }

  showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const container = document.getElementById('oglasiContainer');

    if (show) {
      spinner.style.display = 'block';
      container.style.opacity = '0.5';
    } else {
      spinner.style.display = 'none';
      container.style.opacity = '1';
    }
  }

  showError(message) {
    // Simple error display - može biti prošireno sa toast notifikacijama
    alert(message);
  }

  // Utility functions
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return this.escapeHtml(text);
    return this.escapeHtml(text.substring(0, maxLength)) + '...';
  }

  formatPlata(od, doPlata) {
    if (!od && !doPlata) return '';

    const formatNumber = num => {
      return new Intl.NumberFormat('sr-RS').format(num);
    };

    if (od && doPlata) {
      return `${formatNumber(od)} - ${formatNumber(doPlata)} EUR`;
    } else if (od) {
      return `od ${formatNumber(od)} EUR`;
    } else {
      return `do ${formatNumber(doPlata)} EUR`;
    }
  }

  formatTipPosla(tip) {
    const tipovi = {
      puno_vreme: 'Puno vrijeme',
      skraceno: 'Skraćeno vrijeme',
      praksa: 'Praksa',
      privremeno: 'Privremeno',
    };
    return tipovi[tip] || tip;
  }

  formatObrazovanje(obrazovanje) {
    const nivoi = {
      osnovno: 'Osnovno obrazovanje',
      srednje: 'Srednje obrazovanje',
      visa: 'Viša škola',
      fakultet: 'Fakultet',
      master: 'Master',
      doktorat: 'Doktorat',
    };
    return nivoi[obrazovanje] || obrazovanje;
  }

  sendApplication(oglas) {
    const kontaktEmail =
      oglas.kontakt_email || oglas.firma_email || 'info@firma.me';
    const subject = `Aplikacija za poziciju: ${oglas.pozicija} - ${oglas.naslov}`;

    const body = `Poštovani,

Želim da apliciram za poziciju "${
      oglas.pozicija
    }" objavljenu na MojRadnik.me platformi.

Detalji pozicije:
• Pozicija: ${oglas.pozicija}
• Firma: ${oglas.firma_naziv}
• Lokacija: ${oglas.lokacija || 'Nije specificirano'}
• Tip posla: ${this.formatTipPosla(oglas.tip_posla)}

Molim Vas da mi pošaljete dodatne informacije o procesu selekcije i potrebnim dokumentima.

CV i ostala dokumenta mogu da pošaljem na Vaš zahtjev.

Hvala Vam na razmotrenju moje kandidature.

Srdačan pozdrav`;

    // Kreiranje mailto linka
    const mailtoLink = `mailto:${kontaktEmail}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    // Otvaranje email klijenta
    window.location.href = mailtoLink;

    // Zatvaranje modala nakon kratke pauze
    setTimeout(() => {
      const modal = bootstrap.Modal.getInstance(
        document.getElementById('oglasModal')
      );
      if (modal) {
        modal.hide();
      }
    }, 500);
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OglasiApp();
});
