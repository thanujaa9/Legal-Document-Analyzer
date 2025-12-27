const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Controllers
const analysisController = require('./controllers/analysisController');
const authController = require('./controllers/authController');
const { protect } = require('./middleware/auth');

// Redis and Queue
const { initRedis } = require('./config/redis');
const { initQueue, getQueueStats } = require('./config/queue');
const { startWorker } = require('./workers/analysisWorker');

console.log('🔧 Environment loaded');
console.log('📍 PORT:', process.env.PORT || 8081);
console.log('📍 MongoDB URI exists:', !!process.env.MONGODB_URI);
console.log('📍 JWT Secret exists:', !!process.env.JWT_SECRET);
console.log('📍 Redis URL:', process.env.REDIS_URL || 'redis://localhost:6379');

const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

console.log('✅ Middleware configured');

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', async (req, res) => {
  const queueStats = await getQueueStats();
  
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    dbConnected: mongoose.connection.readyState === 1,
    features: {
      authentication: true,
      redisCache: !!process.env.REDIS_URL,
      bullQueue: queueStats.error ? false : true
    },
    queueStats: queueStats
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Legal Document Analyzer API',
    status: 'running',
    features: ['Authentication', 'Redis Cache', 'Bull Queue', 'Background Processing']
  });
});

console.log('✅ Health routes registered');

// ============================================
// DATABASE CONNECTION
// ============================================
const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      throw new Error('❌ MONGODB_URI not found in .env file');
    }

    console.log('');
    console.log('🌐 Connecting to MongoDB Atlas...');
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4
    });
    
    console.log('✅ MongoDB Atlas Connected');
    console.log('📍 Database:', mongoose.connection.name);
    console.log('🌍 Host:', mongoose.connection.host);
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    return false;
  }
};

// ============================================
// GRIDFS INITIALIZATION
// ============================================
const initGridFS = async () => {
  try {
    console.log('🔧 Initializing GridFS...');
    const { initGridFS: gridfsInit } = require('./config/gridfs');
    await gridfsInit();
    console.log('✅ GridFS initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ GridFS initialization failed:', error.message);
    return false;
  }
};

// ============================================
// ROUTES INITIALIZATION
// ============================================
const initializeRoutes = () => {
  try {
    console.log('');
    console.log('🛣️  Starting route initialization...');
    
    const upload = require('./config/multer');
    const uploadController = require('./controllers/uploadController');
    
    console.log('📦 Step 1: Registering PUBLIC routes...');
    
    // ============================================
    // PUBLIC ROUTES (No authentication required)
    // ============================================
    app.post('/api/auth/signup', authController.signup);
    app.post('/api/auth/login', authController.login);
    
    console.log('  ✓ POST /api/auth/signup (public)');
    console.log('  ✓ POST /api/auth/login (public)');
    
    console.log('');
    console.log('📦 Step 2: Registering PROTECTED routes...');
    
    // ============================================
    // PROTECTED ROUTES (Authentication required)
    // ============================================
    
    // User info
    app.get('/api/auth/me', protect, authController.getMe);
    console.log('  ✓ GET /api/auth/me (protected)');
    
    // Document upload & management
    app.post('/api/documents', protect, upload.array('documents', 10), 
      uploadController.uploadFiles
    );
    console.log('  ✓ POST /api/documents (protected)');
    
    app.get('/api/documents', protect, uploadController.getAllDocuments);
    console.log('  ✓ GET /api/documents (protected)');
    
    app.get('/api/documents/:id', protect, uploadController.getDocument);
    console.log('  ✓ GET /api/documents/:id (protected)');
    
    app.delete('/api/documents/:id', protect, uploadController.deleteDocument);
    console.log('  ✓ DELETE /api/documents/:id (protected)');
    
    app.get('/api/documents/:id/download', protect, uploadController.downloadDocument);
    console.log('  ✓ GET /api/documents/:id/download (protected)');
    
    app.get('/api/documents/:id/stream', protect, uploadController.streamDocument);
    console.log('  ✓ GET /api/documents/:id/stream (protected)');
    
    // Analysis routes (with queue support)
    app.post('/api/documents/:id/analyze', protect, analysisController.analyzeDocument);
    console.log('  ✓ POST /api/documents/:id/analyze (protected, queued)');
    
    app.get('/api/documents/:id/analysis', protect, analysisController.getAnalysis);
    console.log('  ✓ GET /api/documents/:id/analysis (protected, cached)');
    
    // Job status route (NEW)
    app.get('/api/jobs/:jobId/status', protect, analysisController.getJobStatus);
    console.log('  ✓ GET /api/jobs/:jobId/status (protected)');
    
    // Notes routes
    app.post('/api/documents/:id/analysis/clauses/:clauseIndex/notes', 
      protect, analysisController.addNoteToClause
    );
    console.log('  ✓ POST /api/documents/:id/analysis/clauses/:clauseIndex/notes (protected)');
    
    app.put('/api/documents/:id/analysis/clauses/:clauseIndex/notes/:noteIndex', 
      protect, analysisController.updateNoteInClause
    );
    console.log('  ✓ PUT /api/documents/:id/analysis/clauses/:clauseIndex/notes/:noteIndex (protected)');
    
    app.delete('/api/documents/:id/analysis/clauses/:clauseIndex/notes/:noteIndex', 
      protect, analysisController.deleteNoteFromClause
    );
    console.log('  ✓ DELETE /api/documents/:id/analysis/clauses/:clauseIndex/notes/:noteIndex (protected)');
    
    // PDF Export
    app.get('/api/documents/:id/analysis/export', protect, analysisController.exportAnalysisPDF);
    console.log('  ✓ GET /api/documents/:id/analysis/export (protected)');
    
    console.log('✅ All routes registered');
    return true;
  } catch (error) {
    console.error('❌ Route initialization failed:', error);
    return false;
  }
};

