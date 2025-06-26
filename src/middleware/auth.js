const path = require("path");

// Middleware za autentifikaciju
const authMiddleware = (req, res, next) => {
  if (req.session && req.session.user) {
    next(); // korisnik je autentifikovan
  } else {
    // Pošalji lepu HTML stranicu za neautentifikovane korisnike
    res
      .status(401)
      .sendFile(
        path.join(__dirname, "..", "..", "public", "access-denied.html")
      );
  }
};

module.exports = {
  authMiddleware,
};
