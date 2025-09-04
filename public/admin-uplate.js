// Admin Uplate JavaScript

let currentPage = 1;
let totalPages = 1;
const itemsPerPage = 10;
let currentFilters = {};

// Učitaj statistike
async function loadStatistics() {
  try {
    console.log('🔍 Loading admin statistics...');
    const response = await fetch('/api/admin/payments/statistics', {
      credentials: 'include',
    });

    console.log('📊 Statistics response status:', response.status);

    if (response.status === 403) {
      console.log('❌ Access denied - redirecting to dashboard');
      window.location.href = '/dashboard.html';
      return;
    }

    const data = await response.json();
    console.log('📊 Statistics data:', data);

    if (data.success) {
      document.getElementById('totalPayments').textContent = `${
        data.statistics.totalAmount || 0
      }€`;
      document.getElementById('monthlyPayments').textContent = `${
        data.statistics.monthlyAmount || 0
      }€`;
      document.getElementById('paymentCount').textContent =
        data.statistics.totalCount || 0;
      document.getElementById('pendingPayments').textContent =
        data.statistics.pendingCount || 0;
      console.log('✅ Statistics updated successfully');
    } else {
      console.log('❌ Statistics API returned error:', data);
    }
  } catch (error) {
    console.error('❌ Greška pri učitavanju statistika:', error);
  }
}

// Učitaj uplate
async function loadPayments(page = 1) {
  try {
    console.log('📋 Loading payments for page:', page);
    const queryParams = new URLSearchParams({
      page: page,
      limit: itemsPerPage,
      ...currentFilters,
    });

    console.log('📋 Query params:', queryParams.toString());

    const response = await fetch(`/api/admin/payments?${queryParams}`, {
      credentials: 'include',
    });

    console.log('📋 Payments response status:', response.status);

    if (response.status === 403) {
      console.log('❌ Access denied - redirecting to dashboard');
      window.location.href = '/dashboard.html';
      return;
    }

    const data = await response.json();
    console.log('📋 Payments data:', data);

    if (data.success) {
      displayPayments(data.payments);
      updatePagination(data.pagination);
      document.getElementById(
        'totalRecords'
      ).textContent = `${data.pagination.total} rezultata`;
    } else {
      showError('Greška pri učitavanju uplata');
    }
  } catch (error) {
    console.error('Greška pri učitavanju uplata:', error);
    showError('Greška pri komunikaciji sa serverom');
  }
}

// Prikaži uplate u tabeli
function displayPayments(payments) {
  const tbody = document.getElementById('paymentsTableBody');

  if (!payments || payments.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center">
          <i class="fas fa-inbox fa-2x text-muted"></i>
          <p class="mt-2 text-muted">Nema uplata za prikaz</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = payments
    .map(
      payment => `
    <tr>
      <td>#${payment.id}</td>
      <td>
        <div>
          <strong>${payment.user_name || 'N/A'}</strong>
          <small class="d-block text-muted">ID: ${payment.user_id}</small>
        </div>
      </td>
      <td>${payment.user_email || 'N/A'}</td>
      <td>
        <span class="fw-bold text-success">${parseFloat(payment.amount).toFixed(
          2
        )}€</span>
      </td>
      <td>
        <span class="badge ${getStatusBadgeClass(payment.status)}">
          ${getStatusText(payment.status)}
        </span>
      </td>
      <td>
        <i class="fab fa-paypal text-primary"></i> ${
          payment.payment_method || 'PayPal'
        }
      </td>
      <td>
        <div>
          ${formatDate(payment.created_at)}
          <small class="d-block text-muted">${formatTime(
            payment.created_at
          )}</small>
        </div>
      </td>
      <td>
        <code class="small">${payment.paypal_payment_id || 'N/A'}</code>
      </td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="viewPaymentDetails(${
          payment.id
        })">
          <i class="fas fa-eye"></i> Detalji
        </button>
      </td>
    </tr>
  `
    )
    .join('');
}

// Pomoćne funkcije za status
function getStatusBadgeClass(status) {
  switch (status) {
    case 'completed':
      return 'bg-success';
    case 'pending':
      return 'bg-warning';
    case 'failed':
      return 'bg-danger';
    default:
      return 'bg-secondary';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'completed':
      return 'Završeno';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Neuspešno';
    default:
      return 'Nepoznato';
  }
}

// Formatiranje datuma
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('sr-RS');
}

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('sr-RS');
}

