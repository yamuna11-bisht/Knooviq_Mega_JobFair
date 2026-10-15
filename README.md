# 🎓 College Student Registration System with CV Upload & Excel Integration

A complete, production-ready, responsive **College Student Registration Form** built with **React + Vite**, a secure **Express.js backend**, and **centralized Excel (`.xlsx`) spreadsheet storage**.

Includes an authenticated **Administrator Portal**, live search, Excel export, and secure CV file access.

---

## 🌐 Public Shareable Link

| Environment | URL |
|---|---|
| **Live Public HTTPS Link (Shareable)** | `https://monetary-price-invention-freebsd.trycloudflare.com` |
| **Local Development / Web** | `http://localhost:5000/` |
| **Admin Portal Direct Route** | `https://monetary-price-invention-freebsd.trycloudflare.com/#admin` |

> 📱 **Mobile & WhatsApp Friendly:** This HTTPS link can be directly shared across WhatsApp, email, Telegram, and college announcement groups. It does not require students to create an account or install any software.

---

## 🔑 Default Administrator Credentials

To access the Administrator Dashboard to view submissions, download student CVs, or export the Excel spreadsheet:
* **Admin Portal:** Click the **Admin Portal** button in the top right header (or visit `/#admin`)
* **Default Password:** `Admin@College2026!`
* *(Configurable via the `ADMIN_PASSWORD` variable in `.env`)*

---

## 📋 1. Form Fields & Strict Validation Rules

Every field is mandatory and validated on both the client (instant UI feedback) and the backend (security enforcement):

| Field | Input Type | Validation Rules & Constraints | Error Message |
|---|---|---|---|
| **Full Name** | Text input | Required, trimmed, minimum 2 characters | *"Please enter your full name."* |
| **Email ID** | Email input | Required, strict RFC 5322 regex. Accepts `student@gmail.com`, `name@college.edu`, `student@outlook.com`, etc. Rejects incomplete addresses. | *"Please enter a valid email address (e.g. student@gmail.com, name@college.edu)."* |
| **Qualification** | Dropdown select | Required. Exactly four permitted options:<br>• `MBA`<br>• `DIPLOMA`<br>• `BMS`<br>• `OTHER` | *"Please select a qualification from the dropdown."* |
| **Age** | Numeric input | Required. Integer strictly between **18 and 22 years** (inclusive). Maximum permitted age: **22**. Rejects decimals, negative numbers, and ages outside 18–22. | *"Age must be between 18 and 22 years."* |
| **Mobile Number** | Tel input | Required. Must begin with `91` followed by exactly 10 digits (total **12 digits**). E.g. `919876543210`. Rejects non-digits or wrong lengths. | *"Enter 91 followed by your 10-digit mobile number."* |
| **Gender** | Radio group | Required. Exactly two options:<br>• `Male`<br>• `Female` | *"Please select your gender."* |
| **CV / Resume Upload** | File upload (Drag & drop / Browse) | Required. Only **PDF** and **DOCX** files allowed. Maximum size: **10 MB**. Verified via file extension, MIME type, and binary magic bytes (`%PDF-` / `PK\x03\x04`). | *"Please upload your CV or resume."* / *"Only PDF and DOCX files are allowed."* / *"File size must not exceed 10 MB."* |

---

## 📊 2. Centralized Excel Integration

Every successful student registration automatically appends a new row to the server's centralized spreadsheet:
* **File Location:** `server/data/college_registrations.xlsx`
* **Backup JSON Store:** `server/data/registrations.json`
* **Concurrency Lock:** Promise-chained mutex queue ensures multiple students submitting simultaneously never overwrite each other or corrupt the spreadsheet.
* **Atomic Handling:** If saving to the spreadsheet fails, the uploaded CV is automatically deleted (rolled back) and an error is returned.

