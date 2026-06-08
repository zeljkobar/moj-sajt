const { executeQuery } = require('../config/database');
const emailService = require('../services/emailService');

// Generisi slug iz naziva (bez PIB-a), sa proverom duplikata
function baseSlug(naziv) {
  return naziv
    .toLowerCase()
    .replace(/š/g, 's').replace(/č/g, 'c').replace(/ć/g, 'c')
    .replace(/ž/g, 'z').replace(/đ/g, 'dj').replace(/Š/g, 's')
    .replace(/Č/g, 'c').replace(/Ć/g, 'c').replace(/Ž/g, 'z').replace(/Đ/g, 'dj')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generateUniqueSlug(naziv, excludeFirmaId = null) {
  const base = baseSlug(naziv);
  let candidate = base;
  let counter = 2;
  while (true) {
    const whereExclude = excludeFirmaId ? ' AND firma_id != ?' : '';
    const params = excludeFirmaId ? [candidate, excludeFirmaId] : [candidate];
    const existing = await executeQuery(
      `SELECT id FROM poslovni_imenik WHERE slug = ?${whereExclude}`,
      params
    );
    if (existing.length === 0) return candidate;
    candidate = `${base}-${counter}`;
    counter++;
  }
}

const poslovniImenikController = {

  // GET /api/imenik - javna lista svih odobrenih unosa (bez login-a)
  getPublicList: async (req, res) => {
    try {
      const { grad, djelatnost, search, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let whereClause = "WHERE pi.status = 'approved'";
      const params = [];

      if (grad) {
        whereClause += ' AND pi.grad = ?';
        params.push(grad);
      }
      if (djelatnost) {
        whereClause += ' AND pi.sifra_djelatnosti = ?';
        params.push(djelatnost);
      }
      if (search) {
        whereClause += ' AND (pi.naziv LIKE ? OR pi.opis LIKE ? OR pi.naziv_djelatnosti LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const [rezultati, ukupno] = await Promise.all([
        executeQuery(
          `SELECT pi.id, pi.naziv, pi.grad, pi.adresa, pi.telefon, pi.email,
                  pi.opis, pi.naziv_djelatnosti, pi.sifra_djelatnosti,
                  pi.radno_vrijeme, pi.web_sajt, pi.instagram, pi.facebook,
                  pi.linkedin, pi.whatsapp, pi.google_maps, pi.digitalni_meni, pi.logo_url, pi.slug
           FROM poslovni_imenik pi
           ${whereClause}
           ORDER BY pi.approved_at DESC
           LIMIT ? OFFSET ?`,
          [...params, parseInt(limit), offset]
        ),
        executeQuery(
          `SELECT COUNT(*) as total FROM poslovni_imenik pi ${whereClause}`,
          params
        )
      ]);

      res.json({
        rezultati,
        ukupno: ukupno[0].total,
        stranica: parseInt(page),
        ukupnoStranica: Math.ceil(ukupno[0].total / parseInt(limit))
      });
    } catch (error) {
      console.error('Greška pri dohvatanju poslovnog imenika:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju podataka' });
    }
  },

  // GET /api/imenik/:slug - javni profil firme (bez login-a)
  getPublicProfile: async (req, res) => {
    try {
      const { slug } = req.params;

      const rezultat = await executeQuery(
        `SELECT pi.id, pi.naziv, pi.pib, pi.grad, pi.adresa, pi.telefon, pi.email,
                pi.opis, pi.naziv_djelatnosti, pi.sifra_djelatnosti,
                pi.radno_vrijeme, pi.web_sajt, pi.instagram, pi.facebook,
                pi.linkedin, pi.whatsapp, pi.google_maps, pi.digitalni_meni, pi.logo_url, pi.slug,
                pi.approved_at
         FROM poslovni_imenik pi
         WHERE pi.slug = ? AND pi.status = 'approved'`,
        [slug]
      );

      if (rezultat.length === 0) {
        return res.status(404).json({ error: 'Profil nije pronađen' });
      }

      res.json(rezultat[0]);
    } catch (error) {
      console.error('Greška pri dohvatanju profila:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju profila' });
    }
  },

  // GET /api/imenik/moj-unos - status unosa ulogovanog korisnika
  getMojUnos: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Nije autentifikovan' });
      }

      const username = req.session.user.username;

      const rezultat = await executeQuery(
        `SELECT pi.*, f.naziv as firma_naziv, f.pib as firma_pib,
                f.adresa as firma_adresa, f.grad as firma_grad,
                f.telefon as firma_telefon, f.email as firma_email
         FROM poslovni_imenik pi
         JOIN firme f ON pi.firma_id = f.id
         JOIN users u ON pi.user_id = u.id
         WHERE u.username = ?`,
        [username]
      );

      if (rezultat.length === 0) {
        // Vrati podatke firme za prepopulaciju forme
        const firma = await executeQuery(
          `SELECT f.id, f.naziv, f.pib, f.adresa, f.grad, f.telefon, f.email
           FROM firme f
           JOIN users u ON f.user_id = u.id
           WHERE u.username = ?
           LIMIT 1`,
          [username]
        );

        return res.json({
          unos: null,
          firma: firma[0] || null
        });
      }

      res.json({ unos: rezultat[0] });
    } catch (error) {
      console.error('Greška pri dohvatanju unosa:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju unosa' });
    }
  },

  // POST /api/imenik - podnesi zahtjev za upis
  submitUnos: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Nije autentifikovan' });
      }

      const username = req.session.user.username;
      const {
        opis, sifra_djelatnosti, naziv_djelatnosti, radno_vrijeme,
        web_sajt, instagram, facebook, linkedin, whatsapp, google_maps, digitalni_meni
      } = req.body;

      // Dohvati firmu korisnika
      const firme = await executeQuery(
        `SELECT f.id, f.naziv, f.pib, f.adresa, f.grad, f.telefon, f.email
         FROM firme f
         JOIN users u ON f.user_id = u.id
         WHERE u.username = ?
         LIMIT 1`,
        [username]
      );

      if (firme.length === 0) {
        return res.status(400).json({ error: 'Nemate unesenu firmu. Prvo unesite podatke o firmi.' });
      }

      const firma = firme[0];

      if (!firma.telefon || !firma.email) {
        return res.status(400).json({
          error: 'Firma mora imati unesen telefon i email. Ažurirajte podatke firme pa pokušajte ponovo.'
        });
      }

      // Provjeri da li već postoji unos
      const postojeci = await executeQuery(
        `SELECT id, status FROM poslovni_imenik WHERE firma_id = ?`,
        [firma.id]
      );

      if (postojeci.length > 0) {
        return res.status(400).json({
          error: 'Vaša firma je već upisana ili čeka odobrenje u poslovnom imeniku.',
          status: postojeci[0].status
        });
      }

      // Dohvati user_id
      const users = await executeQuery('SELECT id FROM users WHERE username = ?', [username]);
      const userId = users[0].id;

      // Generiši slug
      const slug = await generateUniqueSlug(firma.naziv);

      await executeQuery(
        `INSERT INTO poslovni_imenik 
         (firma_id, user_id, naziv, pib, adresa, grad, telefon, email,
          opis, sifra_djelatnosti, naziv_djelatnosti, radno_vrijeme,
          web_sajt, instagram, facebook, linkedin, whatsapp, google_maps, digitalni_meni, slug, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          firma.id, userId, firma.naziv, firma.pib, firma.adresa, firma.grad,
          firma.telefon, firma.email, opis || null, sifra_djelatnosti || null,
          naziv_djelatnosti || null, radno_vrijeme || null,
          web_sajt || null, instagram || null, facebook || null,
          linkedin || null, whatsapp || null, google_maps || null,
          digitalni_meni || null, slug
        ]
      );

      // Pošalji notifikaciju adminu
      const adminEmail = emailService.getSummasummarumEmail('admin');
      const appUrl = process.env.APP_URL || 'https://summasummarum.me';
      await emailService.transporter.sendMail({
        from: `"Moj Radnik" <${emailService.getMojRadnikEmail('support')}>`,
        to: adminEmail,
        subject: `📋 Novi zahtjev za poslovni imenik: ${firma.naziv}`,
        html: emailService.createEmailTemplate(
          'Novi zahtjev za poslovni imenik',
          `
          <p>Firma <strong>${firma.naziv}</strong> (PIB: ${firma.pib}) podnijela je zahtjev za upis u Poslovni imenik.</p>
          <p><strong>Grad:</strong> ${firma.grad || 'N/A'}</p>
          <p><strong>Telefon:</strong> ${firma.telefon}</p>
          <p><strong>Email:</strong> ${firma.email}</p>
          <p><strong>Djelatnost:</strong> ${naziv_djelatnosti || sifra_djelatnosti || 'Nije unijeto'}</p>
          <p>Prijavite se na admin panel da odobrite ili odbijete zahtjev.</p>
          <div style="margin-top: 20px;">
            <a href="${appUrl}/summasummarum/index.html#imenik" 
               style="background-color:#2c5aa0;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
              Idi na Admin Panel
            </a>
          </div>
          `
        )
      }).catch(err => console.error('Email admin notifikacija greška:', err));

      res.json({ success: true, message: 'Zahtjev je uspješno podnesen. Čeka se odobrenje admina.' });
    } catch (error) {
      console.error('Greška pri podnošenju zahtjeva:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Firma je već upisana u imenik.' });
      }
      res.status(500).json({ error: 'Greška pri podnošenju zahtjeva' });
    }
  },

  // PUT /api/imenik/moj-unos - ažuriraj vlastiti unos (samo ako je approved ili rejected)
  updateMojUnos: async (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Nije autentifikovan' });
      }

      const username = req.session.user.username;
      const {
        opis, sifra_djelatnosti, naziv_djelatnosti, radno_vrijeme,
        web_sajt, instagram, facebook, linkedin, whatsapp, google_maps, digitalni_meni
      } = req.body;

      const unosi = await executeQuery(
        `SELECT pi.id, pi.status FROM poslovni_imenik pi
         JOIN users u ON pi.user_id = u.id
         WHERE u.username = ?`,
        [username]
      );

      if (unosi.length === 0) {
        return res.status(404).json({ error: 'Unos nije pronađen' });
      }

      const unos = unosi[0];

      // Ako je pending, ne može da mijenja
      if (unos.status === 'pending') {
        return res.status(400).json({ error: 'Zahtjev je na čekanju. Ne možete ga mijenjati dok admin ne donese odluku.' });
      }

      // Ako je bio rejected, ponovo ide na pending
      const noviStatus = unos.status === 'rejected' ? 'pending' : 'approved';

      await executeQuery(
        `UPDATE poslovni_imenik SET
         opis = ?, sifra_djelatnosti = ?, naziv_djelatnosti = ?,
         radno_vrijeme = ?, web_sajt = ?, instagram = ?,
         facebook = ?, linkedin = ?, whatsapp = ?, google_maps = ?,
         digitalni_meni = ?, status = ?, admin_komentar = NULL
         WHERE id = ?`,
        [
          opis || null, sifra_djelatnosti || null, naziv_djelatnosti || null,
          radno_vrijeme || null, web_sajt || null, instagram || null,
          facebook || null, linkedin || null, whatsapp || null,
          google_maps || null, digitalni_meni || null, noviStatus, unos.id
        ]
      );

      // Ako se ponovo šalje na odobrenje, obavijesti admina
      if (noviStatus === 'pending') {
        const adminEmail = emailService.getSummasummarumEmail('admin');
        const appUrl = process.env.APP_URL || 'https://summasummarum.me';
        const firma = await executeQuery(
          `SELECT pi.naziv, pi.pib FROM poslovni_imenik pi WHERE pi.id = ?`,
          [unos.id]
        );
        if (firma.length > 0) {
          await emailService.transporter.sendMail({
            from: `"Moj Radnik" <${emailService.getMojRadnikEmail('support')}>`,
            to: adminEmail,
            subject: `🔄 Ažuriran zahtjev za poslovni imenik: ${firma[0].naziv}`,
            html: emailService.createEmailTemplate(
              'Ažuriran zahtjev za poslovni imenik',
              `<p>Firma <strong>${firma[0].naziv}</strong> je ažurirala odbijeni unos i ponovo traži odobrenje.</p>
               <a href="${appUrl}/summasummarum/index.html#imenik" style="background-color:#2c5aa0;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Idi na Admin Panel</a>`
            )
          }).catch(err => console.error('Email greška:', err));
        }
      }

      res.json({ success: true, status: noviStatus });
    } catch (error) {
      console.error('Greška pri ažuriranju unosa:', error);
      res.status(500).json({ error: 'Greška pri ažuriranju unosa' });
    }
  },

  // =====================
  // ADMIN RUTE
  // =====================

  // GET /api/admin/imenik - lista svih unosa za admina
  adminGetAll: async (req, res) => {
    try {
      const { status = 'pending' } = req.query;

      const validStatuses = ['pending', 'approved', 'rejected', 'all'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Nevalidan status' });
      }

      let whereClause = '';
      const params = [];
      if (status !== 'all') {
        whereClause = 'WHERE pi.status = ?';
        params.push(status);
      }

      const rezultati = await executeQuery(
        `SELECT pi.id, pi.naziv, pi.pib, pi.grad, pi.telefon, pi.email,
                pi.opis, pi.naziv_djelatnosti, pi.sifra_djelatnosti,
                pi.radno_vrijeme, pi.web_sajt, pi.instagram, pi.facebook,
                pi.linkedin, pi.whatsapp, pi.google_maps, pi.logo_url,
                pi.slug, pi.status, pi.admin_komentar,
                pi.created_at, pi.approved_at,
                u.username, u.email as user_email
         FROM poslovni_imenik pi
         JOIN users u ON pi.user_id = u.id
         ${whereClause}
         ORDER BY pi.created_at DESC`,
        params
      );

      res.json(rezultati);
    } catch (error) {
      console.error('Greška pri dohvatanju admin liste:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju liste' });
    }
  },

  // PUT /api/admin/imenik/:id/approve - odobri unos
  adminApprove: async (req, res) => {
    try {
      const { id } = req.params;

      const unosi = await executeQuery(
        `SELECT pi.*, u.email as user_email, u.username
         FROM poslovni_imenik pi
         JOIN users u ON pi.user_id = u.id
         WHERE pi.id = ?`,
        [id]
      );

      if (unosi.length === 0) {
        return res.status(404).json({ error: 'Unos nije pronađen' });
      }

      const unos = unosi[0];

      await executeQuery(
        `UPDATE poslovni_imenik SET status = 'approved', approved_at = NOW(), admin_komentar = NULL WHERE id = ?`,
        [id]
      );

      // Obavijesti korisnika
      const appUrl = process.env.APP_URL || 'https://mojradnik.me';
      await emailService.transporter.sendMail({
        from: `"Moj Radnik" <${emailService.getMojRadnikEmail('support')}>`,
        to: unos.user_email,
        subject: `✅ Vaša firma je odobrena u Poslovnom imeniku!`,
        html: emailService.createEmailTemplate(
          'Dobro došli u Poslovni imenik!',
          `
          <p>Čestitamo! Vaša firma <strong>${unos.naziv}</strong> je odobrena i sada je vidljiva u Poslovnom imeniku.</p>
          <p>Vaš javni profil je dostupan na:</p>
          <div style="margin: 20px 0;">
            <a href="${appUrl}/imenik/${unos.slug}" 
               style="background-color:#28a745;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
              Pogledaj profil firme
            </a>
          </div>
          <p style="color:#666;font-size:14px;">Ovaj link možete koristiti za NFC kartice, web sajt ili dijeljenje na društvenim mrežama.</p>
          `
        )
      }).catch(err => console.error('Email korisnik odobrenje greška:', err));

      res.json({ success: true, slug: unos.slug });
    } catch (error) {
      console.error('Greška pri odobravanju:', error);
      res.status(500).json({ error: 'Greška pri odobravanju' });
    }
  },

  // PUT /api/admin/imenik/:id/reject - odbij unos
  adminReject: async (req, res) => {
    try {
      const { id } = req.params;
      const { komentar } = req.body;

      const unosi = await executeQuery(
        `SELECT pi.*, u.email as user_email FROM poslovni_imenik pi
         JOIN users u ON pi.user_id = u.id WHERE pi.id = ?`,
        [id]
      );

      if (unosi.length === 0) {
        return res.status(404).json({ error: 'Unos nije pronađen' });
      }

      const unos = unosi[0];

      await executeQuery(
        `UPDATE poslovni_imenik SET status = 'rejected', admin_komentar = ? WHERE id = ?`,
        [komentar || null, id]
      );

      // Obavijesti korisnika
      await emailService.transporter.sendMail({
        from: `"Moj Radnik" <${emailService.getMojRadnikEmail('support')}>`,
        to: unos.user_email,
        subject: `❌ Zahtjev za Poslovni imenik - potrebna ispravka`,
        html: emailService.createEmailTemplate(
          'Zahtjev za Poslovni imenik',
          `
          <p>Nažalost, zahtjev za upis firme <strong>${unos.naziv}</strong> u Poslovni imenik nije odobren.</p>
          ${komentar ? `<p><strong>Razlog:</strong> ${komentar}</p>` : ''}
          <p>Možete ispraviti podatke i ponovo podnijeti zahtjev kroz Vaš dashboard.</p>
          <div style="margin-top: 20px;">
            <a href="${process.env.APP_URL || 'https://mojradnik.me'}/mojradnik/dashboard.html" 
               style="background-color:#2c5aa0;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">
              Idi na Dashboard
            </a>
          </div>
          `
        )
      }).catch(err => console.error('Email odbijanje greška:', err));

      res.json({ success: true });
    } catch (error) {
      console.error('Greška pri odbijanju:', error);
      res.status(500).json({ error: 'Greška pri odbijanju' });
    }
  },

  // DELETE /api/admin/imenik/:id - obriši unos (admin)
  adminDelete: async (req, res) => {
    try {
      const { id } = req.params;

      const rezultat = await executeQuery(
        'DELETE FROM poslovni_imenik WHERE id = ?',
        [id]
      );

      if (rezultat.affectedRows === 0) {
        return res.status(404).json({ error: 'Unos nije pronađen' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Greška pri brisanju:', error);
      res.status(500).json({ error: 'Greška pri brisanju' });
    }
  }
};

module.exports = poslovniImenikController;
