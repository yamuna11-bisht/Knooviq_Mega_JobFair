import React, { useState, useRef } from 'react';
import {
  User,
  Mail,
  GraduationCap,
  Calendar,
  Phone,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  RotateCcw,
  Copy,
  Check,
  MessageCircle,
  Share2
} from 'lucide-react';

const INITIAL_FORM = {
  fullName: '',
  email: '',
  qualification: '',
  age: '',
  mobile: '',
  gender: ''
};

export default function RegistrationForm() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [cvFile, setCvFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedData, setSubmittedData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const fileInputRef = useRef(null);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/mega-job-fair-registration-form`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const url = `${window.location.origin}/mega-job-fair-registration-form`;
    const text = encodeURIComponent(
      `Mega Knooviq Job Fair - Candidate Registration Form:\nPlease fill out your details and upload your CV here:\n${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Field Validation Helper
  const validateField = (name, value, file = cvFile) => {
    let error = '';

    switch (name) {
      case 'fullName':
        if (!value || !value.trim()) {
          error = 'Please enter your full name.';
        } else if (value.trim().length < 2) {
          error = 'Full name must be at least 2 characters.';
        }
        break;

      case 'email':
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        if (!value || !value.trim()) {
          error = 'Email ID is required.';
        } else if (!emailRegex.test(value.trim())) {
          error = 'Please enter a valid email address (e.g. student@gmail.com, name@college.edu).';
        }
        break;

      case 'qualification':
        const allowedQuals = ['MBA', 'DIPLOMA', 'BMS', 'OTHER'];
        if (!value || !allowedQuals.includes(value.trim().toUpperCase())) {
          error = 'Please select a qualification from the dropdown.';
        }
        break;

      case 'age':
        const numAge = Number(value);
        if (
          value === '' ||
          value === null ||
          value === undefined ||
          isNaN(numAge) ||
          !Number.isInteger(numAge) ||
          numAge < 18 ||
          numAge > 22
        ) {
          error = 'Age must be between 18 and 22 years.';
        }
        break;

      case 'mobile':
        const cleanMobile = value ? String(value).trim() : '';
        const mobileRegex = /^91\d{10}$/;
        if (!cleanMobile) {
          error = 'Enter 91 followed by your 10-digit mobile number.';
        } else if (!mobileRegex.test(cleanMobile)) {
          error = 'Enter 91 followed by your 10-digit mobile number.';
        }
        break;

      case 'gender':
        if (!value || !['Male', 'Female'].includes(value)) {
          error = 'Please select your gender.';
        }
        break;

      case 'cv':
        if (!file) {
          error = 'Please upload your CV or resume.';
        } else {
          const ext = file.name.split('.').pop().toLowerCase();
          if (ext !== 'pdf' && ext !== 'docx') {
            error = 'Only PDF and DOCX files are allowed.';
          } else if (file.size > 10 * 1024 * 1024) {
            error = 'File size must not exceed 10 MB.';
          }
        }
        break;

      default:
        break;
    }

    return error;
  };

  // Change Handler for text/select/radio
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const err = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: err }));
    }
  };

  // Blur Handler
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  // Gender Selection
  const handleGenderSelect = (gender) => {
    setFormData((prev) => ({ ...prev, gender }));
    setTouched((prev) => ({ ...prev, gender: true }));
    const err = validateField('gender', gender);
    setErrors((prev) => ({ ...prev, gender: err }));
  };

  // File Selection & Validation
  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    processSelectedFile(file);
  };

  const processSelectedFile = (file) => {
    setTouched((prev) => ({ ...prev, cv: true }));
    if (!file) {
      setCvFile(null);
      setErrors((prev) => ({ ...prev, cv: 'Please upload your CV or resume.' }));
      return;
    }

    const err = validateField('cv', null, file);
    if (err) {
      setCvFile(null);
      setErrors((prev) => ({ ...prev, cv: err }));
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setCvFile(file);
      setErrors((prev) => ({ ...prev, cv: '' }));
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setCvFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setErrors((prev) => ({ ...prev, cv: 'Please upload your CV or resume.' }));
  };

  // Format File Size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Full Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    // Mark all fields touched
    const allTouched = {
      fullName: true,
      email: true,
      qualification: true,
      age: true,
      mobile: true,
      gender: true,
      cv: true
    };
    setTouched(allTouched);

    // Validate all fields
    const formErrors = {
      fullName: validateField('fullName', formData.fullName),
      email: validateField('email', formData.email),
      qualification: validateField('qualification', formData.qualification),
      age: validateField('age', formData.age),
      mobile: validateField('mobile', formData.mobile),
      gender: validateField('gender', formData.gender),
      cv: validateField('cv', null, cvFile)
    };

    // Filter out empty error strings
    const activeErrors = Object.fromEntries(
      Object.entries(formErrors).filter(([_, msg]) => Boolean(msg))
    );

    setErrors(activeErrors);

    if (Object.keys(activeErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const dataPayload = new FormData();
      dataPayload.append('fullName', formData.fullName.trim());
      dataPayload.append('email', formData.email.trim());
      dataPayload.append('qualification', formData.qualification);
      dataPayload.append('age', formData.age);
      dataPayload.append('mobile', formData.mobile.trim());
      dataPayload.append('gender', formData.gender);
      dataPayload.append('cv', cvFile);

      const response = await fetch('/api/register', {
        method: 'POST',
        body: dataPayload
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.details) {
          setErrors(result.details);
        }
        throw new Error(result.error || 'Failed to submit registration. Please verify your details.');
      }

      // Success
      setSubmittedData({
        submissionId: result.submissionId,
        submittedAt: result.submittedAt,
        fullName: formData.fullName
      });

      // Clear the form
      setFormData(INITIAL_FORM);
      setCvFile(null);
      setErrors({});
      setTouched({});
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Submission error:', err);
      setSubmitError(err.message || 'An error occurred during submission. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset after success
  const handleRegisterAnother = () => {
    setSubmittedData(null);
    setFormData(INITIAL_FORM);
    setCvFile(null);
    setErrors({});
    setTouched({});
    setSubmitError('');
  };

  // Success view if submitted
  if (submittedData) {
    return (
      <div className="main-wrapper">
        <div className="form-card">
          <div className="success-card">
            <div className="success-icon-wrap">
              <CheckCircle2 size={46} strokeWidth={2.5} />
            </div>
            <h3>Registration Completed!</h3>
            <p>
              Your registration and CV for <strong>Mega Knooviq Job Fair</strong> have been submitted successfully!
            </p>
            <div className="submission-pill">
              <span>Submission ID:</span>
              <strong>{submittedData.submissionId}</strong>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '-14px', marginBottom: '24px' }}>
              Student: <strong>{submittedData.fullName}</strong> • Recorded in centralized database.
            </p>
            <button
              type="button"
              className="btn-reset"
              onClick={handleRegisterAnother}
            >
              <RotateCcw size={16} />
              Register Another Student
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-wrapper">
      <div className="form-card">
        {/* Card Header */}
        <div className="form-header">
          <div className="form-badge-pill">
            <GraduationCap size={14} />
            Knooviq Industries Pvt Ltd
          </div>
          <h2>Mega Job Fair</h2>
          <p>Candidate & Student Registration • Please complete all fields and upload your latest CV to apply.</p>

          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                background: 'rgba(255, 255, 255, 0.16)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.785rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              title="Copy shareable registration link to clipboard"
            >
              {copiedLink ? <Check size={14} color="#86efac" /> : <Copy size={14} />}
              {copiedLink ? 'Link Copied to Clipboard!' : 'Copy Form Link'}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{
                background: '#25d366',
                border: 'none',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.785rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Share registration form via WhatsApp"
            >
              <MessageCircle size={15} />
              Share on WhatsApp
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="form-body">
          {submitError && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fca5a5',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px'
              }}
            >
              <AlertCircle size={18} />
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              {/* Field A: Full Name */}
              <div className="form-group">
                <label className="field-label" htmlFor="fullName">
                  Full Name <span className="required-star">*</span>
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <User size={18} />
                  </span>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    className={`text-input ${errors.fullName ? 'input-error' : ''}`}
                    placeholder="e.g. Rahul Sharma"
                    value={formData.fullName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isSubmitting}
                    autoComplete="name"
                  />
                </div>
                {errors.fullName && (
                  <div className="field-error-msg">
                    <AlertCircle size={14} />
                    {errors.fullName}
                  </div>
                )}
              </div>

              {/* Field B: Email ID */}
              <div className="form-group">
                <label className="field-label" htmlFor="email">
                  Email ID <span className="required-star">*</span>
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <Mail size={18} />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className={`text-input ${errors.email ? 'input-error' : ''}`}
                    placeholder="e.g. student@gmail.com, name@college.edu"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                </div>
                {errors.email && (
                  <div className="field-error-msg">
                    <AlertCircle size={14} />
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Row: Qualification & Age */}
              <div className="form-row-2">
                {/* Field C: Qualification */}
                <div className="form-group">
                  <label className="field-label" htmlFor="qualification">
                    Qualification <span className="required-star">*</span>
                  </label>
                  <div className="select-wrapper">
                    <select
                      id="qualification"
                      name="qualification"
                      className={`select-input no-icon ${errors.qualification ? 'input-error' : ''}`}
                      value={formData.qualification}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting}
                    >
                      <option value="">Select Qualification</option>
                      <option value="MBA">MBA</option>
                      <option value="DIPLOMA">DIPLOMA</option>
                      <option value="BMS">BMS</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                  {errors.qualification && (
                    <div className="field-error-msg">
                      <AlertCircle size={14} />
                      {errors.qualification}
                    </div>
                  )}
                </div>

                {/* Field D: Age */}
                <div className="form-group">
                  <label className="field-label" htmlFor="age">
                    Age <span className="required-star">*</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <Calendar size={18} />
                    </span>
                    <input
                      id="age"
                      name="age"
                      type="number"
                      min="18"
                      max="22"
                      step="1"
                      className={`text-input ${errors.age ? 'input-error' : ''}`}
                      placeholder="18 - 22"
                      value={formData.age}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting}
                    />
                  </div>
                  <span className="field-hint">Ages 18 to 22 years only</span>
                  {errors.age && (
                    <div className="field-error-msg">
                      <AlertCircle size={14} />
                      {errors.age}
                    </div>
                  )}
                </div>
              </div>

              {/* Row: Mobile Number & Gender */}
              <div className="form-row-2">
                {/* Field E: Mobile Number */}
                <div className="form-group">
                  <label className="field-label" htmlFor="mobile">
                    Mobile Number <span className="required-star">*</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <Phone size={18} />
                    </span>
                    <input
                      id="mobile"
                      name="mobile"
                      type="tel"
                      maxLength={12}
                      className={`text-input ${errors.mobile ? 'input-error' : ''}`}
                      placeholder="919876543210"
                      value={formData.mobile}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting}
                    />
                  </div>
                  <span className="field-hint">Must start with 91 followed by 10 digits (12 digits total)</span>
                  {errors.mobile && (
                    <div className="field-error-msg">
                      <AlertCircle size={14} />
                      {errors.mobile}
                    </div>
                  )}
                </div>

                {/* Field F: Gender */}
                <div className="form-group">
                  <label className="field-label">
                    Gender <span className="required-star">*</span>
                  </label>
                  <div className="radio-group">
                    <div
                      className={`radio-card ${formData.gender === 'Male' ? 'selected' : ''}`}
                      onClick={() => !isSubmitting && handleGenderSelect('Male')}
                      role="radio"
                      aria-checked={formData.gender === 'Male'}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') handleGenderSelect('Male');
                      }}
                    >
                      <div className="radio-circle">
                        <div className="radio-inner-dot" />
                      </div>
                      <span>Male</span>
                    </div>

                    <div
                      className={`radio-card ${formData.gender === 'Female' ? 'selected' : ''}`}
                      onClick={() => !isSubmitting && handleGenderSelect('Female')}
                      role="radio"
                      aria-checked={formData.gender === 'Female'}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') handleGenderSelect('Female');
                      }}
                    >
                      <div className="radio-circle">
                        <div className="radio-inner-dot" />
                      </div>
                      <span>Female</span>
                    </div>
                  </div>
                  {errors.gender && (
                    <div className="field-error-msg">
                      <AlertCircle size={14} />
                      {errors.gender}
                    </div>
                  )}
                </div>
              </div>

              {/* Field G: CV / Resume Upload */}
              <div className="form-group">
                <label className="field-label" htmlFor="cv-upload-input">
                  Upload Your CV / Resume <span className="required-star">*</span>
                </label>

                <input
                  id="cv-upload-input"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />

                {!cvFile ? (
                  <div
                    className={`upload-dropzone ${errors.cv ? 'has-error' : ''}`}
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        processSelectedFile(e.dataTransfer.files[0]);
                      }
                    }}
                  >
                    <div className="upload-icon-circle">
                      <UploadCloud size={28} />
                    </div>
                    <div className="upload-title">Choose your CV or drag & drop here</div>
                    <div className="upload-subtitle">
                      Supported formats: <strong>PDF and DOCX</strong> • Maximum file size: <strong>10 MB</strong>
                    </div>
                    <button
                      type="button"
                      className="btn-browse"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current && fileInputRef.current.click();
                      }}
                    >
                      Browse Document
                    </button>
                  </div>
                ) : (
                  <div className="selected-file-card">
                    <div className="selected-file-left">
                      <div className="file-type-badge">
                        {cvFile.name.split('.').pop()}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div className="file-name-text" title={cvFile.name}>
                          {cvFile.name}
                        </div>
                        <div className="file-size-text">
                          {formatFileSize(cvFile.size)} • Ready to upload
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn-browse"
                        style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        disabled={isSubmitting}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        className="btn-file-remove"
                        onClick={handleRemoveFile}
                        disabled={isSubmitting}
                        title="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {errors.cv && (
                  <div className="field-error-msg">
                    <AlertCircle size={14} />
                    {errors.cv}
                  </div>
                )}
              </div>

              {/* Submit Registration Button */}
              <button
                type="submit"
                className="btn-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner" />
                    Submitting Registration & Storing CV...
                  </>
                ) : (
                  <>
                    Submit Registration
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
