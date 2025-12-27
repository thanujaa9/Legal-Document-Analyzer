// backend/models/Document.js
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['pdf', 'docx', 'doc']
  },
  fileSize: {
    type: Number,
    required: true
  },
  gridFsId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  
  // Processing status
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'analyzed', 'error'],
    default: 'uploaded'
  },
  
  processingProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  errorMessage: String,
  
  // Extracted content
  extractedText: String,
  pageCount: Number,
  
  // Reference to analysis
  analysis: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis'
  }
  
}, {
  timestamps: true
});

// Indexes for faster queries
documentSchema.index({ uploadDate: -1 });
documentSchema.index({ status: 1 });
documentSchema.index({ originalName: 'text' });

module.exports = mongoose.model('Document', documentSchema);