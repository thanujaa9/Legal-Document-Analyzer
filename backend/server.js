const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const analysisController = require('./controllers/analysisController');
const authController = require('./controllers/authController');
const { protect } = require('./middleware/auth');
const { rateLimit } = require('./middleware/rateLimit');

const { initRedis } = require('./config/redis');
const { initQueue, getQueueStats } = require('./config/queue');
const { startWorker } = require('./workers/analysisWorker');
const { ensureDemoUser } = require('./services/demoUserService');

console.log('🔧 Environment loaded');
console.log('📍 PORT:', process.env.PORT || 8081);

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(value => value.trim());
app.use(cors({
  origin: (origin, callback) => (!origin || allowedOrigins.includes(origin)) ? callback(null, true) : callback(new Error('Origin not allowed')),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    status: 'running'
  });
});

const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found');
    }
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4
    });
    
    console.log('✅ MongoDB connected');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

const initGridFS = async () => {
  try {
    const { initGridFS: gridfsInit } = require('./config/gridfs');
    await gridfsInit();
    console.log('✅ GridFS initialized');
    return true;
  } catch (error) {
    console.error('❌ GridFS initialization failed:', error.message);
    return false;
  }
};

const initializeRoutes = () => {
  try {
    const upload = require('./config/multer');
    const uploadController = require('./controllers/uploadController');

    const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, scope: 'auth' });
    const uploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, scope: 'upload' });
    const analysisLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: Number(process.env.ANALYSES_PER_USER_PER_HOUR) || 5, scope: 'analysis' });
    app.post('/api/auth/signup', authLimiter, authController.signup);
    app.post('/api/auth/login', authLimiter, authController.login);

    app.get('/api/auth/me', protect, authController.getMe);

    app.post('/api/documents', protect, uploadLimiter, upload.array('documents', Number(process.env.MAX_FILES_PER_UPLOAD) || 3), uploadController.uploadFiles);
    app.get('/api/documents', protect, uploadController.getAllDocuments);
    app.get('/api/documents/:id', protect, uploadController.getDocument);
    app.delete('/api/documents/:id', protect, uploadController.deleteDocument);
    app.get('/api/documents/:id/download', protect, uploadController.downloadDocument);
    app.get('/api/documents/:id/stream', protect, uploadController.streamDocument);

    app.post('/api/documents/:id/analyze', protect, analysisLimiter, analysisController.analyzeDocument);
    app.get('/api/documents/:id/analysis', protect, analysisController.getAnalysis);
    app.get('/api/jobs/:jobId/status', protect, analysisController.getJobStatus);

    app.post('/api/documents/:id/analysis/clauses/:clauseIndex/notes',
      protect, analysisController.addNoteToClause
    );

    app.put('/api/documents/:id/analysis/clauses/:clauseIndex/notes/:noteIndex',
      protect, analysisController.updateNoteInClause
    );

    app.delete('/api/documents/:id/analysis/clauses/:clauseIndex/notes/:noteIndex',
      protect, analysisController.deleteNoteFromClause
    );

    app.get('/api/documents/:id/analysis/export', protect, analysisController.exportAnalysisPDF);

    return true;
  } catch (error) {
    console.error('❌ Route initialization failed:', error);
    return false;
  }
};

const setupErrorHandlers = () => {
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found'
    });
  });

  app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        code: 'FILE_TOO_LARGE',
        message: `File too large. Maximum size is ${Number(process.env.MAX_FILE_SIZE_MB) || 10}MB`
      });
    }

    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  });
};

const startServer = async () => {
  const PORT = process.env.PORT || 8081;

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  const dbConnected = await connectDB();
  if (!dbConnected) process.exit(1);
  await ensureDemoUser();

  const gridfsReady = await initGridFS();
  if (!gridfsReady) process.exit(1);

  await initRedis();
  initQueue();
  startWorker();

  const routesOk = initializeRoutes();
  if (!routesOk) process.exit(1);

  setupErrorHandlers();

  app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('✅ Server running');
    console.log(`🌐 http://localhost:${PORT}`);
    console.log('========================================');
  });
};

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

startServer().catch(err => {
  console.error('💥 Fatal startup error:', err);
  process.exit(1);
});
