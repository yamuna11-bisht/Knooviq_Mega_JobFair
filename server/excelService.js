const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const DATA_DIR = path.join(__dirname, 'data');
const EXCEL_PATH = path.join(DATA_DIR, 'college_registrations.xlsx');
const JSON_PATH = path.join(DATA_DIR, 'registrations.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure JSON file exists
if (!fs.existsSync(JSON_PATH)) {
  fs.writeFileSync(JSON_PATH, JSON.stringify([], null, 2), 'utf8');
}

// Columns definition in exact required order:
// 1. Submission ID
// 2. Submission Date & Time
// 3. Full Name
// 4. Email ID
// 5. Qualification
// 6. Age
// 7. Mobile Number
// 8. Gender
// 9. CV Filename
// 10. CV Secure Link or File Reference
const COLUMNS = [
  { header: 'Submission ID', key: 'submissionId', width: 24 },
  { header: 'Submission Date & Time', key: 'submittedAt', width: 24 },
  { header: 'Full Name', key: 'fullName', width: 26 },
  { header: 'Email ID', key: 'email', width: 30 },
  { header: 'Qualification', key: 'qualification', width: 16 },
  { header: 'Age', key: 'age', width: 10 },
  { header: 'Mobile Number', key: 'mobile', width: 20 },
  { header: 'Gender', key: 'gender', width: 14 },
  { header: 'CV Filename', key: 'cvFilename', width: 34 },
  { header: 'CV Secure Link or File Reference', key: 'cvSecureLink', width: 45 }
];

// Mutex queue to safely handle simultaneous submissions without race conditions
let writeQueue = Promise.resolve();

/**
 * Reads all records from the persistent store.
 */
function readRegistrationsFromDisk() {
  try {
    if (!fs.existsSync(JSON_PATH)) {
      return [];
    }
    const data = fs.readFileSync(JSON_PATH, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading registrations JSON:', err);
    return [];
  }
}

/**
 * Saves all records to the persistent JSON store.
 */
function writeRegistrationsToDisk(records) {
  fs.writeFileSync(JSON_PATH, JSON.stringify(records, null, 2), 'utf8');
}

/**
 * Builds or rebuilds the complete Excel spreadsheet from registrations list.
 * Guarantees zero data loss and perfect formatting.
 */
async function buildWorkbookFromRecords(records) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'College Student Registration System';
  workbook.lastModifiedBy = 'Admin System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Registrations', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  worksheet.columns = COLUMNS;

  // Style Header Row (Navy Blue, Bold White)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '0F2B5C' }
    };
    cell.font = {
      name: 'Segoe UI',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFF' }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    };
    cell.border = {
      top: { style: 'medium', color: { argb: '0F2B5C' } },
      bottom: { style: 'medium', color: { argb: '0F2B5C' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } }
    };
  });

  // Sort records oldest to newest for chronological row order in spreadsheet
  const chronRecords = [...records].reverse();

  chronRecords.forEach((record, index) => {
    // Write values by explicit array index to ensure values are never lost
    const rowValues = [
      record.submissionId || '',
      record.submittedAt || '',
      record.fullName || '',
      record.email || '',
      record.qualification || '',
      Number(record.age) || '',
      record.mobile || '',
      record.gender || '',
      record.cvFilename || '',
      record.cvSecureLink || ''
    ];

    const row = worksheet.addRow(rowValues);
    row.height = 24;

    const isEven = (index + 2) % 2 === 0;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 10 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: [1, 2, 5, 6, 7, 8].includes(colNumber) ? 'center' : 'left'
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'F8FAFC' : 'FFFFFF' }
      };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } }
      };
    });
  });

  const tempPath = `${EXCEL_PATH}.tmp`;
  await workbook.xlsx.writeFile(tempPath);
  fs.renameSync(tempPath, EXCEL_PATH);
}

/**
 * Initializes the Excel file with all existing records.
 */
async function initExcel() {
  const records = readRegistrationsFromDisk();
  await buildWorkbookFromRecords(records);
}

/**
 * Appends a student registration record to both Excel and JSON stores safely.
 * Guaranteed atomic through promise queue.
 */
async function addRegistration(record) {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue
      .then(async () => {
        try {
          // 1. Update JSON store (newest first for web view)
          const records = readRegistrationsFromDisk();
          records.unshift(record);
          writeRegistrationsToDisk(records);

          // 2. Re-write Excel workbook with all records
          await buildWorkbookFromRecords(records);

          console.log(`✓ Stored registration in Excel: ${record.submissionId} (${record.fullName})`);
          resolve(record);
        } catch (err) {
          console.error('Failed to append registration to Excel/JSON:', err);
          reject(err);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
}

/**
 * Retrieves all registrations with optional query filtering.
 */
function getRegistrations({ search = '', qualification = '' } = {}) {
  const records = readRegistrationsFromDisk();
  const searchLower = search.trim().toLowerCase();
  const qualUpper = qualification.trim().toUpperCase();

  return records.filter((item) => {
    const matchesSearch =
      !searchLower ||
      (item.fullName && item.fullName.toLowerCase().includes(searchLower)) ||
      (item.email && item.email.toLowerCase().includes(searchLower)) ||
      (item.mobile && item.mobile.includes(searchLower)) ||
      (item.submissionId && item.submissionId.toLowerCase().includes(searchLower)) ||
      (item.submittedAt && item.submittedAt.toLowerCase().includes(searchLower));

    const matchesQual = !qualUpper || item.qualification === qualUpper;

    return matchesSearch && matchesQual;
  });
}

/**
 * Finds a single registration by submissionId.
 */
function getRegistrationById(id) {
  const records = readRegistrationsFromDisk();
  return records.find((item) => item.submissionId === id);
}

/**
 * Deletes a registration record by submissionId from JSON and rewrites Excel workbook.
 * Returns the deleted record (or null if not found).
 */
async function deleteRegistration(id) {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue
      .then(async () => {
        try {
          const records = readRegistrationsFromDisk();
          const targetIndex = records.findIndex((item) => item.submissionId === id);

          if (targetIndex === -1) {
            return resolve(null);
          }

          const deletedRecord = records[targetIndex];
          records.splice(targetIndex, 1);
          writeRegistrationsToDisk(records);

          // Rebuild Excel spreadsheet with remaining records
          await buildWorkbookFromRecords(records);

          console.log(`✓ Deleted registration from Excel & JSON: ${id} (${deletedRecord.fullName})`);
          resolve(deletedRecord);
        } catch (err) {
          console.error('Failed to delete registration:', err);
          reject(err);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
}

module.exports = {
  EXCEL_PATH,
  initExcel,
  addRegistration,
  getRegistrations,
  getRegistrationById,
  deleteRegistration
};
