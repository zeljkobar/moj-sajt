const path = require("path");

// Middleware za autentifikaciju
const authMiddleware = (req, res, next) => {
  if (req.session && req.session.user) {
    next(); // korisnik je autentifikovan
  } else {
    // Check if this is an API/AJAX request
    if (
      req.path.startsWith("/api/") ||
      req.headers["content-type"] === "application/json" ||
      req.headers["x-requested-with"] === "XMLHttpRequest" ||
      (req.headers.accept && req.headers.accept.includes("application/json"))
    ) {
      // For API/AJAX requests, return JSON error
      return res.status(401).json({ msg: "Korisnik nije autentifikovan" });
    } else {
      // For browser requests, send HTML page with additional context
      res
        .status(401)
        .sendFile(
          path.join(__dirname, "..", "..", "public", "access-denied-dynamic.html")
        );
    }
  }
};

module.exports = {
  authMiddleware,
};
