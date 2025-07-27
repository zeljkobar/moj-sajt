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

    const userRole = req.session.user.role || "firma"; // Default role

    // Check if user has required role
    if (!allowedRoles.includes(userRole)) {
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

    next();
  };
};

// Role definitions and access levels
const ROLES = {
  ADMIN: "admin", // Potpun pristup + upravljanje korisnicima
  FIRMA: "firma", // Može kreirati samo jednu firmu
  AGENCIJA: "agencija", // Može kreirati neograničeno firmi
};

// Helper function to get role permissions
const getRolePermissions = (role) => {
  switch (role) {
    case ROLES.FIRMA:
      return [
        "dashboard",
        "firma_create_single", // Može kreirati samo jednu firmu
        "firma_manage_own", // Upravlja svojom firmom
        "radnici_manage", // Upravljanje radnicima
        "pozicije_manage", // Upravljanje pozicijama
        "ugovori_create", // Kreiranje ugovora
        "pdv_prijava", // PDV prijave
        "dobit_prijava", // Prijave dobiti
        "dokumenti_generate", // Generiranje dokumenata
      ];
    case ROLES.AGENCIJA:
      return [
        "dashboard",
        "firma_create_multiple", // Može kreirati neograničeno firmi
        "firma_manage_all", // Upravlja svim svojim firmama
        "radnici_manage", // Upravljanje radnicima
        "pozicije_manage", // Upravljanje pozicijama
        "ugovori_create", // Kreiranje ugovora
        "pdv_prijava", // PDV prijave
        "dobit_prijava", // Prijave dobiti
        "dokumenti_generate", // Generiranje dokumenata
        "client_management", // Upravljanje klijentima
      ];
    case ROLES.ADMIN:
      return [
        "dashboard",
        "firma_create_multiple",
        "firma_manage_all",
        "radnici_manage",
        "pozicije_manage",
        "ugovori_create",
        "pdv_prijava",
        "dobit_prijava",
        "dokumenti_generate",
        "client_management",
        "admin_panel", // Admin panel
        "user_management", // Upravljanje korisnicima
        "system_settings", // Sistemska podešavanja
        "database_management", // Upravljanje bazom
      ];
    default:
      return ["dashboard"]; // Default minimal access
  }
};

// Helper functions for common role checks
const canCreateMultipleFirms = (role) => {
  return role === ROLES.AGENCIJA || role === ROLES.ADMIN;
};

const canManageAllFirms = (role) => {
  return role === ROLES.AGENCIJA || role === ROLES.ADMIN;
};

const isAdmin = (role) => {
  return role === ROLES.ADMIN;
};

const canAccessAdminPanel = (role) => {
  return role === ROLES.ADMIN;
};

// Middleware for checking if user can create more firms
const checkFirmCreationLimit = async (req, res, next) => {
  try {
    const userRole = req.session.user.role;
    const userId = req.session.user.id;

    // Admin i agencije mogu kreirati neograničeno
    if (canCreateMultipleFirms(userRole)) {
      return next();
    }

    // Proverava da li korisnik tipa "firma" već ima firmu
    if (userRole === ROLES.FIRMA) {
      // Ovde bi trebalo dodati logiku za proveru u bazi
      // const existingFirms = await getUserFirmsCount(userId);
      // if (existingFirms >= 1) {
      //   return res.status(403).json({
      //     error: "Korisnici tipa 'firma' mogu kreirati samo jednu firmu"
      //   });
      // }
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "Greška pri proveri dozvola" });
  }
};

module.exports = {
  requireRole,
  ROLES,
  getRolePermissions,
  canCreateMultipleFirms,
  canManageAllFirms,
  isAdmin,
  canAccessAdminPanel,
  checkFirmCreationLimit,
};
