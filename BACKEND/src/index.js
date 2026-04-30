const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────
app.use('/api/health',      require('./routes/health'));
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/categories',  require('./routes/categories'));
app.use('/api/products',    require('./routes/products'));
app.use('/api/addons',      require('./routes/addons'));
app.use('/api/orders',      require('./routes/orders'));
app.use('/api/payments',    require('./routes/payments'));
app.use('/api/stock',       require('./routes/stock'));
app.use('/api/customers',   require('./routes/customers'));

// ── 404 handler ────────────────────────────
app.use((req, res) => {
    res.status(404).json({ status: 'error', message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ── Global error handler (must be last) ────
app.use(errorHandler);

// ── Start server ───────────────────────────
app.listen(port, () => {
    console.log(`\n🚀 Syncra POS Backend running on http://localhost:${port}`);
    console.log(`   Health check: http://localhost:${port}/api/health\n`);
});
