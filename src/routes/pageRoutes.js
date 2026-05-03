const express = require('express');
const fs = require('fs');
const path = require('path');
const { executeQuery } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/roleAuth');
const { subscriptionMiddleware } = require('../middleware/subscription');

const router = express.Router();
const ROOT_DIR = path.join(__dirname, '..', '..');

// Serve domain-specific index files - MORA BITI PRE static middleware-a
router.get('/', (req, res) => {
  try {
    // Root request handler
    const indexPath = path.join(
      ROOT_DIR,
      'public',
      req.domainType,
      'index.html'
    );

    // Checking for domain-specific index file

    // Check if domain-specific index exists, fallback to shared
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback to shared index
      const fallbackPath = path.join(
        ROOT_DIR,
        'public',
        'shared',
        'index.html'
      );
      // Using fallback index
      res.sendFile(fallbackPath);
    }
  } catch (error) {
    console.error('GET / route error:', error);
    res.status(500).send('Server error');
  }
});

// Serve domain-specific registracija files
router.get('/registracija.html', (req, res) => {
  try {
    // Registration page request
    const registracijaPath = path.join(
      ROOT_DIR,
      'public',
      req.domainType,
      'registracija.html'
    );

    console.log('Looking for registracija at:', registracijaPath);
    console.log('File exists:', fs.existsSync(registracijaPath));

    // Check if domain-specific registracija exists, fallback to shared
    if (fs.existsSync(registracijaPath)) {
      res.sendFile(registracijaPath);
    } else {
      // Fallback to shared registracija
      const fallbackPath = path.join(
        ROOT_DIR,
        'public',
        'shared',
        'registracija1.html' // renamed file
      );
      // Using fallback registracija
      if (fs.existsSync(fallbackPath)) {
        res.sendFile(fallbackPath);
      } else {
        res.status(404).send('Registracija page not found');
      }
    }
  } catch (error) {
    console.error('GET /registracija.html route error:', error);
    res.status(500).send('Server error');
  }
});

// Stari root route - zakomentarisan zbog multi-domain setup-a
// router.get('/', (req, res) => {
//   res.sendFile(ROOT_DIR + '/public/index.html');
// });

// Handle direct requests to /index.html by redirecting to root
router.get('/index.html', (req, res) => {
  // Redirecting index.html to root
  res.redirect('/');
});

// zasticene rute za static fajlove
router.get('/protected.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/protected.html');
});

// Zaštićena ruta za PDV prijavu - dostupno svim korisnicima osim admin panel
router.get(
  '/pdv_prijava/index.html',
  authMiddleware,
  requireRole([ROLES.FIRMA, ROLES.AGENCIJA, ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(ROOT_DIR + '/protected/pdv_prijava/index.html');
  }
);

// Zaštićene rute za sve PDV prijava resurse - dostupno svim korisnicima
router.get(
  '/pdv_prijava/:file',
  authMiddleware,
  requireRole([ROLES.FIRMA, ROLES.AGENCIJA, ROLES.ADMIN]),
  (req, res) => {
    const fileName = req.params.file;
    res.sendFile(ROOT_DIR + '/protected/pdv_prijava/' + fileName);
  }
);

// Zaštićena ruta za PDV0 (masovno preuzimanje) - dostupno svim korisnicima
router.get(
  '/pdv0.html',
  authMiddleware,
  requireRole([ROLES.FIRMA, ROLES.AGENCIJA, ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/pdv0.html');
  }
);

// Zaštićena ruta za dashboard
router.get(
  '/dashboard.html',
  authMiddleware,
  subscriptionMiddleware,
  (req, res) => {
    // Domain-specific dashboard routing
    if (req.domainType === 'mojradnik' && req.session.user.role === 'firma') {
      res.sendFile(ROOT_DIR + '/public/mojradnik/dashboard.html');
    } else if (
      req.domainType === 'prijaviradnika' &&
      req.session.user.role === 'firma'
    ) {
      res.sendFile(ROOT_DIR + '/public/mojradnik/dashboard.html'); // Shared dashboard for now
    } else {
      res.sendFile(ROOT_DIR + '/public/shared/dashboard.html');
    }
  }
);

// Zaštićena ruta za pregled firmi
router.get('/firme.html', authMiddleware, subscriptionMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/firme.html');
});

const protectedSharedPages = [
  'dashboard.html',
  'firme.html',
  'firma-detalji.html',
  'dodaj-firmu.html',
  'edit-firmu.html',
  'pdv-pregled.html',
  'mjesecne-obaveze.html',
  'zavrsni-racuni.html',
  'obracun-zaliha.html',
  'obracun-preduzetnika.html',
  'godisnji-odmori.html',
  'plan-godisnjeg-odmora.html',
  'istek-ugovora.html',
  'pozicije.html',
  'ugovor-o-radu.html',
  'ugovor-o-zajmu-novca.html',
  'odluka-raspored-radnog-vremena.html',
  'odluka-o-povracaju.html',
  'resenje-porodiljsko-odsustvo.html',
  'sedmicni-odmor.html',
  'jpr-korica.html',
  'jpr-dodatak-a.html',
  'jpr-dodatak-b.html',
  'jpr-dodatak-c.html',
  'mobing.html',
  'potvrda-zaposlenja.html',
  'aneks-zastita-na-radu.html',
  'aneks-promena-radnog-vremena.html',
  'aneks-promena-radnog-mesta.html',
  'resenje-godisnji-odmor.html',
  'ovlascenje-knjigovodja.html',
  'crps-zahtjev.html',
  'poreska-prijava.html',
];

protectedSharedPages.forEach(pageName => {
  router.get(`/shared/${pageName}`, authMiddleware, subscriptionMiddleware, (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'public', 'shared', pageName));
  });
});

