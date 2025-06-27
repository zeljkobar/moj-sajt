const fs = require("fs");
const path = require("path");

const firmeController = {
  // Helper funkcija za čitanje firmi korisnika
  readUserFirme: (username) => {
    try {
      const filePath = path.join(__dirname, "..", "data", "users", `${username}_firme.json`);
      
      if (!fs.existsSync(filePath)) {
        // Ako fajl ne postoji, kreiraj prazan
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
        return [];
      }
      
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error(`Greška pri čitanju firmi za korisnika ${username}:`, error);
      return [];
    }
  },

  // Helper funkcija za čuvanje firmi korisnika
  saveUserFirme: (username, firme) => {
    try {
      const filePath = path.join(__dirname, "..", "data", "users", `${username}_firme.json`);
      fs.writeFileSync(filePath, JSON.stringify(firme, null, 2));
      return true;
    } catch (error) {
      console.error(`Greška pri čuvanju firmi za korisnika ${username}:`, error);
      return false;
    }
  },

  // GET /api/firme - vraća sve firme za ulogovanog korisnika
  getAllFirme: (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;
      const firme = firmeController.readUserFirme(username);
      
      res.json({ firme });
    } catch (error) {
      console.error("Greška pri dobijanju firmi:", error);
      res.status(500).json({ message: "Greška pri dobijanju firmi" });
    }
  },

  // GET /api/firme/aktivne - vraća samo aktivne firme
  getAktivneFirme: (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;
      const allFirme = firmeController.readUserFirme(username);
      const aktivneFirme = allFirme.filter(firma => firma.status === "active");
      
      res.json(aktivneFirme);
    } catch (error) {
      console.error("Greška pri dobijanju aktivnih firmi:", error);
      res.status(500).json({ message: "Greška pri dobijanju aktivnih firmi" });
    }
  },

  // GET /api/firme/nula - vraća samo firme na nuli
  getFirmeNaNuli: (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;
      const allFirme = firmeController.readUserFirme(username);
      const firmeNaNuli = allFirme.filter(firma => firma.status === "zero");
      
      res.json(firmeNaNuli);
    } catch (error) {
      console.error("Greška pri dobijanju firmi na nuli:", error);
      res.status(500).json({ message: "Greška pri dobijanju firmi na nuli" });
    }
  },

  // POST /api/firme - dodaje novu firmu
  addFirma: (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;
      const { naziv, pib, adresa, pdvBroj, status } = req.body;

      // Validacija
      if (!naziv || !pib || !adresa || !status) {
        return res.status(400).json({ 
          message: "Naziv, PIB, adresa i status su obavezni" 
        });
      }

      // Validacija status-a
      if (!["active", "zero"].includes(status)) {
        return res.status(400).json({ 
          message: "Status mora biti 'active' ili 'zero'" 
        });
      }

      const allFirme = firmeController.readUserFirme(username);

      // Proveri da li firma sa istim PIB-om već postoji
      const postojecaFirma = allFirme.find(f => f.pib === pib);
      if (postojecaFirma) {
        return res.status(400).json({ 
          message: "Firma sa ovim PIB-om već postoji" 
        });
      }

      // Kreiraj novu firmu
      const novaFirma = {
        naziv,
        pib,
        adresa,
        pdvBroj: pdvBroj || "",
        status
      };

      allFirme.push(novaFirma);

      // Sačuvaj
      const success = firmeController.saveUserFirme(username, allFirme);
      if (!success) {
        return res.status(500).json({ message: "Greška pri čuvanju firme" });
      }

      res.json({
        message: "Firma je uspešno dodana",
        firma: novaFirma
      });
    } catch (error) {
      console.error("Greška pri dodavanju firme:", error);
      res.status(500).json({ message: "Greška pri dodavanju firme" });
    }
  },

  // PUT /api/firme/:pib - ažurira postojeću firmu
  updateFirma: (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;
      const { pib } = req.params;
      const { naziv, adresa, pdvBroj, status } = req.body;

      const allFirme = firmeController.readUserFirme(username);
      const firmaIndex = allFirme.findIndex(f => f.pib === pib);

      if (firmaIndex === -1) {
        return res.status(404).json({ message: "Firma nije pronađena" });
      }

      // Ažuriraj firmu
      if (naziv !== undefined) allFirme[firmaIndex].naziv = naziv;
      if (adresa !== undefined) allFirme[firmaIndex].adresa = adresa;
      if (pdvBroj !== undefined) allFirme[firmaIndex].pdvBroj = pdvBroj;
      if (status !== undefined) {
        if (!["active", "zero"].includes(status)) {
          return res.status(400).json({ 
            message: "Status mora biti 'active' ili 'zero'" 
          });
        }
        allFirme[firmaIndex].status = status;
      }

      // Sačuvaj
      const success = firmeController.saveUserFirme(username, allFirme);
      if (!success) {
        return res.status(500).json({ message: "Greška pri ažuriranju firme" });
      }

      res.json({
        message: "Firma je uspešno ažurirana",
        firma: allFirme[firmaIndex]
      });
    } catch (error) {
      console.error("Greška pri ažuriranju firme:", error);
      res.status(500).json({ message: "Greška pri ažuriranju firme" });
    }
  },

  // DELETE /api/firme/:pib - briše firmu
  deleteFirma: (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;
      const { pib } = req.params;

      const allFirme = firmeController.readUserFirme(username);
      const firmaIndex = allFirme.findIndex(f => f.pib === pib);

      if (firmaIndex === -1) {
        return res.status(404).json({ message: "Firma nije pronađena" });
      }

      // Ukloni firmu
      const obrisanaFirma = allFirme.splice(firmaIndex, 1)[0];

      // Sačuvaj
      const success = firmeController.saveUserFirme(username, allFirme);
      if (!success) {
        return res.status(500).json({ message: "Greška pri brisanju firme" });
      }

      res.json({
        message: "Firma je uspešno obrisana",
        firma: obrisanaFirma
      });
    } catch (error) {
      console.error("Greška pri brisanju firme:", error);
      res.status(500).json({ message: "Greška pri brisanju firme" });
    }
  },

  // GET /api/firme/:pib - vraća specifičnu firmu
  getFirmaByPib: (req, res) => {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ message: "Nije autentifikovan" });
      }

      const username = req.session.user.username;
      const { pib } = req.params;

      const allFirme = firmeController.readUserFirme(username);
      const firma = allFirme.find(f => f.pib === pib);

      if (!firma) {
        return res.status(404).json({ message: "Firma nije pronađena" });
      }

      res.json({ firma });
    } catch (error) {
      console.error("Greška pri dobijanju firme:", error);
      res.status(500).json({ message: "Greška pri dobijanju firme" });
    }
  }
};

module.exports = firmeController;
