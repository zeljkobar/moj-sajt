require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;
const { executeQuery } = require('./src/config/database');
const userRoutes = require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');
const firmeRoutes = require('./src/routes/firmeRoutes');
const contractRoutes = require('./src/routes/contractRoutes');
const radnikRoutes = require('./src/routes/radnikRoutes');
const pozicijeRoutes = require('./src/routes/pozicijeRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const pdvRoutes = require('./src/routes/pdvRoutes');
const otkazRoutes = require('./src/routes/otkazRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const pozajmnicaRoutes = require('./src/routes/pozajmnicaRoutes');
const zajmodavciRoutes = require('./src/routes/zajmodavci');
const povracajRoutes = require('./src/routes/povracajRoutes');
const odlukaRoutes = require('./src/routes/odlukaRoutes');
const zadaciRoutes = require('./src/routes/zadaciRoutes');
const emailRoutes = require('./src/routes/emailRoutes');
const godisnjiomdoriRoutes = require('./src/routes/godisnjiomdori');
const { authMiddleware } = require('./src/middleware/auth');
const { requireRole, ROLES } = require('./src/middleware/roleAuth');
const {
  subscriptionMiddleware,
  subscriptionCheckMiddleware,
} = require('./src/middleware/subscription');
const InventoryService = require('./src/services/inventoryService');
const MarketingEmailService = require('./marketing-email');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

// Pokušaj da učitaš Redis pakete
let redisClient = null;
let RedisStore = null;
try {
  const redis = require('redis');
  RedisStore = require('connect-redis').default;

  redisClient = redis.createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    },
  });

  redisClient.on('error', err => {
    console.error('Redis Client Error', err);
    redisClient = null; // Fallback na MemoryStore
  });

  redisClient.on('connect', () => {
    console.log('✅ Connected to Redis');
  });

  // Konektuj se na Redis
  /*redisClient.connect().catch(err => {
    console.error('Failed to connect to Redis:', err);
    redisClient = null;
  });*/
} catch (error) {
  console.warn('⚠️  Redis packages not found, using MemoryStore');
  redisClient = null;
}

// Import novih middleware komponenti
const { httpLogger, logInfo, logError } = require('./src/utils/logger');
const {
  globalErrorHandler,
  handleNotFound,
} = require('./src/middleware/errorHandler');
const {
  smartRateLimiter,
  authLimiter,
} = require('./src/middleware/rateLimiting');

// parsiranje JSON i form-data
const allowedOrigins = [
  'http://localhost:3000',
  'https://summasummarum.me',
  'http://summasummarum.me',
  'https://mojradnik.me',
  'http://mojradnik.me',
  'http://185.102.78.178',
  'https://185.102.78.178',
];

// app.use(smartRateLimiter); // Privremeno onemogućeno

// HTTP request logging
// app.use(httpLogger); // Privremeno onemogućeno

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Omogući slanje cookies/session
  })
);

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Trust proxy for production (IMPORTANT FOR HTTPS/REVERSE PROXY)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);

  // Validate required environment variables in production
  if (
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET === 'vanesa3007-change-in-production'
  ) {
    console.error(
      '❌ CRITICAL: SESSION_SECRET environment variable must be set to a secure value in production!'
    );
    console.error('   Generate with: openssl rand -base64 32');
    process.exit(1);
  }
}

// express.static će biti pomereno na kraj da zaštićene rute imaju prioritet

// Session konfiguracija
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'vanesa3007-change-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'summa.sid', // Custom session name
  store:
    redisClient && RedisStore
      ? new RedisStore({
          client: redisClient,
          prefix: 'sess:',
        })
      : undefined,
  cookie: {
    secure: false, // Temporarily disable for HTTP testing
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 sata
    sameSite: 'lax', // CSRF protection
  },
};

if (sessionConfig.store) {
  console.log('✅ Using Redis session store');
} else {
  console.warn('⚠️  Using MemoryStore for sessions');
  console.warn('   Sessions will be lost on server restart.');
}

app.use(session(sessionConfig));

// PRODUCTION: Security headers
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()'
    );
    next();
  });
}

// Domain-specific middleware for multi-domain setup
app.use((req, res, next) => {
  console.log(
    '🔥 MIDDLEWARE CALLED - Method:',
    req.method,
    'Path:',
    req.path,
    'Host:',
    req.get('host')
  );

  const host = req.get('host');
  console.log('Domain middleware - host:', host, 'path:', req.path);

  // Get referer to check for domain parameter in POST requests
  const referer = req.get('referer') || '';
  const isDomainMojradnik =
    referer.includes('domain=mojradnik') || req.query.domain === 'mojradnik';

  // Detect domain and set appropriate paths
  if (
    host &&
    (host.includes('mojradnik.me') ||
      (host.includes('localhost') && isDomainMojradnik))
  ) {
    // For mojradnik.me domain
    req.domainType = 'mojradnik';
    req.isMultiTenant = false;
  } else {
    // For summasummarum.me domain (default)
    req.domainType = 'summasummarum';
    req.isMultiTenant = true;
  }

  console.log('Domain middleware - domainType set to:', req.domainType);
  next();
});

