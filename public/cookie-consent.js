/**
 * Cookie Consent Manager
 * Handles cookie consent popup and enables pop-up functionality for JPR forms
 */

class CookieConsent {
  constructor() {
    this.storageKey = 'cookieConsent';
    this.popupsEnabledKey = 'popupsEnabled';
    this.init();
  }

  init() {
    // Check if consent already given
    if (this.hasConsent()) {
      this.enablePopups();
      return;
    }

    // Show consent popup after page loads
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        this.showConsentPopup();
      }, 1000); // Show after 1 second
    });
  }

  hasConsent() {
    return localStorage.getItem(this.storageKey) === 'accepted';
  }

  isPopupsEnabled() {
    return localStorage.getItem(this.popupsEnabledKey) === 'true';
  }

  enablePopups() {
    localStorage.setItem(this.popupsEnabledKey, 'true');
    console.log('Pop-ups enabled for JPR functionality');
  }

  showConsentPopup() {
    // Create popup HTML
    const popupHTML = `
            <div id="cookie-consent">
                <div class="cookie-content">
                    <div class="cookie-text">
                        <h3>🍪 Kolačići i Pop-up dozvole</h3>
                        <p>Ovaj sajt koristi kolačiće za bolje korisničko iskustvo i potrebne su vam pop-up dozvole za otvaranje JPR dokumenata. Klikom na "Prihvatam" omogućavate potpunu funkcionalnost sajta.</p>
                    </div>
                    <div class="cookie-buttons">
                        <button class="cookie-btn accept" onclick="cookieConsent.acceptConsent()">
                            ✓ Prihvatam
                        </button>
                        <button class="cookie-btn decline" onclick="cookieConsent.declineConsent()">
                            ✗ Odbijam
                        </button>
                        <button class="cookie-btn settings" onclick="cookieConsent.showSettings()">
                            ⚙️ Postavke
                        </button>
                    </div>
                </div>
            </div>
        `;

    // Add to page
    document.body.insertAdjacentHTML('beforeend', popupHTML);

    // Show with animation
    setTimeout(() => {
      const popup = document.getElementById('cookie-consent');
      if (popup) {
        popup.classList.add('show');
      }
    }, 100);
  }

  acceptConsent() {
    localStorage.setItem(this.storageKey, 'accepted');
    this.enablePopups();
    this.hideConsentPopup();

    // Show success message
    this.showNotification(
      '✅ Hvala! JPR dokumenti će se sada otvarati bez problema.',
      'success'
    );
  }

  declineConsent() {
    localStorage.setItem(this.storageKey, 'declined');
    localStorage.setItem(this.popupsEnabledKey, 'false');
    this.hideConsentPopup();

    // Show warning message
    this.showNotification(
      '⚠️ JPR dokumenti možda neće raditi ispravno bez dozvole za pop-ups.',
      'warning'
    );
  }

  hideConsentPopup() {
    const popup = document.getElementById('cookie-consent');
    if (popup) {
      popup.classList.add('fade-out');
      setTimeout(() => {
        popup.remove();
      }, 300);
    }
  }

  showSettings() {
    const modalHTML = `
            <div class="cookie-modal" id="cookie-settings-modal">
                <div class="cookie-modal-content">
                    <button class="cookie-modal-close" onclick="cookieConsent.closeSettings()">×</button>
                    <h2>Postavke kolačića i dozvola</h2>
                    <div style="margin: 20px 0;">
                        <h3>🍪 Funkcionalni kolačići</h3>
                        <p>Potrebni za osnovnu funkcionalnost sajta.</p>
                        <label>
                            <input type="checkbox" checked disabled> Uvek omogućeno
                        </label>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <h3>🚀 Pop-up dozvole</h3>
                        <p>Potrebne za otvaranje JPR dokumenata i dodataka.</p>
                        <label>
                            <input type="checkbox" id="popup-toggle" ${
                              this.isPopupsEnabled() ? 'checked' : ''
                            }> 
                            Omogući pop-ups za JPR
                        </label>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <h3>📊 Analitički kolačići</h3>
                        <p>Pomažu nam da razumemo kako koristite sajt.</p>
                        <label>
                            <input type="checkbox" id="analytics-toggle"> Omogući analitiku
                        </label>
                    </div>
                    
                    <div style="margin-top: 30px; text-align: right;">
                        <button class="cookie-btn decline" onclick="cookieConsent.closeSettings()" style="margin-right: 10px;">
                            Otkaži
                        </button>
                        <button class="cookie-btn accept" onclick="cookieConsent.saveSettings()">
                            Sačuvaj postavke
                        </button>
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('cookie-settings-modal').classList.add('show');
  }

  closeSettings() {
    const modal = document.getElementById('cookie-settings-modal');
    if (modal) {
      modal.remove();
    }
  }

  saveSettings() {
    const popupToggle = document.getElementById('popup-toggle');
    const analyticsToggle = document.getElementById('analytics-toggle');

    if (popupToggle.checked) {
      this.enablePopups();
      localStorage.setItem(this.storageKey, 'accepted');
    } else {
      localStorage.setItem(this.popupsEnabledKey, 'false');
    }

    localStorage.setItem(
      'analyticsEnabled',
      analyticsToggle.checked ? 'true' : 'false'
    );

    this.closeSettings();
    this.hideConsentPopup();

    this.showNotification('✅ Postavke sačuvane!', 'success');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${
              type === 'success'
                ? '#2ecc71'
                : type === 'warning'
                ? '#f39c12'
                : '#3498db'
            };
            color: white;
            padding: 15px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10002;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 300px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }

  // Method to check if JPR can be opened (for use in other scripts)
  canOpenJPR() {
    return this.hasConsent() && this.isPopupsEnabled();
  }

  // Enhanced window.open with consent check
  openWindow(url, target = '_blank', features = '') {
    if (!this.canOpenJPR()) {
      this.showNotification(
        '⚠️ Molimo prihvatite kolačiće i pop-up dozvole za otvaranje dokumenata.',
        'warning'
      );
      return null;
    }

    try {
      // Use originalWindowOpen to avoid infinite recursion
      const originalWindowOpen = window.originalWindowOpen || window.open;
      const newWindow = originalWindowOpen.call(window, url, target, features);
      if (!newWindow) {
        this.showNotification(
          '❌ Browser je blokirao pop-up. Molimo omogućite pop-ups za ovaj sajt.',
          'warning'
        );
      }
      return newWindow;
    } catch (error) {
      console.error('Error opening window:', error);
      this.showNotification('❌ Greška pri otvaranju dokumenta.', 'warning');
      return null;
    }
  }
}

// Initialize cookie consent
const cookieConsent = new CookieConsent();

// Enhanced JPR opening functions
function openJPRWithConsent(koricaUrl, dodatakUrl) {
  if (!cookieConsent.canOpenJPR()) {
    cookieConsent.showNotification(
      '⚠️ Molimo prihvatite kolačiće i pop-up dozvole za otvaranje JPR dokumenata.',
      'warning'
    );
    return false;
  }

  // Open both windows
  const korica = cookieConsent.openWindow(koricaUrl);
  const dodatak = cookieConsent.openWindow(dodatakUrl);

  if (korica && dodatak) {
    cookieConsent.showNotification('📄 JPR dokumenti otvoreni!', 'success');
    return true;
  }

  return false;
}

// Global helper function for JPR
window.openJPRForSporazumni = function () {
  return openJPRWithConsent(
    'jpr-korica.html?context=sporazumni',
    'jpr-dodatak-b.html?context=odjava'
  );
};

// Removed openJPRForIstek - using custom function in istek-ugovora.html instead

// Override default window.open for better control
const originalWindowOpen = window.open;
// Store reference for internal use
window.originalWindowOpen = originalWindowOpen;

window.open = function (url, target, features) {
  // Allow internal navigation and same-origin opens
  if (
    !url ||
    url.startsWith('#') ||
    url.startsWith('/') ||
    url.includes(window.location.hostname)
  ) {
    return originalWindowOpen.call(this, url, target, features);
  }

  // For external URLs, use consent check
  return cookieConsent.openWindow(url, target, features);
};

console.log('🍪 Cookie Consent Manager loaded successfully');
