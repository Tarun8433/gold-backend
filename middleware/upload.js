import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'public', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + '-' + Date.now() + path.extname(file.originalname)
    );
  },
});

function checkFileType(file, cb) {
  const mimetype = file.mimetype || '';
  if (!mimetype || mimetype === 'application/octet-stream') {
    return cb(null, true);
  }
  if (mimetype.startsWith('image/') || mimetype.startsWith('video/')) {
    return cb(null, true);
  }
  cb(new Error('Images and Videos Only!'));
}

const upload = multer({
  storage,
  limits: { fileSize: 50000000 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

export default upload;