// Serve domain-specific index files - MORA BITI PRE static middleware-a
app.get('/', (req, res) => {
  try {
    console.log('GET / request - domainType:', req.domainType);
    const indexPath = path.join(
      __dirname,
      'public',
      req.domainType,
      'index.html'
    );

    console.log('Looking for index at:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));

    // Check if domain-specific index exists, fallback to shared
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback to shared index
      const fallbackPath = path.join(
        __dirname,
        'public',
        'shared',
        'index.html'
      );
      console.log('Fallback to:', fallbackPath);
      res.sendFile(fallbackPath);
    }
  } catch (error) {
    console.error('GET / route error:', error);
    res.status(500).send('Server error');
  }
});

// Serve domain-specific registracija files
app.get('/registracija.html', (req, res) => {
  try {
    console.log('GET /registracija.html request - domainType:', req.domainType);
    const registracijaPath = path.join(
      __dirname,
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
        __dirname,
        'public',
        'shared',
        'registracija1.html' // renamed file
      );
      console.log('Fallback to:', fallbackPath);
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
// app.get('/', (req, res) => {
//   res.sendFile(__dirname + '/public/index.html');
// });

// Handle direct requests to /index.html by redirecting to root
app.get('/index.html', (req, res) => {
  console.log('GET /index.html - redirecting to /');
  res.redirect('/');
});

// zasticene rute za static fajlove
app.get('/protected.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/protected.html');
});

// Zaštićena ruta za PDV prijavu - dostupno svim korisnicima osim admin panel
app.get(
  '/pdv_prijava/index.html',
  authMiddleware,
  requireRole([ROLES.FIRMA, ROLES.AGENCIJA, ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + '/protected/pdv_prijava/index.html');
  }
);

// Zaštićene rute za sve PDV prijava resurse - dostupno svim korisnicima
app.get(
  '/pdv_prijava/:file',
  authMiddleware,
  requireRole([ROLES.FIRMA, ROLES.AGENCIJA, ROLES.ADMIN]),
  (req, res) => {
    const fileName = req.params.file;
    res.sendFile(__dirname + '/protected/pdv_prijava/' + fileName);
  }
);

// Zaštićena ruta za PDV0 (masovno preuzimanje) - dostupno svim korisnicima
app.get(
  '/pdv0.html',
  authMiddleware,
  requireRole([ROLES.FIRMA, ROLES.AGENCIJA, ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + '/public/shared/pdv0.html');
  }
);

// Zaštićena ruta za dashboard
app.get(
  '/dashboard.html',
  authMiddleware,
  subscriptionMiddleware,
  (req, res) => {
    // Domain-specific dashboard routing
    if (req.domainType === 'mojradnik' && req.session.user.role === 'firma') {
      res.sendFile(__dirname + '/public/mojradnik/dashboard.html');
    } else {
      res.sendFile(__dirname + '/public/shared/dashboard.html');
    }
  }
);

// Zaštićena ruta za pregled firmi
app.get('/firme.html', authMiddleware, subscriptionMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/firme.html');
});

// Zaštićena ruta za dodavanje firmi
app.get(
  '/dodaj-firmu.html',
  authMiddleware,
  subscriptionMiddleware,
  (req, res) => {
    res.sendFile(__dirname + '/public/shared/dodaj-firmu.html');
  }
);

// Zaštićena ruta za editovanje firmi
app.get(
  '/edit-firmu.html',
  authMiddleware,
  subscriptionMiddleware,
  (req, res) => {
    res.sendFile(__dirname + '/public/shared/edit-firmu.html');
  }
);

// Zaštićene rute za UGOVORI funkcionalnost
app.get(
  '/pozicije.html',
  authMiddleware,
  subscriptionMiddleware,
  requireRole([ROLES.FIRMA, ROLES.AGENCIJA, ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + '/public/shared/pozicije.html');
  }
);

app.get(
  '/ugovor-o-radu.html',
  authMiddleware,
  subscriptionMiddleware,
  requireRole([ROLES.FIRMA, ROLES.AGENCIJA, ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + '/public/shared/ugovor-o-radu.html');
  }
);

// Zaštićena ruta za editovanje profila
app.get('/edit-profil.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/edit-profil.html');
});

// Zaštićena ruta za pretplatu
app.get('/pretplata.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/pretplata.html');
});

// Zaštićena ruta za PDV pregled
app.get('/shared/pdv-pregled.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/pdv-pregled.html');
});

// Zaštićena ruta za mobing
app.get('/mobing.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/mobing.html');
});

// Zaštićena ruta za sedmični odmor
app.get('/sedmicni-odmor.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/sedmicni-odmor.html');
});

// Zaštićena ruta za JPR dodatak B
app.get('/jpr-dodatak-b.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/jpr-dodatak-b.html');
});

// Zaštićena ruta za JPR dodatak A
app.get('/jpr-dodatak-a.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/jpr-dodatak-a.html');
});

// Zaštićena ruta za JPR dodatak C
app.get('/jpr-dodatak-c.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/jpr-dodatak-c.html');
});

// Zaštićena ruta za JPR korica
app.get('/jpr-korica.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/jpr-korica.html');
});

// Zaštićena ruta za ugovor o zajmu novca
app.get('/ugovor-o-zajmu-novca.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/ugovor-o-zajmu-novca.html');
});

