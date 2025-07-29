const winston = require("winston");
const path = require("path");

// Kreiraj logs direktorijum ako ne postoji
const fs = require("fs");
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Kreiraj logger konfiguraciju
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "summa-summarum" },
  transports: [
    // Error fajlovi
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Access logs
    new winston.transports.File({
      filename: path.join(logsDir, "access.log"),
      level: "info",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Ako nismo u production, dodaj console output
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Helper funkcije za različite tipove logova
const logInfo = (message, meta = {}) => {
  logger.info(message, meta);
};

const logError = (message, error = null, meta = {}) => {
  const logData = { ...meta };
  if (error) {
    logData.error = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }
  logger.error(message, logData);
};

const logWarning = (message, meta = {}) => {
  logger.warn(message, meta);
};

const logDebug = (message, meta = {}) => {
  logger.debug(message, meta);
};

// Middleware za logovanje HTTP zahteva
const httpLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      userId: req.user ? req.user.id : null,
    };

    if (res.statusCode >= 400) {
      logError(
        `HTTP ${res.statusCode} - ${req.method} ${req.url}`,
        null,
        logData
      );
    } else {
      logInfo(`HTTP ${res.statusCode} - ${req.method} ${req.url}`, logData);
    }
  });

  next();
};

module.exports = {
  logger,
  logInfo,
  logError,
  logWarning,
  logDebug,
  httpLogger,
};
