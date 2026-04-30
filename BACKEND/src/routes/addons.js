const express = require('express');
const router = express.Router();
const { getAll, create, update, remove } = require('../controllers/addonController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/', getAll);
router.post('/', authorize('admin', 'manager'), validate(['name', 'price']), create);
router.put('/:id', authorize('admin', 'manager'), update);
router.delete('/:id', authorize('admin'), remove);

module.exports = router;
