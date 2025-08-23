const { body, param, query, validationResult } = require('express-validator');
const { logError } = require('../utils/logger');

// Middleware za provjeru rezultata validacije
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    logError('Validation failed', null, {
      errors: errorMessages,
      url: req.url,
      method: req.method,
      userId: req.user ? req.user.id : null,
    });

    return res.status(400).json({
      success: false,
      message: 'Greška u validaciji podataka',
      errors: errorMessages,
    });
  }
  next();
};

// Validacija za firme
const validateFirma = [
  body('naziv')
    .trim()
    .notEmpty()
    .withMessage('Naziv firme je obavezan')
    .isLength({ min: 2, max: 100 })
    .withMessage('Naziv mora biti između 2 i 100 karaktera'),

  body('pib')
    .trim()
    .notEmpty()
    .withMessage('PIB je obavezan')
    .custom(value => {
      if (value.length === 8 || value.length === 13) {
        return true;
      }
      throw new Error('PIB mora imati 8 ili 13 cifara');
    })
    .isNumeric()
    .withMessage('PIB mora sadržavati samo brojeve'),

  body('adresa')
    .trim()
    .notEmpty()
    .withMessage('Adresa je obavezna')
    .isLength({ max: 200 })
    .withMessage('Adresa ne može biti duža od 200 karaktera'),

  body('grad')
    .trim()
    .notEmpty()
    .withMessage('Grad je obavezan')
    .isLength({ max: 50 })
    .withMessage('Grad ne može biti duži od 50 karaktera'),

  body('pdv_broj')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('PDV broj ne može biti duži od 20 karaktera'),

  body('direktor')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Ime direktora ne može biti duže od 100 karaktera'),

  body('jmbg_direktora')
    .optional()
    .trim()
    .isLength({ min: 13, max: 13 })
    .withMessage('JMBG mora imati tačno 13 cifara')
    .isNumeric()
    .withMessage('JMBG mora sadržavati samo brojeve'),

  handleValidationErrors,
];

// Validacija za radnike
const validateRadnik = [
  body('ime')
    .trim()
    .notEmpty()
    .withMessage('Ime je obavezno')
    .isLength({ min: 2, max: 50 })
    .withMessage('Ime mora biti između 2 i 50 karaktera')
    .matches(/^[a-zA-ZšđčćžŠĐČĆŽ\s]+$/)
    .withMessage('Ime može sadržavati samo slova'),

  body('prezime')
    .trim()
    .notEmpty()
    .withMessage('Prezime je obavezno')
    .isLength({ min: 2, max: 50 })
    .withMessage('Prezime mora biti između 2 i 50 karaktera')
    .matches(/^[a-zA-ZšđčćžŠĐČĆŽ\s]+$/)
    .withMessage('Prezime može sadržavati samo slova'),

  body('jmbg')
    .trim()
    .notEmpty()
    .withMessage('JMBG je obavezan')
    .isLength({ min: 13, max: 13 })
    .withMessage('JMBG mora imati tačno 13 cifara')
    .isNumeric()
    .withMessage('JMBG mora sadržavati samo brojeve'),

  body('adresa')
    .trim()
    .notEmpty()
    .withMessage('Adresa je obavezna')
    .isLength({ max: 200 })
    .withMessage('Adresa ne može biti duža od 200 karaktera'),

  body('grad')
    .trim()
    .notEmpty()
    .withMessage('Grad je obavezan')
    .isLength({ max: 50 })
    .withMessage('Grad ne može biti duži od 50 karaktera'),

  body('pozicija_id')
    .notEmpty()
    .withMessage('Pozicija je obavezna')
    .isInt({ min: 1 })
    .withMessage('Pozicija mora biti valjan broj'),

  body('firma_id')
    .notEmpty()
    .withMessage('Firma je obavezna')
    .isInt({ min: 1 })
    .withMessage('Firma mora biti valjan broj'),

  body('datum_zaposlenja')
    .notEmpty()
    .withMessage('Datum zaposlenja je obavezan')
    .isISO8601()
    .withMessage('Datum zaposlenja mora biti valjan datum'),

  body('visina_zarade')
    .notEmpty()
    .withMessage('Visina zarade je obavezna')
    .isFloat({ min: 0 })
    .withMessage('Visina zarade mora biti pozitivan broj'),

  body('tip_radnog_vremena')
    .notEmpty()
    .withMessage('Tip radnog vremena je obavezan')
    .isIn(['puno_8h', 'skraceno_6h', 'skraceno_4h', 'skraceno_2h'])
    .withMessage('Nevaljan tip radnog vremena'),

  body('tip_ugovora')
    .notEmpty()
    .withMessage('Tip ugovora je obavezan')
    .isIn(['na_neodredjeno', 'na_odredjeno'])
    .withMessage('Nevaljan tip ugovora'),

  body('vrsta_ugovora')
    .notEmpty()
    .withMessage('Vrsta ugovora je obavezna')
    .isIn([
      'ugovor_o_radu',
      'ugovor_o_djelu',
      'ugovor_o_dopunskom_radu',
      'autorski_ugovor',
      'ugovor_o_pozajmnici',
    ])
    .withMessage('Nevaljna vrsta ugovora'),

  body('datum_prestanka')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Datum prestanka mora biti valjan datum'),

  handleValidationErrors,
];

