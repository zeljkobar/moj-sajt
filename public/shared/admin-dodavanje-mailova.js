// 📧 Admin Email Management JavaScript
let uploadedFiles = [];
let currentOperation = null;
let statsData = {};

// 🚀 Initialize when page loads
document.addEventListener('DOMContentLoaded', function () {
  initializePage();
  setupEventListeners();
  loadStats();
});

// 📊 Initialize page components
function initializePage() {
  console.log('📧 Email Admin Panel initialized');
  showAlert('Sistem spreman za rad', 'info');
}

// 🔧 Setup event listeners
function setupEventListeners() {
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');

  // Drag & Drop functionality
  uploadZone.addEventListener('dragover', handleDragOver);
  uploadZone.addEventListener('dragleave', handleDragLeave);
  uploadZone.addEventListener('drop', handleDrop);

  // File input change
  fileInput.addEventListener('change', handleFileSelect);
}

// 📁 File Upload Handlers
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files);
  processFiles(files);
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  processFiles(files);
}

// 📋 Process uploaded files
function processFiles(files) {
  const validFiles = files.filter(file => {
    const validTypes = ['.xlsx', '.csv'];
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    return validTypes.includes(extension);
  });

  if (validFiles.length === 0) {
    showAlert('Molim uploaduj samo .xlsx ili .csv fajlove', 'error');
    return;
  }

  validFiles.forEach(file => {
    const fileData = {
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
    };
    uploadedFiles.push(fileData);
  });

  displayUploadedFiles();
  showAlert(`Uploadovano ${validFiles.length} fajl(ova)`, 'success');
}

// 📋 Display uploaded files
function displayUploadedFiles() {
  const fileList = document.getElementById('fileList');
  const uploadedFilesDiv = document.getElementById('uploadedFiles');

  if (uploadedFiles.length === 0) {
    fileList.style.display = 'none';
    return;
  }

  fileList.style.display = 'block';
  uploadedFilesDiv.innerHTML = '';

  uploadedFiles.forEach(fileData => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';

    const isExcel = fileData.name.toLowerCase().includes('.xlsx');
    const icon = isExcel ? '📊' : '📄';

    fileItem.innerHTML = `
            <div class="file-info">
                <span class="file-icon">${icon}</span>
                <div>
                    <div><strong>${fileData.name}</strong></div>
                    <div style="font-size: 0.9em; color: #6c757d;">
                        ${(fileData.size / 1024).toFixed(1)} KB
                    </div>
                </div>
            </div>
            <button class="delete-file" onclick="removeFile('${fileData.id}')">
                🗑️ Ukloni
            </button>
        `;

    uploadedFilesDiv.appendChild(fileItem);
  });
}

// 🗑️ Remove uploaded file
function removeFile(fileId) {
  uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
  displayUploadedFiles();
  showAlert('Fajl uklonjen', 'info');
}

