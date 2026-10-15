import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus } from 'lucide-react';
import RegistrationForm from './RegistrationForm';
import AdminPortal from './AdminPortal';

export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    return window.location.hash === '#admin' ? 'admin' : 'register';
  });

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setCurrentView('admin');
      } else if (window.location.hash === '#register' || !window.location.hash) {
        setCurrentView('register');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const switchView = (view) => {
    setCurrentView(view);
    window.location.hash = view === 'admin' ? '#admin' : '#register';
  };

  return (
    <div className="app-container">
      {/* Top Application Static Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-section">
            <img
              src="/logo.png"
              alt="Knooviq Industries Logo"
              className="brand-logo-single"
            />
            <div className="brand-title-wrap">
              <span className="brand-company-name">Knooviq Industries Pvt Ltd</span>
              <h1 className="brand-event-title">Mega Job Fair</h1>
              <p className="brand-subtitle">Candidate & Student Registration Portal</p>
            </div>
          </div>

          <div className="header-actions">
            {currentView === 'register' ? (
              <button
                type="button"
                className="btn-admin-portal"
                onClick={() => switchView('admin')}
                title="Switch to Administrator Dashboard"
              >
                <ShieldCheck size={16} />
                Admin Portal
              </button>
            ) : (
              <button
                type="button"
                className="btn-admin-portal active"
                onClick={() => switchView('register')}
                title="Return to Job Fair Registration Form"
              >
                <UserPlus size={16} />
                Job Fair Form
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main>
        {currentView === 'register' ? (
          <RegistrationForm />
        ) : (
          <AdminPortal />
        )}
      </main>
    </div>
  );
}