// Ruta za pretplatu bez .html ekstenzije (za redirecte iz subscription middleware)
// Ruta za pretplatu koja automatski redirect-uje na osnovu korisničke role
app.get('/pretplata', authMiddleware, async (req, res) => {
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
app.get('/pretplata-firma', (req, res) => {
  res.sendFile(__dirname + '/public/mojradnik/pretplata-firma.html');
});

app.get('/pretplata-agencija', (req, res) => {
  res.sendFile(__dirname + '/public/summasummarum/pretplata-agencija.html');
});

// Ruta za account-suspended (za redirecte iz subscription middleware)
// NAPOMENA: Bez authMiddleware da se izbegnu loopovi kada korisnik nema valjan session
app.get('/account-suspended', (req, res) => {
  res.sendFile(__dirname + '/public/shared/account-suspended.html');
});

// Zaštićena ruta za firma-detalji (nova stranica sa tabovima)
app.get(
  '/firma-detalji.html',
  authMiddleware,
  subscriptionMiddleware,
  (req, res) => {
    res.sendFile(__dirname + '/public/shared/firma-detalji.html');
  }
);

// Zaštićena ruta za obračun zaliha
app.get(
  '/obracun-zaliha.html',
  authMiddleware,
  subscriptionMiddleware,
  (req, res) => {
    res.sendFile(__dirname + '/public/shared/obracun-zaliha.html');
  }
);

// Zaštićena ruta za godišnje odmori
app.get(
  '/godisnji-odmori.html',
  authMiddleware,
  subscriptionMiddleware,
  (req, res) => {
    res.sendFile(__dirname + '/public/shared/godisnji-odmori.html');
  }
);

// Zaštićena ruta za plan godišnjeg odmora
app.get(
  '/plan-godisnjeg-odmora.html',
  authMiddleware,
  subscriptionMiddleware,
  (req, res) => {
    res.sendFile(__dirname + '/public/shared/plan-godisnjeg-odmora.html');
  }
);

// Zaštićena ruta za otkaze
app.get('/otkazi.html', authMiddleware, subscriptionMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/otkazi.html');
});

// Zaštićena ruta za istek ugovora
app.get(
  '/istek-ugovora.html',
  authMiddleware,
  subscriptionMiddleware,
  (req, res) => {
    res.sendFile(__dirname + '/public/shared/istek-ugovora.html');
  }
);

// Zaštićene rute za različite dokumente
app.get('/aneks-promena-radnog-vremena.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/aneks-promena-radnog-vremena.html');
});

app.get('/aneks-zastita-na-radu.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/aneks-zastita-na-radu.html');
});

// Zaštićene rute za različite dokumente i šablone
app.get('/potvrda-zaposlenja.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/potvrda-zaposlenja.html');
});

app.get('/resenje-godisnji-odmor.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/resenje-godisnji-odmor.html');
});

app.get('/ugovor-o-djelu.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/ugovor-o-djelu.html');
});

app.get('/ugovor-o-dopunskom-radu.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/ugovor-o-dopunskom-radu.html');
});

app.get('/sporazumni-raskid.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/shared/sporazumni-raskid.html');
});

// Javne rute za prijavu i registraciju (bez authMiddleware!)
app.get('/prijava.html', (req, res) => {
  if (req.domainType === 'mojradnik') {
    res.sendFile(__dirname + '/public/mojradnik/prijava.html');
  } else {
    res.sendFile(__dirname + '/public/shared/prijava.html');
  }
});

// Rute za zaboravljenu lozinku
app.get('/forgot-password.html', (req, res) => {
  res.sendFile(__dirname + '/public/shared/forgot-password.html');
});

app.get('/reset-password.html', (req, res) => {
  res.sendFile(__dirname + '/public/shared/reset-password.html');
});

// Zaštićena ruta za email admin panel - SAMO ADMIN
app.get(
  '/email-admin.html',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + '/public/shared/email-admin.html');
  }
);

// Zaštićena ruta za admin database panel - SAMO ADMIN
app.get(
  '/admin-database.html',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + '/public/shared/admin-database.html');
  }
);

// Zaštićena ruta za admin users panel - SAMO ADMIN
app.get(
  '/admin-users.html',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + '/public/shared/admin-users.html');
  }
);

// Zaštićena ruta za admin uplate panel - SAMO ADMIN
app.get(
  '/admin-uplate.html',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + '/public/shared/admin-uplate.html');
  }
);

// Zaštićena ruta za admin pretplate panel - SAMO ADMIN
app.get(
  '/admin-pretplate.html',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + '/public/shared/admin-pretplate.html');
  }
);

