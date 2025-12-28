// backend/controllers/analysisController.js
const Document = require('../models/Document');
const Analysis = require('../models/Analysis');
const { extractTextFromDocument } = require('../services/extractionService');
const { analyzeDocument: analyzeWithAI } = require('../services/aiService');
const { generateAnalysisPDF } = require('../services/pdfExportService');

// Redis setup
let redisClient;
let cacheHelpers;
try {
  const redis = require('../config/redis');
  redisClient = redis.client;
  cacheHelpers = redis.cacheHelpers;
  console.log('✅ Redis configured');
} catch (err) {
  console.log('⚠️  Redis not configured, skipping cache');
  redisClient = null;
  cacheHelpers = {
    get: async () => null,
    set: async () => {},
    del: async () => {}
  };
}

// Bull queue setup
let analysisQueue;
try {
  const { getAnalysisQueue } = require('../config/queue');
  analysisQueue = getAnalysisQueue();
  console.log('✅ Bull queue configured');
} catch (err) {
  console.log('⚠️  Bull queue not configured, processing immediately');
  analysisQueue = null;
}

// ============================================
// BACKGROUND PROCESSING FUNCTION
// ============================================
const processAnalysisInBackground = async (documentId, forceRefresh) => {
  let document;
  
  try {
    document = await Document.findById(documentId);
    if (!document) {
      console.error('❌ Document not found:', documentId);
      return;
    }

    console.log('🔄 Background processing started for:', documentId);

    //  Starting (10%)
    await new Promise(resolve => setTimeout(resolve, 500));
    document.processingProgress = 10;
    await document.save();
    console.log('📍 Progress: 10% - Starting extraction');

    // Extract text (20% → 50%)
    console.log('📄 Extracting text from document...');
    document.processingProgress = 20;
    await document.save();
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { text, pageCount } = await extractTextFromDocument(
      document.gridFsId,
      document.fileType
    );

    if (!text || text.length < 100) {
      throw new Error('Extracted text is too short or empty');
    }

    document.extractedText = text;
    document.pageCount = pageCount;
    document.processingProgress = 50;
    await document.save();
    console.log(`📍 Progress: 50% - Text extracted (${text.length} chars, ${pageCount} pages)`);

    //  AI Analysis (60% → 85%)
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('🤖 Starting AI analysis...');
    document.processingProgress = 60;
    await document.save();
    console.log('📍 Progress: 60% - AI analyzing');

    const startTime = Date.now();
    const aiResult = await analyzeWithAI(text, document.originalName);
    const processingTime = Date.now() - startTime;

    document.processingProgress = 85;
    await document.save();
    console.log(`📍 Progress: 85% - AI complete (${processingTime}ms)`);

    // Save Analysis (90% → 95%)
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('💾 Saving analysis to database...');
    document.processingProgress = 90;
    await document.save();

    const analysis = await Analysis.findOneAndUpdate(
      { document: document._id },
      {
        $set: {
          summary: aiResult.summary,
          clauses: aiResult.clauses,
          risks: aiResult.risks,
          overallRiskScore: aiResult.overallRiskScore,
          keyFindings: aiResult.keyFindings || [],
          recommendations: aiResult.recommendations || [],
          processingTime,
          aiModel: aiResult.aiModel || 'gpt-4o-mini',
          tokensUsed: aiResult.tokensUsed,
          analyzedAt: new Date()
        }
      },
      { 
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    document.processingProgress = 95;
    await document.save();
    console.log('📍 Progress: 95% - Analysis saved');

    // Cache the analysis
    if (redisClient && redisClient.isReady) {
      try {
        await cacheHelpers.set(`analysis:${documentId}`, analysis, 3600);
        console.log('💾 Analysis cached in Redis');
      } catch (cacheErr) {
        console.error('Cache store error:', cacheErr);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    document.analysis = analysis._id;
    document.status = 'analyzed';
    document.processingProgress = 100;
    await document.save();

    console.log('🎉 Analysis complete (100%)!');

  } catch (error) {
    console.error('❌ Background processing error:', error.message);
    console.error('📍 Stack:', error.stack);

    try {
      await Document.findByIdAndUpdate(documentId, {
        status: 'error',
        errorMessage: error.message,
        processingProgress: 0
      });
      console.log('❌ Document marked as error');
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }
  }
};

// ============================================
// ANALYZE DOCUMENT 
// ============================================
exports.analyzeDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const forceRefresh = req.query.force === 'true';
    
    console.log('🔍 Analyze request for document:', id);
    if (forceRefresh) {
      console.log('⚠️  Force refresh requested');
    }

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    if (!forceRefresh && redisClient && redisClient.isReady) {
      try {
        const cacheKey = `analysis:${id}`;
        const cachedData = await cacheHelpers.get(cacheKey);
        
        if (cachedData) {
          console.log('⚡ Cache hit - returning cached analysis');
          
          return res.json({
            success: true,
            message: 'Analysis retrieved from cache',
            cached: true,
            fromCache: true,
            analysis: {
              id: cachedData._id,
              summary: cachedData.summary,
              clausesCount: cachedData.clauses.length,
              risksCount: cachedData.risks.length,
              overallRiskScore: cachedData.overallRiskScore
            }
          });
        }
      } catch (cacheError) {
        console.error('Cache error:', cacheError);
      }
    }

    if (!forceRefresh && document.status === 'analyzed') {
      const existingAnalysis = await Analysis.findOne({ document: id });
      
      if (existingAnalysis) {
        console.log('✅ Found existing analysis in database');
        
        if (redisClient && redisClient.isReady) {
          try {
            await cacheHelpers.set(`analysis:${id}`, existingAnalysis, 3600);
          } catch (err) {
            console.error('Cache store error:', err);
          }
        }

        return res.json({
          success: true,
          message: 'Document already analyzed',
          cached: false,
          fromCache: true,
          analysis: {
            id: existingAnalysis._id,
            summary: existingAnalysis.summary,
            clausesCount: existingAnalysis.clauses.length,
            risksCount: existingAnalysis.risks.length,
            overallRiskScore: existingAnalysis.overallRiskScore
          }
        });
      }
    }

    if (forceRefresh) {
      console.log('🔄 Force refresh - deleting old data');
      
      if (redisClient && redisClient.isReady) {
        try {
          await cacheHelpers.del(`analysis:${id}`);
          console.log('🗑️  Cache deleted');
        } catch (err) {
          console.error('Cache delete error:', err);
        }
      }
      
      try {
        await Analysis.deleteOne({ document: id });
        console.log('🗑️  Old analysis deleted');
      } catch (err) {
        console.error('Analysis delete error:', err);
      }
    }

    document.status = 'processing';
    document.processingProgress = 5;
    document.errorMessage = undefined;
    await document.save();
    console.log('✅ Status: processing (5%)');

    res.json({
      success: true,
      message: 'Analysis started',
      cached: false,
      fromCache: false,
      document: {
        id: document._id,
        status: document.status,
        processingProgress: document.processingProgress
      }
    });

    console.log('🚀 Starting background processing...');
    setImmediate(() => {
      processAnalysisInBackground(id, forceRefresh);
    });

  } catch (error) {
    console.error('❌ Analysis error:', error.message);
    console.error('📍 Stack:', error.stack);

    try {
      await Document.findByIdAndUpdate(req.params.id, {
        status: 'error',
        errorMessage: error.message,
        processingProgress: 0
      });
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    res.status(500).json({
      success: false,
      message: 'Analysis failed to start',
      error: error.message
    });
  }
};

exports.getAnalysis = async (req, res) => {
  try {
    const { id } = req.params;

    const cacheKey = `analysis:${id}`;
    const cachedAnalysis = await cacheHelpers.get(cacheKey);
    
    if (cachedAnalysis) {
      console.log('✅ Returning cached analysis');
      return res.json({
        success: true,
        fromCache: true,
        analysis: cachedAnalysis
      });
    }

    const analysis = await Analysis.findOne({ document: id })
      .populate('document', 'originalName uploadDate fileType');

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found. Please analyze the document first.'
      });
    }

    await cacheHelpers.set(cacheKey, analysis, 3600);
    console.log('✅ Analysis cached');

    res.json({
      success: true,
      fromCache: false,
      analysis
    });

  } catch (error) {
    console.error('❌ Get analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analysis',
      error: error.message
    });
  }
};


