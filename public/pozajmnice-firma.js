/**
 * JavaScript za pozajmnice-firma.html
 * Upravljanje pozajmnicama i povraćajima za određenu firmu
 */

let firmaId = null;
let pozajmice = [];
let statistike = {};

// ============================================
// INICIJALIZACIJA
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  firmaId = urlParams.get("firmaId");

  if (firmaId) {
    loadFirmaInfo();
    loadPozajmice();
    loadStatistike();
  } else {
    alert("Nedostaje ID firme!");
    window.location.href = "/firme.html";
  }

  // Event listeneri
  setupEventListeners();
});

function setupEventListeners() {
  // Form za povraćaj
  document
    .getElementById("povracajForm")
    .addEventListener("submit", handlePovracajSubmit);

  // Form za pozajmicu
  document
    .getElementById("pozajmicaForm")
    .addEventListener("submit", handlePozajmicaSubmit);

  // Postavi današnji datum kao default za povraćaj
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("datum_povracaja").value = today;
}

// ============================================
// UČITAVANJE PODATAKA
// ============================================

async function loadFirmaInfo() {
  try {
    const response = await fetch(`/api/firme/id/${firmaId}`);
    const firma = await response.json();

    document.getElementById(
      "firmaNaziv"
    ).innerHTML = `<i class="fas fa-hand-holding-usd me-3 text-primary"></i>Pozajmnice - ${firma.naziv}`;
    document.getElementById(
      "firmaInfo"
    ).textContent = `PIB: ${firma.pib} | ${firma.adresa}`;
  } catch (error) {
    console.error("Greška pri učitavanju informacija o firmi:", error);
  }
}

async function loadPozajmice() {
  try {
    const response = await fetch(`/api/pozajmice/firma/${firmaId}`);
    const data = await response.json();

    pozajmice = data.pozajmice || [];

    document.getElementById("loadingSpinner").style.display = "none";

    if (pozajmice.length === 0) {
      document.getElementById("emptyState").classList.remove("d-none");
    } else {
      renderPozajmice();
    }
  } catch (error) {
    console.error("Greška pri učitavanju pozajmica:", error);
    document.getElementById("loadingSpinner").innerHTML =
      '<div class="alert alert-danger">Greška pri učitavanju pozajmica</div>';
  }
}

async function loadStatistike() {
  try {
    const response = await fetch(`/api/povracaji/statistike/firma/${firmaId}`);
    const data = await response.json();

    if (data.success) {
      statistike = data.statistike;
      renderStatistike();
    }
  } catch (error) {
    console.error("Greška pri učitavanju statistika:", error);
  }
}

// ============================================
// RENDEROVANJE
// ============================================

function renderStatistike() {
  document.getElementById(
    "ukupnoPozajmljeno"
  ).textContent = `${statistike.ukupno_pozajmljeno}€`;
  document.getElementById(
    "ukupnoVraceno"
  ).textContent = `${statistike.ukupno_vraceno}€`;
  document.getElementById(
    "ukupnoPreostalo"
  ).textContent = `${statistike.ukupno_preostalo}€`;
  document.getElementById("brojPozajmica").textContent =
    statistike.ukupno_pozajmica;

  document.getElementById("statistikeContainer").style.display = "block";
}

