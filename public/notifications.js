// Obavještenja funkcionalnost
class NotificationManager {
  constructor() {
    console.log("🚀 NotificationManager se inicijalizuje...");
    this.notifications = [];
    this.updateInterval = null;
    this.init();
  }

  async init() {
    await this.loadNotifications();
    this.startAutoUpdate();
  }

  async loadNotifications() {
    try {
      console.log("🔔 Učitavam obavještenja...");
      const response = await fetch("/api/notifications", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("📨 Dobio obavještenja:", data);
        this.notifications = data.notifications || [];
        this.renderNotifications();
      } else {
        console.error(
          "Greška pri učitavanju obavještenja - status:",
          response.status
        );
      }
    } catch (error) {
      console.error("Greška pri učitavanju obavještenja:", error);
    }
  }

  renderNotifications() {
    const container = document.getElementById("notifications-container");
    if (!container) return;

    const urgentCount = this.notifications.filter(
      (n) => n.type === "urgent"
    ).length;
    const totalCount = this.notifications.length;

    if (totalCount === 0) {
      container.innerHTML = this.getEmptyState();
      return;
    }

    container.innerHTML = `
      <div class="notifications-header">
        <h3 class="notifications-title">
          🔔 Obavještenja
          ${
            urgentCount > 0
              ? `<span class="notifications-count">${urgentCount}</span>`
              : ""
          }
        </h3>
      </div>
      <div class="notifications-list">
        ${this.notifications
          .map((notification) => this.renderNotification(notification))
          .join("")}
      </div>
    `;

    // Dodaj event listenere
    this.addEventListeners();
  }

  renderNotification(notification) {
    const timeText = this.getTimeText(notification);

    return `
      <div class="notification-item ${notification.type}" 
           data-id="${notification.id}" 
           data-action="${notification.action}">
        <div class="notification-icon">${notification.icon}</div>
        <div class="notification-content">
          <div class="notification-title">${notification.title}</div>
          <div class="notification-description">${notification.description}</div>
          <div class="notification-time">${timeText}</div>
        </div>
        <button class="notification-dismiss" data-id="${notification.id}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  }

  getTimeText(notification) {
    if (notification.days < 0) {
      return `Isteklo pre ${Math.abs(notification.days)} dana`;
    } else if (notification.days === 0) {
      return "Danas";
    } else if (notification.days === 1) {
      return "Sutra";
    } else {
      return `Za ${notification.days} dana`;
    }
  }

  getEmptyState() {
    return `
      <div class="notifications-header">
        <h3 class="notifications-title">🔔 Obavještenja</h3>
      </div>
      <div class="notifications-empty">
        <div class="notifications-empty-icon">✅</div>
        <p class="notifications-empty-text">Nema novih obavještenja</p>
      </div>
    `;
  }
  addEventListeners() {
    // Klik na obavještenje - idi na akciju
    document.querySelectorAll(".notification-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.target.closest(".notification-dismiss")) return;

        const action = item.dataset.action;

        if (action && action !== "undefined") {
          window.location.href = action;
        }
      });
    });

    // Dismiss obavještenja
    document.querySelectorAll(".notification-dismiss").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const notificationId = btn.dataset.id;
        this.dismissNotification(notificationId);
      });
    });
  }

  dismissNotification(notificationId) {
    // Ukloni iz liste
    this.notifications = this.notifications.filter(
      (n) => n.id !== notificationId
    );

    // Ukloni iz DOM-a sa animacijom
    const element = document.querySelector(`[data-id="${notificationId}"]`);
    if (element) {
      element.style.opacity = "0";
      element.style.transform = "translateX(-20px)";
      setTimeout(() => {
        this.renderNotifications();
      }, 200);
    }

    // Sačuvaj u localStorage da se ne pojavi ponovo
    const dismissed = JSON.parse(
      localStorage.getItem("dismissedNotifications") || "[]"
    );
    dismissed.push(notificationId);
    localStorage.setItem("dismissedNotifications", JSON.stringify(dismissed));
  }

  startAutoUpdate() {
    // Ažuriraj svakih 5 minuta
    this.updateInterval = setInterval(() => {
      this.loadNotifications();
    }, 5 * 60 * 1000);
  }

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Inicijalizuj kada se stranica učita
document.addEventListener("DOMContentLoaded", () => {
  // Provjeri da li smo na dashboard stranici
  if (document.getElementById("notifications-container")) {
    window.notificationManager = new NotificationManager();
  }
});

// Cleanup kada se stranica napušta
window.addEventListener("beforeunload", () => {
  if (window.notificationManager) {
    window.notificationManager.stopAutoUpdate();
  }
});

// Globalna funkcija za prikazivanje toast notifikacija
function showNotification(message, type = "info") {
  // Kreiraj toast container ako ne postoji
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(toastContainer);
  }

  // Kreiraj toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.style.cssText = `
    padding: 12px 16px;
    border-radius: 6px;
    color: white;
    font-weight: 500;
    max-width: 350px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transform: translateX(100%);
    transition: transform 0.3s ease;
    cursor: pointer;
  `;

  // Stilovi prema tipu
  const styles = {
    success: "background-color: #10b981;",
    error: "background-color: #ef4444;",
    warning: "background-color: #f59e0b;",
    info: "background-color: #3b82f6;",
  };

  toast.style.cssText += styles[type] || styles.info;
  toast.textContent = message;

  // Dodaj toast u container
  toastContainer.appendChild(toast);

  // Animacija ulaska
  setTimeout(() => {
    toast.style.transform = "translateX(0)";
  }, 100);

  // Ukloni nakon 4 sekunde
  const timeout = setTimeout(() => {
    removeToast(toast);
  }, 4000);

  // Ukloni na klik
  toast.addEventListener("click", () => {
    clearTimeout(timeout);
    removeToast(toast);
  });

  function removeToast(toastElement) {
    toastElement.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (toastElement.parentNode) {
        toastElement.parentNode.removeChild(toastElement);
      }
    }, 300);
  }
}
