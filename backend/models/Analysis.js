// backend/models/Analysis.js
const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  
  // AI Analysis Results
  summary: {
    type: String,
    required: true
  },
  
  clauses: [{
    type: {
      type: String,
      // ✅ REMOVED enum restriction - allows ANY clause type from OpenAI
      required: false
    },
    text: String,
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    explanation: String,
    notes: [{
      text: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  
  risks: [{
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    category: {
      type: String,
      // ✅ Allow any category type
      required: false
    },
    description: String,
    recommendation: String
  }],
  
  overallRiskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  
  keyFindings: [String],
  
  recommendations: [String],
  
  // Metadata
  processingTime: Number,
  aiModel: String,
  tokensUsed: Number,
  
  analyzedAt: {
    type: Date,
    default: Date.now
  }
  
}, {
  timestamps: true
});

// Index for faster queries
analysisSchema.index({ document: 1 });
analysisSchema.index({ analyzedAt: -1 });

module.exports = mongoose.model('Analysis', analysisSchema);