// API ruta za pretragu
app.get(
  '/api/search',
  authMiddleware,
  subscriptionMiddleware,
  async (req, res) => {
    try {
      const { q } = req.query;
      const userId = req.session.user.id;
      const { executeQuery } = require('./src/config/database');

      if (!q || q.length < 2) {
        return res.json({ results: [] });
      }

      const searchTerm = `%${q}%`;
      const results = [];

      // Pretraži firme
      const firme = await executeQuery(
        `
      SELECT id, naziv, pdvBroj, pib 
      FROM firme 
      WHERE user_id = ? AND (naziv LIKE ? OR pdvBroj LIKE ? OR pib LIKE ?)
      LIMIT 5
    `,
        [userId, searchTerm, searchTerm, searchTerm]
      );

      firme.forEach(firma => {
        results.push({
          type: 'firma',
          id: firma.id,
          category: 'Firma',
          title: firma.naziv,
          subtitle: `PDV: ${firma.pdvBroj || 'N/A'} | PIB: ${
            firma.pib || 'N/A'
          }`,
        });
      });

      // Pretraži radnike
      const radnici = await executeQuery(
        `
      SELECT r.id, r.ime, r.prezime, r.firma_id, f.naziv as firma_naziv, p.naziv as pozicija_naziv
      FROM radnici r
      JOIN firme f ON r.firma_id = f.id
      LEFT JOIN pozicije p ON r.pozicija_id = p.id
      WHERE f.user_id = ? AND (r.ime LIKE ? OR r.prezime LIKE ? OR CONCAT(r.ime, ' ', r.prezime) LIKE ?)
      LIMIT 5
    `,
        [userId, searchTerm, searchTerm, searchTerm]
      );

      radnici.forEach(radnik => {
        results.push({
          type: 'radnik',
          id: radnik.id,
          firmaId: radnik.firma_id,
          category: 'Radnik',
          title: `${radnik.ime} ${radnik.prezime}`,
          subtitle: `${radnik.firma_naziv} - ${
            radnik.pozicija_naziv || 'Nespecifikovano'
          }`,
        });
      });

      res.json({ results });
    } catch (error) {
      console.error('Greška pri pretrazi:', error);
      res.status(500).json({ results: [] });
    }
  }
);

// Specifični search endpoint-i
app.get(
  '/api/firme/search',
  authMiddleware,
  subscriptionMiddleware,
  async (req, res) => {
    try {
      const { q } = req.query;
      const userId = req.session.user.id;

      if (!q || q.length < 2) {
        return res.json([]);
      }

      const searchTerm = `%${q}%`;
      const firme = await executeQuery(
        `
      SELECT id, naziv, grad, pib, status
      FROM firme 
      WHERE user_id = ? AND (naziv LIKE ? OR grad LIKE ? OR pib LIKE ?)
      ORDER BY naziv
      LIMIT 10
    `,
        [userId, searchTerm, searchTerm, searchTerm]
      );

      const results = firme.map(firma => ({
        id: firma.id,
        naziv: firma.naziv,
        grad: firma.grad,
        aktivna: firma.status === 'aktivan',
      }));

      res.json(results);
    } catch (error) {
      console.error('Greška pri pretrazi firmi:', error);
      res.status(500).json([]);
    }
  }
);

app.get('/api/radnici/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.session.user.id;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const searchTerm = `%${q}%`;
    const radnici = await executeQuery(
      `
      SELECT r.id, r.ime, r.prezime, r.firma_id, f.naziv as firma, p.naziv as pozicija
      FROM radnici r
      JOIN firme f ON r.firma_id = f.id
      LEFT JOIN pozicije p ON r.pozicija_id = p.id
      WHERE f.user_id = ? AND (r.ime LIKE ? OR r.prezime LIKE ? OR CONCAT(r.ime, ' ', r.prezime) LIKE ?)
      ORDER BY r.ime, r.prezime
      LIMIT 10
    `,
      [userId, searchTerm, searchTerm, searchTerm]
    );

    const results = radnici.map(radnik => ({
      id: radnik.id,
      ime: radnik.ime,
      prezime: radnik.prezime,
      firma_id: radnik.firma_id, // Dodano
      firma: radnik.firma,
      pozicija: radnik.pozicija || 'Nespecifikovano',
    }));

    res.json(results);
  } catch (error) {
    console.error('Greška pri pretrazi radnika:', error);
    res.status(500).json([]);
  }
});

app.get('/api/ugovori/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.session.user.id;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const searchTerm = `%${q}%`;

    // Pretraži radnike kao osnovne ugovore
    const ugovori = await executeQuery(
      `
      SELECT r.id, r.ime, r.prezime, r.datum_zaposlenja, r.datum_prestanka, f.naziv as firma
      FROM radnici r
      JOIN firme f ON r.firma_id = f.id
      WHERE f.user_id = ? AND (r.ime LIKE ? OR r.prezime LIKE ? OR CONCAT(r.ime, ' ', r.prezime) LIKE ?)
      ORDER BY r.datum_zaposlenja DESC
      LIMIT 10
    `,
      [userId, searchTerm, searchTerm, searchTerm]
    );

    const results = ugovori.map(ugovor => ({
      id: ugovor.id,
      tip: ugovor.datum_prestanka ? 'Sporazumni raskid' : 'Ugovor o radu',
      radnik: `${ugovor.ime} ${ugovor.prezime}`,
      datum: ugovor.datum_zaposlenja,
    }));

    res.json(results);
  } catch (error) {
    console.error('Greška pri pretrazi ugovora:', error);
    res.status(500).json([]);
  }
});

// Endpoint-i za firmu detalje (po ID-ju, ne PIB-u)
app.get('/api/firme/id/:id', authMiddleware, async (req, res) => {
  try {
    const firmaId = req.params.id;
    const userId = req.session.user.id;

    const firma = await executeQuery(
      'SELECT * FROM firme WHERE id = ? AND user_id = ?',
      [firmaId, userId]
    );

    if (firma.length === 0) {
      return res.status(404).json({ message: 'Firma nije pronađena' });
    }

    res.json(firma[0]);
  } catch (error) {
    console.error('Greška pri učitavanju firme:', error);
    res.status(500).json({ message: 'Greška pri učitavanju firme' });
  }
});

