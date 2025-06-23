// src/controllers/userController.js

// Privremena lista korisnika u memoriji
let users = [[{ id: 1, name: "zeljko", password: "john@example.com" }]];
let nextId = 2;

// GET /api/users
exports.getUsers = (req, res) => {
  res.json(users);
};

// POST /api/users
exports.createUser = (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    return res.status(400).json({ msg: "Name and password are required" });
  }
  const newUser = { id: nextId++, name, password };
  users.push(newUser);
  res.status(201).json(newUser);
};

// GET /api/users/:id
exports.getUserById = (req, res) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ msg: "User not found" });
  res.json(user);
};

// PUT /api/users/:id
exports.updateUser = (req, res) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ msg: "User not found" });

  const { name, email } = req.body;
  if (name) user.name = name;
  if (email) user.email = email;
  res.json(user);
};

// DELETE /api/users/:id
exports.deleteUser = (req, res) => {
  const idx = users.findIndex((u) => u.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ msg: "User not found" });
  const deleted = users.splice(idx, 1);
  res.json(deleted[0]);
};
