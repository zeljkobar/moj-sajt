require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;
const { executeQuery } = require('./src/config/database');
const userRoutes = require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');
const firmeRoutes = require('./src/routes/firmeRoutes');
const irmsRoutes = require('./src/routes/irmsRoutes');
const contractRoutes = require('./src/routes/contractRoutes');
const radnikRoutes = require('./src/routes/radnikRoutes');
const pozicijeRoutes = require('./src/routes/pozicijeRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const pdvRoutes = require('./src/routes/pdvRoutes');
const mjesecneObavezeRoutes = require('./src/routes/mjesecneObavezeRoutes');
const otkazRoutes = require('./src/routes/otkazRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const pozajmnicaRoutes = require('./src/routes/pozajmnicaRoutes');
const zajmodavciRoutes = require('./src/routes/zajmodavci');
const povracajRoutes = require('./src/routes/povracajRoutes');
const odlukaRoutes = require('./src/routes/odlukaRoutes');
const zadaciRoutes = require('./src/routes/zadaciRoutes');
const emailRoutes = require('./src/routes/emailRoutes');
const godisnjiomdoriRoutes = require('./src/routes/godisnjiomdori');
const oglasiRoutes = require('./src/routes/oglasiRoutes');
const zavrsniRacuniRoutes = require('./src/routes/zavrsniRacuniRoutes');
const { authMiddleware } = require('./src/middleware/auth');
const { requireRole, ROLES } = require('./src/middleware/roleAuth');
const { subscriptionMiddleware } = require('./src/middleware/subscription');
const { domainMiddleware } = require('./src/middleware/domain');
const InventoryService = require('./src/services/inventoryService');
const {
  runContractExpiryReminderJob,
} = require('./src/services/contractReminderService');
const {
  runAutomaticIrmsImportForPreviousDay,
  getPreviousDayYmd,
} = require('./src/services/irmsDailyImportService');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

// Pokušaj da učitaš Redis pakete
let redisClient = null;
let RedisStore = null;
const useRedisSessions = process.env.USE_REDIS_SESSIONS === 'true';
try {
  if (useRedisSessions) {
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
    redisClient.connect().catch(err => {
      console.error('Failed to connect to Redis:', err);
      redisClient = null;
    });
  }
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
const { smartRateLimiter } = require('./src/middleware/rateLimiting');

// parsiranje JSON i form-data
const allowedOrigins = [
  'http://localhost:3000',
  'https://summasummarum.me',
  'http://summasummarum.me',
  'https://www.summasummarum.me',
  'http://www.summasummarum.me',
  'https://mojradnik.me',
  'http://mojradnik.me',
  'https://www.mojradnik.me',
  'http://www.mojradnik.me',
  'https://prijaviradnika.com',
  'http://prijaviradnika.com',
  'https://www.prijaviradnika.com',
  'http://www.prijaviradnika.com',
  'http://185.102.78.178',
  'https://185.102.78.178',
];

app.use(smartRateLimiter);

// HTTP request logging
if (process.env.NODE_ENV === 'production') {
  app.use(httpLogger);
}

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
  proxy: process.env.NODE_ENV === 'production',
  name: 'summa.sid', // Custom session name
  store:
    redisClient && RedisStore
      ? new RedisStore({
          client: redisClient,
          prefix: 'sess:',
        })
      : undefined,
  cookie: {
    secure: process.env.NODE_ENV === 'production' ? 'auto' : false,
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
  if (useRedisSessions) {
    console.warn(
      '   Set USE_REDIS_SESSIONS=true only when Redis is reachable.'
    );
  }
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

app.use(domainMiddleware);

// HTML/page routes
app.use(require('./src/routes/pageRoutes'));

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
    const isAdmin = req.session.user.role === 'admin';

    console.log(
      '[app.js /api/firme/id/:id] ID:',
      firmaId,
      'User:',
      userId,
      'IsAdmin:',
      isAdmin
    );

    let firma;
    if (isAdmin) {
      // Admin može vidjeti bilo koju firmu
      firma = await executeQuery('SELECT * FROM firme WHERE id = ?', [firmaId]);
    } else {
      // Obični korisnik samo svoje firme
      firma = await executeQuery(
        'SELECT * FROM firme WHERE id = ? AND user_id = ?',
        [firmaId, userId]
      );
    }

    if (firma.length === 0) {
      console.log('[app.js /api/firme/id/:id] Firma NOT FOUND');
      return res.status(404).json({ message: 'Firma nije pronađena' });
    }

    console.log('[app.js /api/firme/id/:id] Firma FOUND:', firma[0].naziv);
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

const dashboardStatsCache = new Map();
const DASHBOARD_STATS_CACHE_TTL_MS = 60 * 1000;

// API ruta za dashboard statistike
app.get('/api/dashboard-stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { executeQuery } = require('./src/config/database');
    const cacheKey = String(userId);
    const cached = dashboardStatsCache.get(cacheKey);

    if (
      req.query.refresh !== '1' &&
      cached &&
      Date.now() - cached.createdAt < DASHBOARD_STATS_CACHE_TTL_MS
    ) {
      res.set('X-Dashboard-Stats-Cache', 'HIT');
      return res.json(cached.payload);
    }

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}-01`;
    const nextMonthStartDate = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );
    const nextMonthStart = `${nextMonthStartDate.getFullYear()}-${String(
      nextMonthStartDate.getMonth() + 1
    ).padStart(2, '0')}-01`;

    // Osnovne statistike firmi
    const [firmeStats, radniciStats, ugovoriMjesec] = await Promise.all([
      executeQuery(
        'SELECT status, COUNT(*) as count FROM firme WHERE user_id = ? GROUP BY status',
        [userId]
      ),
      // Statistike radnika - aktivni su oni bez otkaza
      executeQuery(
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
      ),
      // Ugovori ovaj mjesec
      executeQuery(
        `
      SELECT COUNT(*) as count 
      FROM radnici r 
      JOIN firme f ON r.firma_id = f.id 
      WHERE f.user_id = ? 
        AND r.datum_zaposlenja >= ?
        AND r.datum_zaposlenja < ?
    `,
        [userId, monthStart, nextMonthStart]
      ),
    ]);

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

    const payload = {
      total: total,
      aktivne: aktivne,
      naNuli: naNuli,
      procenatNaNuli: procenatNaNuli,
      aktivniRadnici: aktivniRadnici,
      ugovoriMjesec: ugovoriMjesecCount,
    };

    dashboardStatsCache.set(cacheKey, {
      createdAt: Date.now(),
      payload,
    });
    res.set('X-Dashboard-Stats-Cache', 'MISS');
    res.json(payload);
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
app.use('/api/irms', irmsRoutes);
app.use('/api', contractRoutes);
app.use('/api/radnici', radnikRoutes);
app.use('/api/pozicije', pozicijeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/pdv', pdvRoutes);
app.use('/api/mjesecne-obaveze', mjesecneObavezeRoutes);
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
app.use('/api/oglasi', oglasiRoutes);
app.use('/api/zavrsni-racuni', zavrsniRacuniRoutes);

// Marketing and email-admin routes
app.use(require('./src/routes/marketingRoutes'));

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

// Serve email templates (admin only)
app.use(
  '/email-templates',
  authMiddleware,
  requireRole([ROLES.ADMIN]),
  express.static(path.join(__dirname, 'email-templates'))
);

// Serve domain-specific assets directly
app.use(
  '/summasummarum',
  express.static(path.join(__dirname, 'public', 'summasummarum'))
);
app.use(
  '/mojradnik',
  express.static(path.join(__dirname, 'public', 'mojradnik'))
);
app.use(
  '/prijaviradnika',
  express.static(path.join(__dirname, 'public', 'prijaviradnika'))
);

// Statički fajlovi - zadnji da zaštićene rute imaju prioritet
// app.use(express.static('public')); // Zakomentarisano - koristimo specifične rute umesto

// Middleware za nepostojece rute (mora biti nakon svih validnih ruta)
app.use(handleNotFound);

// Globalni error handler (mora biti poslednji middleware)
app.use(globalErrorHandler);

let server;
let contractReminderInterval = null;
let irmsDailyImportInterval = null;
let irmsDailyImportRunning = false;
let irmsDailyImportLastRunDate = '';

async function runAutomaticContractReminders() {
  try {
    const daysBefore = Math.max(
      1,
      Number(process.env.CONTRACT_REMINDER_DAYS_BEFORE || 10)
    );

    const summary = await runContractExpiryReminderJob({ daysBefore });
    logInfo('Contract reminder job finished', { summary });
  } catch (error) {
    logError('Contract reminder job failed', error);
  }
}

function startContractReminderScheduler() {
  const remindersEnabled =
    String(process.env.ENABLE_CONTRACT_EXPIRY_REMINDERS || 'true').toLowerCase() !==
    'false';

  if (!remindersEnabled) {
    return;
  }

  const intervalMs = Math.max(
    60 * 60 * 1000,
    Number(process.env.CONTRACT_REMINDER_INTERVAL_MS || 6 * 60 * 60 * 1000)
  );

  runAutomaticContractReminders();
  contractReminderInterval = setInterval(runAutomaticContractReminders, intervalMs);

  logInfo('Contract reminder scheduler started', {
    intervalMs,
    daysBefore: Number(process.env.CONTRACT_REMINDER_DAYS_BEFORE || 10),
  });
}

async function runAutomaticIrmsDailyImport() {
  if (irmsDailyImportRunning) {
    return;
  }

  const now = new Date();
  const runHour = Math.max(0, Math.min(23, Number(process.env.IRMS_DAILY_IMPORT_HOUR || 3)));
  const todayKey = now.toISOString().slice(0, 10);

  if (now.getHours() < runHour) {
    return;
  }

  if (irmsDailyImportLastRunDate === todayKey) {
    return;
  }

  irmsDailyImportRunning = true;

  try {
    const summary = await runAutomaticIrmsImportForPreviousDay();
    irmsDailyImportLastRunDate = todayKey;

    logInfo('IRMS daily import finished', {
      summary,
      runHour,
      executedAt: now.toISOString(),
      importedDate: summary.registrationDate || getPreviousDayYmd(now),
    });
  } catch (error) {
    logError('IRMS daily import failed', error);
  } finally {
    irmsDailyImportRunning = false;
  }
}

function startIrmsDailyImportScheduler() {
  const importEnabled =
    String(process.env.ENABLE_IRMS_DAILY_IMPORT || 'true').toLowerCase() !== 'false';

  if (!importEnabled) {
    return;
  }

  const intervalMs = Math.max(
    10 * 60 * 1000,
    Number(process.env.IRMS_DAILY_IMPORT_CHECK_INTERVAL_MS || 30 * 60 * 1000)
  );

  runAutomaticIrmsDailyImport();
  irmsDailyImportInterval = setInterval(runAutomaticIrmsDailyImport, intervalMs);

  logInfo('IRMS daily import scheduler started', {
    intervalMs,
    runHour: Math.max(0, Math.min(23, Number(process.env.IRMS_DAILY_IMPORT_HOUR || 3))),
    importsPreviousDay: true,
  });
}

if (require.main === module) {
  // Listen on all interfaces, not just localhost
  server = app.listen(port, '0.0.0.0', () => {
    if (process.env.IISNODE_VERSION) {
      logInfo('Server started', { environment: 'IIS with iisnode', port });
      console.log(`🚀 Server running on IIS with iisnode`);
    } else {
      logInfo('Server started', { environment: 'development', port });
      console.log(`🚀 Server radi na http://0.0.0.0:${port}`);
    }

    startContractReminderScheduler();
    startIrmsDailyImportScheduler();
  });

  // PRODUCTION: Graceful shutdown
  const shutdownGracefully = async () => {
    console.log('\n⚠️  Shutting down gracefully...');

    if (contractReminderInterval) {
      clearInterval(contractReminderInterval);
      contractReminderInterval = null;
    }

    if (irmsDailyImportInterval) {
      clearInterval(irmsDailyImportInterval);
      irmsDailyImportInterval = null;
    }

    server.close(() => {
      logInfo('Process terminated');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => {
    logInfo('SIGINT received. Shutting down gracefully');
    shutdownGracefully();
  });

  process.on('SIGTERM', () => {
    logInfo('SIGTERM received. Shutting down gracefully');
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
}

module.exports = app;
