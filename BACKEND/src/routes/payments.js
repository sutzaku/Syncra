const express = require('express');
const router = express.Router();
const { create, getByOrder, getMethods } = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/methods', getMethods);
router.get('/', getByOrder);
router.post('/', validate(['order_id', 'payment_method_id', 'amount']), create);

module.exports = router;
