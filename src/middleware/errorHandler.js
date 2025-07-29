const { logError } = require("../utils/logger");

// Custom error klase
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class AuthError extends AppError {
  constructor(message = "Nemate dozvolu za ovu akciju") {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Pristup zabranjen") {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resurs nije pronađen") {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = "Konflikt podataka") {
    super(message, 409);
  }
}

class ServerError extends AppError {
  constructor(message = "Greška na serveru") {
    super(message, 500, false);
  }
}

// Error handler za development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// Error handler za production
const sendErrorProd = (err, res) => {
  // Operacijski error - pošalji korisniku
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  } else {
    // Programming error - ne otkrivaj detalje
    logError("UNEXPECTED ERROR", err);

    res.status(500).json({
      success: false,
      message: "Nešto je pošlo po zlu!",
    });
  }
};

// Specifični error handleri
const handleCastErrorDB = (err) => {
  const message = `Nevaljan ${err.path}: ${err.value}`;
  return new ValidationError(message);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.message.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplikat vrednosti: ${value}. Molimo koristite drugu vrednost!`;
  return new ConflictError(message);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Nevalidni podaci: ${errors.join(". ")}`;
  return new ValidationError(message);
};

const handleJWTError = () =>
  new AuthError("Nevaljan token. Molimo prijavite se ponovo!");

const handleJWTExpiredError = () =>
  new AuthError("Token je istekao. Molimo prijavite se ponovo!");

// Glavny error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log grešku
  const logData = {
    url: req.url,
    method: req.method,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    userId: req.user ? req.user.id : null,
    body: req.method !== "GET" ? req.body : undefined,
  };

  logError("Global error handler", err, logData);

  // MySQL duplicate entry
  if (err.code === "ER_DUP_ENTRY") {
    error = handleDuplicateFieldsDB(err);
  }

  // MySQL validation error
  if (err.code === "ER_DATA_TOO_LONG") {
    error = new ValidationError("Neki od polja su predugački");
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = handleJWTError();
  }
  if (err.name === "TokenExpiredError") {
    error = handleJWTExpiredError();
  }

  // Validation errors iz express-validator
  if (err.name === "ValidationError") {
    error = handleValidationErrorDB(err);
  }

  // Postavi default status code ako nije postavljen
  error.statusCode = error.statusCode || 500;
  error.status = error.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// Async error catcher
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Handle unhandled routes
const handleNotFound = (req, res, next) => {
  const err = new NotFoundError(
    `Can't find ${req.originalUrl} on this server!`
  );
  next(err);
};

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ServerError,
  globalErrorHandler,
  catchAsync,
  handleNotFound,
};
