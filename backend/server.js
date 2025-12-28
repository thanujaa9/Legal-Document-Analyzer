const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const analysisController = require('./controllers/analysisController');
const authController = require('./controllers/authController');
const { protect } = require('./middleware/auth');

const { initRedis } = require('./config/redis');
const { initQueue, getQueueStats } = require('./config/queue');
const { startWorker } = require('./workers/analysisWorker');

console.log('🔧 Environment loaded');
console.log('📍 PORT:', process.env.PORT || 8081);

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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

    app.post('/api/auth/signup', authController.signup);
    app.post('/api/auth/login', authController.login);

    app.get('/api/auth/me', protect, authController.getMe);

    app.post('/api/documents', protect, upload.array('documents', 10), uploadController.uploadFiles);
    app.get('/api/documents', protect, uploadController.getAllDocuments);
    app.get('/api/documents/:id', protect, uploadController.getDocument);
    app.delete('/api/documents/:id', protect, uploadController.deleteDocument);
    app.get('/api/documents/:id/download', protect, uploadController.downloadDocument);
    app.get('/api/documents/:id/stream', protect, uploadController.streamDocument);

    app.post('/api/documents/:id/analyze', protect, analysisController.analyzeDocument);
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
        message: 'File too large. Maximum size is 50MB'
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

  const dbConnected = await connectDB();
  if (!dbConnected) process.exit(1);

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
