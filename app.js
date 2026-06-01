require('dotenv').config();
const express = require('express');
const cors = require('cors');
const YAML = require('yamljs');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const { getDb } = require('./src/config/database');
const authRoutes = require('./src/routes/authRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// Swagger docs
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger/swagger.yaml'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'Expense Tracker API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Expense Tracker API is running', version: '1.0.0' });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the Expense Tracker API',
    docs: '/docs',
    health: '/health',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handler — never expose stack traces
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred. Please try again later.',
  });
});

// Start server after DB is ready
async function startServer() {
  try {
    await getDb();
    console.log('✅ Database initialized');

    app.listen(PORT, () => {
      console.log(`\n🚀 Expense Tracker API running on http://localhost:${PORT}`);
      console.log(`📄 Swagger docs at http://localhost:${PORT}/docs`);
      console.log(`💚 Health check at http://localhost:${PORT}/health\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