// Zaštićena ruta za dodavanje firmi
router.get(
  '/dodaj-firmu.html',
  authMiddleware,
  subscriptionMiddleware,
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/dodaj-firmu.html');
  }
);

// Zaštićena ruta za editovanje firmi
router.get(
  '/edit-firmu.html',
  authMiddleware,
  subscriptionMiddleware,
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/edit-firmu.html');
  }
);

// Zaštićene rute za UGOVORI funkcionalnost
router.get(
  '/pozicije.html',
  authMiddleware,
  subscriptionMiddleware,
  requireRole([ROLES.FIRMA, ROLES.AGENCIJA, ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/pozicije.html');
  }
);

router.get(
  '/ugovor-o-radu.html',
  authMiddleware,
  subscriptionMiddleware,
  requireRole([ROLES.FIRMA, ROLES.AGENCIJA, ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/ugovor-o-radu.html');
  }
);

// Zaštićena ruta za editovanje profila
router.get('/edit-profil.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/edit-profil.html');
});

// Zaštićena ruta za pretplatu
router.get('/pretplata.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/pretplata.html');
});

// Zaštićena ruta za PDV pregled
router.get('/shared/pdv-pregled.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/pdv-pregled.html');
});

// Zaštićena ruta za mobing
router.get('/mobing.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/mobing.html');
});

// Zaštićena ruta za sedmični odmor
router.get('/sedmicni-odmor.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/sedmicni-odmor.html');
});

// Zaštićena ruta za JPR dodatak B
router.get('/jpr-dodatak-b.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/jpr-dodatak-b.html');
});

// Zaštićena ruta za JPR dodatak A
router.get('/jpr-dodatak-a.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/jpr-dodatak-a.html');
});

// Zaštićena ruta za JPR dodatak C
router.get('/jpr-dodatak-c.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/jpr-dodatak-c.html');
});

// Zaštićena ruta za JPR korica
router.get('/jpr-korica.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/jpr-korica.html');
});

// Zaštićena ruta za ugovor o zajmu novca
router.get('/ugovor-o-zajmu-novca.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/ugovor-o-zajmu-novca.html');
});

// Zaštićena ruta za odluku o rasporedu radnog vremena
router.get('/odluka-raspored-radnog-vremena.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/odluka-raspored-radnog-vremena.html');
});

// Ruta za pretplatu bez .html ekstenzije (za redirecte iz subscription middleware)
// Ruta za pretplatu koja automatski redirect-uje na osnovu korisničke role
router.get('/pretplata', authMiddleware, async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.redirect('/prijava.html');
    }

    // Pronađi korisnika u bazi
    const users = await executeQuery('SELECT role FROM users WHERE id = ?', [
      userId,
    ]);

    if (!users || users.length === 0) {
      return res.redirect('/prijava.html');
    }

    const userRole = users[0].role;

    // Redirect na odgovarajuću pretplata stranicu
    if (userRole === 'firma') {
      return res.redirect('/pretplata-firma');
    } else if (userRole === 'agencija') {
      return res.redirect('/pretplata-agencija');
    } else {
      // Default za admin ili nepoznate role
      return res.redirect('/pretplata-firma');
    }
  } catch (error) {
    console.error('Error determining subscription page:', error);
    // Fallback na firma stranicu
    return res.redirect('/pretplata-firma');
  }
});

// Rute za pretplatu specifične po tipovima korisnika
router.get('/pretplata-firma', (req, res) => {
  res.sendFile(ROOT_DIR + '/public/mojradnik/pretplata-firma.html');
});

router.get('/pretplata-agencija', (req, res) => {
  res.sendFile(ROOT_DIR + '/public/summasummarum/pretplata-agencija.html');
});

// Ruta za account-suspended (za redirecte iz subscription middleware)
// NAPOMENA: Bez authMiddleware da se izbegnu loopovi kada korisnik nema valjan session
router.get('/account-suspended', (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/account-suspended.html');
});

// Zaštićena ruta za firma-detalji (nova stranica sa tabovima)
router.get(
  '/firma-detalji.html',
  authMiddleware,
  subscriptionMiddleware,
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/firma-detalji.html');
  }
);

// Zaštićena ruta za obračun zaliha
router.get(
  '/obracun-zaliha.html',
  authMiddleware,
  subscriptionMiddleware,
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/obracun-zaliha.html');
  }
);

