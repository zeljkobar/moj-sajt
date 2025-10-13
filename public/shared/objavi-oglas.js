/**
 * Objavi Oglas - JavaScript funkcionalnost
 * Summa Summarum platform
 */

class OglasiFormApp {
  constructor() {
    this.form = document.getElementById('oglasForm');
    this.preview = document.getElementById('preview');
    this.init();
  }

  init() {
    this.checkAuthentication();
    this.bindEvents();
    this.setDefaultDate();
    this.updatePreview();
  }

  async checkAuthentication() {
    try {
      const response = await fetch('/api/users/current', {
        credentials: 'include',
      });

      if (!response.ok) {
        // Korisnik nije ulogovan
        this.showError(
          'Morate biti ulogovani kao firma da biste pristupili ovoj stranici.'
        );
        setTimeout(() => {
          window.location.href =
            '/shared/login.html?redirect=' +
            encodeURIComponent(window.location.href);
        }, 2000);
        return;
      }

      const userData = await response.json();

      // Provjeri da li je korisnik firma
      if (userData.role !== 'firma') {
        this.showError('Samo firme mogu objavljivati oglase za poslove.');
        setTimeout(() => {
          window.location.href = '/shared/dashboard.html';
        }, 2000);
        return;
      }
    } catch (error) {
      console.error('Greška pri provjeri autentifikacije:', error);
    }
  }