async function renderPozajmice() {
  const container = document.getElementById("pozajmniceContainer");

  if (pozajmice.length === 0) {
    container.innerHTML =
      '<div class="alert alert-info">Nema pozajmica za ovu firmu.</div>';
    return;
  }

  let html = "";

  for (const pozajmica of pozajmice) {
    console.log(
      "Rendering pozajmica:",
      pozajmica.id,
      "broj_ugovora:",
      pozajmica.broj_ugovora
    );

    // Učitaj povraćaje za ovu pozajmnicu
    const povracaji = await loadPovracajeForPozajmica(pozajmica.id);

    html += `
            <div class="card pozajmica-card status-${pozajmica.status} mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-0">
                            <i class="fas fa-file-contract me-2"></i>
                            Ugovor br. ${pozajmica.broj_ugovora}
                        </h5>
                        <small class="text-muted">
                            ${pozajmica.radnik_ime} ${
      pozajmica.radnik_prezime
    } | ${formatDate(pozajmica.datum_izdavanja)}
                        </small>
                    </div>
                    <div class="text-end">
                        <span class="badge ${getStatusBadgeClass(
                          pozajmica.status
                        )} fs-6 mb-2">
                            ${getStatusText(pozajmica.status)}
                        </span>
                        <div class="btn-group">
                            <button class="btn btn-primary btn-sm" onclick="pregledajUgovor(${
                              pozajmica.id
                            })" title="Pregled ugovora o pozajmici">
                                <i class="fas fa-file-alt"></i> Ugovor
                            </button>
                            <button class="btn btn-warning btn-sm" onclick="editujPozajmicu(${
                              pozajmica.id
                            })" title="Izmeni pozajmicu">
                                <i class="fas fa-edit"></i> Izmeni
                            </button>
                            <button class="btn btn-success btn-sm" onclick="otvoriPovracajModal(${
                              pozajmica.id
                            })" 
                                    ${
                                      pozajmica.status === "potpuno_vracena"
                                        ? "disabled"
                                        : ""
                                    }
                                    title="Dodaj povraćaj">
                                <i class="fas fa-plus"></i> Povraćaj
                            </button>
                            <button class="btn btn-info btn-sm" onclick="toggleDetalje(${
                              pozajmica.id
                            })" title="Prikaži/sakrij detalje">
                                <i class="fas fa-eye"></i> Detalji
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="obrisiPozajmicu(${
                              pozajmica.id
                            })" title="Obriši pozajmicu">
                                <i class="fas fa-trash"></i> Obriši
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <strong>Iznos pozajmice:</strong><br>
                            <span class="h5 text-primary">${
                              pozajmica.iznos
                            }€</span>
                        </div>
                        <div class="col-md-3">
                            <strong>Ukupno vraćeno:</strong><br>
                            <span class="h5 text-success">${
                              pozajmica.ukupno_vraceno || 0
                            }€</span>
                        </div>
                        <div class="col-md-3">
                            <strong>Preostalo:</strong><br>
                            <span class="h5 text-danger">${
                              pozajmica.preostalo_dugovanje || pozajmica.iznos
                            }€</span>
                        </div>
                        <div class="col-md-3">
                            <strong>Svrha:</strong><br>
                            <span class="text-capitalize">${pozajmica.svrha.replace(
                              "_",
                              " "
                            )}</span>
                        </div>
                    </div>
                    
                    <!-- Progress bar -->
                    <div class="mt-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <small class="text-muted">Napredak povraćaja</small>
                            <small class="text-muted">${Math.round(
                              ((pozajmica.ukupno_vraceno || 0) /
                                pozajmica.iznos) *
                                100
                            )}%</small>
                        </div>
                        <div class="progress">
                            <div class="progress-bar bg-success" style="width: ${
                              ((pozajmica.ukupno_vraceno || 0) /
                                pozajmica.iznos) *
                              100
                            }%"></div>
                        </div>
                    </div>
                    
                    <!-- Detalji i povraćaji -->
                    <div id="detalji-${
                      pozajmica.id
                    }" class="mt-3" style="display: none;">
                        <hr>
                        <h6><i class="fas fa-history me-2"></i>Istorija povraćaja</h6>
                        <div id="povracaji-${pozajmica.id}">
                            ${renderPovracajeList(povracaji)}
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  container.innerHTML = html;
}

async function loadPovracajeForPozajmica(pozajmicaId) {
  try {
    const response = await fetch(`/api/povracaji/pozajmica/${pozajmicaId}`);
    const data = await response.json();
    return data.success ? data.povracaji : [];
  } catch (error) {
    console.error("Greška pri učitavanju povraćaja:", error);
    return [];
  }
}

function renderPovracajeList(povracaji) {
  if (povracaji.length === 0) {
    return '<div class="alert alert-light">Nema zabeleženih povraćaja.</div>';
  }

  let html = "";
  povracaji.forEach((povracaj) => {
    html += `
            <div class="povracaj-row d-flex justify-content-between align-items-center">
                <div>
                    <strong>${
                      povracaj.iznos_povracaja
                    }€</strong> - ${formatDate(povracaj.datum_povracaja)}
                    ${
                      povracaj.napomena
                        ? `<br><small class="text-muted">${povracaj.napomena}</small>`
                        : ""
                    }
                </div>
                <div>
                    <button class="btn btn-danger btn-sm" onclick="obrisiPovracaj(${
                      povracaj.id
                    })">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
  });

  return html;
}

