import express from 'express';
import upload from '../middleware/upload.js';

const router = express.Router();

router.post('/', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.message === 'Images and Videos Only!') {
        return res.status(400).json({ message: err.message });
      }
      return res.status(500).json({
        message: 'File upload error',
        error: err.message || 'Unknown error',
      });
    }

    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const filePath = `/uploads/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${filePath}`;

    res.send({
      message: 'File uploaded!',
      file: filePath,
      url: fullUrl,
      imageUrl: fullUrl,
    });
  });
});

export default router;
