import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const RegisterPage = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validate = () => {
    const newErrors = {};
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();

    if (!trimmedName) {
      newErrors.name = 'Full name is required.';
    }

    if (!trimmedEmail) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.';
    } else if (
      !/[a-z]/.test(formData.password) ||
      !/[A-Z]/.test(formData.password) ||
      !/\d/.test(formData.password) ||
      !/[^A-Za-z0-9]/.test(formData.password)
    ) {
      newErrors.password =
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password must match password.';
    }

    if (formData.phoneNumber) {
      const trimmedPhone = formData.phoneNumber.trim();
      if (!/^[+0-9\s\-()]{7,32}$/.test(trimmedPhone)) {
        newErrors.phoneNumber = 'Please enter a valid phone number.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessInfo(null);

    // Strict client-side check: Do not call API when validation fails
    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      };

      if (formData.phoneNumber.trim()) {
        payload.phoneNumber = formData.phoneNumber.trim();
      }

      const result = await register(payload);

      // If backend returned a valid JWT access token, navigate straight to dashboard
      if (result.hasToken) {
        navigate('/dashboard', { replace: true });
        return;
      }

      // If backend returned user without token (requires email verification per backend contract)
      setSuccessInfo({
        message:
          result.message ||
          'Account created successfully. Verify your email with the OTP sent to your inbox to continue.',
        email: payload.email,
      });
    } catch (err) {
      setServerError(
        err.message || 'Registration failed. Please review your information and try again.',
      );
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
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            PMC Citizen Services
          </div>
          <h1 className="brand-title">Create Citizen Account</h1>
          <p className="brand-subtitle">Register to submit grievances and track civic resolutions</p>
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

        {successInfo ? (
          <div className="alert alert-success" role="alert" style={{ flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <strong style={{ fontSize: '1rem' }}>Registration Successful!</strong>
            </div>
            <p style={{ marginBottom: '1rem', color: 'var(--color-text-main)' }}>{successInfo.message}</p>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Account registered for: <strong>{successInfo.email}</strong>. Once verified, you can sign in to access your civic dashboard.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none' }}>
              Proceed to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate aria-label="Citizen Registration Form">
            <div className="form-group">
              <label htmlFor="register-name" className="form-label">
                <span>Full Name<span className="required-star" aria-hidden="true">*</span></span>
              </label>
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="e.g. Ramesh Kulkarni"
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
                className={`form-input ${errors.name ? 'has-error' : ''}`}
                aria-required="true"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'register-name-error' : undefined}
              />
              {errors.name && (
                <p id="register-name-error" className="field-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {errors.name}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="register-email" className="form-label">
                <span>Email Address<span className="required-star" aria-hidden="true">*</span></span>
              </label>
              <input
                id="register-email"
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
                aria-describedby={errors.email ? 'register-email-error' : undefined}
              />
              {errors.email && (
                <p id="register-email-error" className="field-error" role="alert">
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
              <label htmlFor="register-phone" className="form-label">
                <span>Phone Number <span style={{ color: 'var(--color-text-dim)', fontWeight: 400 }}>(Optional)</span></span>
              </label>
              <input
                id="register-phone"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                placeholder="+91 9876543210"
                value={formData.phoneNumber}
                onChange={handleChange}
                disabled={isLoading}
                className={`form-input ${errors.phoneNumber ? 'has-error' : ''}`}
                aria-invalid={Boolean(errors.phoneNumber)}
                aria-describedby={errors.phoneNumber ? 'register-phone-error' : undefined}
              />
              {errors.phoneNumber && (
                <p id="register-phone-error" className="field-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {errors.phoneNumber}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="register-password" className="form-label">
                <span>Password<span className="required-star" aria-hidden="true">*</span></span>
              </label>
              <div className="input-container">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters with upper, lower, digit, symbol"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`form-input input-with-toggle ${errors.password ? 'has-error' : ''}`}
                  aria-required="true"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby="register-password-rules register-password-error"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                <p id="register-password-error" className="field-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {errors.password}
                </p>
              )}
              <div id="register-password-rules" className="field-hint">
                Must include 8+ characters, uppercase, lowercase, number, and special symbol.
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="register-confirm-password" className="form-label">
                <span>Confirm Password<span className="required-star" aria-hidden="true">*</span></span>
              </label>
              <div className="input-container">
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`form-input input-with-toggle ${errors.confirmPassword ? 'has-error' : ''}`}
                  aria-required="true"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={errors.confirmPassword ? 'register-confirm-error' : undefined}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? (
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
              {errors.confirmPassword && (
                <p id="register-confirm-error" className="field-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {errors.confirmPassword}
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
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Register Citizen Account</span>
              )}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <span>Already registered?</span>
          <Link to="/login">Sign in here</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