// ============================================
// MODAL I FORME
// ============================================

async function otvoriPovracajModal(pozajmicaId) {
  const pozajmica = pozajmice.find((p) => p.id == pozajmicaId);

  if (!pozajmica) {
    alert("Greška: pozajmica nije pronađena");
    return;
  }

  // Popuni modal
  document.getElementById("pozajmica_id_povracaj").value = pozajmicaId;
  document.getElementById("pozajmicaInfo").innerHTML = `
        <strong>Ugovor br. ${pozajmica.broj_ugovora}</strong><br>
        Iznos pozajmice: ${pozajmica.iznos}€<br>
        Vraćeno: ${pozajmica.ukupno_vraceno || 0}€<br>
        <strong>Preostalo: ${
          pozajmica.preostalo_dugovanje || pozajmica.iznos
        }€</strong>
    `;

  const maxPovracaj = pozajmica.preostalo_dugovanje || pozajmica.iznos;
  document.getElementById("maxPovracaj").textContent = `${maxPovracaj}€`;
  document.getElementById("iznos_povracaja").setAttribute("max", maxPovracaj);
  document.getElementById("iznos_povracaja").value = "";
  document.getElementById("napomena_povracaj").value = "";

  // Otvori modal
  const modal = new bootstrap.Modal(document.getElementById("povracajModal"));
  modal.show();
}

async function handlePovracajSubmit(e) {
  e.preventDefault();

  const formData = {
    pozajmica_id: document.getElementById("pozajmica_id_povracaj").value,
    iznos_povracaja: parseFloat(
      document.getElementById("iznos_povracaja").value
    ),
    datum_povracaja: document.getElementById("datum_povracaja").value,
    napomena: document.getElementById("napomena_povracaj").value,
  };

  try {
    const response = await fetch("/api/povracaji", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (result.success) {
      // Zatvori modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("povracajModal")
      );
      modal.hide();

      // Refresh podatke
      await loadPozajmice();
      await loadStatistike();

      showNotification("Povraćaj je uspešno zabeležen!", "success");
    } else {
      showNotification(result.message, "error");
    }
  } catch (error) {
    console.error("Greška pri kreiranju povraćaja:", error);
    showNotification("Greška pri čuvanju povraćaja", "error");
  }
}

// ============================================
// UTILITY FUNKCIJE
// ============================================

function toggleDetalje(pozajmicaId) {
  const detalji = document.getElementById(`detalji-${pozajmicaId}`);
  detalji.style.display = detalji.style.display === "none" ? "block" : "none";
}

