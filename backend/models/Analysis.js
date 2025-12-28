// backend/models/Analysis.js
const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  
  summary: {
    type: String,
    required: true
  },
  
  clauses: [{
    type: {
      type: String,
      
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

analysisSchema.index({ document: 1 });
analysisSchema.index({ analyzedAt: -1 });

module.exports = mongoose.model('Analysis', analysisSchema);