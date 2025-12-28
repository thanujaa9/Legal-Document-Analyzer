const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const uploadController = require('../controllers/uploadController');
const protect = require('../middleware/authMiddleware');

router.post(
  '/',
  protect,
  upload.array('documents', 10),
  uploadController.uploadFiles
);

router.get('/', protect, uploadController.getAllDocuments);

router.get('/:id', protect, uploadController.getDocument);

router.delete('/:id', protect, uploadController.deleteDocument);

router.get('/:id/download', protect, uploadController.downloadDocument);

router.get('/:id/stream', protect, uploadController.streamDocument);

module.exports = router;
