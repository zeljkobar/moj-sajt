// src/controllers/userController.js
const bcrypt = require("bcrypt");
const { executeQuery } = require("../config/database");

// GET /api/users
exports.getUsers = async (req, res) => {
  try {
    const users = await executeQuery(
      "SELECT id, username, email, ime, prezime, phone, jmbg, created_at FROM users"
    );
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// POST /api/users
exports.createUser = async (req, res) => {
  try {
    const { username, password, email, phone, ime, prezime, jmbg } = req.body;

    if (!username || !password || !email || !ime || !prezime || !jmbg) {
      return res.status(400).json({ msg: "Sva obavezna polja su potrebna" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await executeQuery(
      "INSERT INTO users (username, password, email, phone, ime, prezime, jmbg) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [username, hashedPassword, email, phone, ime, prezime, jmbg]
    );

    res
      .status(201)
      .json({ msg: "Korisnik kreiran uspešno", id: result.insertId });
  } catch (error) {
    console.error("Error creating user:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ msg: "Korisničko ime, email ili JMBG već postoji" });
    }

    res.status(500).json({ msg: "Server error" });
  }
};

// GET /api/user/current - Get current logged in user data
exports.getCurrentUser = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ msg: "Nema validne sesije" });
    }

    const username = req.session.user.username;

    const users = await executeQuery(
      "SELECT id, username, email, ime, prezime, phone, jmbg, role, created_at FROM users WHERE username = ?",
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({ msg: "Korisnik nije pronađen" });
    }

    res.json(users[0]);
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// PUT /api/user/profile - Update current user's profile
exports.updateProfile = async (req, res) => {
  try {
    const username = req.session.user.username;
    const { ime, prezime, email, phone, currentPassword } = req.body;

    if (!ime || !prezime || !email || !currentPassword) {
      return res
        .status(400)
        .json({ msg: "Ime, prezime, email i trenutna lozinka su obavezni" });
    }

    // First verify current password
    const users = await executeQuery(
      "SELECT password FROM users WHERE username = ?",
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({ msg: "Korisnik nije pronađen" });
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      users[0].password
    );

    if (!isValidPassword) {
      return res.status(400).json({ msg: "Trenutna lozinka nije ispravna" });
    }

    // Check if email is already taken by another user
    const emailCheck = await executeQuery(
      "SELECT id FROM users WHERE email = ? AND username != ?",
      [email, username]
    );

    if (emailCheck.length > 0) {
      return res
        .status(400)
        .json({ msg: "Email već postoji kod drugog korisnika" });
    }

    // Update user profile
    await executeQuery(
      "UPDATE users SET ime = ?, prezime = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?",
      [ime, prezime, email, phone || null, username]
    );

    res.json({ msg: "Profil je uspešno ažuriran" });
  } catch (error) {
    console.error("Error updating profile:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ msg: "Email već postoji" });
    }

    res.status(500).json({ msg: "Server error" });
  }
};

// PUT /api/users/change-password - Change current user's password
exports.changePassword = async (req, res) => {
  try {
    console.log("Change password request received");
    console.log("Session:", req.session);
    console.log("Session user:", req.session?.user);

    if (!req.session || !req.session.user) {
      return res.status(401).json({ msg: "Korisnik nije autentifikovan" });
    }

    const username = req.session.user.username;
    console.log("Username from session:", username);

    if (!username) {
      return res.status(400).json({ msg: "Username nije pronađen u sesiji" });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;
    console.log("Request body:", {
      hasCurrentPassword: !!currentPassword,
      hasNewPassword: !!newPassword,
      hasConfirmPassword: !!confirmPassword,
      newPasswordLength: newPassword?.length,
    });

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ msg: "Sva polja su obavezna" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ msg: "Nova lozinka mora imati najmanje 6 karaktera" });
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ msg: "Nova lozinka i potvrda se ne poklapaju" });
    }

    // Get current user's password
    const users = await executeQuery(
      "SELECT password FROM users WHERE username = ?",
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({ msg: "Korisnik nije pronađen" });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      users[0].password
    );

    if (!isValidPassword) {
      return res.status(400).json({ msg: "Trenutna lozinka nije ispravna" });
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, users[0].password);

    if (isSamePassword) {
      return res
        .status(400)
        .json({ msg: "Nova lozinka mora biti različita od trenutne" });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await executeQuery(
      "UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?",
      [hashedNewPassword, username]
    );

    res.json({ msg: "Lozinka je uspešno promenjena" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// GET /api/users/:id
exports.getUserById = async (req, res) => {
  try {
    const users = await executeQuery(
      "SELECT id, username, email, ime, prezime, phone, jmbg, created_at FROM users WHERE id = ?",
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(users[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

// PUT /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { username, email, ime, prezime, phone } = req.body;

    if (!username || !email || !ime || !prezime) {
      return res.status(400).json({ msg: "Obavezna polja su potrebna" });
    }

    await executeQuery(
      "UPDATE users SET username = ?, email = ?, ime = ?, prezime = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [username, email, ime, prezime, phone || null, req.params.id]
    );

    res.json({ msg: "Korisnik ažuriran uspešno" });
  } catch (error) {
    console.error("Error updating user:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ msg: "Korisničko ime ili email već postoji" });
    }

    res.status(500).json({ msg: "Server error" });
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const result = await executeQuery("DELETE FROM users WHERE id = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({ msg: "Korisnik obrisan uspešno" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ msg: "Server error" });
  }
};
