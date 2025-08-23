const { executeQuery } = require('../config/database');

// Kreiraj novog zajmodavca
exports.createZajmodavac = async (req, res) => {
  console.log('=== CREATE ZAJMODAVAC ===');
  console.log('Request body:', req.body);

  const { ime, prezime, jmbg, ziro_racun } = req.body;
  const { firmaId } = req.params;

  try {
    const result = await executeQuery(
      'INSERT INTO zajmodavci (firma_id, ime, prezime, jmbg, ziro_racun) VALUES (?, ?, ?, ?, ?)',
      [firmaId, ime, prezime, jmbg || null, ziro_racun || null]
    );

    console.log('Zajmodavac created with ID:', result.insertId);

    res.status(201).json({
      success: true,
      message: 'Zajmodavac je uspešno kreiran',
      data: {
        id: result.insertId,
        firma_id: firmaId,
        ime,
        prezime,
        jmbg: jmbg || null,
        ziro_racun: ziro_racun || null,
      },
    });
  } catch (error) {
    console.error('Error creating zajmodavac:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri kreiranju zajmodavca',
      error: error.message,
    });
  }
};

// Dohvati sve zajmodavce za firmu
exports.getZajmodavciByFirma = async (req, res) => {
  console.log('=== GET ZAJMODAVCI BY FIRMA ===');

  const { firmaId } = req.params;
  console.log('Firma ID:', firmaId);

  try {
    const zajmodavci = await executeQuery(
      'SELECT * FROM zajmodavci WHERE firma_id = ? ORDER BY ime, prezime',
      [firmaId]
    );

    console.log('Found zajmodavci:', zajmodavci.length);

    res.json({
      success: true,
      data: zajmodavci,
    });
  } catch (error) {
    console.error('Error fetching zajmodavci:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvatanju zajmodavaca',
      error: error.message,
    });
  }
};

// Ažuriraj zajmodavca
exports.updateZajmodavac = async (req, res) => {
  console.log('=== UPDATE ZAJMODAVAC ===');
  console.log('Request body:', req.body);

  const { id } = req.params;
  const { ime, prezime, jmbg, ziro_racun } = req.body;

  try {
    const result = await executeQuery(
      'UPDATE zajmodavci SET ime = ?, prezime = ?, jmbg = ?, ziro_racun = ? WHERE id = ?',
      [ime, prezime, jmbg || null, ziro_racun || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Zajmodavac nije pronađen',
      });
    }

    console.log('Zajmodavac updated, ID:', id);

    res.json({
      success: true,
      message: 'Zajmodavac je uspešno ažuriran',
      data: {
        id,
        ime,
        prezime,
        jmbg: jmbg || null,
        ziro_racun: ziro_racun || null,
      },
    });
  } catch (error) {
    console.error('Error updating zajmodavac:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri ažuriranju zajmodavca',
      error: error.message,
    });
  }
};

// Obriši zajmodavca
exports.deleteZajmodavac = async (req, res) => {
  console.log('=== DELETE ZAJMODAVAC ===');

  const { id } = req.params;
  console.log('Zajmodavac ID:', id);

  try {
    // Proveri da li postoje pozajmice za ovog zajmodavca
    const pozajmiceCount = await executeQuery(
      'SELECT COUNT(*) as count FROM pozajmnice WHERE zajmodavac_id = ?',
      [id]
    );

    if (pozajmiceCount[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `Ne možete obrisati zajmodavca jer ima ${pozajmiceCount[0].count} aktivnih pozajmica`,
      });
    }

    const result = await executeQuery('DELETE FROM zajmodavci WHERE id = ?', [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Zajmodavac nije pronađen',
      });
    }

    console.log('Zajmodavac deleted, ID:', id);

    res.json({
      success: true,
      message: 'Zajmodavac je uspešno obrisan',
    });
  } catch (error) {
    console.error('Error deleting zajmodavac:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri brisanju zajmodavca',
      error: error.message,
    });
  }
};