// Ažuriraj paginaciju
function updatePagination(pagination) {
  currentPage = pagination.page;
  totalPages = pagination.pages;

  const paginationElement = document.getElementById('pagination');

  if (totalPages <= 1) {
    paginationElement.innerHTML = '';
    return;
  }

  let paginationHTML = '';

  // Previous button
  paginationHTML += `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
      </a>
    </li>
  `;

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    ) {
      paginationHTML += `
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
        </li>
      `;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  // Next button
  paginationHTML += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
      </a>
    </li>
  `;

  paginationElement.innerHTML = paginationHTML;
}

// Promeni stranicu
function changePage(page) {
  if (page >= 1 && page <= totalPages && page !== currentPage) {
    loadPayments(page);
  }
}

// Primeni filtere
function applyFilters() {
  currentFilters = {};

  const status = document.getElementById('statusFilter').value;
  const dateFrom = document.getElementById('dateFromFilter').value;
  const dateTo = document.getElementById('dateToFilter').value;
  const userSearch = document.getElementById('userSearchFilter').value.trim();

  if (status) currentFilters.status = status;
  if (dateFrom) currentFilters.dateFrom = dateFrom;
  if (dateTo) currentFilters.dateTo = dateTo;
  if (userSearch) currentFilters.userSearch = userSearch;

  currentPage = 1;
  loadPayments(1);
  loadStatistics(); // Ažuriraj statistike sa filterima
}

// Resetuj filtere
function resetFilters() {
  document.getElementById('statusFilter').value = '';
  document.getElementById('dateFromFilter').value = '';
  document.getElementById('dateToFilter').value = '';
  document.getElementById('userSearchFilter').value = '';

  currentFilters = {};
  currentPage = 1;
  loadPayments(1);
  loadStatistics();
}

// Prikaži detalje uplate
async function viewPaymentDetails(paymentId) {
  try {
    const response = await fetch(`/api/admin/payments/${paymentId}`, {
      credentials: 'include',
    });

    const data = await response.json();

    if (data.success) {
      const payment = data.payment;

      document.getElementById('paymentDetailsContent').innerHTML = `
        <div class="row">
          <div class="col-md-6">
            <h6>Osnove informacije</h6>
            <table class="table table-sm">
              <tr><td><strong>ID uplate:</strong></td><td>#${
                payment.id
              }</td></tr>
              <tr><td><strong>Korisnik:</strong></td><td>${
                payment.user_name || 'N/A'
              } (ID: ${payment.user_id})</td></tr>
              <tr><td><strong>Email:</strong></td><td>${
                payment.user_email || 'N/A'
              }</td></tr>
              <tr><td><strong>Iznos:</strong></td><td><span class="fw-bold text-success">${parseFloat(
                payment.amount
              ).toFixed(2)}€</span></td></tr>
              <tr><td><strong>Status:</strong></td><td><span class="badge ${getStatusBadgeClass(
                payment.status
              )}">${getStatusText(payment.status)}</span></td></tr>
            </table>
          </div>
          <div class="col-md-6">
            <h6>PayPal informacije</h6>
            <table class="table table-sm">
              <tr><td><strong>PayPal ID:</strong></td><td><code>${
                payment.paypal_payment_id || 'N/A'
              }</code></td></tr>
              <tr><td><strong>Način plaćanja:</strong></td><td>${
                payment.payment_method || 'PayPal'
              }</td></tr>
              <tr><td><strong>Kreirana:</strong></td><td>${formatDate(
                payment.created_at
              )} ${formatTime(payment.created_at)}</td></tr>
              <tr><td><strong>Ažurirana:</strong></td><td>${formatDate(
                payment.updated_at
              )} ${formatTime(payment.updated_at)}</td></tr>
            </table>
          </div>
        </div>
        
        ${
          payment.description
            ? `
          <div class="row mt-3">
            <div class="col-12">
              <h6>Opis</h6>
              <p class="bg-light p-3 rounded">${payment.description}</p>
            </div>
          </div>
        `
            : ''
        }
      `;

      const modal = new bootstrap.Modal(
        document.getElementById('paymentDetailsModal')
      );
      modal.show();
    } else {
      showError('Greška pri učitavanju detalja uplate');
    }
  } catch (error) {
    console.error('Greška pri učitavanju detalja:', error);
    showError('Greška pri komunikaciji sa serverom');
  }
}

// Export u CSV
async function exportToCSV() {
  try {
    const queryParams = new URLSearchParams({
      format: 'csv',
      ...currentFilters,
    });

    const response = await fetch(`/api/admin/payments/export?${queryParams}`, {
      credentials: 'include',
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `uplate_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      showSuccess('CSV fajl je uspešno preuzet');
    } else {
      showError('Greška pri exportu CSV fajla');
    }
  } catch (error) {
    console.error('Greška pri exportu:', error);
    showError('Greška pri exportu CSV fajla');
  }
}

// Toast notifikacije
function showSuccess(message) {
  document.getElementById('successToastBody').textContent = message;
  const toast = new bootstrap.Toast(document.getElementById('successToast'));
  toast.show();
}

function showError(message) {
  document.getElementById('errorToastBody').textContent = message;
  const toast = new bootstrap.Toast(document.getElementById('errorToast'));
  toast.show();
}

// Event listeneri
document.addEventListener('DOMContentLoaded', function () {
  // Enter key na search polju
  document
    .getElementById('userSearchFilter')
    .addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        applyFilters();
      }
    });

  // Auto-apply filteri na datum promenu
  document
    .getElementById('dateFromFilter')
    .addEventListener('change', applyFilters);
  document
    .getElementById('dateToFilter')
    .addEventListener('change', applyFilters);
  document
    .getElementById('statusFilter')
    .addEventListener('change', applyFilters);
});
