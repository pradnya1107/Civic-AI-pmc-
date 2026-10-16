import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { complaintApi } from '../services/api';

export const PMC_CATEGORIES = [
  { value: '', label: 'Select a Category *', disabled: true },
  { value: 'Roads & Potholes', label: 'Roads & Potholes (खड्डे आणि रस्ते)' },
  { value: 'Water Supply', label: 'Water Supply (पाणी पुरवठा)' },
  { value: 'Drainage & Sewerage', label: 'Drainage & Sewerage (ड्रेनेज आणि सांडपाणी)' },
  { value: 'Solid Waste & Garbage', label: 'Solid Waste & Garbage (कचरा व्यवस्थापन)' },
  { value: 'Street Lighting & Electrical', label: 'Street Lighting & Electrical (पथदिवे)' },
  { value: 'Health & Sanitation', label: 'Health & Sanitation (आरोग्य आणि स्वच्छता)' },
  { value: 'Garden & Tree Trimming', label: 'Garden & Tree Trimming (उद्यान आणि झाडे)' },
  { value: 'Encroachment', label: 'Encroachment (अतिक्रमण)' },
  { value: 'Traffic & Signage', label: 'Traffic & Signage (वाहतूक आणि फलक)' },
  { value: 'Other Civic Grievance', label: 'Other Civic Grievance (इतर नागरी तक्रार)' },
];

export const PMC_WARDS = [
  { value: '', label: 'Select PMC Ward (Optional)' },
  { value: 'Ward 1 - Shivajinagar / Ghole Road', label: 'Ward 1 - Shivajinagar / Ghole Road' },
  { value: 'Ward 2 - Kothrud / Bavdhan', label: 'Ward 2 - Kothrud / Bavdhan' },
  { value: 'Ward 3 - Dhankawadi / Sahakarnagar', label: 'Ward 3 - Dhankawadi / Sahakarnagar' },
  { value: 'Ward 4 - Sinhagad Road / Vadgaon', label: 'Ward 4 - Sinhagad Road / Vadgaon' },
  { value: 'Ward 5 - Warje / Karvenagar', label: 'Ward 5 - Warje / Karvenagar' },
  { value: 'Ward 6 - Kasba / Vishrambaug Wada', label: 'Ward 6 - Kasba / Vishrambaug Wada' },
  { value: 'Ward 7 - Bhavani Peth', label: 'Ward 7 - Bhavani Peth' },
  { value: 'Ward 8 - Bibwewadi', label: 'Ward 8 - Bibwewadi' },
  { value: 'Ward 9 - Hadapsar / Mundhwa', label: 'Ward 9 - Hadapsar / Mundhwa' },
  { value: 'Ward 10 - Wanowrie / Ramtekdi', label: 'Ward 10 - Wanowrie / Ramtekdi' },
  { value: 'Ward 11 - Kondhwa / Yewalewadi', label: 'Ward 11 - Kondhwa / Yewalewadi' },
  { value: 'Ward 12 - Ahmednagar Road / Vadgaonsheri', label: 'Ward 12 - Ahmednagar Road / Vadgaonsheri' },
  { value: 'Ward 13 - Yerwada / Kalas / Dhanori', label: 'Ward 13 - Yerwada / Kalas / Dhanori' },
  { value: 'Ward 14 - Dhole Patil Road', label: 'Ward 14 - Dhole Patil Road' },
  { value: 'Ward 15 - Aundh / Baner / Pashan', label: 'Ward 15 - Aundh / Baner / Pashan' },
];

