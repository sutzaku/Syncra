const express = require('express');
const router = express.Router();
const { getAll, getById, create } = require('../controllers/orderController');
const { updateStatus, getStatusLogs, getAllStatuses } = require('../controllers/orderStatusController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/', getAll);
router.get('/statuses', getAllStatuses);
router.get('/:id', getById);
router.post('/', validate(['items']), create);
router.put('/:id/status', validate(['status_name']), updateStatus);
router.get('/:id/status-logs', getStatusLogs);

module.exports = router;
