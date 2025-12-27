const Document = require('../models/Document');
const { getGridFSBucket } = require('../config/gridfs');
const path = require('path');
const mongoose = require('mongoose');
const { Readable } = require('stream');
const crypto = require('crypto');

// Upload files to GridFS
exports.uploadFiles = async (req, res) => {
  try {
    console.log('📤 Upload request received');
    console.log('👤 User:', req.user.id);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const bucket = getGridFSBucket();
    
    const documents = await Promise.all(
      req.files.map(async (file) => {
        const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${file.originalname}`;
        
        const readableStream = Readable.from(file.buffer);
        const uploadStream = bucket.openUploadStream(filename, {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            mimetype: file.mimetype,
            uploadDate: new Date(),
            userId: req.user.id // ✅ Store user ID in metadata
          }
        });

        await new Promise((resolve, reject) => {
          readableStream
            .pipe(uploadStream)
            .on('error', reject)
            .on('finish', resolve);
        });

        console.log('✅ File uploaded to GridFS:', uploadStream.id);

        // ✅ Save document with user reference
        const doc = new Document({
          user: req.user.id, // ✅ Associate with user
          filename: filename,
          originalName: file.originalname,
          fileType: path.extname(file.originalname).substring(1).toLowerCase(),
          fileSize: file.size,
          gridFsId: uploadStream.id
        });

        return await doc.save();
      })
    );

    res.status(201).json({
      success: true,
      message: `${documents.length} file(s) uploaded successfully`,
      documents: documents.map(doc => ({
        id: doc._id,
        originalName: doc.originalName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        uploadDate: doc.uploadDate,
        status: doc.status
      }))
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
};

// Get all documents for logged-in user
exports.getAllDocuments = async (req, res) => {
  try {
    const { 
      status, 
      search, 
      page = 1, 
      limit = 20,
      sortBy = 'uploadDate',
      sortOrder = 'desc'
    } = req.query;

    // ✅ Filter by user
    const query = { user: req.user.id };
    
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.originalName = { $regex: search, $options: 'i' };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [documents, total] = await Promise.all([
      Document.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Document.countDocuments(query)
    ]);

    res.json({
      success: true,
      documents,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: error.message
    });
  }
};

// Get single document (check ownership)
exports.getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.user.id // ✅ Ensure user owns document
    }).lean();

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      document
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document',
      error: error.message
    });
  }
};

// Delete document (check ownership)
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.user.id // ✅ Ensure user owns document
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const bucket = getGridFSBucket();
    await bucket.delete(new mongoose.Types.ObjectId(document.gridFsId));
    console.log('🗑️ File deleted from GridFS');

    await document.deleteOne();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message
    });
  }
};

// Download document (check ownership)
exports.downloadDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.user.id // ✅ Ensure user owns document
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const bucket = getGridFSBucket();
    const downloadStream = bucket.openDownloadStream(
      new mongoose.Types.ObjectId(document.gridFsId)
    );

    res.set({
      'Content-Type': document.fileType === 'pdf' 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${document.originalName}"`
    });

    downloadStream.on('error', (error) => {
      console.error('❌ Download error:', error);
      if (!res.headersSent) {
        res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
    });

    downloadStream.pipe(res);

  } catch (error) {
    console.error('❌ Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download document',
      error: error.message
    });
  }
};

// Stream document (check ownership)
exports.streamDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.user.id // ✅ Ensure user owns document
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const bucket = getGridFSBucket();
    const downloadStream = bucket.openDownloadStream(
      new mongoose.Types.ObjectId(document.gridFsId)
    );

    res.set('Content-Type', document.fileType === 'pdf' 
      ? 'application/pdf' 
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    downloadStream.on('error', (error) => {
      console.error('❌ Stream error:', error);
      if (!res.headersSent) {
        res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
    });

    downloadStream.pipe(res);

  } catch (error) {
    console.error('❌ Stream error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stream document',
      error: error.message
    });
  }
};