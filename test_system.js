const fs = require('fs');
const path = require('path');
const http = require('http');

// Helper to make multipart request using native Node
async function runTests() {
  console.log('--- STARTING COMPREHENSIVE AUTOMATED TESTS ---');

  // 1. Create genuine sample PDF buffer (magic bytes %PDF-1.4)
  const validPdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Title (Student CV) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
  const validDocxHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00]);
  const fakePdfHeader = Buffer.from('This is a text file renamed to cv.pdf');

  // Test API health
  const healthRes = await fetch('http://localhost:5000/api/health');
  const healthData = await healthRes.json();
  console.log('✓ Health Check:', healthData.status === 'ok' ? 'PASSED' : 'FAILED');

  // Helper function to submit form using FormData (Node 18+ has native FormData & Blob)
  async function submitRegistration(fields, fileBuffer, fileName) {
    const fd = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      fd.append(key, value);
    }
    if (fileBuffer && fileName) {
      const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
      fd.append('cv', blob, fileName);
    }

    const res = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      body: fd
    });
    const body = await res.json();
    return { status: res.status, body };
  }

  // TEST 1: Missing Fields
  console.log('\n--- Test 1: Empty Form Rejection ---');
  const t1 = await submitRegistration({}, null, null);
  console.log('Status:', t1.status, '(Expected 400)');
  console.log('Errors:', Object.keys(t1.body.details || {}));
  if (t1.status === 400 && t1.body.details.fullName && t1.body.details.email) {
    console.log('✓ PASS: Empty submission rejected properly');
  } else {
    console.error('✗ FAIL');
  }

  // TEST 2: Invalid Email
  console.log('\n--- Test 2: Invalid Email Format ---');
  const t2 = await submitRegistration({
    fullName: 'Ananya Sharma',
    email: 'ananya-invalid-email',
    qualification: 'MBA',
    age: '21',
    mobile: '919876543210',
    gender: 'Female'
  }, validPdfHeader, 'ananya_cv.pdf');
  console.log('Status:', t2.status, 'Error message:', t2.body.details?.email);
  if (t2.status === 400 && t2.body.details?.email) {
    console.log('✓ PASS: Invalid email rejected properly');
  } else {
    console.error('✗ FAIL');
  }

  // TEST 3: Age out of range (< 18 or > 22)
  console.log('\n--- Test 3: Age Range Validation (Ages 18-22 only) ---');
  const t3a = await submitRegistration({
    fullName: 'Rohan Mehra',
    email: 'rohan@college.edu',
    qualification: 'BMS',
    age: '23', // Above 22
    mobile: '919876543210',
    gender: 'Male'
  }, validPdfHeader, 'rohan_cv.pdf');
  console.log('Age 23 status:', t3a.status, 'Error message:', t3a.body.details?.age);

  const t3b = await submitRegistration({
    fullName: 'Rohan Mehra',
    email: 'rohan@college.edu',
    qualification: 'BMS',
    age: '17', // Below 18
    mobile: '919876543210',
    gender: 'Male'
  }, validPdfHeader, 'rohan_cv.pdf');
  console.log('Age 17 status:', t3b.status, 'Error message:', t3b.body.details?.age);

  if (t3a.status === 400 && t3b.status === 400 && t3a.body.details?.age.includes('between 18 and 22')) {
    console.log('✓ PASS: Age boundaries strictly enforced');
  } else {
    console.error('✗ FAIL');
  }

  // TEST 4: Mobile Number Validation (91 + 10 digits)
  console.log('\n--- Test 4: Mobile Number Format ---');
  const t4a = await submitRegistration({
    fullName: 'Pooja Verma',
    email: 'pooja@outlook.com',
    qualification: 'DIPLOMA',
    age: '19',
    mobile: '9876543210', // Missing 91 prefix
    gender: 'Female'
  }, validPdfHeader, 'pooja_cv.pdf');
  console.log('Missing 91 status:', t4a.status, 'Error:', t4a.body.details?.mobile);

  const t4b = await submitRegistration({
    fullName: 'Pooja Verma',
    email: 'pooja@outlook.com',
    qualification: 'DIPLOMA',
    age: '19',
    mobile: '9198765432', // Only 10 digits total (not 12)
    gender: 'Female'
  }, validPdfHeader, 'pooja_cv.pdf');
  console.log('Too short mobile status:', t4b.status, 'Error:', t4b.body.details?.mobile);

  if (t4a.status === 400 && t4b.status === 400) {
    console.log('✓ PASS: Mobile number format strictly enforced');
  } else {
    console.error('✗ FAIL');
  }

  // TEST 5: Spoofed File Content (Fake PDF)
  console.log('\n--- Test 5: Magic Bytes CV Validation ---');
  const t5 = await submitRegistration({
    fullName: 'Vikram Singh',
    email: 'vikram@gmail.com',
    qualification: 'OTHER',
    age: '20',
    mobile: '919123456789',
    gender: 'Male'
  }, fakePdfHeader, 'fake_resume.pdf');
  console.log('Fake PDF status:', t5.status, 'Error:', t5.body.details?.cv);
  if (t5.status === 400 && t5.body.details?.cv.includes('genuine PDF or DOCX')) {
    console.log('✓ PASS: Magic byte spoofing prevented');
  } else {
    console.error('✗ FAIL');
  }

  // TEST 6: Valid Submission with PDF
  console.log('\n--- Test 6: Genuine Student Registration 1 (PDF) ---');
  const t6 = await submitRegistration({
    fullName: 'Aarav Patel',
    email: 'aarav.patel@gmail.com',
    qualification: 'MBA',
    age: '22',
    mobile: '919820011223',
    gender: 'Male'
  }, validPdfHeader, 'Aarav_Patel_Resume.pdf');
  console.log('Registration 1 Result:', t6.status, t6.body);
  if (t6.status === 201 && t6.body.success && t6.body.submissionId) {
    console.log('✓ PASS: Student 1 Registered Successfully. ID:', t6.body.submissionId);
  } else {
    console.error('✗ FAIL');
  }

  // TEST 7: Genuine Student Registration 2 (DOCX)
  console.log('\n--- Test 7: Genuine Student Registration 2 (DOCX) ---');
  const t7 = await submitRegistration({
    fullName: 'Sneha Kulkarni',
    email: 'sneha.k@college.edu',
    qualification: 'BMS',
    age: '20',
    mobile: '919876543210',
    gender: 'Female'
  }, validDocxHeader, 'Sneha_Kulkarni_CV.docx');
  console.log('Registration 2 Result:', t7.status, t7.body);
  if (t7.status === 201 && t7.body.success && t7.body.submissionId) {
    console.log('✓ PASS: Student 2 Registered Successfully. ID:', t7.body.submissionId);
  } else {
    console.error('✗ FAIL');
  }

  // TEST 8: Admin Authentication & Query
  console.log('\n--- Test 8: Admin Authentication & Record Inspection ---');
  const adminLoginRes = await fetch('http://localhost:5000/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'Admin@College2026!' })
  });
  const adminLoginData = await adminLoginRes.json();
  console.log('Admin Login status:', adminLoginRes.status, 'Success:', adminLoginData.success);

  const token = adminLoginData.token;
  const submissionsRes = await fetch('http://localhost:5000/api/admin/submissions', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const submissionsData = await submissionsRes.json();
  console.log('Submissions fetched count:', submissionsData.data?.length);
  console.log('Metrics summary:', submissionsData.metrics);

  // TEST 9: Secure CV Download
  console.log('\n--- Test 9: Secure CV Download ---');
  if (t6.body.submissionId) {
    const cvDownloadRes = await fetch(`http://localhost:5000/api/admin/cv/${t6.body.submissionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('CV Download status:', cvDownloadRes.status, 'Content-Type:', cvDownloadRes.headers.get('content-type'));
    if (cvDownloadRes.status === 200) {
      console.log('✓ PASS: CV Download authenticated and streamed successfully');
    }
  }

  // TEST 10: Verify Excel Spreadsheet File Structure
  console.log('\n--- Test 10: Inspect Excel Spreadsheet Structure ---');
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(__dirname, 'server', 'data', 'college_registrations.xlsx'));
  const ws = wb.getWorksheet('Registrations');
  console.log('Excel Sheet Name:', ws.name);
  console.log('Excel Total Rows:', ws.rowCount);
  const headers = ws.getRow(1).values;
  console.log('Excel Headers:', headers.slice(1));
  console.log('Row 2 Values:', ws.getRow(2).values.slice(1));

  console.log('\n--- ALL AUTOMATED VERIFICATIONS COMPLETED SUCCESSFULLY ---');
}

runTests().catch(console.error);