async function obrisiPovracaj(povracajId) {
  if (!confirm("Da li ste sigurni da želite da obrišete ovaj povraćaj?")) {
    return;
  }

  try {
    const response = await fetch(`/api/povracaji/${povracajId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (result.success) {
      await loadPozajmice();
      await loadStatistike();
      showNotification("Povraćaj je obrisan", "success");
    } else {
      showNotification(result.message, "error");
    }
  } catch (error) {
    console.error("Greška pri brisanju povraćaja:", error);
    showNotification("Greška pri brisanju povraćaja", "error");
  }
}

// ============================================
// POZAJMICA FUNKCIJE
// ============================================

async function loadRadniciForModal() {
  try {
    const response = await fetch(`/api/radnici/firma/${firmaId}`, {
      credentials: "include",
    });
    const data = await response.json();

    const select = document.getElementById("radnik_id");
    select.innerHTML = '<option value="">Izaberite radnika...</option>';

    if (response.ok && data && data.length > 0) {
      data.forEach((radnik) => {
        const option = document.createElement("option");
        option.value = radnik.id;
        option.textContent = `${radnik.ime} ${radnik.prezime}`;
        select.appendChild(option);
      });
    } else {
      select.innerHTML = '<option value="">Nema radnika u ovoj firmi</option>';
      console.warn("Nema radnika ili greška:", data);
    }
  } catch (error) {
    console.error("Greška pri učitavanju radnika:", error);
    showNotification("Greška pri učitavanju radnika", "error");
  }
}

async function handlePozajmicaSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const editPozajmicaId = formData.get("edit_pozajmica_id");
  const isEdit = editPozajmicaId && editPozajmicaId !== "";

  const data = {
    firma_id: firmaId,
    radnik_id: formData.get("radnik_id"),
    iznos: parseFloat(formData.get("iznos")),
    svrha: formData.get("svrha_pozajmice"),
    broj_ugovora: formData.get("broj_ugovora"),
    datum_izdavanja: formData.get("datum_pozajmice"),
    datum_dospeća: formData.get("datum_dospijetja") || null,
    napomene: formData.get("napomena") || null,
  };

  console.log("Podaci koji se šalju na server:", data);
  console.log("Is Edit:", isEdit, "ID:", editPozajmicaId);

  try {
    const url = isEdit ? `/api/pozajmice/${editPozajmicaId}` : "/api/pozajmice";
    const method = isEdit ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const result = await response.json();

    console.log("Response status:", response.status);
    console.log("Response result:", result);

    if (response.ok) {
      showNotification(
        isEdit
          ? "Pozajmica je uspešno ažurirana!"
          : "Pozajmica je uspešno dodana!",
        "success"
      );

      // Zatvori modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("pozajmicaModal")
      );
      modal.hide();

      // Resetuj form i ukloni edit ID
      e.target.reset();
      const editInput = document.getElementById("edit_pozajmica_id");
      if (editInput) {
        editInput.remove();
      }

      // Vrati originalni naslov modala
      document.querySelector("#pozajmicaModal .modal-title").innerHTML = `
        <i class="fas fa-plus-circle me-2"></i>Nova pozajmica
      `;

      // Ponovo učitaj podatke
      loadPozajmice();
      loadStatistike();
    } else {
      showNotification(
        result.message ||
          (isEdit
            ? "Greška pri ažuriranju pozajmice"
            : "Greška pri dodavanju pozajmice"),
        "error"
      );
    }
  } catch (error) {
    console.error("Greška:", error);
    showNotification("Greška pri komunikaciji sa serverom", "error");
  }
}

async function dodajPozajmnicu() {
  try {
    // Resetuj form za dodavanje nove pozajmice
    document.getElementById("pozajmicaForm").reset();

    // Ukloni edit ID ako postoji
    const editInput = document.getElementById("edit_pozajmica_id");
    if (editInput) {
      editInput.remove();
    }

    // Vrati originalni naslov modala
    document.querySelector("#pozajmicaModal .modal-title").innerHTML = `
      <i class="fas fa-plus-circle me-2"></i>Nova pozajmica
    `;

    // Učitaj radnike prije otvaranja modala
    loadRadniciForModal();

    // Postavi današnji datum kao default
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("datum_pozajmice").value = today;

    // Generiši sledeći broj ugovora preko API-ja
    const nextBrojResponse = await fetch("/api/pozajmice/next-broj", {
      credentials: "include",
    });
    if (nextBrojResponse.ok) {
      const data = await nextBrojResponse.json();
      document.getElementById("broj_ugovora").value = data.nextBrojUgovora;
    }

    // Otvori modal
    const modal = new bootstrap.Modal(
      document.getElementById("pozajmicaModal")
    );
    modal.show();
  } catch (error) {
    console.error("Greška pri otvaranju modala:", error);
    showNotification("Greška pri otvaranju modala", "error");
  }
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("sr-RS");
}

function getStatusText(status) {
  const statusMap = {
    aktivna: "Aktivna",
    delimicno_vracena: "Delimi¸cno vraćena",
    potpuno_vracena: "Potpuno vraćena",
  };
  return statusMap[status] || status;
}

function getStatusBadgeClass(status) {
  const classMap = {
    aktivna: "bg-danger",
    delimicno_vracena: "bg-warning",
    potpuno_vracena: "bg-success",
  };
  return classMap[status] || "bg-secondary";
}

function showNotification(message, type = "info") {
  // Kreiri notification element
  const notification = document.createElement("div");
  notification.className = `alert alert-${
    type === "error" ? "danger" : type
  } alert-dismissible fade show position-fixed`;
  notification.style.cssText =
    "top: 20px; right: 20px; z-index: 9999; min-width: 300px;";
  notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

  document.body.appendChild(notification);

  // Auto dismiss after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// ============================================
// NOVE FUNKCIJE - UGOVOR, EDIT, DELETE
// ============================================

function pregledajUgovor(pozajmicaId) {
  console.log("=== PREGLED UGOVORA ===");
  console.log("pozajmicaId:", pozajmicaId);
  console.log("firmaId:", firmaId);

  if (!pozajmicaId) {
    alert("Greška: pozajmicaId je undefined ili null");
    return;
  }

  const url = `/ugovor-o-zajmu-novca.html?pozajmnicaId=${pozajmicaId}&firmaId=${firmaId}`;
  console.log("Opening URL:", url);
  window.open(url, "_blank");
}

async function editujPozajmicu(pozajmicaId) {
  try {
    const pozajmica = pozajmice.find((p) => p.id == pozajmicaId);
    if (!pozajmica) {
      showNotification("Greška: pozajmica nije pronađena", "error");
      return;
    }

    // Učitaj radnike prije otvaranja modala
    await loadRadniciForModal();

    // Popuni form sa postojećim podacima
    document.getElementById("broj_ugovora").value = pozajmica.broj_ugovora;
    document.getElementById("datum_pozajmice").value =
      pozajmica.datum_izdavanja?.split("T")[0] || "";
    document.getElementById("radnik_id").value = pozajmica.radnik_id || "";
    document.getElementById("iznos").value = pozajmica.iznos || "";
    document.getElementById("svrha_pozajmice").value = pozajmica.svrha || "";
    document.getElementById("datum_dospijetja").value =
      pozajmica.datum_dospeća?.split("T")[0] || "";
    document.getElementById("napomena").value = pozajmica.napomene || "";

    // Promeni naslov modala
    document.querySelector("#pozajmicaModal .modal-title").innerHTML = `
      <i class="fas fa-edit me-2"></i>Izmeni pozajmicu
    `;

    // Dodaj hidden input za ID pozajmice
    let hiddenIdInput = document.getElementById("edit_pozajmica_id");
    if (!hiddenIdInput) {
      hiddenIdInput = document.createElement("input");
      hiddenIdInput.type = "hidden";
      hiddenIdInput.id = "edit_pozajmica_id";
      hiddenIdInput.name = "edit_pozajmica_id";
      document.getElementById("pozajmicaForm").appendChild(hiddenIdInput);
    }
    hiddenIdInput.value = pozajmicaId;

    // Otvori modal
    const modal = new bootstrap.Modal(
      document.getElementById("pozajmicaModal")
    );
    modal.show();
  } catch (error) {
    console.error("Greška pri editovanju pozajmice:", error);
    showNotification("Greška pri editovanju pozajmice", "error");
  }
}

async function obrisiPozajmicu(pozajmicaId) {
  const pozajmica = pozajmice.find((p) => p.id == pozajmicaId);
  if (!pozajmica) {
    showNotification("Greška: pozajmica nije pronađena", "error");
    return;
  }

  // Proverim da li ima povraćaje
  try {
    const povracajiResponse = await fetch(
      `/api/povracaji/pozajmica/${pozajmicaId}`
    );
    const povracajiData = await povracajiResponse.json();

    if (povracajiData.success && povracajiData.povracaji.length > 0) {
      const confirmMsg = `Pozajmica "${pozajmica.broj_ugovora}" ima ${povracajiData.povracaji.length} zabeleženih povraćaja.\n\nBrisanje pozajmice će obrisati i sve povezane povraćaje.\n\nDa li ste sigurni da želite da je obrišete?`;
      if (!confirm(confirmMsg)) {
        return;
      }
    } else {
      const confirmMsg = `Da li ste sigurni da želite da obrišete pozajmicu "${pozajmica.broj_ugovora}"?\n\nOva akcija se ne može opozoriti.`;
      if (!confirm(confirmMsg)) {
        return;
      }
    }

    // Obrisi pozajmicu
    const response = await fetch(`/api/pozajmice/${pozajmicaId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Pozajmica je uspešno obrisana", "success");
      // Osvezi prikaz
      loadPozajmice();
      loadStatistike();
    } else {
      showNotification(
        data.message || "Greška pri brisanju pozajmice",
        "error"
      );
    }
  } catch (error) {
    console.error("Greška pri brisanju pozajmice:", error);
    showNotification("Greška pri komunikaciji sa serverom", "error");
  }
}
