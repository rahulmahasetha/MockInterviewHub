const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { allowedResumeExts } = require('../config/multer');

const createHttpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const isPdfBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  return buffer.subarray(0, 4).toString('latin1').startsWith('%PDF');
};

const isDocxBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  return buffer[0] === 0x50 && buffer[1] === 0x4b;
};

const validateResumeFile = (file, buffer) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedResumeExts.includes(ext)) {
    throw createHttpError(400, 'Only PDF and DOCX files are allowed.');
  }
  if (!buffer || buffer.length === 0) {
    throw createHttpError(400, 'Uploaded resume file is empty.');
  }
  if (ext === '.pdf' && !isPdfBuffer(buffer)) {
    throw createHttpError(400, 'Invalid or corrupted PDF file. Please upload a valid PDF resume.');
  }
  if (ext === '.docx' && !isDocxBuffer(buffer)) {
    throw createHttpError(400, 'Invalid or corrupted DOCX file. Please upload a valid Word resume.');
  }
  return ext;
};

const normalizeResumeParseError = (err, ext) => {
  const message = String(err?.message || '').toLowerCase();
  if (
    message.includes('invalid pdf') ||
    message.includes('bad xref') ||
    message.includes('xref') ||
    message.includes('endobj') ||
    message.includes('corrupt') ||
    message.includes('encrypted')
  ) {
    return createHttpError(400, 'Could not read this PDF. It appears to be corrupted, encrypted, or not a valid PDF resume.');
  }
  if (ext === '.docx') {
    return createHttpError(400, 'Could not read this DOCX file. It appears to be corrupted or not a valid Word resume.');
  }
  return createHttpError(400, 'Could not extract resume text from the uploaded file.');
};

const extractResumeText = async (filePath, file, buffer) => {
  const ext = validateResumeFile(file, buffer);
  try {
    if (ext === '.pdf') {
      const data = await pdfParse(buffer, {
        max: 0,
        version: 'v1.10.100'
      });
      return (data.text || '').trim();
    }
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || '').trim();
  } catch (err) {
    throw normalizeResumeParseError(err, ext);
  }
};

const cleanupUploadedFile = (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.warn('Could not delete uploaded resume file:', err.message);
  }
};

module.exports = { createHttpError, extractResumeText, cleanupUploadedFile };