exports.addNoteToClause = async (req, res) => {
  try {
    const { id, clauseIndex } = req.params;
    const { noteText } = req.body;

    if (!noteText || noteText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Note text is required'
      });
    }

    const analysis = await Analysis.findOne({ document: id });
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    const index = parseInt(clauseIndex);
    if (index < 0 || index >= analysis.clauses.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clause index'
      });
    }

    const newNote = {
      text: noteText.trim(),
      createdAt: new Date()
    };

    analysis.clauses[index].notes.push(newNote);
    await analysis.save();

    await cacheHelpers.del(`analysis:${id}`);
    console.log('✅ Note added, cache invalidated');

    res.json({
      success: true,
      message: 'Note added successfully',
      note: newNote
    });

  } catch (error) {
    console.error('❌ Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note',
      error: error.message
    });
  }
};

exports.updateNoteInClause = async (req, res) => {
  try {
    const { id, clauseIndex, noteIndex } = req.params;
    const { noteText } = req.body;

    if (!noteText || noteText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Note text is required'
      });
    }

    const analysis = await Analysis.findOne({ document: id });
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    const cIndex = parseInt(clauseIndex);
    const nIndex = parseInt(noteIndex);

    if (cIndex < 0 || cIndex >= analysis.clauses.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clause index'
      });
    }

    const clause = analysis.clauses[cIndex];
    
    if (nIndex < 0 || nIndex >= clause.notes.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid note index'
      });
    }

    clause.notes[nIndex].text = noteText.trim();
    clause.notes[nIndex].updatedAt = new Date();
    await analysis.save();

    await cacheHelpers.del(`analysis:${id}`);
    console.log('✅ Note updated, cache invalidated');

    res.json({
      success: true,
      message: 'Note updated successfully',
      note: clause.notes[nIndex]
    });

  } catch (error) {
    console.error('❌ Update note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update note',
      error: error.message
    });
  }
};

