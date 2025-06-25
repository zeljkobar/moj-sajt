// Middleware za autentifikaciju
const authMiddleware = (req, res, next) => {
  if (req.session && req.session.user) {
    next(); // korisnik je autentifikovan
  } else {
    res.status(401).send("pristup zabranjen. ulogujte se");
  }
};

module.exports = {
  authMiddleware,
};