// 📊 Load statistics from server
async function loadStats() {
  try {
    showProgress('Učitavanje statistika...', 0);

    const response = await fetch('/api/email-admin/stats');
    const data = await response.json();

    if (data.success) {
      statsData = data.stats;
      updateStatsDisplay();
      hideProgress();
      addLogEntry('✅ Statistike učitane', 'success');
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    hideProgress();
    addLogEntry(
      `❌ Greška pri učitavanju statistika: ${error.message}`,
      'error'
    );
    showAlert('Greška pri učitavanju statistika', 'error');

    // Fallback static data
    statsData = {
      totalCompanies: 2685,
      emailCoverage: '89.8%',
      validEmails: 2411,
      lastUpdate: 'Oktober 2025',
    };
    updateStatsDisplay();
  }
}

// 📊 Update statistics display
function updateStatsDisplay() {
  document.getElementById('totalCompanies').textContent =
    statsData.totalCompanies || '-';
  document.getElementById('emailCoverage').textContent =
    statsData.emailCoverage || '-';
  document.getElementById('validEmails').textContent =
    statsData.validEmails || '-';
  document.getElementById('lastUpdate').textContent =
    statsData.lastUpdate || '-';
}

// 🔍 Workflow Step 1: Check New PIBs
async function checkNewPibs() {
  const excelFiles = uploadedFiles.filter(f =>
    f.name.toLowerCase().includes('.xlsx')
  );

  if (excelFiles.length === 0) {
    showAlert('Potreban je Excel fajl sa PIB-ovima', 'warning');
    return;
  }

  try {
    setStepProcessing('step1');
    showProgress('Proverava nove PIB-ove...', 10);
    addLogEntry('🔍 Pokretanje provere novih PIB-ova...', 'info');

    const formData = new FormData();
    formData.append('excelFile', excelFiles[0].file);

    const response = await fetch('/api/email-admin/check-new-pibs', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      setStepActive('step1');
      // enableStep('btn2'); // Dugme je sada uvek aktivno
      updateProgress(100);
      addLogEntry(
        `✅ Provera završena: ${result.stats.newPibs} novih od ${result.stats.totalPibs}`,
        'success'
      );

      // Show download link if there's a clean file
      if (result.downloadUrl && result.stats.newPibs > 0) {
        showDownloadLink(
          result.downloadUrl,
          `Preuzmi čist Excel (${result.stats.newPibs} novih PIB-ova)`
        );
        showAlert(
          `Pronađeno ${result.stats.newPibs} novih PIB-ova - čist fajl kreiran!`,
          'success'
        );
      } else if (result.stats.newPibs === 0) {
        showAlert('Svi PIB-ovi već postoje u bazi', 'info');
      } else {
        showAlert(`Pronađeno ${result.stats.newPibs} novih PIB-ova`, 'success');
      }

      setTimeout(() => {
        hideProgress();
      }, 1000);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    setStepError('step1');
    hideProgress();
    addLogEntry(`❌ Greška pri proveri PIB-ova: ${error.message}`, 'error');
    showAlert('Greška pri proveri PIB-ova', 'error');
  }
}

// 🔗 Workflow Step 2: Join Files
async function joinFiles() {
  const excelFiles = uploadedFiles.filter(f =>
    f.name.toLowerCase().includes('.xlsx')
  );
  const csvFiles = uploadedFiles.filter(f =>
    f.name.toLowerCase().includes('.csv')
  );

  if (excelFiles.length === 0 || csvFiles.length === 0) {
    showAlert('Potrebni su i Excel i CSV fajl', 'warning');
    return;
  }

  try {
    setStepProcessing('step2');
    showProgress('Spaja fajlove...', 20);
    addLogEntry('🔗 Pokretanje spajanja fajlova...', 'info');

    const formData = new FormData();
    formData.append('excelFile', excelFiles[0].file);
    formData.append('csvFile', csvFiles[0].file);

    const response = await fetch('/api/email-admin/join-files', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      setStepActive('step2');
      // enableStep('btn3'); // Dugme je sada uvek aktivno
      updateProgress(100);
      addLogEntry(
        `✅ Spajanje završeno: ${
          result.stats ? result.stats.joinedRecords || 'N/A' : 'N/A'
        } spojenih zapisa`,
        'success'
      );

      // Show download link for joined file
      if (result.downloadUrl) {
        showDownloadLink(result.downloadUrl, 'Preuzmi spojene podatke (CSV)');
        showAlert(`Fajlovi uspešno spojeni - CSV kreiran!`, 'success');
      } else {
        showAlert(`Fajlovi spojeni`, 'success');
      }

      setTimeout(() => {
        hideProgress();
      }, 1000);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    setStepError('step2');
    hideProgress();
    addLogEntry(`❌ Greška pri spajanju: ${error.message}`, 'error');
    showAlert('Greška pri spajanju fajlova', 'error');
  }
}

// 🧹 Workflow Step 3: Remove Duplicates
async function removeDuplicates() {
  try {
    setStepProcessing('step3');
    showProgress('Uklanja duplikate...', 30);
    addLogEntry('🧹 Pokretanje uklanjanja duplikata...', 'info');

    const response = await fetch('/api/email-admin/remove-duplicates', {
      method: 'POST',
    });

    const result = await response.json();

    if (result.success) {
      setStepActive('step3');
      // enableStep('btn4'); // Dugme je sada uvek aktivno
      updateProgress(100);
      addLogEntry(
        `✅ Duplikati uklonjeni: ${
          result.stats ? result.stats.duplicatesRemoved || '0' : '0'
        } duplikata`,
        'success'
      );

      // Show download link for clean file
      if (result.downloadUrl) {
        showDownloadLink(
          result.downloadUrl,
          'Preuzmi čiste podatke (bez duplikata)'
        );
        showAlert(`Duplikati uklonjeni - čist CSV kreiran!`, 'success');
      } else {
        showAlert(`Duplikati obrađeni`, 'success');
      }

      setTimeout(() => {
        hideProgress();
      }, 1000);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    setStepError('step3');
    hideProgress();
    addLogEntry(
      `❌ Greška pri uklanjanju duplikata: ${error.message}`,
      'error'
    );
    showAlert('Greška pri uklanjanju duplikata', 'error');
  }
}

// 💾 Workflow Step 4: Insert Companies
async function insertCompanies() {
  // Proveri da li ima fajlova za insert
  console.log('🔍 DEBUG insertCompanies - uploadedFiles:', uploadedFiles);

  const suitableFiles = uploadedFiles.filter(
    f =>
      f.name.toLowerCase().includes('.csv') ||
      f.name.toLowerCase().includes('.xlsx')
  );

  console.log('🔍 DEBUG insertCompanies - suitableFiles:', suitableFiles);

  if (suitableFiles.length === 0) {
    showAlert(
      'Potreban je CSV ili Excel fajl za dodavanje u bazu. Uploaduj fajl najpre!',
      'warning'
    );
    addLogEntry(
      '❌ Nema fajlova za insert - uploaduj CSV ili Excel fajl',
      'error'
    );
    return;
  }

  try {
    setStepProcessing('step4');
    showProgress('Dodaje firme u bazu...', 50);
    addLogEntry('💾 Pokretanje dodavanja u bazu...', 'info');

    // Ako ima više fajlova, uzmi prvi koji može da se koristi
    const fileToUse = suitableFiles[0];
    addLogEntry(`📁 Koristim fajl: ${fileToUse.name}`, 'info');

    const formData = new FormData();
    formData.append('dataFile', fileToUse.file);

    const response = await fetch('/api/email-admin/insert-companies', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      setStepActive('step4');
      updateProgress(100);
      addLogEntry(
        `✅ Dodavanje završeno: ${result.stats.inserted} novih firmi`,
        'success'
      );
      showAlert(`Dodano ${result.stats.inserted} novih firmi`, 'success');

      // Refresh stats after successful insert
      await loadStats();
      updateRecentActivity('Dodano novih firmi', result.stats.inserted);

      setTimeout(() => {
        hideProgress();
        resetWorkflow();
      }, 2000);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    setStepError('step4');
    hideProgress();
    addLogEntry(`❌ Greška pri dodavanju u bazu: ${error.message}`, 'error');
    showAlert('Greška pri dodavanju u bazu', 'error');
  }
}

// 🔄 Update existing emails
async function updateEmails() {
  const csvFiles = uploadedFiles.filter(f =>
    f.name.toLowerCase().includes('.csv')
  );

  if (csvFiles.length === 0) {
    showAlert('Potreban je CSV fajl za ažuriranje', 'warning');
    return;
  }

  try {
    setStepProcessing('stepUpdate1');
    showProgress('Ažurira email-ove...', 25);
    addLogEntry('📝 Pokretanje ažuriranja email-ova...', 'info');

    const formData = new FormData();
    formData.append('csvFile', csvFiles[0].file);

    const response = await fetch('/api/email-admin/update-emails', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      setStepActive('stepUpdate1');
      enableStep('btnUpdate2');
      updateProgress(100);
      addLogEntry(
        `✅ Ažuriranje završeno: ${result.stats.updated} ažurirano, ${result.stats.new} novo`,
        'success'
      );
      showAlert(`Ažurirano ${result.stats.updated} zapisa`, 'success');

      await loadStats();
      updateRecentActivity('Ažurirani email-ovi', result.stats.updated);

      setTimeout(() => {
        hideProgress();
      }, 1500);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    setStepError('stepUpdate1');
    hideProgress();
    addLogEntry(`❌ Greška pri ažuriranju: ${error.message}`, 'error');
    showAlert('Greška pri ažuriranju email-ova', 'error');
  }
}

// 📊 Refresh statistics
async function refreshStats() {
  await loadStats();
  showAlert('Statistike osvežene', 'success');
  updateRecentActivity('Osvežene statistike', new Date().toLocaleTimeString());
}

// 📥 Export data
async function exportData() {
  try {
    showProgress('Priprema export...', 0);
    addLogEntry('📥 Pokretanje export-a...', 'info');

    const response = await fetch('/api/email-admin/export-csv');

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email_baza_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      hideProgress();
      addLogEntry('✅ Export završen', 'success');
      showAlert('Podaci exportovani', 'success');
      updateRecentActivity('Exportovani podaci', 'CSV format');
    } else {
      throw new Error('Export neuspešan');
    }
  } catch (error) {
    hideProgress();
    addLogEntry(`❌ Greška pri export-u: ${error.message}`, 'error');
    showAlert('Greška pri export-u', 'error');
  }
}

// 🔍 View database (redirect to existing page)
function viewDatabase() {
  window.open('/shared/admin-database.html', '_blank');
}

// 🔄 Reset workflow to initial state
function resetWorkflow() {
  ['step1', 'step2', 'step3', 'step4'].forEach(stepId => {
    const step = document.getElementById(stepId);
    step.className = 'workflow-step';
  });

  // Dugmad su sada uvek aktivna - korisnik sam bira kada da ih koristi
  // ['btn2', 'btn3', 'btn4'].forEach(btnId => {
  //   document.getElementById(btnId).disabled = true;
  // });

  // Clear uploaded files
  uploadedFiles = [];
  displayUploadedFiles();

  addLogEntry('🔄 Workflow resetovan', 'info');
}

// 🎨 Step management functions
function setStepProcessing(stepId) {
  const step = document.getElementById(stepId);
  step.className = 'workflow-step processing';
}

function setStepActive(stepId) {
  const step = document.getElementById(stepId);
  step.className = 'workflow-step active';
}

function setStepError(stepId) {
  const step = document.getElementById(stepId);
  step.className = 'workflow-step';
  step.style.borderColor = '#dc3545';
  step.style.background = '#f8d7da';
}

function enableStep(btnId) {
  document.getElementById(btnId).disabled = false;
}

// 📊 Progress management
function showProgress(title, percentage = 0) {
  const container = document.getElementById('progressContainer');
  const titleEl = document.getElementById('progressTitle');
  const textEl = document.getElementById('progressText');

  container.style.display = 'block';
  titleEl.textContent = title;
  textEl.textContent = `${percentage}% završeno`;
  updateProgress(percentage);

  // Show logs as well
  document.getElementById('logContainer').style.display = 'block';
}

function updateProgress(percentage) {
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');

  fill.style.width = percentage + '%';
  text.textContent = `${percentage}% završeno`;
}

function hideProgress() {
  setTimeout(() => {
    document.getElementById('progressContainer').style.display = 'none';
  }, 1000);
}

// 📋 Log management
function addLogEntry(message, type = 'info') {
  const logEntries = document.getElementById('logEntries');
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;

  const timestamp = new Date().toLocaleTimeString();
  entry.innerHTML = `[${timestamp}] ${message}`;

  logEntries.appendChild(entry);
  logEntries.scrollTop = logEntries.scrollHeight;
}

function clearLogs() {
  document.getElementById('logEntries').innerHTML = '';
}

// 🚨 Alert system
function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alertContainer');
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; font-size: 1.2em; cursor: pointer;">×</button>
        </div>
    `;

  alertContainer.appendChild(alert);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (alert.parentElement) {
      alert.remove();
    }
  }, 5000);
}

// � Show download link for processed files
function showDownloadLink(downloadUrl, linkText) {
  // Remove existing download links
  const existingLinks = document.querySelectorAll('.download-link-container');
  existingLinks.forEach(link => link.remove());

  // Create download container
  const downloadContainer = document.createElement('div');
  downloadContainer.className = 'download-link-container';
  downloadContainer.style.cssText = `
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        margin: 15px 0;
        text-align: center;
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        animation: slideIn 0.5s ease-out;
    `;

  downloadContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
            <div style="font-size: 2em;">📥</div>
            <div>
                <div style="font-weight: bold; margin-bottom: 5px;">${linkText}</div>
                <a href="${downloadUrl}" 
                   style="color: white; text-decoration: underline; font-size: 0.9em;"
                   target="_blank">
                    Klikni ovde za preuzimanje
                </a>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: rgba(255,255,255,0.2); border: none; color: white; 
                           border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">×</button>
        </div>
    `;

  // Add CSS animation
  if (!document.querySelector('#downloadAnimation')) {
    const style = document.createElement('style');
    style.id = 'downloadAnimation';
    style.textContent = `
            @keyframes slideIn {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
    document.head.appendChild(style);
  }

  // Insert after progress container
  const progressContainer = document.getElementById('progressContainer');
  progressContainer.parentNode.insertBefore(
    downloadContainer,
    progressContainer.nextSibling
  );
}

// �📈 Update recent activity
function updateRecentActivity(action, details) {
  const recentActivity = document.getElementById('recentActivity');
  const activityItem = document.createElement('div');
  activityItem.className = 'activity-item';

  activityItem.innerHTML = `
        <div style="font-size: 1.5em;">📊</div>
        <div>
            <div>${action}: ${details}</div>
            <div class="activity-time">${new Date().toLocaleTimeString()}</div>
        </div>
    `;

  // Add to top
  const firstActivity = recentActivity.querySelector('.activity-item');
  if (firstActivity) {
    recentActivity.insertBefore(activityItem, firstActivity);
  } else {
    recentActivity.appendChild(activityItem);
  }

  // Keep only last 5 activities
  const activities = recentActivity.querySelectorAll('.activity-item');
  if (activities.length > 5) {
    activities[activities.length - 1].remove();
  }
}