// ============================================
// ERROR HANDLERS
// ============================================
const setupErrorHandlers = () => {
  console.log('🛡️  Setting up error handlers...');
  
  app.use((req, res, next) => {
    console.log('⚠️  404 Not Found:', req.method, req.path);
    res.status(404).json({
      success: false,
      error: 'Route not found',
      method: req.method,
      path: req.originalUrl
    });
  });
  
  app.use((err, req, res, next) => {
    console.error('❌ Error caught:', err.message);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB'
      });
    }
    
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  });
  
  console.log('✅ Error handlers configured');
};

// ============================================
// START SERVER
// ============================================
const startServer = async () => {
  const PORT = process.env.PORT || 8081;

  console.log('');
  console.log('========================================');
  console.log('🚀 Legal Document Analyzer');
  console.log('========================================');
  console.log('');

  // Step 1: Connect to MongoDB
  console.log('STEP 1: Database Connection');
  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.error('❌ FATAL: Database connection failed');
    process.exit(1);
  }

  // Step 2: Initialize GridFS
  console.log('');
  console.log('STEP 2: GridFS Setup');
  const gridfsReady = await initGridFS();
  if (!gridfsReady) {
    console.error('❌ FATAL: GridFS initialization failed');
    process.exit(1);
  }

  // Step 3: Initialize Redis (optional, won't crash if fails)
  console.log('');
  console.log('STEP 3: Redis Setup');
  await initRedis();
  // Redis is optional - server continues even if Redis fails

  // Step 4: Initialize Bull Queue (optional)
  console.log('');
  console.log('STEP 4: Bull Queue Setup');
  initQueue();
  // Queue is optional - server continues even if queue fails

  // Step 5: Start Background Worker
  console.log('');
  console.log('STEP 5: Starting Background Worker');
  startWorker();

  // Step 6: Stabilize connections
  console.log('');
  console.log('STEP 6: Stabilizing connections...');
  await new Promise(resolve => setTimeout(resolve, 1500));
  console.log('✅ Connections stable');

  // Step 7: Initialize routes
  console.log('');
  console.log('STEP 7: Route Registration');
  const routesOk = initializeRoutes();
  if (!routesOk) {
    console.error('❌ FATAL: Route initialization failed');
    process.exit(1);
  }

  // Step 8: Setup error handlers
  console.log('');
  console.log('STEP 8: Error Handlers');
  setupErrorHandlers();

  // Step 9: Start HTTP server
  console.log('');
  console.log('STEP 9: Starting HTTP Server');

  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('========================================');
    console.log('✅ SERVER FULLY OPERATIONAL');
    console.log('========================================');
    console.log(`🌐 URL:        http://localhost:${PORT}`);
    console.log(`💚 Health:     http://localhost:${PORT}/api/health`);
    console.log(`🔐 Signup:     POST http://localhost:${PORT}/api/auth/signup`);
    console.log(`🔐 Login:      POST http://localhost:${PORT}/api/auth/login`);
    console.log('========================================');
    console.log('💾 MongoDB:    Connected');
    console.log('🔴 Redis:      Ready (14-day cache)');
    console.log('🐂 Bull Queue: Processing jobs');
    console.log('👷 Worker:     Active (Concurrency: 2)');
    console.log('🔐 Auth:       JWT Protected');
    console.log('========================================');
    console.log('');
    console.log('🎯 Ready to accept requests!');
    console.log('');
  });
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down...');
  await mongoose.connection.close();
  console.log('✅ Database closed');
  process.exit(0);
});

// Start the server
startServer().catch(err => {
  console.error('💥 Fatal error during startup:', err);
  process.exit(1);
});