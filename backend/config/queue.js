const Bull = require('bull');

let analysisQueue = null;

const initQueue = () => {
  try {
    console.log('🐂 Initializing Bull Queue...');
    
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log('📍 Redis URL:', redisUrl);

    analysisQueue = new Bull('document-analysis', redisUrl, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 200
      }
    });

    analysisQueue.on('waiting', (jobId) => {
      console.log(`📋 Job ${jobId} is waiting`);
    });

    analysisQueue.on('active', (job) => {
      console.log(`🔄 Job ${job.id} started processing`);
    });

    analysisQueue.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed successfully`);
    });

    analysisQueue.on('failed', (job, err) => {
      console.error(`❌ Job ${job.id} failed:`, err.message);
    });

    analysisQueue.on('progress', (job, progress) => {
      console.log(`📊 Job ${job.id} progress: ${progress}%`);
    });

    analysisQueue.on('stalled', (job) => {
      console.warn(`⚠️  Job ${job.id} stalled`);
    });

    console.log('✅ Bull Queue initialized successfully');

    return analysisQueue;
  } catch (error) {
    console.error('❌ Bull Queue initialization failed:', error.message);
    console.log('⚠️  Running without queue processing');
    return null;
  }
};

const getAnalysisQueue = () => {
  return analysisQueue;
};

const getQueueStats = async () => {
  if (!analysisQueue) {
    return { error: 'Queue not initialized' };
  }

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      analysisQueue.getWaitingCount(),
      analysisQueue.getActiveCount(),
      analysisQueue.getCompletedCount(),
      analysisQueue.getFailedCount(),
      analysisQueue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return { error: error.message };
  }
};

const getJob = async (jobId) => {
  if (!analysisQueue) return null;
  try {
    return await analysisQueue.getJob(jobId);
  } catch (error) {
    console.error('Error getting job:', error);
    return null;
  }
};

const cleanQueue = async (grace = 1000) => {
  if (!analysisQueue) return false;
  try {
    await analysisQueue.clean(grace, 'completed');
    await analysisQueue.clean(grace, 'failed');
    console.log('✅ Queue cleaned');
    return true;
  } catch (error) {
    console.error('Error cleaning queue:', error);
    return false;
  }
};

module.exports = {
  initQueue,
  getAnalysisQueue,
  getQueueStats,
  getJob,
  cleanQueue
};