app.get('/api/firme/:id/radnici', authMiddleware, async (req, res) => {
  try {
    const firmaId = req.params.id;
    const userId = req.session.user.id;

    // Prvo proveri da li firma pripada korisniku
    const firma = await executeQuery(
      'SELECT id FROM firme WHERE id = ? AND user_id = ?',
      [firmaId, userId]
    );

    if (firma.length === 0) {
      return res.status(404).json({ message: 'Firma nije pronađena' });
    }

    const radnici = await executeQuery(
      `
      SELECT r.*, p.naziv as pozicija_naziv
      FROM radnici r
      LEFT JOIN pozicije p ON r.pozicija_id = p.id
      WHERE r.firma_id = ?
      ORDER BY r.ime, r.prezime
      `,
      [firmaId]
    );

    res.json(radnici);
  } catch (error) {
    console.error('Greška pri učitavanju radnika:', error);
    res.status(500).json({ message: 'Greška pri učitavanju radnika' });
  }
});

app.get('/api/firme/:id/pozajmnice', authMiddleware, async (req, res) => {
  try {
    const firmaId = req.params.id;
    const userId = req.session.user.id;

    // Prvo proveri da li firma pripada korisniku
    const firma = await executeQuery(
      'SELECT id FROM firme WHERE id = ? AND user_id = ?',
      [firmaId, userId]
    );

    if (firma.length === 0) {
      return res.status(404).json({ message: 'Firma nije pronađena' });
    }

    const pozajmice = await executeQuery(
      `
      SELECT p.*, r.ime, r.prezime,
             r.ime as radnik_ime, r.prezime as radnik_prezime
      FROM pozajmnice p
      JOIN radnici r ON p.radnik_id = r.id
      WHERE r.firma_id = ?
      ORDER BY p.created_at DESC
      `,
      [firmaId]
    );

    res.json(pozajmice);
  } catch (error) {
    console.error('Greška pri učitavanju pozajmica:', error);
    res.status(500).json({ message: 'Greška pri učitavanju pozajmica' });
  }
});

// Dodaj i endpoint koji frontend očekuje
app.get('/api/pozajmnice/firma/:firmaId', authMiddleware, async (req, res) => {
  try {
    const firmaId = req.params.firmaId;
    const userId = req.session.user.id;

    // Prvo proveri da li firma pripada korisniku
    const firma = await executeQuery(
      'SELECT id FROM firme WHERE id = ? AND user_id = ?',
      [firmaId, userId]
    );

    if (firma.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Firma nije pronađena',
      });
    }

    // Učitaj pozajmice sa podacima o radnicima ili zajmodavcima
    const pozajmice = await executeQuery(
      `
      SELECT p.*, 
             r.ime as radnik_ime, r.prezime as radnik_prezime,
             z.ime as zajmodavac_ime, z.prezime as zajmodavac_prezime
      FROM pozajmnice p
      LEFT JOIN radnici r ON p.radnik_id = r.id AND p.pozajmilac_tip = 'radnik'
      LEFT JOIN zajmodavci z ON p.zajmodavac_id = z.id AND p.pozajmilac_tip = 'zajmodavac'
      WHERE p.firma_id = ?
      ORDER BY p.created_at DESC
      `,
      [firmaId]
    );

    res.json({
      success: true,
      pozajmice: pozajmice,
    });
  } catch (error) {
    console.error('Greška pri učitavanju pozajmica:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri učitavanju pozajmica',
    });
  }
});

// Endpoint za sve pozajmice korisnika iz svih firmi (za dashboard)
app.get('/api/pozajmnice', authMiddleware, async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Učitaj sve pozajmice korisnika iz svih firmi
    const pozajmice = await executeQuery(
      `
      SELECT p.*, 
             f.naziv as firma_naziv,
             r.ime as radnik_ime, r.prezime as radnik_prezime,
             z.ime as zajmodavac_ime, z.prezime as zajmodavac_prezime
      FROM pozajmnice p
      JOIN firme f ON p.firma_id = f.id
      LEFT JOIN radnici r ON p.radnik_id = r.id AND p.pozajmilac_tip = 'radnik'
      LEFT JOIN zajmodavci z ON p.zajmodavac_id = z.id AND p.pozajmilac_tip = 'zajmodavac'
      WHERE f.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT 10
      `,
      [userId]
    );

    res.json({
      success: true,
      pozajmice: pozajmice,
    });
  } catch (error) {
    console.error('Greška pri učitavanju pozajmica:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri učitavanju pozajmica',
    });
  }
});

// Endpoint za pojedinačnu pozajmicu po ID-u (za ugovor)
app.get('/api/pozajmnice/:pozajmicaId', authMiddleware, async (req, res) => {
  try {
    const pozajmicaId = req.params.pozajmicaId;
    const userId = req.session.user.id;

    // Učitaj pozajmicu sa svim podacima uključujući firmu, radnika ili zajmodavca
    const pozajmice = await executeQuery(
      `
      SELECT p.*, 
             f.naziv as firma_naziv,
             f.adresa as firma_adresa, 
             f.pib as firma_pib,
             f.ziro_racun as firma_ziro_racun,
             f.direktor_ime_prezime as direktor_ime_prezime,
             f.direktor_jmbg as direktor_jmbg,
             f.grad as firma_grad,
             r.ime as radnik_ime, r.prezime as radnik_prezime, r.jmbg as radnik_jmbg,
             z.ime as zajmodavac_ime, z.prezime as zajmodavac_prezime, 
             z.jmbg as zajmodavac_jmbg, z.ziro_racun as zajmodavac_ziro_racun
      FROM pozajmnice p
      LEFT JOIN firme f ON p.firma_id = f.id
      LEFT JOIN radnici r ON p.radnik_id = r.id AND p.pozajmilac_tip = 'radnik'
      LEFT JOIN zajmodavci z ON p.zajmodavac_id = z.id AND p.pozajmilac_tip = 'zajmodavac'
      WHERE p.id = ? AND f.user_id = ?
      `,
      [pozajmicaId, userId]
    );

    if (pozajmice.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pozajmica nije pronađena',
      });
    }

    res.json({
      success: true,
      pozajmica: pozajmice[0],
    });
  } catch (error) {
    console.error('Greška pri učitavanju pozajmice:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri učitavanju pozajmice',
    });
  }
});

