import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { complaintApi, aiApi } from '../services/api';

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

// Sample civic images for quick demo selection
const DEMO_PRESETS = [
  {
    label: 'Road Pothole (Shivajinagar)',
    url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
    category: 'Roads & Potholes',
    hint: 'Deep pothole on main road causing hazard for two-wheelers',
    address: 'Near Agriculture College, Shivajinagar, Pune',
    ward: 'Ward 1 - Shivajinagar / Ghole Road',
    lat: 18.5308,
    lng: 73.8475,
  },
  {
    label: 'Garbage Overflow (Kothrud)',
    url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800',
    category: 'Solid Waste & Garbage',
    hint: 'Garbage dump overflowing outside residential society gate for 4 days',
    address: 'Near Karve Statue, Kothrud, Pune',
    ward: 'Ward 2 - Kothrud / Bavdhan',
    lat: 18.5074,
    lng: 73.8077,
  },
  {
    label: 'Waterlogging / Drainage (FC Road)',
    url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800',
    category: 'Drainage & Sewerage',
    hint: 'Severe monsoon water stagnation and blocked drainage line',
    address: 'FC Road near Deccan Gymkhana, Pune',
    ward: 'Ward 1 - Shivajinagar / Ghole Road',
    lat: 18.5196,
    lng: 73.8415,
  },
  {
    label: 'Broken Streetlight (Hadapsar)',
    url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800',
    category: 'Street Lighting & Electrical',
    hint: 'Street pole light malfunctioning, creating dark unsafe stretch at night',
    address: 'Magarpatta Road, Hadapsar, Pune',
    ward: 'Ward 9 - Hadapsar / Mundhwa',
    lat: 18.5089,
    lng: 73.9259,
  },
];