// Validacija za edit radnika (bez vrsta_ugovora jer se ne menja)
const validateRadnikEdit = [
  body('ime')
    .trim()
    .notEmpty()
    .withMessage('Ime je obavezno')
    .isLength({ min: 2, max: 50 })
    .withMessage('Ime mora biti između 2 i 50 karaktera')
    .matches(/^[a-zA-ZšđčćžŠĐČĆŽ\s]+$/)
    .withMessage('Ime može sadržavati samo slova'),

  body('prezime')
    .trim()
    .notEmpty()
    .withMessage('Prezime je obavezno')
    .isLength({ min: 2, max: 50 })
    .withMessage('Prezime mora biti između 2 i 50 karaktera')
    .matches(/^[a-zA-ZšđčćžŠĐČĆŽ\s]+$/)
    .withMessage('Prezime može sadržavati samo slova'),

  body('jmbg')
    .trim()
    .notEmpty()
    .withMessage('JMBG je obavezan')
    .isLength({ min: 13, max: 13 })
    .withMessage('JMBG mora imati tačno 13 cifara')
    .isNumeric()
    .withMessage('JMBG mora sadržavati samo brojeve'),

  body('adresa')
    .trim()
    .notEmpty()
    .withMessage('Adresa je obavezna')
    .isLength({ max: 200 })
    .withMessage('Adresa ne može biti duža od 200 karaktera'),

  body('grad')
    .trim()
    .notEmpty()
    .withMessage('Grad je obavezan')
    .isLength({ max: 50 })
    .withMessage('Grad ne može biti duži od 50 karaktera'),

  body('pozicija_id')
    .notEmpty()
    .withMessage('Pozicija je obavezna')
    .isInt({ min: 1 })
    .withMessage('Pozicija mora biti valjan broj'),

  body('firma_id')
    .notEmpty()
    .withMessage('Firma je obavezna')
    .isInt({ min: 1 })
    .withMessage('Firma mora biti valjan broj'),

  body('datum_zaposlenja')
    .notEmpty()
    .withMessage('Datum zaposlenja je obavezan')
    .isISO8601()
    .withMessage('Datum zaposlenja mora biti valjan datum'),

  body('visina_zarade')
    .notEmpty()
    .withMessage('Visina zarade je obavezna')
    .isFloat({ min: 0 })
    .withMessage('Visina zarade mora biti pozitivan broj'),

  body('tip_radnog_vremena')
    .notEmpty()
    .withMessage('Tip radnog vremena je obavezan')
    .isIn(['puno_8h', 'skraceno_6h', 'skraceno_4h', 'skraceno_2h'])
    .withMessage('Nevaljan tip radnog vremena'),

  body('tip_ugovora')
    .notEmpty()
    .withMessage('Tip ugovora je obavezan')
    .isIn(['na_neodredjeno', 'na_odredjeno'])
    .withMessage('Nevaljan tip ugovora'),

  // Nema vrsta_ugovora jer se ne menja pri editu

  body('datum_prestanka')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Datum prestanka mora biti valjan datum'),

  handleValidationErrors,
];

// Validacija za pozajmice
const validatePozajmica = [
  body('broj_ugovora')
    .trim()
    .notEmpty()
    .withMessage('Broj ugovora je obavezan')
    .isLength({ max: 50 })
    .withMessage('Broj ugovora ne može biti duži od 50 karaktera'),

  body('datum_izdavanja')
    .notEmpty()
    .withMessage('Datum izdavanja je obavezan')
    .isISO8601()
    .withMessage('Datum izdavanja mora biti valjan datum'),

  body('pozajmilac_tip')
    .optional()
    .isIn(['radnik', 'zajmodavac'])
    .withMessage("Pozajmilac tip mora biti 'radnik' ili 'zajmodavac'"),

  body('radnik_id')
    .if(body('pozajmilac_tip').equals('radnik'))
    .notEmpty()
    .withMessage("Radnik je obavezan kada je pozajmilac tip 'radnik'")
    .isInt({ min: 1 })
    .withMessage('Radnik mora biti valjan broj'),

  body('zajmodavac_id')
    .if(body('pozajmilac_tip').equals('zajmodavac'))
    .notEmpty()
    .withMessage("Zajmodavac je obavezan kada je pozajmilac tip 'zajmodavac'")
    .isInt({ min: 1 })
    .withMessage('Zajmodavac mora biti valjan broj'),

  body('iznos')
    .notEmpty()
    .withMessage('Iznos je obavezan')
    .isFloat({ min: 0.01 })
    .withMessage('Iznos mora biti pozitivan broj veći od 0'),

  body('svrha')
    .trim()
    .notEmpty()
    .withMessage('Svrha pozajmice je obavezna')
    .isIn(['obaveze_zarade', 'obaveze_dobavljaci'])
    .withMessage('Nevaljna svrha pozajmice'),

  body('datum_dospeca')
    .optional()
    .isISO8601()
    .withMessage('Datum dospeća mora biti valjan datum'),

  handleValidationErrors,
];

