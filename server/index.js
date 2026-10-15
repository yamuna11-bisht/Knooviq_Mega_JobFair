require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const {
  initExcel,
  addRegistration,
  getRegistrations,
  getRegistrationById,
  deleteRegistration,
  EXCEL_PATH
} = require('./excelService');

const {
  ADMIN_PASSWORD,
  authenticateAdmin,
  requireAdminAuth
} = require('./authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxies (Cloudflare, Render, NGINX)
app.set('trust proxy', 1);

// Directory configuration
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'cvs');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Security headers with CSP relaxed for fonts and SVGs
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting: 60 requests per 15 minutes per IP for general API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests from this IP. Please try again later.' }
});
app.use('/api/', apiLimiter);

// Multer Storage - store in memory first so we can validate magic bytes and size safely
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB strict limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || ext === '.docx') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed.'));
    }
  }
});

/**
 * Validates magic bytes for PDF and DOCX to prevent spoofed file extensions.
 */
function validateMagicBytes(buffer, ext) {
  if (ext === '.pdf') {
    // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46)
    if (buffer.length < 4) return false;
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  } else if (ext === '.docx') {
    // DOCX is a zip archive: PK\x03\x04 (0x50 0x4B 0x03 0x04)
    if (buffer.length < 4) return false;
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }
  return false;
}

// ==========================================
// PUBLIC STUDENT REGISTRATION ENDPOINT
// ==========================================
app.post('/api/register', (req, res) => {
  upload.single('cv')(req, res, async (err) => {
    // Handle Multer upload errors
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File size must not exceed 10 MB.'
        });
      }
      return res.status(400).json({
        success: false,
        error: err.message || 'File upload error.'
      });
    }

    try {
      const { fullName, email, qualification, age, mobile, gender } = req.body;
      const errors = {};

      // 1. Full Name Validation
      if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
        errors.fullName = 'Full Name is required.';
      } else if (fullName.trim().length < 2) {
        errors.fullName = 'Full Name must be at least 2 characters.';
      }

      // 2. Email Validation
      // Standard strict email validation
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!email || typeof email !== 'string' || !email.trim()) {
        errors.email = 'Email ID is required.';
      } else if (!emailRegex.test(email.trim())) {
        errors.email = 'Please enter a valid email address (e.g., student@gmail.com, name@college.edu).';
      }

      // 3. Qualification Validation (exact choices: MBA, DIPLOMA, BMS, OTHER)
      const allowedQualifications = ['MBA', 'DIPLOMA', 'BMS', 'OTHER'];
      if (!qualification || !allowedQualifications.includes(qualification.trim().toUpperCase())) {
        errors.qualification = 'Please select a valid qualification (MBA, DIPLOMA, BMS, or OTHER).';
      }

      // 4. Age Validation (18 to 22 years only, integers)
      const parsedAge = Number(age);
      if (
        age === undefined ||
        age === null ||
        age === '' ||
        isNaN(parsedAge) ||
        !Number.isInteger(parsedAge) ||
        parsedAge < 18 ||
        parsedAge > 22
      ) {
        errors.age = 'Age must be between 18 and 22 years.';
      }

      // 5. Mobile Number Validation: Must start with 91 followed by 10 digits (total 12 digits)
      const mobileClean = mobile ? String(mobile).trim() : '';
      const mobileRegex = /^91\d{10}$/;
      if (!mobileClean) {
        errors.mobile = 'Enter 91 followed by your 10-digit mobile number.';
      } else if (!mobileRegex.test(mobileClean)) {
        errors.mobile = 'Enter 91 followed by your 10-digit mobile number.';
      }

      // 6. Gender Validation (Male, Female)
      const allowedGenders = ['Male', 'Female'];
      if (!gender || !allowedGenders.includes(gender.trim())) {
        errors.gender = 'Please select your gender (Male or Female).';
      }

      // 7. CV Upload Validation
      if (!req.file) {
        errors.cv = 'Please upload your CV or resume.';
      } else {
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (ext !== '.pdf' && ext !== '.docx') {
          errors.cv = 'Only PDF and DOCX files are allowed.';
        } else if (req.file.size > 10 * 1024 * 1024) {
          errors.cv = 'File size must not exceed 10 MB.';
        } else if (!validateMagicBytes(req.file.buffer, ext)) {
          errors.cv = 'The uploaded file content does not match a genuine PDF or DOCX document.';
        }
      }

      // If any validation failed, return immediately
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed. Please correct the highlighted errors.',
          details: errors
        });
      }

      // Generate Unique Submission ID
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const submissionId = `REG-${Date.now().toString().slice(-6)}-${randomSuffix}`;

      // Format Submission Date & Time
      const now = new Date();
      const submittedAt = now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      // Securely store CV file on disk with a randomized unique filename
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      const safeRandomName = `CV_${submissionId}_${crypto.randomBytes(4).toString('hex')}${fileExt}`;
      const savedFilePath = path.join(UPLOADS_DIR, safeRandomName);

      // Write file to persistent storage
      fs.writeFileSync(savedFilePath, req.file.buffer);

      // Prepare Record according to required columns:
      // 1. Submission ID
      // 2. Submission Date & Time
      // 3. Full Name
      // 4. Email ID
      // 5. Qualification
      // 6. Age
      // 7. Mobile Number
      // 8. Gender
      // 9. CV Filename (original uploaded name)
      // 10. CV Secure Link or File Reference
      const secureCvRef = `/api/admin/cv/${submissionId}`;

      const newRecord = {
        submissionId,
        submittedAt,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        qualification: qualification.trim().toUpperCase(),
        age: parsedAge,
        mobile: mobileClean,
        gender: gender.trim(),
        cvFilename: req.file.originalname,
        cvSecureLink: secureCvRef,
        storedFileName: safeRandomName,
        fileSizeBytes: req.file.size
      };

      try {
        // Save to centralized Excel spreadsheet and JSON cache
        await addRegistration(newRecord);
      } catch (saveError) {
        // Rollback: delete stored CV to prevent orphaned files
        if (fs.existsSync(savedFilePath)) {
          fs.unlinkSync(savedFilePath);
        }
        console.error('Failed to commit registration record to spreadsheet:', saveError);
        return res.status(500).json({
          success: false,
          error: 'Unable to save registration record to the centralized spreadsheet. Please try again.'
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Your registration and CV have been submitted successfully!',
        submissionId,
        submittedAt
      });
    } catch (unexpectedError) {
      console.error('Unexpected error during registration processing:', unexpectedError);
      return res.status(500).json({
        success: false,
        error: 'An internal server error occurred while processing your registration. Please try again.'
      });
    }
  });
});

