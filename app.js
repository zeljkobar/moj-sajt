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
const povracajRoutes = require('./src/routes/povracajRoutes');
const odlukaRoutes = require('./src/routes/odlukaRoutes');
const zadaciRoutes = require('./src/routes/zadaciRoutes');
const emailRoutes = require('./src/routes/emailRoutes');
const { authMiddleware } = require('./src/middleware/auth');
const { requireRole, ROLES } = require('./src/middleware/roleAuth');
const { setupActivitiesWithUserFilter } = require('./activities-patch');
const InventoryService = require('./src/services/inventoryService');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

// Pokušaj da učitaš Redis pakete
let redisClient = null;
let RedisStore = null;
try {
  const redis = require('redis');
  RedisStore = require('connect-redis')(session);

  redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  });

  redisClient.on('error', err => {
    console.error('Redis Client Error', err);
    redisClient = null; // Fallback na MemoryStore
  });

  redisClient.on('connect', () => {
    console.log('✅ Connected to Redis');
  });

  // Konektuj se na Redis
  redisClient.connect().catch(err => {
    console.error('Failed to connect to Redis:', err);
    redisClient = null;
  });
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
  'http://185.102.78.178',
  'https://185.102.78.178',
];

// Primeni osnovni rate limiting na sve zahteve
app.use(smartRateLimiter);

// HTTP request logging
app.use(httpLogger);

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
      ? new RedisStore({ client: redisClient })
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

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
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
    res.sendFile(__dirname + '/public/pdv0.html');
  }
);

// Zaštićena ruta za dashboard
app.get('/dashboard.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/dashboard.html');
});

// Zaštićena ruta za pregled firmi
app.get('/firme.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/firme.html');
});

// Zaštićena ruta za dodavanje firmi
app.get('/dodaj-firmu.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/dodaj-firmu.html');
});

// Zaštićena ruta za editovanje firmi
app.get('/edit-firmu.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/edit-firmu.html');
});

// Zaštićene rute za UGOVORI funkcionalnost
app.get(
  '/pozicije.html',
  authMiddleware,
  requireRole([ROLES.FIRMA, ROLES.AGENCIJA, ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + '/public/pozicije.html');
  }
);

app.get(
  '/ugovor-o-radu.html',
  authMiddleware,
  requireRole([ROLES.FIRMA, ROLES.AGENCIJA, ROLES.ADMIN]),
  (req, res) => {
    res.sendFile(__dirname + '/public/ugovor-o-radu.html');
  }
);

// Zaštićena ruta za editovanje profila
app.get('/edit-profil.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/edit-profil.html');
});

// Zaštićena ruta za firma-detalji (nova stranica sa tabovima)
app.get('/firma-detalji.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/firma-detalji.html');
});

// Zaštićena ruta za obračun zaliha
app.get('/obracun-zaliha.html', authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/public/obracun-zaliha.html');
});

// API ruta za pretragu
app.get('/api/search', authMiddleware, async (req, res) => {
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
        subtitle: `PDV: ${firma.pdvBroj || 'N/A'} | PIB: ${firma.pib || 'N/A'}`,
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
});

// Specifični search endpoint-i
app.get('/api/firme/search', authMiddleware, async (req, res) => {
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
});

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

app.get('/api/firme/:id/pozajmice', authMiddleware, async (req, res) => {
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
app.use('/api/firme', firmeRoutes);
app.use('/api', contractRoutes);
app.use('/api/radnici', radnikRoutes);
app.use('/api/pozicije', pozicijeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/pdv', pdvRoutes);
app.use('/api/otkazi', otkazRoutes);
app.use('/api/pozajmice', pozajmnicaRoutes);
app.use('/api/povracaji', povracajRoutes);
app.use('/api/odluka', odlukaRoutes);
app.use('/api/zadaci', zadaciRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/email', emailRoutes);

// Setup activities endpoint with user filtering
setupActivitiesWithUserFilter(app, authMiddleware);

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

// Statički fajlovi - zadnji da zaštićene rute imaju prioritet
app.use(express.static('public'));

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
