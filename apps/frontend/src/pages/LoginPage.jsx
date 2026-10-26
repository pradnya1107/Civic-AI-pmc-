import React, { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 2-Step OTP Authentication State for Department Admins
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpData, setOtpData] = useState(null);
  const [otpError, setOtpError] = useState('');

  // If already authenticated, redirect by role directly
  if (isAuthenticated) {
    const role = (user?.role || 'CITIZEN').toUpperCase();
    if (role === 'DEPARTMENT_ADMIN') {
      return <Navigate to="/department/dashboard" replace />;
    }
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const validate = () => {
    const newErrors = {};
    const trimmedEmail = formData.email.trim();

    if (!trimmedEmail) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific error as user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const handleRoleRedirect = (authenticatedUser) => {
    const role = (authenticatedUser?.role || 'CITIZEN').toUpperCase();
    const fromPath = location.state?.from?.pathname;

    if (fromPath && fromPath !== '/login') {
      if (fromPath.startsWith('/department') && role === 'DEPARTMENT_ADMIN') {
        navigate(fromPath, { replace: true });
        return;
      }
      if (fromPath.startsWith('/admin') && (role === 'SUPER_ADMIN' || role === 'ADMIN')) {
        navigate(fromPath, { replace: true });
        return;
      }
      if (!fromPath.startsWith('/admin') && !fromPath.startsWith('/department') && role === 'CITIZEN') {
        navigate(fromPath, { replace: true });
        return;
      }
    }

    if (role === 'DEPARTMENT_ADMIN') {
      navigate('/department/dashboard', { replace: true });
    } else if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      navigate('/admin', { replace: true });
    } else {
      sessionStorage.setItem('civicai_welcome_voice_auto', 'true');
      sessionStorage.removeItem('civicai_welcome_voice_played');
      navigate('/dashboard', { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (result?.requiresOtp) {
        setOtpRequired(true);
        setOtpData(result.data || {});
        setOtpError('');
        return;
      }

      handleRoleRedirect(result?.user);
    } catch (err) {
      setServerError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setOtpError('');

    const trimmedOtp = otpCode.trim();
    if (!trimmedOtp || trimmedOtp.length < 6) {
      setOtpError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        otp: trimmedOtp,
      });

      handleRoleRedirect(result?.user);
    } catch (err) {
      setOtpError(err.message || 'Invalid verification OTP. Please check your backend terminal.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="brand-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <img
              src="/civicai-logo.jpg"
              alt="CivicAI PMC"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                objectFit: 'cover',
                boxShadow: '0 8px 24px rgba(13, 148, 136, 0.45)',
                border: '1.5px solid rgba(45, 212, 191, 0.4)',
              }}
            />
          </div>
          <div className="brand-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Pune Municipal Corporation
          </div>
          <h1 className="brand-title">CivicAI Citizen Portal</h1>
          <p className="brand-subtitle">
            {otpRequired
              ? 'Enter security verification code to unlock Department Admin Portal'
              : 'Sign in to report and track municipal civic complaints'}
          </p>
        </div>

        {serverError && (
          <div className="alert alert-error" role="alert" aria-live="assertive">
            <svg className="alert-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{serverError}</span>
          </div>
        )}

        {/* 2-Step OTP Challenge Form */}
        {otpRequired ? (
          <form onSubmit={handleOtpSubmit} noValidate aria-label="Two-factor verification form">
            <div
              style={{
                background: 'rgba(13, 148, 136, 0.08)',
                border: '1px solid rgba(13, 148, 136, 0.3)',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#0f766e',
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span>🔒 Security Verification Required</span>
                {otpData?.departmentName && (
                  <span
                    style={{
                      background: '#0D9488',
                      color: '#fff',
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {otpData.departmentName}
                  </span>
                )}
              </div>
              <p style={{ margin: 0 }}>
                A 6-digit confirmation code was printed to your <strong>backend terminal</strong>.
              </p>
              {otpData?.demoTerminalOtp && (
                <div
                  style={{
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ color: '#047857' }}>Terminal OTP:</span>
                  <code
                    style={{
                      background: '#fff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      letterSpacing: '2px',
                      border: '1px dashed #0D9488',
                      cursor: 'pointer',
                    }}
                    onClick={() => setOtpCode(otpData.demoTerminalOtp)}
                    title="Click to auto-fill"
                  >
                    {otpData.demoTerminalOtp}
                  </code>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>(click to auto-fill)</span>
                </div>
              )}
            </div>

            {otpError && (
              <div className="alert alert-error" role="alert" aria-live="assertive" style={{ marginBottom: '16px' }}>
                <span>{otpError}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="login-otp" className="form-label">
                <span>
                  6-Digit Verification Code<span className="required-star" aria-hidden="true">*</span>
                </span>
              </label>
              <div className="input-container">
                <input
                  id="login-otp"
                  name="otp"
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 491028"
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setOtpCode(val);
                    if (otpError) setOtpError('');
                  }}
                  autoFocus
                  disabled={isLoading}
                  className={`form-input ${otpError ? 'has-error' : ''}`}
                  style={{ fontSize: '20px', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
                  aria-required="true"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || otpCode.length < 6}
              aria-busy={isLoading}
              style={{ width: '100%', marginBottom: '10px' }}
            >
              {isLoading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <span>Confirm & Log In</span>
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setOtpRequired(false);
                setOtpCode('');
                setOtpError('');
              }}
              style={{ width: '100%' }}
            >
              ← Back to Credentials
            </button>
          </form>
        ) : (
          /* Standard Login Form */
          <form onSubmit={handleSubmit} noValidate aria-label="Sign in form">
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                <span>
                  Email Address<span className="required-star" aria-hidden="true">*</span>
                </span>
              </label>
              <div className="input-container">
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="citizen@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`form-input ${errors.email ? 'has-error' : ''}`}
                  aria-required="true"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                />
              </div>
              {errors.email && (
                <p id="login-email-error" className="field-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {errors.email}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                <span>
                  Password<span className="required-star" aria-hidden="true">*</span>
                </span>
              </label>
              <div className="input-container">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`form-input input-with-toggle ${errors.password ? 'has-error' : ''}`}
                  aria-required="true"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="login-password-error" className="field-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <span>New to CivicAI?</span>
          <Link to="/register">Register Citizen Account</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
