const multer = require('multer');
const fs= require('fs');
const path = require('path');

const uploadDir= path.join(__dirname, '../uploads');
if(!fs.existsSync(uploadDir)){
  fs.mkdirSync(uploadDir, {recursive: true});
}

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Save files in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;//new
    cb(null, uniqueName);
  },
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed!'));
  }
};

// Initialize multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // Limit: 2MB
});

module.exports = upload;
