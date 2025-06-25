// Dummy korisnici - u produkcioj bi ovo bila prava baza
const users = [{ id: 1, username: "admin", password: "12345" }];

const authController = {
  // Login
  login: (req, res) => {
    const { username, password } = req.body;
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      req.session.user = user; // čuvanje korisnika u sesiji
      res.json({ success: true });
    } else {
      res.status(401).json({ message: "Pogrešno korisničko ime ili lozinka" });
    }
  },

  // Provera autentifikacije
  checkAuth: (req, res) => {
    if (req.session && req.session.user) {
      res.json({ authenticated: true, user: req.session.user });
    } else {
      res.json({ authenticated: false });
    }
  },

  // Logout
  logout: (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  },
};

module.exports = authController;