### Column Sequence (Exact Order)
1. `Submission ID`
2. `Submission Date & Time`
3. `Full Name`
4. `Email ID`
5. `Qualification`
6. `Age`
7. `Mobile Number`
8. `Gender`
9. `CV Filename`
10. `CV Secure Link or File Reference`

---

## 🛡️ 3. CV Storage & Security Architecture

* **Private Storage:** Uploaded CVs are stored in private storage (`server/uploads/cvs/`) and are **never exposed in a public static directory**.
* **Unique Filenames:** Uploaded files receive a unique timestamp + cryptographic random hex identifier to prevent filename collisions and overwrites.
* **Magic Byte Checking:** Server inspects the binary file signature to prevent executable files disguised with a `.pdf` or `.docx` extension.
* **Authenticated Access:** Only authorized administrators with a valid session token can view or download CVs through `/api/admin/cv/:id`.

---

## 💼 4. Administrator Portal Features

1. **Dashboard KPI Counters:**
   * Total registered candidates
   * Count by program (MBA, Diploma, BMS, Other)
2. **Instant Search & Filter:**
   * Filter across Student Name, Email, Mobile Number, Submission ID, or Date.
   * Filter by Qualification.
3. **One-Click Excel Export:**
   * Click **Download Excel (.xlsx)** to download the live spreadsheet directly to your device.
4. **Secure CV Downloads:**
   * Download individual candidate CVs securely.

---

## 🚀 5. How to Run Locally

### Prerequisites
* Node.js v18+ (tested on Node v24)
* npm v9+

### Commands

1. **Install dependencies:**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

2. **Build the client:**
   ```bash
   npm run build
   ```

3. **Start the application server:**
   ```bash
   npm start
   ```
   * Open your browser at: `http://localhost:5000`

4. **Run automated test suite:**
   ```bash
   node test_system.js
   ```

---

## ☁️ 6. Production Deployment Instructions

### Option A: Render.com (Recommended Free / Cloud)
1. Push your repository to GitHub.
2. Create a new **Web Service** on [Render](https://render.com).
3. Set the following build and start commands:
   * **Build Command:** `npm install && cd client && npm install && npm run build && cd ..`
   * **Start Command:** `node server/index.js`
4. In **Environment Variables**, set:
   * `NODE_ENV`: `production`
   * `PORT`: `10000`
   * `ADMIN_PASSWORD`: `<your-secure-admin-password>`
   * `JWT_SECRET`: `<random-secret-key>`
5. Deploy! Render will provide a permanent public `https://<your-app>.onrender.com` URL.

### Option B: Railway.app / VPS
1. Clone the repo and run `npm install && npm run build`.
2. Run `npm start` with a process manager like PM2 (`pm2 start server/index.js --name "college-form"`).
3. Configure NGINX reverse proxy with SSL (Certbot Let's Encrypt).

---

## 📁 Project Structure

```text
├── client/                      # React + Vite Frontend
│   ├── src/
│   │   ├── App.jsx              # Main shell with header & navigation
│   │   ├── RegistrationForm.jsx # Registration form with validations
│   │   ├── AdminPortal.jsx      # Protected admin dashboard & table
│   │   ├── index.css            # Modern typography, navy/cyan styles
│   │   └── main.jsx
│   ├── dist/                    # Production built assets
│   └── vite.config.js           # Vite configuration with /api proxy
├── server/                      # Express.js Backend
│   ├── index.js                 # API endpoints & static serving
│   ├── excelService.js          # Centralized ExcelJS integration
│   ├── authMiddleware.js        # Admin JWT authentication
│   ├── data/                    # Centralized Excel & JSON data
│   │   ├── college_registrations.xlsx
│   │   └── registrations.json
│   └── uploads/cvs/             # Private CV storage
├── test_system.js               # Comprehensive automated test suite
├── .env.example                 # Placeholder environment configuration
├── package.json                 # Project dependencies & scripts
└── README.md                    # Documentation
```
