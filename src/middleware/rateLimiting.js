const rateLimit = require("express-rate-limit");
const { logWarning } = require("../utils/logger");

// Osnovni rate limiter za sve zahteve
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 1000, // maksimalno 1000 zahteva po IP adresi
  message: {
    success: false,
    message: "Previše zahteva sa ove IP adrese, pokušajte ponovo za 15 minuta.",
    retryAfter: 15 * 60, // sekunde
  },
  standardHeaders: true, // Vrati rate limit info u `RateLimit-*` headers
  legacyHeaders: false, // Onemogući `X-RateLimit-*` headers
  handler: (req, res) => {
    logWarning("Rate limit exceeded - General", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      url: req.url,
      method: req.method,
    });

    res.status(429).json({
      success: false,
      message:
        "Previše zahteva sa ove IP adrese, pokušajte ponovo za 15 minuta.",
      retryAfter: 15 * 60,
    });
  },
});

// Strožiji limit za login/registraciju
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 15, // maksimalno 15 pokušaja prijave po IP adresi (povećano sa 5)
  message: {
    success: false,
    message: "Previše pokušaja prijave. Pokušajte ponovo za 15 minuta.",
    retryAfter: 15 * 60,
  },
  skipSuccessfulRequests: true, // Ne računaj uspešne zahteve
  handler: (req, res) => {
    logWarning("Rate limit exceeded - Auth", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      url: req.url,
      method: req.method,
      email: req.body?.email,
    });

    res.status(429).json({
      success: false,
      message: "Previše pokušaja prijave. Pokušajte ponovo za 15 minuta.",
      retryAfter: 15 * 60,
    });
  },
});

// Oštriji limit za API operacije koje menjaju podatke
const apiWriteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minuta
  max: 50, // maksimalno 50 POST/PUT/DELETE zahteva po IP adresi
  message: {
    success: false,
    message: "Previše izmena podataka. Pokušajte ponovo za 5 minuta.",
    retryAfter: 5 * 60,
  },
  skip: (req) => req.method === "GET", // Preskoči GET zahteve
  handler: (req, res) => {
    logWarning("Rate limit exceeded - API Write", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      url: req.url,
      method: req.method,
      userId: req.user ? req.user.id : null,
    });

    res.status(429).json({
      success: false,
      message: "Previše izmena podataka. Pokušajte ponovo za 5 minuta.",
      retryAfter: 5 * 60,
    });
  },
});

// Specifičan limit za upload operacije
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 sat
  max: 10, // maksimalno 10 upload-a po IP adresi
  message: {
    success: false,
    message: "Previše upload operacija. Pokušajte ponovo za 1 sat.",
    retryAfter: 60 * 60,
  },
  handler: (req, res) => {
    logWarning("Rate limit exceeded - Upload", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      url: req.url,
      method: req.method,
      userId: req.user ? req.user.id : null,
    });

    res.status(429).json({
      success: false,
      message: "Previše upload operacija. Pokušajte ponovo za 1 sat.",
      retryAfter: 60 * 60,
    });
  },
});

// Blažji limit za čitanje podataka
const apiReadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minut
  max: 100, // maksimalno 100 GET zahteva po IP adresi
  message: {
    success: false,
    message: "Previše zahteva za čitanje. Pokušajte ponovo za 1 minut.",
    retryAfter: 1 * 60,
  },
  skip: (req) => req.method !== "GET", // Samo GET zahtevi
  handler: (req, res) => {
    logWarning("Rate limit exceeded - API Read", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      url: req.url,
      method: req.method,
      userId: req.user ? req.user.id : null,
    });

    res.status(429).json({
      success: false,
      message: "Previše zahteva za čitanje. Pokušajte ponovo za 1 minut.",
      retryAfter: 1 * 60,
    });
  },
});

// Middleware koji automatski primenjuje odgovarajući limiter na osnovu rute
const smartRateLimiter = (req, res, next) => {
  const path = req.path.toLowerCase();

  // Preskoči rate limiting za browser well-known rute
  if (path.includes("/.well-known/") || path.includes("/favicon.ico")) {
    return next();
  }

  // Auth rute
  if (path.includes("/login") || path.includes("/register")) {
    return authLimiter(req, res, next);
  }

  // Upload rute
  if (path.includes("/upload") || path.includes("/file")) {
    return uploadLimiter(req, res, next);
  }

  // API write operacije
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return apiWriteLimiter(req, res, next);
  }

  // API read operacije
  if (req.method === "GET" && path.startsWith("/api/")) {
    return apiReadLimiter(req, res, next);
  }

  // Opšti limiter za sve ostalo
  return generalLimiter(req, res, next);
};

module.exports = {
  general: generalLimiter,
  auth: authLimiter,
  api: apiWriteLimiter,
  read: apiReadLimiter,
  upload: uploadLimiter,
  smart: smartRateLimiter,
  // Legacy exports
  generalLimiter,
  authLimiter,
  apiWriteLimiter,
  uploadLimiter,
  apiReadLimiter,
  smartRateLimiter,
};
