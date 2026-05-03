const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const controller = require('../controllers/mjesecneObavezeController');

router.use(authMiddleware);

router.get('/mjeseci', controller.listMonths);
router.get('/firma/:firmaId', controller.getFirmOverview);
router.get('/', controller.getOverview);
router.post('/kreiraj', controller.createMonth);
router.post('/update', controller.updateStatus);

module.exports = router;
