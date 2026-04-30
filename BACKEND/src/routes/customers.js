const express = require('express');
const router = express.Router();
const { getAll, create, update, remove } = require('../controllers/customerController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/', getAll);
router.post('/', validate(['full_name']), create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