// Validacija za ID parametre
const validateId = [
  param('id').isInt({ min: 1 }).withMessage('ID mora biti pozitivan broj'),

  handleValidationErrors,
];

// Validacija za firma ID parametre
const validateFirmaId = [
  param('firmaId')
    .isInt({ min: 1 })
    .withMessage('Firma ID mora biti pozitivan broj'),

  handleValidationErrors,
];

// Validacija za auth
const validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Korisničko ime je obavezno')
    .isLength({ min: 3 })
    .withMessage('Korisničko ime mora imati najmanje 3 karaktera'),

  body('password')
    .notEmpty()
    .withMessage('Lozinka je obavezna')
    .isLength({ min: 6 })
    .withMessage('Lozinka mora imati najmanje 6 karaktera'),

  handleValidationErrors,
];

const validateRegistration = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Korisničko ime je obavezno')
    .isLength({ min: 3, max: 20 })
    .withMessage('Korisničko ime mora biti između 3 i 20 karaktera')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Korisničko ime može sadržavati samo slova, brojeve i _'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email je obavezan')
    .isEmail()
    .withMessage('Email mora biti valjan')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Lozinka je obavezna')
    .isLength({ min: 6 })
    .withMessage('Lozinka mora imati najmanje 6 karaktera'),

  body('ime')
    .trim()
    .notEmpty()
    .withMessage('Ime je obavezno')
    .isLength({ min: 2, max: 50 })
    .withMessage('Ime mora biti između 2 i 50 karaktera'),

  body('prezime')
    .trim()
    .notEmpty()
    .withMessage('Prezime je obavezno')
    .isLength({ min: 2, max: 50 })
    .withMessage('Prezime mora biti između 2 i 50 karaktera'),

  body('jmbg')
    .trim()
    .notEmpty()
    .withMessage('JMBG je obavezan')
    .isLength({ min: 13, max: 13 })
    .withMessage('JMBG mora imati tačno 13 cifara')
    .isNumeric()
    .withMessage('JMBG mora sadržavati samo brojeve'),

  body('userType')
    .optional()
    .isIn(['firma', 'agencija'])
    .withMessage('Nevaljan tip korisnika'),

  handleValidationErrors,
];

// Validacija za pozicije
const validatePozicija = [
  body('naziv')
    .trim()
    .notEmpty()
    .withMessage('Naziv pozicije je obavezan')
    .isLength({ min: 2, max: 100 })
    .withMessage('Naziv mora biti između 2 i 100 karaktera'),

  body('opis_poslova')
    .trim()
    .notEmpty()
    .withMessage('Opis poslova je obavezan')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Opis poslova mora biti između 10 i 1000 karaktera'),

  handleValidationErrors,
];

// Validacija za zajmodavce
const validateZajmodavac = [
  body('ime')
    .trim()
    .notEmpty()
    .withMessage('Ime je obavezno')
    .isLength({ min: 2, max: 50 })
    .withMessage('Ime mora biti između 2 i 50 karaktera')
    .matches(/^[a-zA-ZšđčćžŠĐČĆŽ\s]+$/)
    .withMessage('Ime može sadržavati samo slova i razmake'),

  body('prezime')
    .trim()
    .notEmpty()
    .withMessage('Prezime je obavezno')
    .isLength({ min: 2, max: 50 })
    .withMessage('Prezime mora biti između 2 i 50 karaktera')
    .matches(/^[a-zA-ZšđčćžŠĐČĆŽ\s]+$/)
    .withMessage('Prezime može sadržavati samo slova i razmake'),

  body('jmbg')
    .optional({ nullable: true })
    .isLength({ min: 13, max: 13 })
    .withMessage('JMBG mora imati tačno 13 cifara')
    .isNumeric()
    .withMessage('JMBG može sadržavati samo brojeve'),

  body('ziro_racun')
    .optional({ nullable: true })
    .isLength({ min: 15, max: 20 })
    .withMessage('Žiro račun mora biti između 15 i 20 karaktera'),

  handleValidationErrors,
];

module.exports = {
  validateFirma,
  validateRadnik,
  validateRadnikEdit,
  validatePozajmica,
  validateZajmodavac,
  validateId,
  validateFirmaId,
  validateLogin,
  validateRegistration,
  validatePozicija,
  handleValidationErrors,
};
