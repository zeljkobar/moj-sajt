const { pool } = require('../src/config/database');

async function addPaymentsTable() {
  try {
    console.log('🔄 Dodajem tabelu payments...');

    // Kreiraj tabelu payments
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'EUR',
        payment_method VARCHAR(50) DEFAULT 'bank_transfer',
        payment_reference VARCHAR(255),
        payment_date DATE NOT NULL,
        period_months INT DEFAULT 1,
        period_start_date DATE NOT NULL,
        period_end_date DATE NOT NULL,
        status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'confirmed',
        notes TEXT,
        admin_id INT,
        admin_username VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_payment_date (payment_date),
        INDEX idx_period_dates (period_start_date, period_end_date)
      )
    `);

    console.log('✅ Tabela payments je uspešno kreirana');

    // Proverim da li kolone već postoje u subscription_history
    const [paymentIdColumns] = await pool.execute(`
      SHOW COLUMNS FROM subscription_history LIKE 'payment_id'
    `);

    const [paymentAmountColumns] = await pool.execute(`
      SHOW COLUMNS FROM subscription_history LIKE 'payment_amount'
    `);

    const [paymentRefColumns] = await pool.execute(`
      SHOW COLUMNS FROM subscription_history LIKE 'payment_reference'
    `);

    const columnsToAdd = [];

    if (paymentIdColumns.length === 0) {
      columnsToAdd.push('ADD COLUMN payment_id INT NULL');
    }

    if (paymentAmountColumns.length === 0) {
      columnsToAdd.push('ADD COLUMN payment_amount DECIMAL(10,2) NULL');
    }

    if (paymentRefColumns.length === 0) {
      columnsToAdd.push('ADD COLUMN payment_reference VARCHAR(255) NULL');
    }

    if (columnsToAdd.length > 0) {
      console.log('🔄 Dodajem nedostajuće kolone u subscription_history...');

      await pool.execute(`
        ALTER TABLE subscription_history ${columnsToAdd.join(', ')}
      `);

      console.log('✅ Kolone dodane u subscription_history');
    } else {
      console.log('ℹ️  Sve kolone već postoje u subscription_history');
    }

    console.log('🎉 Sve je uspešno završeno!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Greška:', error.message);
    process.exit(1);
  }
}

addPaymentsTable();
