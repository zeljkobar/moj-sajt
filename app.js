require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = process.env.PORT || 3000;
const userRoutes = require("./src/routes/userRoutes");
const cors = require("cors");
// parsiranje JSON i form-data
app.use(
  cors({
    origin: "http://localhost:5000", // promeni ako koristiš drugi port
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 👇 Dummy korisnik za test
const users = [{ username: "admin", password: "12345" }];

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    res.json({ success: true });
  } else {
    res.status(401).json({ message: "Pogrešno korisničko ime ili lozinka" });
  }
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// in-memory CRUD za “users”
app.use("/api/users", userRoutes);

// fallback 404
app.use((req, res) => {
  res.status(404).json({ msg: "Ruta nije pronađena" });
});

// globalni error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ msg: "Server error" });
});

app.listen(port, () => {
  console.log(`🚀 Server radi na http://localhost:${port}`);
});