// API ruta za dashboard statistike
app.get('/api/dashboard-stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { executeQuery } = require('./src/config/database');

    // Osnovne statistike firmi
    const firmeStats = await executeQuery(
      'SELECT status, COUNT(*) as count FROM firme WHERE user_id = ? GROUP BY status',
      [userId]
    );

    // Statistike radnika - aktivni su oni bez otkaza
    const radniciStats = await executeQuery(
      `
      SELECT 
        COUNT(*) as ukupno_radnici,
        SUM(CASE WHEN o.id IS NULL THEN 1 ELSE 0 END) as aktivni_radnici
      FROM radnici r 
      JOIN firme f ON r.firma_id = f.id 
      LEFT JOIN otkazi o ON r.id = o.radnik_id
      WHERE f.user_id = ?
    `,
      [userId]
    );

    // Ugovori ovaj mjesec
    const ugovoriMjesec = await executeQuery(
      `
      SELECT COUNT(*) as count 
      FROM radnici r 
      JOIN firme f ON r.firma_id = f.id 
      WHERE f.user_id = ? 
        AND YEAR(r.datum_zaposlenja) = YEAR(CURDATE()) 
        AND MONTH(r.datum_zaposlenja) = MONTH(CURDATE())
    `,
      [userId]
    );

    // Procesuiraj rezultate
    const firmeMap = {};
    firmeStats.forEach(stat => {
      firmeMap[stat.status] = stat.count;
    });

    const total = (firmeMap.aktivan || 0) + (firmeMap.nula || 0);
    const aktivne = firmeMap.aktivan || 0;
    const naNuli = firmeMap.nula || 0;
    const procenatNaNuli = total > 0 ? Math.round((naNuli / total) * 100) : 0;

    const aktivniRadnici = radniciStats[0]?.aktivni_radnici || 0;
    const ugovoriMjesecCount = ugovoriMjesec[0]?.count || 0;

    res.json({
      total: total,
      aktivne: aktivne,
      naNuli: naNuli,
      procenatNaNuli: procenatNaNuli,
      aktivniRadnici: aktivniRadnici,
      ugovoriMjesec: ugovoriMjesecCount,
    });
  } catch (error) {
    console.error('Greška pri učitavanju dashboard statistika:', error);
    res.status(500).json({ message: 'Greška pri učitavanju statistika' });
  }
});

// API ruta za obračun zaliha
app.post('/api/obracun-zaliha', authMiddleware, async (req, res) => {
  try {
    // Koristi InventoryService za kalkulaciju
    const responseData = InventoryService.calculateInventory(req.body);
    res.json(responseData);
  } catch (error) {
    console.error('Greška pri obračunu zaliha:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri kalkulaciji',
    });
  }
});

// API rute
app.use('/api/users', userRoutes);
app.use('/api', authRoutes);
// Dodaj specifične direktne rute za kompatibilnost sa frontendom
const authController = require('./src/controllers/authController');
const userController = require('./src/controllers/userController');
app.get('/check-auth', authController.checkAuth);
app.get('/current', authMiddleware, userController.getCurrentUser);

// GET logout ruta za front-end linkove
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/prijava.html');
  });
});