// ==========================================
// ADMINISTRATOR AUTHENTICATION & PORTAL API
// ==========================================

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, error: 'Password is required.' });
  }

  const result = authenticateAdmin(password);
  if (!result.success) {
    return res.status(401).json({ success: false, error: result.message });
  }

  return res.json({
    success: true,
    token: result.token,
    user: 'Administrator',
    message: 'Authentication successful.'
  });
});

// Admin Submissions List (Searchable, Filterable)
app.get('/api/admin/submissions', requireAdminAuth, (req, res) => {
  const { search = '', qualification = '' } = req.query;
  const records = getRegistrations({ search, qualification });

  // Compute metrics
  const allRecords = getRegistrations();
  const metrics = {
    total: allRecords.length,
    mba: allRecords.filter((r) => r.qualification === 'MBA').length,
    diploma: allRecords.filter((r) => r.qualification === 'DIPLOMA').length,
    bms: allRecords.filter((r) => r.qualification === 'BMS').length,
    other: allRecords.filter((r) => r.qualification === 'OTHER').length
  };

  return res.json({
    success: true,
    data: records,
    metrics
  });
});

// Admin Delete Student Registration Record
app.delete('/api/admin/submissions/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await deleteRegistration(id);

    if (!deletedRecord) {
      return res.status(404).json({ success: false, error: 'Registration record not found.' });
    }

    // Delete CV file from disk if present
    if (deletedRecord.storedFileName) {
      const cvFilePath = path.join(UPLOADS_DIR, deletedRecord.storedFileName);
      if (fs.existsSync(cvFilePath)) {
        try {
          fs.unlinkSync(cvFilePath);
          console.log(`✓ Deleted CV file: ${deletedRecord.storedFileName}`);
        } catch (fileErr) {
          console.warn('Could not unlink CV file:', fileErr);
        }
      }
    }

    return res.json({
      success: true,
      message: `Registration ${id} (${deletedRecord.fullName}) deleted successfully.`
    });
  } catch (err) {
    console.error('Error deleting registration:', err);
    res.status(500).json({ success: false, error: 'Failed to delete registration.' });
  }
});

// Admin Download Entire Excel Spreadsheet
app.get('/api/admin/export-excel', requireAdminAuth, async (req, res) => {
  try {
    await initExcel();
    if (!fs.existsSync(EXCEL_PATH)) {
      return res.status(404).json({ success: false, error: 'Spreadsheet file not found.' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const downloadFilename = `Mega_Knooviq_Job_Fair_Registrations_${timestamp}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadFilename}"`
    );

    const stream = fs.createReadStream(EXCEL_PATH);
    stream.pipe(res);
  } catch (err) {
    console.error('Error streaming excel export:', err);
    res.status(500).json({ success: false, error: 'Failed to export spreadsheet.' });
  }
});

// Admin Secure Download or Preview of Student CV
app.get('/api/admin/cv/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const record = getRegistrationById(id);

  if (!record || !record.storedFileName) {
    return res.status(404).json({ success: false, error: 'Registration or CV not found.' });
  }

  const cvPath = path.join(UPLOADS_DIR, record.storedFileName);
  if (!fs.existsSync(cvPath)) {
    return res.status(404).json({ success: false, error: 'CV file is missing from storage.' });
  }

  const ext = path.extname(record.cvFilename || record.storedFileName).toLowerCase();
  const contentType =
    ext === '.pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const downloadName = encodeURIComponent(record.cvFilename || `CV_${id}${ext}`);

  res.setHeader('Content-Type', contentType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${downloadName}"; filename*=UTF-8''${downloadName}`
  );

  const fileStream = fs.createReadStream(cvPath);
  fileStream.pipe(res);
});

// System Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'College Registration API'
  });
});

// Serve frontend in production
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global server error:', err);
  res.status(500).json({
    success: false,
    error: 'An unexpected server error occurred.'
  });
});

// Initialize Excel and start server
initExcel()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n==================================================`);
      console.log(`🎓 College Student Registration Server running!`);
      console.log(`🌐 Local API/Web: http://localhost:${PORT}`);
      console.log(`📊 Centralized Excel: ${EXCEL_PATH}`);
      console.log(`📁 Private CV Uploads: ${UPLOADS_DIR}`);
      console.log(`🔑 Default Admin Password: ${ADMIN_PASSWORD}`);
      console.log(`==================================================\n`);
    });
  })
  .catch((err) => {
    console.error('Critical initialization failure:', err);
    process.exit(1);
  });
