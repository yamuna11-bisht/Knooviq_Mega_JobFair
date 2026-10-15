import React, { useState, useEffect } from 'react';
import {
  Lock,
  Download,
  Search,
  RefreshCw,
  LogOut,
  FileSpreadsheet,
  FileText,
  UserCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Share2,
  ExternalLink,
  MessageCircle,
  Trash2
} from 'lucide-react';

export default function AdminPortal() {
  const [token, setToken] = useState(() => sessionStorage.getItem('admin_token') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [submissions, setSubmissions] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, mba: 0, diploma: 0, bms: 0, other: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [qualificationFilter, setQualificationFilter] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [actionNotice, setActionNotice] = useState('');

  // Delete Record Handler
  const handleDeleteRecord = async (submissionId, fullName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the registration for "${fullName}" (${submissionId})?\n\nThis will remove the candidate from the centralized Excel sheet and delete their uploaded CV permanently.`
    );
    if (!confirmed) return;

    setDeletingId(submissionId);
    setActionNotice('');

    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete record.');
      }

      setSubmissions((prev) => prev.filter((r) => r.submissionId !== submissionId));
      fetchSubmissions();

      setActionNotice(`✓ Registration for "${fullName}" was successfully deleted from database and Excel.`);
      setTimeout(() => setActionNotice(''), 4000);
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.message || 'Error deleting candidate record.');
    } finally {
      setDeletingId(null);
    }
  };

  // Helper to get shareable student URL
  const getStudentFormUrl = () => {
    return `${window.location.origin}/mega-job-fair-registration-form`;
  };

  const handleCopyLink = () => {
    const url = getStudentFormUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const url = getStudentFormUrl();
    const text = encodeURIComponent(
      `Mega Knooviq Job Fair - Candidate Registration Form:\nPlease fill out your details and upload your CV here:\n${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!password) {
      setLoginError('Please enter administrator password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid administrator password.');
      }

      setToken(data.token);
      sessionStorage.setItem('admin_token', data.token);
      setPassword('');
    } catch (err) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setToken('');
    sessionStorage.removeItem('admin_token');
    setSubmissions([]);
  };

  // Fetch Submissions
  const fetchSubmissions = async () => {
    if (!token) return;
    setIsLoadingData(true);
    setDataError('');

    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (qualificationFilter) params.append('qualification', qualificationFilter);

      const res = await fetch(`/api/admin/submissions?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 401 || res.status === 403) {
        handleLogout();
        throw new Error('Administrative session expired. Please log in again.');
      }

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch registrations.');
      }

      setSubmissions(result.data || []);
      if (result.metrics) {
        setMetrics(result.metrics);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setDataError(err.message || 'Unable to retrieve registrations.');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSubmissions();
    }
  }, [token, qualificationFilter]);

  // Search Debounce or Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSubmissions();
  };

  // Download Spreadsheet
  const handleExportExcel = () => {
    if (!token) return;
    window.open(`/api/admin/export-excel?token=${encodeURIComponent(token)}`, '_blank');
  };

  // Download Individual Student CV
  const handleDownloadCv = (submissionId) => {
    if (!token) return;
    window.open(`/api/admin/cv/${submissionId}?token=${encodeURIComponent(token)}`, '_blank');
  };

  // If not logged in, render login card
  if (!token) {
    return (
      <div className="main-wrapper">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon-wrap">
              <Lock size={26} />
            </div>
            <h3>Administrator Access</h3>
            <p>Enter the secure password to view registrations & Excel records</p>
          </div>

          {loginError && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '16px'
              }}
            >
              <AlertCircle size={16} />
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="field-label" htmlFor="adminPassword">
                Administrator Password
              </label>
              <div className="input-wrapper">
                <input
                  id="adminPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="text-input no-icon"
                  style={{ paddingRight: '40px' }}
                  placeholder="Enter administrator password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-submit"
              disabled={isLoggingIn}
              style={{ marginTop: '4px' }}
            >
              {isLoggingIn ? (
                <>
                  <div className="spinner" />
                  Verifying...
                </>
              ) : (
                'Unlock Admin Dashboard'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Logged-in Admin Portal View (FULL SCREEN RESPONSIVE)
  return (
    <div className="admin-wrapper full-screen-admin">
      <div className="admin-card">
        {/* Header with Title and Global Actions */}
        <div className="admin-header">
          <div className="admin-title-wrap">
            <h2>Mega Knooviq Job Fair - Candidate Repository</h2>
            <p>Live Centralized Excel Database • Secured CV Vault • Full Width View</p>
          </div>

          <div className="admin-actions">
            <button
              type="button"
              className="btn-export-excel"
              onClick={handleExportExcel}
              title="Download entire centralized database as .xlsx"
            >
              <FileSpreadsheet size={18} />
              Download Excel (.xlsx)
            </button>
            <button
              type="button"
              className="btn-admin-portal"
              onClick={fetchSubmissions}
              disabled={isLoadingData}
              title="Refresh Records"
            >
              <RefreshCw size={15} className={isLoadingData ? 'spinner' : ''} />
              Refresh
            </button>
            <button
              type="button"
              className="btn-logout"
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Shareable Link Quick Bar */}
        <div className="admin-share-bar">
          <div className="admin-share-left">
            <Share2 size={16} color="#0284c7" />
            <span style={{ fontSize: '0.85rem', color: '#0f2b5c' }}>
              <strong>Public Shareable Form Link:</strong>{' '}
              <a
                href={getStudentFormUrl()}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: 600 }}
              >
                {getStudentFormUrl()}
              </a>
            </span>
          </div>

          <div className="admin-share-right">
            <button
              type="button"
              className="btn-copy-share"
              onClick={handleCopyLink}
              title="Copy registration link to clipboard"
            >
              {copiedLink ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
              {copiedLink ? 'Link Copied!' : 'Copy Form Link'}
            </button>

            <button
              type="button"
              className="btn-whatsapp-share"
              onClick={handleShareWhatsApp}
              title="Share registration form via WhatsApp"
            >
              <MessageCircle size={15} />
              WhatsApp Share
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="metrics-row">
          <div className="metric-card">
            <span className="metric-label">Total Registered</span>
            <span className="metric-value">{metrics.total}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">MBA Candidates</span>
            <span className="metric-value" style={{ color: '#0284c7' }}>{metrics.mba}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Diploma</span>
            <span className="metric-value" style={{ color: '#d97706' }}>{metrics.diploma}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">BMS</span>
            <span className="metric-value" style={{ color: '#9333ea' }}>{metrics.bms}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Other Programs</span>
            <span className="metric-value" style={{ color: '#475569' }}>{metrics.other}</span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="filters-bar">
          <form onSubmit={handleSearchSubmit} className="search-input-box">
            <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by student name, email, mobile, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>

          <select
            className="qual-filter-select"
            value={qualificationFilter}
            onChange={(e) => setQualificationFilter(e.target.value)}
          >
            <option value="">All Qualifications</option>
            <option value="MBA">MBA</option>
            <option value="DIPLOMA">DIPLOMA</option>
            <option value="BMS">BMS</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>

        {dataError && (
          <div style={{ padding: '16px 28px', color: '#dc2626', fontSize: '0.875rem' }}>
            <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
            {dataError}
          </div>
        )}

        {actionNotice && (
          <div
            style={{
              padding: '12px 28px',
              backgroundColor: '#f0fdf4',
              color: '#15803d',
              borderBottom: '1px solid #bbf7d0',
              fontSize: '0.875rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Check size={16} />
            {actionNotice}
          </div>
        )}

        {/* Data Table with Full Width & No Cutoff */}
        <div className="table-responsive full-width-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '135px' }}>Submission ID</th>
                <th style={{ width: '155px' }}>Date & Time</th>
                <th>Full Name</th>
                <th>Email ID</th>
                <th style={{ textAlign: 'center', width: '90px' }}>Qualification</th>
                <th style={{ textAlign: 'center', width: '50px' }}>Age</th>
                <th style={{ width: '130px' }}>Mobile Number</th>
                <th style={{ textAlign: 'center', width: '70px' }}>Gender</th>
                <th style={{ minWidth: '160px' }}>CV Filename</th>
                <th style={{ textAlign: 'center', width: '180px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b' }}>
                    {isLoadingData ? (
                      <div>Loading registrations...</div>
                    ) : (
                      <div>No student registrations found matching your query.</div>
                    )}
                  </td>
                </tr>
              ) : (
                submissions.map((row) => (
                  <tr key={row.submissionId}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f2b5c', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {row.submissionId}
                    </td>
                    <td style={{ fontSize: '0.785rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {row.submittedAt}
                    </td>
                    <td style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {row.fullName}
                    </td>
                    <td style={{ color: '#0284c7', fontSize: '0.825rem' }}>
                      {row.email}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`qual-badge qual-${(row.qualification || 'other').toLowerCase()}`}>
                        {row.qualification}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#0f2b5c' }}>
                      {row.age}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.825rem', whiteSpace: 'nowrap' }}>
                      {row.mobile}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '0.825rem' }}>
                      {row.gender}
                    </td>
                    <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.cvFilename}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <FileText size={13} color="#64748b" />
                        {row.cvFilename}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn-download-cv"
                          onClick={() => handleDownloadCv(row.submissionId)}
                          title="Download student CV file securely"
                        >
                          <Download size={13} />
                          CV
                        </button>
                        <button
                          type="button"
                          className="btn-delete-record"
                          onClick={() => handleDeleteRecord(row.submissionId, row.fullName)}
                          disabled={deletingId === row.submissionId}
                          title={`Delete registration record for ${row.fullName}`}
                        >
                          <Trash2 size={13} />
                          {deletingId === row.submissionId ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