export const ComplaintFormPage = () => {
  const navigate = useNavigate();

  // Controlled form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    address: '',
    ward: '',
    latitude: '',
    longitude: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoNotice, setGeoNotice] = useState('');

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    if (serverError) setServerError('');
  };

  // Client-side validation function
  const validate = () => {
    const newErrors = {};

    // Title validation: required, 3-200 characters
    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) {
      newErrors.title = 'Complaint title is required.';
    } else if (trimmedTitle.length < 3) {
      newErrors.title = 'Title must be at least 3 characters long.';
    } else if (trimmedTitle.length > 200) {
      newErrors.title = 'Title cannot exceed 200 characters.';
    }

    // Category validation: required
    if (!formData.category || !formData.category.trim()) {
      newErrors.category = 'Please select a grievance category.';
    }

    // Description validation: required, 10-5000 characters
    const trimmedDesc = formData.description.trim();
    if (!trimmedDesc) {
      newErrors.description = 'Complaint description is required.';
    } else if (trimmedDesc.length < 10) {
      newErrors.description = 'Description must be at least 10 characters long.';
    } else if (trimmedDesc.length > 5000) {
      newErrors.description = 'Description cannot exceed 5000 characters.';
    }

    // Location Address validation: required, 1-300 characters
    const trimmedAddress = formData.address.trim();
    if (!trimmedAddress) {
      newErrors.address = 'Location address or landmark is required.';
    } else if (trimmedAddress.length > 300) {
      newErrors.address = 'Address cannot exceed 300 characters.';
    }

    // Latitude & Longitude pairing validation
    const hasLat = formData.latitude !== '' && formData.latitude !== null && formData.latitude !== undefined;
    const hasLng = formData.longitude !== '' && formData.longitude !== null && formData.longitude !== undefined;
    if (hasLat !== hasLng) {
      newErrors.location = 'Latitude and longitude must both be provided together or left blank.';
    }

    return newErrors;
  };

  // Optional: Geolocation helper
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoNotice('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    setGeoNotice('Detecting your GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          address: prev.address || `GPS: ${lat}, ${lng} (Pune)`,
        }));
        setGeoNotice(`Location captured: ${lat}, ${lng}`);
        setGeoLoading(false);
      },
      (error) => {
        setGeoLoading(false);
        setGeoNotice(`Unable to retrieve location (${error.message || 'Permission denied'}).`);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Focus first erroneous input
      const firstErrorField = Object.keys(validationErrors)[0];
      const el = document.getElementById(`complaint-${firstErrorField}`);
      if (el) el.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      // Build complaint payload matching backend schema
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category.trim(),
        location: {
          address: formData.address.trim(),
          ...(formData.ward.trim() ? { ward: formData.ward.trim() } : {}),
          ...(formData.latitude !== '' && formData.longitude !== ''
            ? {
                latitude: Number(formData.latitude),
                longitude: Number(formData.longitude),
              }
            : {}),
        },
      };

      const response = await complaintApi.createComplaint(payload);
      const createdComplaint = response?.data?.complaint || response?.complaint || response?.data;
      const complaintId = createdComplaint?._id || createdComplaint?.id || '';

      setToastMessage('Grievance submitted successfully! Redirecting to tracking...');

      setTimeout(() => {
        if (complaintId) {
          navigate(`/complaints/${complaintId}`, {
            state: { message: 'Complaint registered successfully!' },
          });
        } else {
          navigate('/complaints', {
            state: { message: 'Complaint registered successfully!' },
          });
        }
      }, 900);
    } catch (err) {
      const msg = err.message || 'Failed to submit grievance. Please verify details and try again.';
      setServerError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-container">
      <Navbar />

      <main className="dashboard-main" id="main-content">
        {/* Breadcrumb Navigation */}
        <nav className="breadcrumb-nav" aria-label="Breadcrumb">
          <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
          <span className="breadcrumb-separator">/</span>
          <Link to="/complaints" className="breadcrumb-link">My Complaints</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current" aria-current="page">Report an Issue</span>
        </nav>

        {/* Page Header */}
        <header className="page-header">
          <div>
            <h1 className="page-title">Report a Civic Grievance</h1>
            <p className="page-subtitle">
              Submit an issue directly to Pune Municipal Corporation. Track resolution progress in real time.
            </p>
          </div>
          <Link to="/complaints" className="btn btn-outline btn-sm">
            Cancel & Back
          </Link>
        </header>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="toast-notification toast-notification--success" role="status" aria-live="polite">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Server Error Alert */}
        {serverError && (
          <div className="alert-banner alert-banner--error" role="alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <strong>Submission Error:</strong> {serverError}
            </div>
          </div>
        )}

        {/* Complaint Submission Form Card */}
        <section className="form-card" aria-labelledby="form-heading">
          <form onSubmit={handleSubmit} noValidate className="complaint-form">
            {/* Title field */}
            <div className={`form-group ${errors.title ? 'has-error' : ''}`}>
              <div className="form-label-row">
                <label htmlFor="complaint-title" className="form-label">
                  Complaint Title <span className="required-star">*</span>
                </label>
                <span className="char-count" aria-hidden="true">
                  {formData.title.length}/200
                </span>
              </div>
              <input
                type="text"
                id="complaint-title"
                name="title"
                className="form-input"
                placeholder="Brief summary (e.g. Major pothole near Swargate Bus Stand)"
                value={formData.title}
                onChange={handleChange}
                maxLength={200}
                aria-required="true"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? 'complaint-title-error' : undefined}
                disabled={isSubmitting}
              />
              {errors.title && (
                <div id="complaint-title-error" className="field-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errors.title}</span>
                </div>
              )}
            </div>

            {/* Category selection */}
            <div className={`form-group ${errors.category ? 'has-error' : ''}`}>
              <label htmlFor="complaint-category" className="form-label">
                Department / Grievance Category <span className="required-star">*</span>
              </label>
              <select
                id="complaint-category"
                name="category"
                className="form-input form-select"
                value={formData.category}
                onChange={handleChange}
                aria-required="true"
                aria-invalid={!!errors.category}
                aria-describedby={errors.category ? 'complaint-category-error' : undefined}
                disabled={isSubmitting}
              >
                {PMC_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value} disabled={cat.disabled}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <div id="complaint-category-error" className="field-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errors.category}</span>
                </div>
              )}
            </div>

            {/* Description field */}
            <div className={`form-group ${errors.description ? 'has-error' : ''}`}>
              <div className="form-label-row">
                <label htmlFor="complaint-description" className="form-label">
                  Detailed Description <span className="required-star">*</span>
                </label>
                <span className="char-count" aria-hidden="true">
                  {formData.description.length}/5000
                </span>
              </div>
              <textarea
                id="complaint-description"
                name="description"
                className="form-input form-textarea"
                rows={5}
                placeholder="Describe the issue, landmarks, severity, hazards, and how long it has persisted..."
                value={formData.description}
                onChange={handleChange}
                maxLength={5000}
                aria-required="true"
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? 'complaint-description-error' : undefined}
                disabled={isSubmitting}
              />
              {errors.description && (
                <div id="complaint-description-error" className="field-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errors.description}</span>
                </div>
              )}
            </div>

            {/* Location Section */}
            <fieldset className="form-fieldset">
              <legend className="form-legend">
                <span>Location Details</span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm geo-btn"
                  onClick={handleGetLocation}
                  disabled={geoLoading || isSubmitting}
                  aria-label="Use device GPS location"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                  </svg>
                  <span>{geoLoading ? 'Detecting GPS...' : 'Use My Current Location'}</span>
                </button>
              </legend>

              {geoNotice && (
                <p className="geo-notice" role="status">
                  {geoNotice}
                </p>
              )}

              {/* Address input */}
              <div className={`form-group ${errors.address ? 'has-error' : ''}`}>
                <label htmlFor="complaint-address" className="form-label">
                  Street Address / Landmark <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  id="complaint-address"
                  name="address"
                  className="form-input"
                  placeholder="e.g. Near Ganpati Mandir, FC Road, Pune 411004"
                  value={formData.address}
                  onChange={handleChange}
                  maxLength={300}
                  aria-required="true"
                  aria-invalid={!!errors.address}
                  aria-describedby={errors.address ? 'complaint-address-error' : undefined}
                  disabled={isSubmitting}
                />
                {errors.address && (
                  <div id="complaint-address-error" className="field-error" role="alert">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{errors.address}</span>
                  </div>
                )}
              </div>

              {/* Ward dropdown */}
              <div className="form-group">
                <label htmlFor="complaint-ward" className="form-label">
                  PMC Ward Office (Administrative Zone)
                </label>
                <select
                  id="complaint-ward"
                  name="ward"
                  className="form-input form-select"
                  value={formData.ward}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  {PMC_WARDS.map((ward) => (
                    <option key={ward.value} value={ward.value}>
                      {ward.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Coordinates (optional) */}
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="complaint-latitude" className="form-label">
                    Latitude (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    id="complaint-latitude"
                    name="latitude"
                    className="form-input"
                    placeholder="e.g. 18.5204"
                    value={formData.latitude}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="complaint-longitude" className="form-label">
                    Longitude (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    id="complaint-longitude"
                    name="longitude"
                    className="form-input"
                    placeholder="e.g. 73.8567"
                    value={formData.longitude}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              {errors.location && (
                <div className="field-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errors.location}</span>
                </div>
              )}
            </fieldset>

            {/* Form Actions */}
            <div className="form-actions">
              <Link to="/complaints" className="btn btn-outline" tabIndex={isSubmitting ? -1 : 0}>
                Cancel
              </Link>

              <button
                type="submit"
                className="btn btn-primary btn-submit"
                id="submit-complaint-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner" style={{ width: '1rem', height: '1rem' }} aria-hidden="true" />
                    <span>Submitting Grievance...</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    <span>Submit Grievance</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

export default ComplaintFormPage;
