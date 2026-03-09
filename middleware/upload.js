// middlewares/upload.js
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage(); // or diskStorage if you prefer

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'application/json'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and JSON files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

module.exports = upload;