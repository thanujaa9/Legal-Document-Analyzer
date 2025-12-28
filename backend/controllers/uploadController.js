
const Document = require('../models/Document');
const Analysis = require('../models/Analysis');
const { getGridFSBucket } = require('../config/gridfs');
const path = require('path');
const mongoose = require('mongoose');
const { Readable } = require('stream');
const crypto = require('crypto');

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
        
        // 🎯 STEP 1: Calculate SHA-256 hash of file content
        const fileHash = crypto
          .createHash('sha256')
          .update(file.buffer)
          .digest('hex');
        
        console.log('📊 File:', file.originalname);
        console.log('   Hash:', fileHash.substring(0, 16) + '...');
        
        // 🎯 STEP 2: Check if this exact file was already analyzed
        const existingDoc = await Document.findOne({ 
          user: req.user.id,
          fileHash: fileHash,
          status: 'analyzed'
        }).populate('analysis');
        
        if (existingDoc && existingDoc.analysis) {
          console.log('⚡ DUPLICATE FOUND!');
          console.log('   Original:', existingDoc.originalName);
          console.log('   Uploaded:', existingDoc.uploadDate);
          console.log('   Status: Already analyzed ✅');
          
          return {
            isDuplicate: true,
            document: existingDoc,
            analysis: existingDoc.analysis
          };
        }
        
        // 🎯 STEP 3: New file - proceed with upload
        console.log('📄 New file, uploading to GridFS...');
        
        const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${file.originalname}`;
        
        const readableStream = Readable.from(file.buffer);
        const uploadStream = bucket.openUploadStream(filename, {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            mimetype: file.mimetype,
            uploadDate: new Date(),
            userId: req.user.id 
          }
        });

        await new Promise((resolve, reject) => {
          readableStream
            .pipe(uploadStream)
            .on('error', reject)
            .on('finish', resolve);
        });

        console.log('✅ File uploaded to GridFS:', uploadStream.id);

        // 🎯 STEP 4: Save document WITH hash
        const doc = new Document({
          user: req.user.id, 
          filename: filename,
          originalName: file.originalname,
          fileType: path.extname(file.originalname).substring(1).toLowerCase(),
          fileSize: file.size,
          gridFsId: uploadStream.id,
          fileHash: fileHash  // 🔥 Store the hash!
        });

        const savedDoc = await doc.save();
        console.log('✅ Document saved with hash');
        
        return {
          isDuplicate: false,
          document: savedDoc
        };
      })
    );

    // 🎯 STEP 5: Separate duplicates from new uploads
    const duplicates = documents.filter(d => d.isDuplicate);
    const newUploads = documents.filter(d => !d.isDuplicate);

    console.log('');
    console.log('📊 UPLOAD SUMMARY:');
    console.log('   New files:', newUploads.length);
    console.log('   Duplicates:', duplicates.length);
    console.log('');

    // 🎯 STEP 6: Return response with duplicate info
    res.status(201).json({
      success: true,
      message: duplicates.length > 0 
        ? `${newUploads.length} new, ${duplicates.length} duplicate(s) detected (already analyzed)`
        : `${documents.length} file(s) uploaded successfully`,
      documents: documents.map(d => {
        const doc = d.document;
        return {
          id: doc._id,
          originalName: doc.originalName,
          fileSize: doc.fileSize,
          fileType: doc.fileType,
          uploadDate: doc.uploadDate,
          status: doc.status,
          isDuplicate: d.isDuplicate,
          cached: d.isDuplicate,
          analysisId: d.analysis?._id
        };
      })
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
        .populate('analysis', 'overallRiskScore') 
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

exports.getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.user.id 
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

exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.user.id 
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

exports.downloadDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.user.id 
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

exports.streamDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.user.id 
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