  bindEvents() {
    // Form submission
    this.form.addEventListener('submit', e => {
      e.preventDefault();
      this.submitForm();
    });

    // Real-time preview update
    const previewFields = [
      'naslov',
      'pozicija',
      'opis',
      'lokacija',
      'tipPosla',
      'plataOd',
      'plataDo',
      'iskustvoGodine',
      'obrazovanje',
    ];

    previewFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', () => this.updatePreview());
        field.addEventListener('change', () => this.updatePreview());
      }
    });

    // Character counters
    this.bindCharacterCounters();

    // Salary validation
    this.bindSalaryValidation();
  }

  bindCharacterCounters() {
    const naslov = document.getElementById('naslov');
    const naslovCount = document.getElementById('naslovCount');
    const opis = document.getElementById('opis');
    const opisCount = document.getElementById('opisCount');

    naslov.addEventListener('input', () => {
      naslovCount.textContent = naslov.value.length;
    });

    opis.addEventListener('input', () => {
      opisCount.textContent = opis.value.length;
    });
  }

  bindSalaryValidation() {
    const plataOd = document.getElementById('plataOd');
    const plataDo = document.getElementById('plataDo');

    const validateSalary = () => {
      const od = parseInt(plataOd.value) || 0;
      const doValue = parseInt(plataDo.value) || 0;

      if (od > 0 && doValue > 0 && od > doValue) {
        plataDo.setCustomValidity(
          'Maksimalna plata mora biti veća od minimalne'
        );
      } else {
        plataDo.setCustomValidity('');
      }
    };

    plataOd.addEventListener('input', validateSalary);
    plataDo.addEventListener('input', validateSalary);
  }

  setDefaultDate() {
    const datumIsteka = document.getElementById('datumIsteka');
    const today = new Date();
    const defaultDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    datumIsteka.value = defaultDate.toISOString().split('T')[0];
  }

  updatePreview() {
    const formData = this.getFormData();
    this.preview.innerHTML = this.generatePreviewHTML(formData);
  }

  getFormData() {
    return {
      naslov: document.getElementById('naslov').value,
      pozicija: document.getElementById('pozicija').value,
      opis: document.getElementById('opis').value,
      lokacija: document.getElementById('lokacija').value,
      tip_posla: document.getElementById('tipPosla').value,
      plata_od: document.getElementById('plataOd').value,
      plata_do: document.getElementById('plataDo').value,
      iskustvo_godine: document.getElementById('iskustvoGodine').value,
      obrazovanje: document.getElementById('obrazovanje').value,
      datum_isteka: document.getElementById('datumIsteka').value,
      kontakt_email: document.getElementById('kontaktEmail').value,
      kontakt_telefon: document.getElementById('kontaktTelefon').value,
    };
  }

  generatePreviewHTML(data) {
    if (!data.naslov && !data.pozicija && !data.opis) {
      return `
                <div class="text-muted text-center py-4">
                    <i class="fas fa-clipboard-list fa-3x mb-3"></i>
                    <p>Počnite da popunjavate formu da vidite pregled oglasa</p>
                </div>
            `;
    }

    const tipPoslaText = this.formatTipPosla(data.tip_posla);
    const plataText = this.formatPlata(data.plata_od, data.plata_do);
    const obrazovanjeText = this.formatObrazovanje(data.obrazovanje);
    const datumIsteka = data.datum_isteka
      ? new Date(data.datum_isteka).toLocaleDateString('sr-RS')
      : '';

    return `
            <div class="card border-0">
                <div class="card-body p-0">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge bg-primary">${tipPoslaText}</span>
                        ${
                          data.lokacija
                            ? `<span class="badge bg-light text-dark">${this.escapeHtml(
                                data.lokacija
                              )}</span>`
                            : ''
                        }
                    </div>
                    
                    <h5 class="card-title text-primary mb-2">
                        ${
                          data.naslov
                            ? this.escapeHtml(data.naslov)
                            : '<em class="text-muted">Unesite naslov oglasa</em>'
                        }
                    </h5>
                    
                    <p class="text-muted mb-2">
                        <i class="fas fa-user-tie me-1"></i>
                        ${
                          data.pozicija
                            ? this.escapeHtml(data.pozicija)
                            : '<em>Unesite poziciju</em>'
                        }
                    </p>
                    
                    ${
                      data.opis
                        ? `
                        <p class="card-text mb-3" style="font-size: 0.9rem;">
                            ${this.escapeHtml(data.opis)
                              .replace(/\n/g, '<br>')
                              .substring(0, 200)}${
                            data.opis.length > 200 ? '...' : ''
                          }
                        </p>
                    `
                        : '<p class="text-muted mb-3"><em>Unesite opis posla</em></p>'
                    }
                    
                    <div class="small text-muted">
                        ${
                          plataText
                            ? `<div class="mb-1"><i class="fas fa-coins me-2"></i>${plataText}</div>`
                            : ''
                        }
                        ${
                          data.iskustvo_godine
                            ? `<div class="mb-1"><i class="fas fa-clock me-2"></i>Iskustvo: ${data.iskustvo_godine} god.</div>`
                            : ''
                        }
                        ${
                          obrazovanjeText
                            ? `<div class="mb-1"><i class="fas fa-graduation-cap me-2"></i>${obrazovanjeText}</div>`
                            : ''
                        }
                        ${
                          datumIsteka
                            ? `<div class="mb-1"><i class="fas fa-calendar me-2"></i>Važi do: ${datumIsteka}</div>`
                            : ''
                        }
                        
                        ${
                          data.kontakt_email || data.kontakt_telefon
                            ? `
                            <div class="mt-2 pt-2 border-top">
                                <strong>Kontakt:</strong><br>
                                ${
                                  data.kontakt_email
                                    ? `<i class="fas fa-envelope me-1"></i> ${this.escapeHtml(
                                        data.kontakt_email
                                      )}<br>`
                                    : ''
                                }
                                ${
                                  data.kontakt_telefon
                                    ? `<i class="fas fa-phone me-1"></i> ${this.escapeHtml(
                                        data.kontakt_telefon
                                      )}`
                                    : ''
                                }
                            </div>
                        `
                            : ''
                        }
                    </div>
                </div>
            </div>
        `;
  }

  async submitForm() {
    if (!this.form.checkValidity()) {
      this.form.reportValidity();
      return;
    }

    const formData = this.getFormData();

    // Remove empty fields
    Object.keys(formData).forEach(key => {
      if (
        formData[key] === '' ||
        formData[key] === null ||
        formData[key] === undefined
      ) {
        delete formData[key];
      }
    });

    try {
      this.showLoading(true);

      const response = await fetch('/api/oglasi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Važno za slanje cookies/session
        body: JSON.stringify(formData),
      });

      // Provjeri da li je korisnik ulogovan
      if (response.status === 401) {
        this.showError(
          'Morate biti ulogovani kao firma da biste objavili oglas. Preusmjeravam vas na stranicu za prijavu...'
        );
        setTimeout(() => {
          window.location.href =
            '/shared/login.html?redirect=' +
            encodeURIComponent(window.location.href);
        }, 2000);
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `HTTP error! status: ${response.status}`
        );
      }

      this.showSuccess(result);
      this.resetForm();
    } catch (error) {
      console.error('Greška pri kreiranju oglasa:', error);
      if (error.message.includes('401')) {
        this.showError(
          'Morate biti ulogovani kao firma da biste objavili oglas.'
        );
      } else {
        this.showError(
          error.message || 'Došlo je do greške pri kreiranju oglasa.'
        );
      }
    } finally {
      this.showLoading(false);
    }
  }

  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    const submitBtn = document.getElementById('submitBtn');

    if (show) {
      overlay.style.display = 'flex';
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin me-2"></i>Objavljivanje...';
    } else {
      overlay.style.display = 'none';
      submitBtn.disabled = false;
      submitBtn.innerHTML =
        '<i class="fas fa-paper-plane me-2"></i>Objavi Oglas';
    }
  }

  showSuccess(result) {
    const successMessage = document.getElementById('successMessage');
    successMessage.style.display = 'block';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Hide after 5 seconds
    setTimeout(() => {
      successMessage.style.display = 'none';
    }, 5000);
  }

  showError(message) {
    // Simple alert for now - can be enhanced with toast notifications
    alert('Greška: ' + message);
  }

  resetForm() {
    this.form.reset();
    this.setDefaultDate();
    this.updatePreview();

    // Reset character counters
    document.getElementById('naslovCount').textContent = '0';
    document.getElementById('opisCount').textContent = '0';
  }

  // Utility functions
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
    return tipovi[tip] || 'Puno vrijeme';
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
    return nivoi[obrazovanje] || '';
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OglasiFormApp();
});
