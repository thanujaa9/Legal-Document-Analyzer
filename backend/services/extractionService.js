const mammoth = require('mammoth');
const { getGridFSBucket } = require('../config/gridfs');
const mongoose = require('mongoose');
const pdfParse = require('pdf-parse');

const extractFromPDF = async (buffer) => {
  try {
    console.log('📕 Extracting text from PDF...');
    console.log(`📦 Buffer size: ${buffer.length} bytes`);

    const data = await pdfParse(buffer);

    console.log(`✅ Extracted ${data.text.length} characters`);
    console.log(`📄 Pages: ${data.numpages}`);

    if (!data.text || data.text.length < 50) {
      throw new Error('PDF appears to be empty or unreadable');
    }

    return {
      text: data.text,
      pageCount: data.numpages
    };
  } catch (error) {
    console.error('❌ PDF extraction error:', error);
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
};

const extractFromDOCX = async (buffer) => {
  try {
    console.log('📘 Extracting text from DOCX...');
    console.log(`📦 Buffer size: ${buffer.length} bytes`);

    const result = await mammoth.extractRawText({ buffer });

    console.log(`✅ Extracted ${result.value.length} characters`);

    if (!result.value || result.value.length < 50) {
      throw new Error('DOCX appears to be empty or unreadable');
    }

    const pageCount = Math.ceil(result.value.length / 3000);

    return {
      text: result.value,
      pageCount: pageCount
    };
  } catch (error) {
    console.error('❌ DOCX extraction error:', error);
    throw new Error(`DOCX extraction failed: ${error.message}`);
  }
};

const extractTextFromDocument = async (gridFsId, fileType) => {
  try {
    console.log('📥 Downloading file from GridFS...');
    console.log(`📍 GridFS ID: ${gridFsId}`);
    console.log(`📍 File type: ${fileType}`);

    const bucket = getGridFSBucket();
    
    if (!bucket) {
      throw new Error('GridFS bucket not initialized');
    }

    const chunks = [];
    const objectId = new mongoose.Types.ObjectId(gridFsId);
    const downloadStream = bucket.openDownloadStream(objectId);

    await new Promise((resolve, reject) => {
      downloadStream.on('data', chunk => {
        chunks.push(chunk);
      });
      
      downloadStream.on('error', error => {
        console.error('❌ GridFS download error:', error);
        reject(error);
      });
      
      downloadStream.on('end', () => {
        console.log('✅ Download complete');
        resolve();
      });
    });

    const buffer = Buffer.concat(chunks);
    console.log(`✅ Downloaded ${buffer.length} bytes`);

    if (buffer.length === 0) {
      throw new Error('Downloaded file is empty');
    }

    if (fileType === 'pdf') {
      return await extractFromPDF(buffer);
    } else if (fileType === 'docx' || fileType === 'doc') {
      return await extractFromDOCX(buffer);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

  } catch (error) {
    console.error('❌ Extraction error:', error);
    throw error;
  }
};

module.exports = {
  extractTextFromDocument
};
