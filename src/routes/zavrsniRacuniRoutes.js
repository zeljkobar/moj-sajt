const express = require('express');
const router = express.Router();
const zavrsniRacuniController = require('../controllers/zavrsniRacuniController');
const { authMiddleware } = require('../middleware/auth');

// Sve rute su zaštićene
router.use(authMiddleware);

router.get('/:godina', zavrsniRacuniController.getZavrsniRacuni);
router.post('/update', zavrsniRacuniController.updateStatus);

module.exports = router;
