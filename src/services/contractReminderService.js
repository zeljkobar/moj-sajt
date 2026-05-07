const { executeQuery } = require('../config/database');
const emailService = require('./emailService');

const DEFAULT_DAYS_BEFORE = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return EMAIL_REGEX.test(email) ? email : '';
}

async function ensureReminderTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS contract_expiry_reminders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      radnik_id INT NOT NULL,
      firma_id INT NOT NULL,
      contract_end_date DATE NOT NULL,
      reminder_days INT NOT NULL,
      recipient_email VARCHAR(255) NOT NULL,
      status ENUM('sent', 'failed') NOT NULL,
      message_id VARCHAR(255) NULL,
      error_text TEXT NULL,
      triggered_by_admin_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_contract_reminder (radnik_id, contract_end_date, reminder_days)
    )
  `);
}

async function findCandidates(daysBefore) {
  return executeQuery(
    `
      SELECT
        r.id AS radnik_id,
        r.ime AS radnik_ime,
        r.prezime AS radnik_prezime,
        DATE(r.datum_prestanka) AS contract_end_date,
        f.id AS firma_id,
        f.naziv AS firma_naziv,
        f.email AS firma_email,
        u.email AS user_email
      FROM radnici r
      JOIN firme f ON f.id = r.firma_id
      LEFT JOIN users u ON u.id = f.user_id
      LEFT JOIN otkazi o ON o.radnik_id = r.id
      LEFT JOIN contract_expiry_reminders cer
        ON cer.radnik_id = r.id
       AND cer.contract_end_date = DATE(r.datum_prestanka)
       AND cer.reminder_days = ?
       AND cer.status = 'sent'
      WHERE r.datum_prestanka IS NOT NULL
        AND o.id IS NULL
        AND DATEDIFF(DATE(r.datum_prestanka), CURDATE()) = ?
        AND cer.id IS NULL
      ORDER BY f.id ASC, r.id ASC
    `,
    [daysBefore, daysBefore]
  );
}

async function upsertReminderLog({
  radnikId,
  firmaId,
  contractEndDate,
  reminderDays,
  recipientEmail,
  status,
  messageId,
  errorText,
  triggeredByAdminId,
}) {
  await executeQuery(
    `
      INSERT INTO contract_expiry_reminders (
        radnik_id,
        firma_id,
        contract_end_date,
        reminder_days,
        recipient_email,
        status,
        message_id,
        error_text,
        triggered_by_admin_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        recipient_email = VALUES(recipient_email),
        status = VALUES(status),
        message_id = VALUES(message_id),
        error_text = VALUES(error_text),
        triggered_by_admin_id = VALUES(triggered_by_admin_id)
    `,
    [
      radnikId,
      firmaId,
      contractEndDate,
      reminderDays,
      recipientEmail,
      status,
      messageId || null,
      errorText || null,
      triggeredByAdminId || null,
    ]
  );
}

async function runContractExpiryReminderJob(options = {}) {
  const daysBefore = Number(options.daysBefore) > 0
    ? Number(options.daysBefore)
    : DEFAULT_DAYS_BEFORE;
  const triggeredByAdminId = Number(options.triggeredByAdminId) || null;
  const dryRun = Boolean(options.dryRun);

  const summary = {
    daysBefore,
    dryRun,
    candidates: 0,
    sent: 0,
    failed: 0,
    skippedNoEmail: 0,
  };

  await ensureReminderTable();

  const candidates = await findCandidates(daysBefore);
  summary.candidates = candidates.length;

  for (const row of candidates) {
    const recipientEmail = normalizeEmail(row.firma_email) || normalizeEmail(row.user_email);

    if (!recipientEmail) {
      summary.skippedNoEmail += 1;
      continue;
    }

    if (dryRun) {
      summary.sent += 1;
      continue;
    }

    const sendResult = await emailService.sendContractExpiryReminder({
      toEmail: recipientEmail,
      firmaNaziv: row.firma_naziv,
      radnikIme: row.radnik_ime,
      radnikPrezime: row.radnik_prezime,
      daysLeft: daysBefore,
      contractEndDate: row.contract_end_date,
    });

    if (sendResult.success) {
      summary.sent += 1;
      await upsertReminderLog({
        radnikId: row.radnik_id,
        firmaId: row.firma_id,
        contractEndDate: row.contract_end_date,
        reminderDays: daysBefore,
        recipientEmail,
        status: 'sent',
        messageId: sendResult.messageId,
        errorText: null,
        triggeredByAdminId,
      });
    } else {
      summary.failed += 1;
      await upsertReminderLog({
        radnikId: row.radnik_id,
        firmaId: row.firma_id,
        contractEndDate: row.contract_end_date,
        reminderDays: daysBefore,
        recipientEmail,
        status: 'failed',
        messageId: null,
        errorText: sendResult.error || 'Nepoznata greška pri slanju',
        triggeredByAdminId,
      });
    }
  }

  return summary;
}

module.exports = {
  runContractExpiryReminderJob,
};
