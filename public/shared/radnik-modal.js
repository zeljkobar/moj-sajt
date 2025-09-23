/**
 * Centralizovani modal za dodavanje radnika
 * Koristi se na stranicama: firma-detalji.html
 */

console.log('🚀 radnik-modal.js loaded successfully!');

class RadnikModal {
  constructor() {
    this.modal = null;
    this.firmId = null; // Može biti setovano spoljno
    this.onSuccess = null; // Callback funkcija
    this.init();
  }

  // HTML template za modal
  getModalHTML() {
    return `
      <!-- Modal za dodavanje radnika -->
      <div id="radnikModal" class="modal">
        <div class="modal-content">
          <span class="close" onclick="closeRadnikModal()">&times;</span>
          <h2>Dodaj novog radnika</h2>
          <form id="radnikForm">
            <!-- Vrsta ugovora - PRVO POLJE -->
            <div class="form-group">
              <label for="vrsta_ugovora">Vrsta ugovora:</label>
              <select
                id="vrsta_ugovora"
                name="vrsta_ugovora"
                required
                onchange="toggleRadnoVremeOptions()"
              >
                <option value="">Izaberite vrstu ugovora</option>
                <option value="ugovor_o_radu">Ugovor o radu</option>
                <option value="ugovor_o_djelu">Ugovor o djelu</option>
                <option value="ugovor_o_dopunskom_radu">
                  Ugovor o dopunskom radu
                </option>
              </select>
            </div>

            <!-- Osnovni podaci -->
            <div class="form-row">
              <div class="form-col">
                <div class="form-group">
                  <label for="ime">Ime:</label>
                  <input type="text" id="ime" name="ime" required />
                </div>
              </div>
              <div class="form-col">
                <div class="form-group">
                  <label for="prezime">Prezime:</label>
                  <input type="text" id="prezime" name="prezime" required />
                </div>
              </div>
            </div>

            <!-- JMBG i Grad -->
            <div class="form-row">
              <div class="form-col">
                <div class="form-group">
                  <label for="jmbg">JMBG:</label>
                  <input
                    type="text"
                    id="jmbg"
                    name="jmbg"
                    required
                    maxlength="13"
                    pattern="[0-9]{13}"
                    title="JMBG mora imati tačno 13 cifara"
                  />
                </div>
              </div>
              <div class="form-col">
                <div class="form-group">
                  <label for="grad">Grad:</label>
                  <input
                    type="text"
                    id="grad"
                    name="grad"
                    placeholder="Bar, Budva, Podgorica..."
                    required
                  />
                </div>
              </div>
            </div>

            <!-- Adresa -->
            <div class="form-group">
              <label for="adresa">Adresa:</label>
              <input
                type="text"
                id="adresa"
                name="adresa"
                placeholder="Ulica i broj, Bar 85000"
                required
              />
            </div>

            <!-- Pozicija i firma -->
            <div class="form-row">
              <div class="form-col">
                <div class="form-group">
                  <label for="pozicija_id">Pozicija:</label>
                  <select id="pozicija_id" name="pozicija_id" required>
                    <option value="">Izaberite poziciju</option>
                  </select>
                </div>
              </div>
              <div class="form-col" id="firmaSelectContainer">
                <div class="form-group">
                  <label for="firma_id">Firma:</label>
                  <select id="firma_id" name="firma_id" required>
                    <option value="">Izaberite firmu</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Datum i zarada -->
            <div class="form-row">
              <div class="form-col">
                <div class="form-group">
                  <label for="datum_zaposlenja">Datum zaposlenja:</label>
                  <input
                    type="date"
                    id="datum_zaposlenja"
                    name="datum_zaposlenja"
                    required
                  />
                </div>
              </div>
              <div class="form-col">
                <div class="form-group">
                  <label for="visina_zarade">Visina zarade (€):</label>
                  <input
                    type="number"
                    id="visina_zarade"
                    name="visina_zarade"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>
            </div>

            <!-- Radno vreme -->
            <div class="form-group">
              <label for="tip_radnog_vremena">Radno vrijeme:</label>
              <select id="tip_radnog_vremena" name="tip_radnog_vremena" required>
                <option value="puno_8h">
                  Puno radno vrijeme (8 sati dnevno / 40 sati nedeljno)
                </option>
                <option value="skraceno_6h">
                  Skraćeno radno vrijeme (6 sati dnevno / 30 sati nedeljno)
                </option>
                <option value="skraceno_4h">
                  Skraćeno radno vrijeme (4 sata dnevno / 20 sati nedeljno)
                </option>
                <option value="skraceno_2h">
                  Skraćeno radno vrijeme (2 sata dnevno / 10 sati nedeljno)
                </option>
              </select>
              <small
                id="radnoVremeHelp"
                style="color: #6c757d; font-size: 12px; display: none"
              >
                💡 Za dopunski rad: maksimalno 4 sata dnevno po zakonu
              </small>
            </div>

            <!-- Radi subotom checkbox -->
            <div class="form-group">
              <label style="margin-bottom: 8px; display: block;">Radni dani:</label>
              <div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background-color: var(--card-bg-secondary, #f8f9fa); border: 1px solid var(--border-color, #dee2e6); border-radius: 6px;">
                <input 
                  type="checkbox" 
                  id="subota" 
                  name="subota" 
                  checked 
                  style="margin: 0; width: 16px; height: 16px; cursor: pointer;"
                />
                <label 
                  for="subota" 
                  style="margin: 0; font-weight: normal; cursor: pointer; flex: 1;"
                >
                  Radi subotom
                </label>
              </div>
              <small style="color: #6c757d; font-size: 12px; margin-top: 6px; display: block;">
                💡 Utiče na broj dana godišnjeg odmora (20 ili 24 dana)
              </small>
            </div>

            <!-- Tip ugovora -->
            <div class="form-group">
              <label for="tip_ugovora">Tip ugovora:</label>
              <select
                id="tip_ugovora"
                name="tip_ugovora"
                required
                onchange="toggleDatumPrestanka()"
              >
                <option value="na_neodredjeno">Na neodređeno vreme</option>
                <option value="na_odredjeno">Na određeno vreme</option>
              </select>
            </div>

            <!-- Datum prestanka (uslovni) -->
            <div
              class="form-group"
              id="datum_prestanka_group"
              style="display: none"
            >
              <label for="datum_prestanka">Datum prestanka rada:</label>
              <input type="date" id="datum_prestanka" name="datum_prestanka" />
            </div>

            <!-- Napomene -->
            <div class="form-group">
              <label for="napomene">Napomene:</label>
              <textarea
                id="napomene"
                name="napomene"
                placeholder="Dodatne napomene o zaposlenju..."
              ></textarea>
            </div>

            <!-- Dugmad -->
            <div
              style="margin-top: 20px; text-align: center"
              class="form-buttons"
            >
              <button
                type="submit"
                class="btn btn-success"
                style="margin-right: 10px"
              >
                Dodaj radnika
              </button>
              <button type="button" class="btn" onclick="closeRadnikModal()">
                Otkaži
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // CSS stilovi za modal
  getModalCSS() {
    return `
      .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        overflow-y: auto;
      }
      .modal-content {
        background-color: var(--card-bg);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        margin: 20px auto;
        padding: 20px;
        border-radius: 8px;
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        top: 10px;
      }