// Zaštićena ruta za godišnje odmori
router.get(
  '/godisnji-odmori.html',
  authMiddleware,
  subscriptionMiddleware,
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/godisnji-odmori.html');
  }
);

// Zaštićena ruta za plan godišnjeg odmora
router.get(
  '/plan-godisnjeg-odmora.html',
  authMiddleware,
  subscriptionMiddleware,
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/plan-godisnjeg-odmora.html');
  }
);

// Zaštićena ruta za otkaze
// Zaštićena ruta za istek ugovora
router.get(
  '/istek-ugovora.html',
  authMiddleware,
  subscriptionMiddleware,
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/istek-ugovora.html');
  }
);

// Zaštićene rute za različite dokumente
router.get('/aneks-promena-radnog-vremena.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/aneks-promena-radnog-vremena.html');
});

router.get('/aneks-zastita-na-radu.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/aneks-zastita-na-radu.html');
});

// Zaštićene rute za različite dokumente i šablone
router.get('/potvrda-zaposlenja.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/potvrda-zaposlenja.html');
});

router.get('/resenje-godisnji-odmor.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/resenje-godisnji-odmor.html');
});

router.get('/ugovor-o-djelu.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/ugovor-o-djelu.html');
});

router.get('/ugovor-o-dopunskom-radu.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/ugovor-o-dopunskom-radu.html');
});

router.get('/sporazumni-raskid.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/sporazumni-raskid.html');
});

router.get(
  '/jednostrani-raskid-od-strane-radnika.html',
  authMiddleware,
  (req, res) => {
    res.sendFile(
      ROOT_DIR + '/public/shared/jednostrani-raskid-od-strane-radnika.html'
    );
  }
);

// Javne rute za prijavu i registraciju (bez authMiddleware!)
router.get('/prijava.html', (req, res) => {
  if (req.domainType === 'mojradnik') {
    res.sendFile(ROOT_DIR + '/public/mojradnik/prijava.html');
  } else if (req.domainType === 'prijaviradnika') {
    res.sendFile(ROOT_DIR + '/public/prijaviradnika/prijava.html');
  } else {
    res.sendFile(ROOT_DIR + '/public/shared/prijava.html');
  }
});

// Rute za zaboravljenu lozinku
router.get('/forgot-password.html', (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/forgot-password.html');
});

router.get('/reset-password.html', (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/reset-password.html');
});

// Zaštićena ruta za završne račune
router.get('/zavrsni-racuni.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/zavrsni-racuni.html');
});

router.get('/mjesecne-obaveze.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/mjesecne-obaveze.html');
});

router.get('/shared/mjesecne-obaveze.html', authMiddleware, (req, res) => {
  res.sendFile(ROOT_DIR + '/public/shared/mjesecne-obaveze.html');
});

// Zaštićena ruta za email admin panel - SAMO ADMIN
router.get(
  '/email-admin.html',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/email-admin.html');
  }
);

// Zaštićena ruta za admin database panel - SAMO ADMIN
router.get(
  '/admin-database.html',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/admin-database.html');
  }
);

// Zaštićena ruta za admin users panel - SAMO ADMIN
router.get(
  '/admin-users.html',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/admin-users.html');
  }
);

// Zaštićena ruta za admin uplate panel - SAMO ADMIN
router.get(
  '/admin-uplate.html',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/admin-uplate.html');
  }
);

router.get(
  '/admin-dodavanje-mailova.html',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/admin-dodavanje-mailova.html');
  }
);

router.get(
  '/admin-oglasi.html',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/admin-oglasi.html');
  }
);

// Zaštićena ruta za admin pretplate panel - SAMO ADMIN
router.get(
  '/admin-pretplate.html',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/shared/admin-pretplate.html');
  }
);


// Zaštićena ruta za prijavu poreza na dobit - requires FULL or ADMIN role

// Zaštićena ruta za prijavu poreza na dobit - requires FULL or ADMIN role
router.get(
  '/dobit_prijava/index.html',
  authMiddleware,
  requireRole([ROLES.FIRMA, ROLES.AGENCIJA, ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(ROOT_DIR + '/protected/dobit_prijava/index.html');
  }
);

// Zaštićene rute za sve dobit prijava resurse - requires FULL or ADMIN role
router.get(
  '/dobit_prijava/:file',
  authMiddleware,
  requireRole([ROLES.FIRMA, ROLES.AGENCIJA, ROLES.ADMIN]),
  (req, res) => {
    const fileName = req.params.file;

    // Dozvoljavamo pristup CSS, JS i ostalim statičkim fajlovima
    if (
      fileName.endsWith('.css') ||
      fileName.endsWith('.js') ||
      fileName.endsWith('.html')
    ) {
      res.sendFile(ROOT_DIR + `/protected/dobit_prijava/${fileName}`);
    } else {
      res.status(404).send('File not found');
    }
  }
);

// Admin routes - require ADMIN role
router.get(
  '/admin-users.html',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/admin-users.html');
  }
);

router.get(
  '/admin-pretplate.html',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(ROOT_DIR + '/public/admin-pretplate.html');
  }
);


module.exports = router;