app.use('/api/firme', firmeRoutes);
app.use('/api', contractRoutes);
app.use('/api/radnici', radnikRoutes);
app.use('/api/pozicije', pozicijeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/pdv', pdvRoutes);
app.use('/api/otkazi', otkazRoutes);
app.use('/api/pozajmnice', pozajmnicaRoutes);
app.use('/api/firme', zajmodavciRoutes);
app.use('/api/povracaji', povracajRoutes);

// Direktne rute za zajmodavce (kompatibilnost sa frontend-om)
const zajmodavciController = require('./src/controllers/zajmodavciController');
const {
  validateZajmodavac,
  validateId,
} = require('./src/middleware/validation');

app.put(
  '/api/zajmodavci/:id',
  authMiddleware,
  validateId,
  validateZajmodavac,
  zajmodavciController.updateZajmodavac
);
app.delete(
  '/api/zajmodavci/:id',
  authMiddleware,
  validateId,
  zajmodavciController.deleteZajmodavac
);
app.use('/api/odluka', odlukaRoutes);
app.use('/api/zadaci', zadaciRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/godisnji-odmori', godisnjiomdoriRoutes);

// Marketing Email API endpoints (samo za administratore)
const multer = require('multer');
const upload = multer({ dest: 'email-lists/' });

// Test marketing email
app.post(
  '/api/marketing/test',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { email, firstName, companyName } = req.body;

      if (!email) {
        return res
          .status(400)
          .json({ success: false, error: 'Email je obavezan' });
      }

      const service = new MarketingEmailService();
      const result = await service.sendMarketingEmail(email, {
        firstName,
        companyName,
      });

      res.json(result);
    } catch (error) {
      console.error('Marketing test email error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Upload i pokreni marketing kampanju
app.post(
  '/api/marketing/campaign',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  upload.single('csvFile'),
  async (req, res) => {
    console.log('🚀 Marketing campaign endpoint pozvan');
    console.log('📁 req.file:', req.file ? 'Postoji' : 'Ne postoji');
    console.log('📋 req.body:', req.body);
    console.log('👤 req.user:', req.user ? req.user.username : 'Nije ulogovan');

    try {
      const { testMode, campaignName } = req.body;

      if (!req.file) {
        console.log('❌ Nema CSV fajla');
        return res
          .status(400)
          .json({ success: false, error: 'CSV fajl je obavezan' });
      }

      const MarketingEmailService = require('./marketing-email');
      const manager = new MarketingEmailService();

      // Učitaj CSV fajl
      const recipients = manager.loadEmailListFromCSV(req.file.path);
      if (testMode === 'true') {
        // Test mod - šalje samo prvi email
        const service = new MarketingEmailService();
        const testRecipient = recipients[0];
        const result = await service.sendMarketingEmail(
          testRecipient.email,
          testRecipient
        );

        // Obriši privremeni fajl
        fs.unlinkSync(req.file.path);

        return res.json({
          success: true,
          testMode: true,
          recipient: testRecipient.email,
          result,
        });
      }

      // Kompletna kampanja sa tracking-om
      const service = new MarketingEmailService();
      const campaignTitle =
        campaignName || `Kampanja ${new Date().toISOString().split('T')[0]}`;
      const results = await service.sendBulkMarketingEmails(
        recipients,
        2000,
        campaignTitle,
        req.user.id
      );

      // Obriši privremeni fajl
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        campaign: {
          id: results.campaignId,
          name: campaignTitle,
          total: results.total,
          successful: results.successful,
          failed: results.failed,
          recipients: recipients.length,
        },
      });
    } catch (error) {
      console.error('Marketing campaign error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Dobij dostupne email liste
app.get(
  '/api/marketing/lists',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  (req, res) => {
    try {
      const MarketingEmailService = require('./marketing-email');
      const manager = new MarketingEmailService();
      const lists = manager.listAvailableLists();
      res.json({ success: true, lists });
    } catch (error) {
      console.error('Marketing lists error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Dobij marketing statistike (javno dostupno za sada)
app.get('/api/marketing/stats', async (req, res) => {
  try {
    const service = new MarketingEmailService();
    const stats = await service.getStats();

    res.json({
      totalSent: stats.total_emails_sent || 0,
      successRate: `${stats.overall_success_rate || 0}%`,
      totalCampaigns: stats.total_campaigns || 0,
      lastUpdated: stats.last_updated,
    });
  } catch (error) {
    console.error('Marketing stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dobij listu svih kampanja
app.get(
  '/api/marketing/campaigns',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { executeQuery } = require('./src/config/database');
      const query = `
        SELECT 
          c.id, c.campaign_name, c.subject, c.total_recipients, c.emails_sent, 
          c.emails_failed, c.success_rate, c.created_at, c.completed_at, c.status,
          COUNT(e.opened_at) as emails_opened
        FROM marketing_campaigns c
        LEFT JOIN marketing_emails e ON c.id = e.campaign_id AND e.opened_at IS NOT NULL
        GROUP BY c.id
        ORDER BY c.created_at DESC 
        LIMIT 50
      `;
      const campaigns = await executeQuery(query);
      res.json({ success: true, campaigns });
    } catch (error) {
      console.error('Campaigns list error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Dobij detalje kampanje
app.get(
  '/api/marketing/campaigns/:id',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { executeQuery } = require('./src/config/database');
      const campaignId = req.params.id;

      // Osnovni podaci kampanje
      const campaignQuery = `
        SELECT * FROM marketing_campaigns WHERE id = ?
      `;
      const campaign = await executeQuery(campaignQuery, [campaignId]);

      if (campaign.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: 'Kampanja nije pronađena' });
      }

      // Email lista kampanje
      const emailsQuery = `
        SELECT id, email_address, recipient_name, company_name, status, 
               error_message, sent_at, created_at,
               opened_at, open_count, user_agent, ip_address
        FROM marketing_emails 
        WHERE campaign_id = ? 
        ORDER BY created_at DESC
      `;
      const emails = await executeQuery(emailsQuery, [campaignId]);

      res.json({
        success: true,
        campaign: campaign[0],
        emails,
      });
    } catch (error) {
      console.error('Campaign details error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Email tracking endpoint - tracking pixel
app.get('/api/marketing/track/open/:emailId', async (req, res) => {
  try {
    const emailId = req.params.emailId;
    const userAgent = req.get('User-Agent') || '';
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    // Ažuriraj email kao otvoren
    const updateQuery = `
      UPDATE marketing_emails 
      SET 
        opened_at = COALESCE(opened_at, NOW()), 
        open_count = open_count + 1,
        user_agent = ?,
        ip_address = ?
      WHERE id = ?
    `;
    await executeQuery(updateQuery, [userAgent, ipAddress, emailId]);

    // Ažuriraj statistike kampanje
    const campaignQuery = `
      SELECT campaign_id FROM marketing_emails WHERE id = ?
    `;
    const campaignResult = await executeQuery(campaignQuery, [emailId]);

    if (campaignResult.length > 0) {
      const marketingService = new MarketingEmailService();
      await marketingService.updateCampaignStats(campaignResult[0].campaign_id);
    }

    // Vrati 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    res.set({
      'Content-Type': 'image/png',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    res.end(pixel);

    console.log(`📖 Email ${emailId} otvoren - IP: ${ipAddress}`);
  } catch (error) {
    console.error('Email tracking error:', error);
    // I u slučaju greške vrati pixel da ne pokvarimo email
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': pixel.length,
    });
    res.end(pixel);
  }
});

// Profile API endpoint
const profileController = require('./src/controllers/profileController');
app.get(
  '/api/profile/stats',
  authMiddleware,
  profileController.getProfileStats
);

// GET /api/odmori/:id - pojedinačni odmor po ID-u (za rešenja)
app.get('/api/odmori/:id', authMiddleware, async (req, res) => {
  const godisnjiomdoriController = require('./src/controllers/godisnjiomdoriController');
  return godisnjiomdoriController.getOdmorById(req, res);
});

// Zaštićena ruta za prijavu poreza na dobit - requires FULL or ADMIN role

// Zaštićena ruta za prijavu poreza na dobit - requires FULL or ADMIN role
app.get(
  '/dobit_prijava/index.html',
  authMiddleware,
  requireRole([ROLES.FIRMA, ROLES.AGENCIJA, ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + '/protected/dobit_prijava/index.html');
  }
);

// Zaštićene rute za sve dobit prijava resurse - requires FULL or ADMIN role
app.get(
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
      res.sendFile(__dirname + `/protected/dobit_prijava/${fileName}`);
    } else {
      res.status(404).send('File not found');
    }
  }
);

// Admin routes - require ADMIN role
app.get(
  '/admin-users.html',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + '/public/admin-users.html');
  }
);

app.get(
  '/admin-pretplate.html',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + '/public/admin-pretplate.html');
  }
);

// API rute za admin funkcionalnosti
app.get(
  '/api/admin/users',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const { executeQuery } = require('./src/config/database');
      const users = await executeQuery(
        'SELECT id, username, email, ime, prezime, role, created_at FROM users ORDER BY created_at DESC'
      );
      res.json(users);
    } catch (error) {
      console.error('Greška pri učitavanju korisnika:', error);
      res.status(500).json({ msg: 'Greška pri učitavanju korisnika' });
    }
  }
);

app.put(
  '/api/admin/users/:id/role',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  async (req, res) => {
    try {
      const { executeQuery } = require('./src/config/database');
      const { id } = req.params;
      const { role } = req.body;

      // Validate role
      const validRoles = ['firma', 'agencija', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ msg: 'Neispravna rola' });
      }

      // Don't allow changing own role
      if (parseInt(id) === req.session.user.id) {
        return res.status(400).json({ msg: 'Ne možete promeniti svoju rolu' });
      }

      await executeQuery('UPDATE users SET role = ? WHERE id = ?', [role, id]);
      res.json({ msg: 'Rola je uspešno promenjena', role });
    } catch (error) {
      console.error('Greška pri promeni role:', error);
      res.status(500).json({ msg: 'Greška pri promeni role' });
    }
  }
);

// Serve shared files with proper paths
app.use('/shared', express.static(path.join(__dirname, 'public', 'shared')));

// Serve domain-specific assets directly
app.use(
  '/summasummarum',
  express.static(path.join(__dirname, 'public', 'summasummarum'))
);
app.use(
  '/mojradnik',
  express.static(path.join(__dirname, 'public', 'mojradnik'))
);

// Statički fajlovi - zadnji da zaštićene rute imaju prioritet
// app.use(express.static('public')); // Zakomentarisano - koristimo specifične rute umesto

// Middleware za nepostojece rute (mora biti nakon svih validnih ruta)
app.use(handleNotFound);

// Globalni error handler (mora biti poslednji middleware)
app.use(globalErrorHandler);

// Listen on all interfaces, not just localhost
const server = app.listen(port, '0.0.0.0', () => {
  if (process.env.IISNODE_VERSION) {
    logInfo('Server started', { environment: 'IIS with iisnode', port });
    console.log(`🚀 Server running on IIS with iisnode`);
  } else {
    logInfo('Server started', { environment: 'development', port });
    console.log(`🚀 Server radi na http://0.0.0.0:${port}`);
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logInfo('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    logInfo('Process terminated');
    process.exit(0);
  });
});

// PRODUCTION: Graceful shutdown
const shutdownGracefully = async () => {
  console.log('\n⚠️  Shutting down gracefully...');

  // Close server
  server.close(() => {
    logInfo('Process terminated');
    process.exit(0);
  });
};

process.on('SIGINT', () => {
  logInfo('SIGINT received. Shutting down gracefully');
  shutdownGracefully();
});

// Handle uncaught exceptions
process.on('uncaughtException', err => {
  logError('UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', err => {
  logError('UNHANDLED REJECTION! Shutting down...', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle IIS shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  shutdownGracefully();
});