      /* Dodaj stilove za bolji prikaz dugih formi */
      @media (max-height: 800px) {
        .modal-content {
          margin: 10px auto;
          max-height: 95vh;
        }
      }

      .modal h2 {
        margin-top: 0;
        margin-bottom: 20px;
        color: var(--text-color);
        border-bottom: 2px solid var(--border-color);
        padding-bottom: 10px;
      }

      /* Layout za formu u dva stubca */
      .form-row {
        display: flex;
        gap: 15px;
        margin-bottom: 15px;
      }

      .form-col {
        flex: 1;
      }

      .form-col .form-group {
        margin-bottom: 0;
      }

      .form-group {
        margin-bottom: 15px;
      }
      .form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
        color: var(--text-color);
      }
      .form-group input,
      .form-group select,
      .form-group textarea {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        box-sizing: border-box;
        background-color: var(--input-bg);
        color: var(--text-color);
      }
      .form-group input:focus,
      .form-group select:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px var(--focus-shadow);
      }
      .form-group textarea {
        height: 100px;
        resize: vertical;
      }
      .close {
        color: var(--text-color);
        float: right;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s ease;
      }
      .close:hover {
        opacity: 1;
      }
      
      /* Button stilovi */
      .modal .btn {
        padding: 8px 16px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        font-weight: 500;
        text-decoration: none;
        display: inline-block;
        transition: all 0.2s ease;
      }
      
      .modal .btn-success {
        background-color: var(--success-color);
        color: white;
      }
      
      .modal .btn-success:hover {
        background-color: var(--success-hover);
      }
      
      .modal .btn:not(.btn-success) {
        background-color: var(--secondary-color);
        color: white;
      }
      
      .modal .btn:not(.btn-success):hover {
        background-color: var(--secondary-hover);
      }

      /* Responsive dizajn */
      @media (max-width: 768px) {
        .form-row {
          flex-direction: column;
          gap: 0;
        }

        .modal-content {
          width: 95%;
          margin: 5px auto;
          padding: 15px;
        }

        .form-col .form-group {
          margin-bottom: 15px;
        }
      }

      @media (max-width: 480px) {
        .modal-content {
          width: 98%;
          padding: 10px;
        }

        .form-buttons .btn {
          width: 45%;
          margin: 5px 2.5%;
          display: inline-block;
        }
      }
    `;
  }

  // Inicijalizacija modala
  init() {
    // Dodaj CSS ako ne postoji
    if (!document.querySelector('#radnik-modal-css')) {
      const style = document.createElement('style');
      style.id = 'radnik-modal-css';
      style.textContent = this.getModalCSS();
      document.head.appendChild(style);
    }

    // Dodaj HTML ako ne postoji
    if (!document.querySelector('#radnikModal')) {
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = this.getModalHTML();
      document.body.appendChild(modalContainer);
    }

    this.setupEventListeners();
    this.loadInitialData();
  }

  // Setup event listeneri
  setupEventListeners() {
    const form = document.getElementById('radnikForm');
    if (form) {
      form.addEventListener('submit', e => this.handleSubmit(e));
    }

    // Zatvaranje modala klikom van njega
    window.addEventListener('click', event => {
      const modal = document.getElementById('radnikModal');
      if (event.target === modal) {
        this.close();
      }
    });
  }

  // Učitaj početne podatke
  async loadInitialData() {
    await this.loadFirme();
    await this.loadPozicije();
    this.setDefaultDate();
  }

  // Učitaj firme
  async loadFirme() {
    try {
      const response = await fetch('/api/firme');
      if (response.ok) {
        const firmeData = await response.json();
        // Koristi isti pattern kao u edit modalu: data.firme || data
        const firme = firmeData.firme || firmeData;
        const firmaSelect = document.getElementById('firma_id');

        if (firmaSelect) {
          firmaSelect.innerHTML = '<option value="">Izaberite firmu</option>';
          if (Array.isArray(firme)) {
            firme.forEach(firma => {
              const option = document.createElement('option');
              option.value = firma.id;
              option.textContent = firma.naziv;
              firmaSelect.appendChild(option);
            });
          } else {
            console.error('Firme nisu u nizu formatu:', firme);
          }
        }
      }
    } catch (error) {
      console.error('Greška pri učitavanju firmi:', error);
    }
  }

  // Učitaj pozicije
  async loadPozicije() {
    try {
      const response = await fetch('/api/pozicije');
      if (response.ok) {
        const pozicijeData = await response.json();
        // Koristi isti pattern kao za firme
        const pozicije = pozicijeData.pozicije || pozicijeData;
        const pozicijaSelect = document.getElementById('pozicija_id');

        if (pozicijaSelect) {
          pozicijaSelect.innerHTML =
            '<option value="">Izaberite poziciju</option>';
          if (Array.isArray(pozicije)) {
            pozicije.forEach(pozicija => {
              const option = document.createElement('option');
              option.value = pozicija.id;
              option.textContent = pozicija.naziv;
              pozicijaSelect.appendChild(option);
            });
          } else {
            console.error('Pozicije nisu u nizu formatu:', pozicije);
          }
        }
      }
    } catch (error) {
      console.error('Greška pri učitavanju pozicija:', error);
    }
  }

  // Postavi današnji datum
  setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    const datumField = document.getElementById('datum_zaposlenja');
    if (datumField) {
      datumField.value = today;
    }
  }

  // Otvori modal
  open(options = {}) {
    // Setuj opcije
    if (options.firmId) {
      this.firmId = options.firmId;
      // Sakrij firma select ako je firmId setovano
      const firmaContainer = document.getElementById('firmaSelectContainer');
      if (firmaContainer) {
        firmaContainer.style.display = 'none';
      }
      // Postavi vrednost u hidden field
      const firmaSelect = document.getElementById('firma_id');
      if (firmaSelect) {
        firmaSelect.value = options.firmId;
        firmaSelect.required = false;
      }
    } else {
      // Prikaži firma select
      const firmaContainer = document.getElementById('firmaSelectContainer');
      if (firmaContainer) {
        firmaContainer.style.display = 'block';
      }
      const firmaSelect = document.getElementById('firma_id');
      if (firmaSelect) {
        firmaSelect.required = true;
      }
    }

    if (options.onSuccess) {
      this.onSuccess = options.onSuccess;
    }

    // Otvori modal
    const modal = document.getElementById('radnikModal');
    if (modal) {
      modal.style.display = 'block';
      // Focus na prvo polje
      setTimeout(() => {
        const firstInput = document.getElementById('vrsta_ugovora');
        if (firstInput) firstInput.focus();
      }, 100);
    }
  }

  // Zatvori modal
  close() {
    const modal = document.getElementById('radnikModal');
    if (modal) {
      modal.style.display = 'none';
      this.resetForm();
    }
  }

  // Reset forma
  resetForm() {
    const form = document.getElementById('radnikForm');
    if (form) {
      form.reset();
      this.setDefaultDate();
      this.toggleRadnoVremeOptions(); // Reset radno vreme opcije
      this.toggleDatumPrestanka(); // Reset datum prestanka
    }
  }

  // Handle submit forma
  async handleSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Eksplicitno dodaj checkbox vrednost za subota
    const subotaCheckbox = document.getElementById('subota');
    data.subota = subotaCheckbox ? subotaCheckbox.checked : false;

    // Koristi firmId ako je setovan spoljno
    if (this.firmId && !data.firma_id) {
      data.firma_id = this.firmId;
    }

    try {
      const response = await fetch('/api/radnici', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();

        // Zatvori modal
        this.close();

        // Pozovi callback funkciju ako postoji
        if (this.onSuccess) {
          this.onSuccess(result);
        }

        // Prikaži success poruku
        this.showSuccessMessage('Radnik je uspješno dodan!');
      } else {
        const error = await response.json();
        this.showErrorMessage(error.message || 'Greška pri dodavanju radnika');
      }
    } catch (error) {
      console.error('Greška:', error);
      this.showErrorMessage('Greška pri komunicaciji sa serverom');
    }
  }

  // Handle promjena vrste ugovora
  toggleRadnoVremeOptions() {
    const vrstaUgovora = document.getElementById('vrsta_ugovora').value;
    const radnoVremeSelect = document.getElementById('tip_radnog_vremena');
    const helpText = document.getElementById('radnoVremeHelp');

    if (!radnoVremeSelect) return;

    // Sačuvaj trenutno izabranu vrednost
    const trenutnaVrednost = radnoVremeSelect.value;

    if (vrstaUgovora === 'ugovor_o_dopunskom_radu') {
      // Za dopunski rad - samo 2h ili 4h (max 4h po zakonu)
      radnoVremeSelect.innerHTML = `
        <option value="skraceno_2h">Skraćeno radno vreme (2 sata dnevno / 10 sati nedeljno)</option>
        <option value="skraceno_4h">Skraćeno radno vreme (4 sata dnevno / 20 sati nedeljno)</option>
      `;
      // Postavi default na 4h za dopunski rad
      radnoVremeSelect.value = 'skraceno_4h';
      // Prikaži poruku o ograničenju
      if (helpText) helpText.style.display = 'block';
    } else {
      // Za ostale ugovore - sve opcije
      radnoVremeSelect.innerHTML = `
        <option value="puno_8h">Puno radno vreme (8 sati dnevno / 40 sati nedeljno)</option>
        <option value="skraceno_6h">Skraćeno radno vreme (6 sati dnevno / 30 sati nedeljno)</option>
        <option value="skraceno_4h">Skraćeno radno vreme (4 sata dnevno / 20 sati nedeljno)</option>
        <option value="skraceno_2h">Skraćeno radno vreme (2 sata dnevno / 10 sati nedeljno)</option>
      `;
      // Pokušaj da vratiš prethodnu vrednost ako je bila validna
      if (
        trenutnaVrednost &&
        ['puno_8h', 'skraceno_6h', 'skraceno_4h', 'skraceno_2h'].includes(
          trenutnaVrednost
        )
      ) {
        radnoVremeSelect.value = trenutnaVrednost;
      } else {
        radnoVremeSelect.value = 'puno_8h'; // Default za ostale ugovore
      }
      // Sakrij poruku o ograničenju
      if (helpText) helpText.style.display = 'none';
    }
  }

  // Handle promjena tipa ugovora
  toggleDatumPrestanka() {
    const tipUgovora = document.getElementById('tip_ugovora').value;
    const datumPrestankaGroup = document.getElementById(
      'datum_prestanka_group'
    );
    const datumPrestankaInput = document.getElementById('datum_prestanka');

    if (datumPrestankaGroup && datumPrestankaInput) {
      if (tipUgovora === 'na_odredjeno') {
        datumPrestankaGroup.style.display = 'block';
        datumPrestankaInput.required = true;
      } else {
        datumPrestankaGroup.style.display = 'none';
        datumPrestankaInput.required = false;
        datumPrestankaInput.value = '';
      }
    }
  }

  // Prikaži success poruku
  showSuccessMessage(message) {
    // Jednostavan alert - može se proširiti sa boljim notifikacionim sistemom
    alert(message);
  }

  // Prikaži error poruku
  showErrorMessage(message) {
    // Jednostavan alert - može se proširiti sa boljim notifikacionim sistemom
    alert(message);
  }
}

// Globalne funkcije za kompatibilnost sa postojećim kodom
let radnikModalInstance = null;

// Globalna funkcija za otvaranje modala (kompatibilnost sa postojećim kodom)
function openRadnikModal(options = {}) {
  console.log('🎯 openRadnikModal called with options:', options);

  // Lazy inicijalizacija
  if (!radnikModalInstance) {
    console.log('📝 Creating new RadnikModal instance...');
    radnikModalInstance = new RadnikModal();
  }

  if (radnikModalInstance) {
    radnikModalInstance.open(options);
  } else {
    console.error('RadnikModal nije inicijalizovan');
  }
}

// Globalna funkcija za zatvaranje modala (kompatibilnost sa postojećim kodom)
function closeRadnikModal() {
  if (radnikModalInstance) {
    radnikModalInstance.close();
  }
}

// Globalne funkcije za toggle opcije (kompatibilnost sa postojećim kodom)
function toggleRadnoVremeOptions() {
  if (radnikModalInstance) {
    radnikModalInstance.toggleRadnoVremeOptions();
  }
}

function toggleDatumPrestanka() {
  if (radnikModalInstance) {
    radnikModalInstance.toggleDatumPrestanka();
  }
}

// Export za module sisteme
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RadnikModal;
}
