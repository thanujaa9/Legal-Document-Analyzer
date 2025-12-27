// backend/workers/analysisWorker.js
const { getAnalysisQueue } = require('../config/queue');
const Document = require('../models/Document');
const Analysis = require('../models/Analysis');
const { extractTextFromDocument } = require('../services/extractionService');
const { analyzeDocument } = require('../services/aiService');
const { cacheHelpers } = require('../config/redis');

/**
 * Process a single analysis job
 * @param {Object} job - Bull job object
 * @returns {Object} - Processing result
 */
const processAnalysisJob = async (job) => {
  const { documentId } = job.data;
  
  try {
    console.log(`🔍 Worker processing document: ${documentId}`);
    
    // Update progress: 10%
    await job.progress(10);

    // 1. Find document
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Check if already analyzed and cached
    const cacheKey = `analysis:${documentId}`;
    const cachedAnalysis = await cacheHelpers.get(cacheKey);
    
    if (cachedAnalysis) {
      console.log('✅ Using cached analysis');
      return {
        success: true,
        fromCache: true,
        analysis: cachedAnalysis
      };
    }

    // 2. Update document status to processing
    document.status = 'processing';
    document.processingProgress = 10;
    await document.save();
    
    await job.progress(20);
    console.log('✅ Document status updated to processing');

    // 3. Extract text from document
    console.log('📄 Extracting text from document...');
    const { text, pageCount } = await extractTextFromDocument(
      document.gridFsId,
      document.fileType
    );

    if (!text || text.length < 100) {
      throw new Error('Extracted text is too short or empty');
    }

    document.extractedText = text;
    document.pageCount = pageCount;
    document.processingProgress = 40;
    await document.save();
    
    await job.progress(40);
    console.log(`✅ Text extracted successfully (${text.length} characters, ${pageCount} pages)`);

    // 4. Analyze with OpenAI
    console.log('🤖 Analyzing document with AI...');
    const startTime = Date.now();
    
    const aiResult = await analyzeDocument(text, document.originalName);
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ AI analysis complete in ${processingTime}ms`);

    document.processingProgress = 80;
    await document.save();
    
    await job.progress(80);

    // 5. Save analysis to database
    console.log('💾 Saving analysis to database...');
    const analysis = new Analysis({
      document: document._id,
      summary: aiResult.summary,
      clauses: aiResult.clauses,
      risks: aiResult.risks,
      overallRiskScore: aiResult.overallRiskScore,
      keyFindings: aiResult.keyFindings || [],
      recommendations: aiResult.recommendations || [],
      processingTime,
      aiModel: aiResult.aiModel,
      tokensUsed: aiResult.tokensUsed
    });

    await analysis.save();
    console.log('✅ Analysis saved to database');

    // 6. Cache the analysis (14 days = 1,209,600 seconds)
    await cacheHelpers.set(cacheKey, analysis, 1209600);
    console.log('✅ Analysis cached for 14 days');

    // 7. Update document with analysis reference
    document.analysis = analysis._id;
    document.status = 'analyzed';
    document.processingProgress = 100;
    await document.save();

    await job.progress(100);
    console.log('🎉 Worker completed analysis successfully!');

    return {
      success: true,
      fromCache: false,
      document: {
        id: document._id,
        status: document.status,
        pageCount: document.pageCount
      },
      analysis: {
        id: analysis._id,
        summary: analysis.summary,
        clausesCount: analysis.clauses.length,
        risksCount: analysis.risks.length,
        overallRiskScore: analysis.overallRiskScore,
        processingTime: analysis.processingTime
      }
    };

  } catch (error) {
    console.error('❌ Worker error:', error);

    // Update document status to error
    try {
      await Document.findByIdAndUpdate(documentId, {
        status: 'error',
        errorMessage: error.message,
        processingProgress: 0
      });
      console.log('📝 Document status updated to error');
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    // Re-throw error so Bull can handle retry
    throw error;
  }
};

/**
 * Start the analysis worker
 * Processes jobs from the analysis queue with concurrency of 2
 */
const startWorker = () => {
  const queue = getAnalysisQueue();
  
  if (!queue) {
    console.log('⚠️  Analysis queue not available, worker not started');
    console.log('   Server will continue but analysis will be synchronous');
    return;
  }

  console.log('👷 Starting analysis worker...');
  console.log('   Concurrency: 2 (can process 2 documents simultaneously)');
  console.log('   Auto-retry: 3 attempts on failure');

  // Process jobs with concurrency of 2
  // This means 2 documents can be analyzed at the same time
  queue.process(2, async (job) => {
    console.log(`📋 Worker picked up job: ${job.id}`);
    return await processAnalysisJob(job);
  });

  // Event listeners for monitoring
  queue.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed successfully`);
    if (result.fromCache) {
      console.log('   Result served from cache');
    } else {
      console.log(`   Processed in ${result.analysis?.processingTime}ms`);
    }
  });

  queue.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed:`, err.message);
    console.log(`   Attempt ${job.attemptsMade} of 3`);
  });

  queue.on('stalled', (job) => {
    console.warn(`⚠️  Job ${job.id} stalled (taking too long)`);
  });

  queue.on('progress', (job, progress) => {
    console.log(`📊 Job ${job.id} progress: ${progress}%`);
  });

  console.log('✅ Analysis worker started successfully');
  console.log('   Ready to process analysis jobs');
};

module.exports = {
  processAnalysisJob,
  startWorker
};