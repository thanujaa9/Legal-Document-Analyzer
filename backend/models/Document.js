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
  
  // 🎯 ADD THIS: For detecting duplicate files
  fileHash: {
    type: String,
    index: true  // Index for fast lookups
  },
  
  uploadDate: {
    type: Date,
    default: Date.now
  },
  
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
  
  extractedText: String,
  pageCount: Number,
  
  analysis: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis'
  }
  
}, {
  timestamps: true
});

documentSchema.index({ uploadDate: -1 });
documentSchema.index({ status: 1 });
documentSchema.index({ originalName: 'text' });
// 🎯 ADD THIS: Index for hash-based duplicate detection
documentSchema.index({ user: 1, fileHash: 1 });

module.exports = mongoose.model('Document', documentSchema);

