const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const uploadController = require('../controllers/uploadController');
const protect = require('../middleware/authMiddleware');

// Upload files
router.post(
  '/',
  protect,
  upload.array('documents', 10),
  uploadController.uploadFiles
);

// Get all documents
router.get('/', protect, uploadController.getAllDocuments);

// Get single document
router.get('/:id', protect, uploadController.getDocument);

// Delete document
router.delete('/:id', protect, uploadController.deleteDocument);

// Download document
router.get('/:id/download', protect, uploadController.downloadDocument);

// Stream document
router.get('/:id/stream', protect, uploadController.streamDocument);

module.exports = router;
