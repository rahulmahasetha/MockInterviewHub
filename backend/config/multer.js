const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `resume_${Date.now()}_${safeName}`);
  }
});

const allowedResumeExts = ['.pdf', '.docx'];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedResumeExts.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF and DOCX files are allowed'));
  }
});

const resumeUpload = upload.single('resume');

const runResumeUpload = (req, res) => new Promise((resolve, reject) => {
  resumeUpload(req, res, (err) => {
    if (err) reject(err);
    else resolve();
  });
});

module.exports = { upload, resumeUpload, runResumeUpload, allowedResumeExts };
