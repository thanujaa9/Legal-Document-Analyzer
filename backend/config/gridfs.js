const mongoose = require('mongoose');

let gridfsBucket;
let isInitialized = false;

const initGridFS = () => {
  return new Promise((resolve, reject) => {
    const conn = mongoose.connection;

    if (conn.readyState !== 1) {
      reject(new Error('MongoDB not connected'));
      return;
    }

    try {
      // Initialize GridFSBucket (no gridfs-stream needed!)
      gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'uploads'
      });

      isInitialized = true;
      console.log('✅ GridFS Initialized - Scalable file storage ready');
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

const getGridFSBucket = () => {
  if (!isInitialized || !gridfsBucket) {
    throw new Error('GridFS not initialized. Make sure MongoDB is connected.');
  }
  return gridfsBucket;
};

const isGridFSReady = () => isInitialized;

module.exports = { 
  initGridFS, 
  getGridFSBucket,
  isGridFSReady 
};