// src/middleware/roleAuth.js
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.session || !req.session.user) {
      if (req.path.startsWith("/api/")) {
        return res.status(401).json({ msg: "Korisnik nije autentifikovan" });
      } else {
        // Redirect to access denied page for HTML requests
        return res.redirect("/access-denied-dynamic.html");
      }
    }

    const userRole = req.session.user.role || "pdv0"; // Default role

    // Check if user has required role
    if (!allowedRoles.includes(userRole)) {
      console.log(
        `🚫 Access denied for role ${userRole}. Required: ${allowedRoles.join(
          ", "
        )}`
      );

      if (req.path.startsWith("/api/")) {
        return res.status(403).json({
          msg: "Nemate dozvolu za pristup ovoj funkcionalnosti",
          requiredRole: allowedRoles,
          userRole: userRole,
        });
      } else {
        // For HTML requests, show access denied page
        return res
          .status(200)
          .sendFile(
            require("path").join(
              __dirname,
              "..",
              "..",
              "public",
              "access-denied-dynamic.html"
            )
          );
      }
    }

    console.log(`✅ Access granted for role ${userRole}`);
    next();
  };
};

// Role definitions and access levels
const ROLES = {
  PDV0: "pdv0", // Only PDV0 (mass download)
  PDV: "pdv", // PDV0 + PDV submissions
  FULL: "full", // PDV0 + PDV + Profit tax
  ADMIN: "admin", // Everything + user management
};

// Helper function to get role permissions
const getRolePermissions = (role) => {
  switch (role) {
    case ROLES.PDV0:
      return ["pdv0"];
    case ROLES.PDV:
      return ["pdv0", "pdv_prijava"];
    case ROLES.FULL:
      return ["pdv0", "pdv_prijava", "dobit_prijava"];
    case ROLES.ADMIN:
      return ["pdv0", "pdv_prijava", "dobit_prijava", "admin"];
    default:
      return ["pdv0"]; // Default minimal access
  }
};

module.exports = {
  requireRole,
  ROLES,
  getRolePermissions,
};
