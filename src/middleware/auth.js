const path = require("path");
const fs = require("fs");

// Middleware za autentifikaciju
const authMiddleware = (req, res, next) => {
  console.log("🔐 Auth middleware called for:", req.path);
  console.log("🔐 Session exists:", !!req.session);
  console.log("🔐 User exists:", !!req.session?.user);
  
  if (req.session && req.session.user) {
    console.log("✅ User authenticated, proceeding");
    next(); // korisnik je autentifikovan
  } else {
    console.log("❌ User not authenticated");
    
    // Check if this is an API/AJAX request
    if (
      req.path.startsWith("/api/") ||
      req.headers["content-type"] === "application/json" ||
      req.headers["x-requested-with"] === "XMLHttpRequest" ||
      (req.headers.accept && req.headers.accept.includes("application/json"))
    ) {
      console.log("📡 API request detected, sending JSON error");
      // For API/AJAX requests, return JSON error
      return res.status(401).json({ msg: "Korisnik nije autentifikovan" });
    } else {
      console.log("🌐 Browser request detected, sending HTML page");
      
      // For browser requests, try to send dynamic page, fallback to basic page
      const dynamicPath = path.join(
        __dirname,
        "..",
        "..",
        "public",
        "access-denied-dynamic.html"
      );
      const basicPath = path.join(
        __dirname,
        "..",
        "..",
        "public",
        "access-denied.html"
      );

      console.log("📁 Checking paths:");
      console.log("   Dynamic path:", dynamicPath);
      console.log("   Basic path:", basicPath);
      console.log("   Dynamic exists:", fs.existsSync(dynamicPath));
      console.log("   Basic exists:", fs.existsSync(basicPath));

      // Check if dynamic file exists
      if (fs.existsSync(dynamicPath)) {
        console.log("✅ Sending dynamic access-denied page");
        res.status(401).sendFile(dynamicPath);
      } else if (fs.existsSync(basicPath)) {
        console.log("⚠️ Sending basic access-denied page");
        res.status(401).sendFile(basicPath);
      } else {
        console.log("🚨 Fallback: Sending inline HTML");
        // Ultimate fallback - send HTML directly
        res.status(401).send(`
          <!DOCTYPE html>
          <html lang="sr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pristup zabranjen | Summa Summarum</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
            <style>
              body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
              .container { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); text-align: center; max-width: 500px; }
              .btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; display: inline-block; margin: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1><i class="fas fa-lock text-danger"></i> Pristup zabranjen</h1>
              <p>Morate biti prijavljeni da biste pristupili ovoj stranici.</p>
              <p><small>Debug: Fallback HTML verzija</small></p>
              <a href="/" class="btn"><i class="fas fa-sign-in-alt"></i> Prijavite se</a>
              <a href="/registracija.html" class="btn"><i class="fas fa-user-plus"></i> Registrujte se</a>
            </div>
          </body>
          </html>
        `);
      }
    }
  }
};

module.exports = {
  authMiddleware,
};
