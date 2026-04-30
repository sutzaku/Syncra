const express = require('express');
const router = express.Router();
const { getStock, getMovements, adjust } = require('../controllers/stockController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/', getStock);
router.get('/movements', getMovements);
router.post('/adjust', authorize('admin', 'manager'), validate(['product_variant_id', 'quantity_change', 'movement_type']), adjust);

module.exports = router;