export const ComplaintFormPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Controlled form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'MEDIUM',
    address: '',
    ward: '',
    latitude: '',
    longitude: '',
    imageUrl: '',
  });

  const [imagePreview, setImagePreview] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Duplicates state
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [supportedDuplicateId, setSupportedDuplicateId] = useState(null);

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
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    if (serverError) setServerError('');
  };

  // Check for duplicates when location/category changes
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if ((formData.address.trim().length >= 5 || (formData.latitude && formData.longitude)) && formData.category) {
        try {
          setIsCheckingDuplicates(true);
          const res = await complaintApi.checkDuplicates({
            latitude: formData.latitude ? Number(formData.latitude) : undefined,
            longitude: formData.longitude ? Number(formData.longitude) : undefined,
            category: formData.category,
            title: formData.title,
            address: formData.address,
          });

          if (res && res.success && res.data?.duplicates?.length > 0) {
            setDuplicateMatches(res.data.duplicates);
          } else {
            setDuplicateMatches([]);
          }
        } catch {
          // Non-blocking duplicate check error
        } finally {
          setIsCheckingDuplicates(false);
        }
      } else {
        setDuplicateMatches([]);
      }
    }, 600);

    return () => clearTimeout(debounceTimer);
  }, [formData.address, formData.category, formData.latitude, formData.longitude, formData.title]);

  // Support an existing duplicate
  const handleSupportExisting = async (duplicateId) => {
    try {
      setSupportedDuplicateId(duplicateId);
      const res = await complaintApi.supportComplaint(duplicateId);
      if (res && res.success) {
        setToastMessage('Thank you! You supported this existing report. Its priority has been escalated.');
        setTimeout(() => {
          navigate(`/complaints/${duplicateId}`);
        }, 1200);
      }
    } catch (err) {
      setServerError(err.message || 'Failed to support existing grievance.');
    } finally {
      setSupportedDuplicateId(null);
    }
  };

  // Handle local file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setServerError('Please select an image file (JPG, PNG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setImageBase64(reader.result);
      setFormData((prev) => ({ ...prev, imageUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // Select demo preset
  const handleSelectPreset = (preset) => {
    setImagePreview(preset.url);
    setImageBase64('');
    setFormData((prev) => ({
      ...prev,
      imageUrl: preset.url,
      category: preset.category,
      address: preset.address,
      ward: preset.ward,
      latitude: preset.lat,
      longitude: preset.lng,
      description: prev.description || preset.hint,
    }));
  };

  // Trigger Gemini AI Vision Scan
  const handleAiScan = async () => {
    if (!formData.imageUrl && !imageBase64) {
      setServerError('Please upload or select an issue photo first to run AI Severity Analysis.');
      return;
    }

    try {
      setIsAiScanning(true);
      setServerError('');
      const res = await aiApi.analyzeComplaint({
        imageUrl: formData.imageUrl,
        imageBase64: imageBase64 || undefined,
        descriptionHint: formData.description || formData.title,
        category: formData.category,
      });

      if (res && res.success && res.data) {
        const ai = res.data;
        setAiResult(ai);

        setFormData((prev) => ({
          ...prev,
          title: prev.title || ai.suggestedTitle || 'Reported Civic Issue',
          description: prev.description ? `${prev.description}\n\n[AI Analysis]: ${ai.description}` : ai.description,
          category: ai.category || prev.category || 'Roads & Potholes',
          priority: ai.priority || prev.priority || 'HIGH',
        }));

        setToastMessage(`AI Scan Complete: Severity ${ai.severity} (${ai.severityScore}/100) - Assigned to ${ai.department}`);
      }
    } catch (err) {
      setServerError(err.message || 'AI analysis failed. You can continue filling the form manually.');
    } finally {
      setIsAiScanning(false);
    }
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
      const firstErrorField = Object.keys(validationErrors)[0];
      const el = document.getElementById(`complaint-${firstErrorField}`);
      if (el) el.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category.trim(),
        priority: formData.priority,
        imageUrl: formData.imageUrl || undefined,
        aiAnalysis: aiResult || undefined,
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
            <div className="d-flex align-center gap-2 mb-1">
              <span className="badge badge-primary">AI Civic Intelligence</span>
              <span className="badge badge-success">Smart City PMC</span>
            </div>
            <h1 className="page-title">Report a Civic Grievance</h1>
            <p className="page-subtitle">
              Upload photo evidence for automated AI severity detection, instant duplicate prevention, and guaranteed SLA resolution.
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

        {/* Duplicate Detection Alert Banner */}
        {duplicateMatches.length > 0 && (
          <div className="duplicate-alert-card" role="region" aria-label="Similar nearby complaints">
            <div className="duplicate-alert-header">
              <div className="duplicate-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className="duplicate-title">Similar Issues Already Reported Nearby!</h3>
                <p className="duplicate-desc">
                  We found {duplicateMatches.length} matching civic report(s) in this vicinity. Instead of creating a duplicate, you can support an existing ticket to accelerate municipal action.
                </p>
              </div>
            </div>

            <div className="duplicate-items-list">
              {duplicateMatches.map((dup) => (
                <div key={dup._id} className="duplicate-item">
                  <div className="dup-meta">
                    <span className={`badge badge-sm badge-${(dup.severity || 'medium').toLowerCase()}`}>
                      {dup.severity || 'Medium'} Severity
                    </span>
                    <strong className="dup-title">{dup.title}</strong>
                    <span className="dup-dist">
                      {dup.distanceMeters ? `~${dup.distanceMeters}m away` : 'Nearby'} • {dup.supportCount || 1} citizens supporting
                    </span>
                  </div>
                  <div className="dup-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => handleSupportExisting(dup._id)}
                      disabled={supportedDuplicateId === dup._id}
                    >
                      {supportedDuplicateId === dup._id ? 'Supporting...' : '👍 Support & Upvote Issue'}
                    </button>
                    <Link to={`/complaints/${dup._id}`} target="_blank" className="btn btn-sm btn-outline">
                      View Details &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Complaint Submission Form Card */}
        <section className="form-card" aria-labelledby="form-heading">
          {/* AI Photo & Severity Scanner Module */}
          <div className="ai-scanner-panel">
            <div className="scanner-header">
              <div className="d-flex align-center gap-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-primary)' }}>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <h3 className="scanner-title">Photo Attachment & Gemini AI Scanner</h3>
              </div>
              <span className="scanner-tag">Multimodal AI 1.5</span>
            </div>

            <p className="scanner-intro">
              Upload a picture of the civic problem. Our Gemini AI engine will analyze image patterns, estimate hazard severity, recommend the municipal department, and auto-populate your grievance.
            </p>

            {/* Quick Demo Presets */}
            <div className="demo-presets-row">
              <span className="presets-label">Sample Photos:</span>
              <div className="preset-buttons">
                {DEMO_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn btn-xs btn-outline preset-btn"
                    onClick={() => handleSelectPreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload & Preview */}
            <div className="scanner-body-grid">
              <div className="scanner-upload-box">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  className="btn btn-outline scanner-pick-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAiScanning}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Choose Image File
                </button>

                <div className="form-group mt-2">
                  <label htmlFor="complaint-image-url" className="form-label text-xs">Or paste image URL:</label>
                  <input
                    type="url"
                    id="complaint-image-url"
                    name="imageUrl"
                    className="form-input form-input-sm"
                    placeholder="https://example.com/pothole.jpg"
                    value={formData.imageUrl}
                    onChange={(e) => {
                      handleChange(e);
                      setImagePreview(e.target.value);
                    }}
                  />
                </div>
              </div>

              {/* Preview & AI Trigger Button */}
              <div className="scanner-preview-box">
                {imagePreview ? (
                  <div className="preview-container">
                    <img src={imagePreview} alt="Civic issue preview" className="scanner-preview-img" onError={() => setImagePreview('')} />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm ai-scan-btn"
                      onClick={handleAiScan}
                      disabled={isAiScanning}
                    >
                      {isAiScanning ? (
                        <>
                          <span className="spinner" style={{ width: '0.9rem', height: '0.9rem' }} />
                          <span>Gemini AI Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                          </svg>
                          <span>Scan & Auto-Fill with AI</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="preview-placeholder">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>No photo selected yet</span>
                  </div>
                )}
              </div>
            </div>

            {/* AI Result Card */}
            {aiResult && (
              <div className="ai-insights-card">
                <div className="ai-insights-header">
                  <div className="ai-badge-group">
                    <span className="badge badge-primary">Gemini Verified</span>
                    <span className={`badge badge-${aiResult.severity?.toLowerCase()}`}>
                      {aiResult.severity} Severity ({aiResult.severityScore}/100)
                    </span>
                  </div>
                  <span className="ai-sla-pill">Guaranteed SLA: {aiResult.estimatedHours || 24} Hours</span>
                </div>
                <div className="ai-insights-body">
                  <p><strong>Department Assigned:</strong> {aiResult.department}</p>
                  <p><strong>AI Assessment:</strong> {aiResult.description}</p>
                  {aiResult.safetyHazards?.length > 0 && (
                    <p className="ai-hazards">
                      <strong>Identified Hazards:</strong> {aiResult.safetyHazards.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

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

            {/* Priority selection */}
            <div className="form-group">
              <label htmlFor="complaint-priority" className="form-label">
                Priority & SLA Timeline
              </label>
              <select
                id="complaint-priority"
                name="priority"
                className="form-input form-select"
                value={formData.priority}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="CRITICAL">Critical (12 Hours SLA - Immediate Hazard)</option>
                <option value="HIGH">High (24 Hours SLA - Severe Disruption)</option>
                <option value="MEDIUM">Medium (48 Hours SLA - Standard Civic Issue)</option>
                <option value="LOW">Low (72 Hours SLA - Minor Maintenance)</option>
              </select>
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