exports.deleteNoteFromClause = async (req, res) => {
  try {
    const { id, clauseIndex, noteIndex } = req.params;

    const analysis = await Analysis.findOne({ document: id });
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    const cIndex = parseInt(clauseIndex);
    const nIndex = parseInt(noteIndex);

    if (cIndex < 0 || cIndex >= analysis.clauses.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clause index'
      });
    }

    const clause = analysis.clauses[cIndex];
    
    if (nIndex < 0 || nIndex >= clause.notes.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid note index'
      });
    }

    clause.notes.splice(nIndex, 1);
    await analysis.save();

    await cacheHelpers.del(`analysis:${id}`);
    console.log('✅ Note deleted, cache invalidated');

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete note',
      error: error.message
    });
  }
};

exports.exportAnalysisPDF = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📄 Exporting analysis to PDF:', id);

    const cacheKey = `analysis:${id}`;
    let analysis = await cacheHelpers.get(cacheKey);

    if (!analysis) {
      analysis = await Analysis.findOne({ document: id })
        .populate('document', 'originalName');

      if (!analysis) {
        return res.status(404).json({
          success: false,
          message: 'Analysis not found. Please analyze the document first.'
        });
      }

      await cacheHelpers.set(cacheKey, analysis, 3600);
    } else {
      console.log('✅ Using cached analysis for PDF export');
    }

    const pdfBuffer = await generateAnalysisPDF(
      analysis,
      analysis.document?.originalName || 'document'
    );

    console.log('✅ PDF generated successfully');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="analysis-${analysis.document?.originalName || 'document'}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ PDF export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export PDF',
      error: error.message
    });
  }
};

exports.getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!analysisQueue) {
      return res.status(503).json({
        success: false,
        message: 'Queue not available'
      });
    }

    const job = await analysisQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const state = await job.getState();
    const progress = job.progress();

    res.json({
      success: true,
      job: {
        id: job.id,
        state: state,
        progress: progress,
        data: job.data,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason
      }
    });

  } catch (error) {
    console.error('❌ Get job status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get job status',
      error: error.message
    });
  }
};