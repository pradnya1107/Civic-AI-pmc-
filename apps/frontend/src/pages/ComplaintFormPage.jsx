import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CitizenLayout } from '../components/CitizenLayout';
import { LocationPickerMap } from '../components/LocationPickerMap';
import { complaintApi, aiApi } from '../services/api';
import { PMC_CATEGORIES, PMC_WARDS } from '../constants/pmcData';
export { PMC_CATEGORIES, PMC_WARDS };

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

/**
 * Strips the [AI Visible Evidence] block from a complaint description,
 * preserving only the citizen's manually entered text.
 */
export function extractManualDescription(fullDescription) {
  if (!fullDescription || typeof fullDescription !== 'string') return '';
  return fullDescription.replace(/\n*\s*\[AI Visible Evidence\]:[\s\S]*$/i, '').trim();
}

/**
 * Combines citizen manual text with an AI visible evidence block.
 * Replaces any existing AI block rather than accumulating duplicates.
 */
export function mergeDescriptionWithAiEvidence(currentDescription, aiEvidenceText) {
  const manual = extractManualDescription(currentDescription);
  const evidence = (aiEvidenceText || '').trim();
  if (!evidence) return manual;
  if (!manual) return `[AI Visible Evidence]: ${evidence}`;
  return `${manual}\n\n[AI Visible Evidence]: ${evidence}`;
}

export const ComplaintFormPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const activeScanIdRef = useRef(0);

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
  const [step7Completed, setStep7Completed] = useState(false);
  const [createdComplaintData, setCreatedComplaintData] = useState(null);

  /**
   * Invalidates existing AI result and strips previous AI evidence
   * whenever the user replaces or clears the complaint image.
   */
  const invalidateImageAnalysis = () => {
    activeScanIdRef.current += 1;
    setIsAiScanning(false);
    setAiResult(null);
    setFormData((prev) => ({
      ...prev,
      description: extractManualDescription(prev.description),
    }));
  };

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

// Client-side image compression to optimize speed and avoid oversized payloads
const compressImageFile = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        resolve(compressed);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

  // Handle local file selection
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setServerError('Please select an image file (JPG, PNG, or WebP).');
      return;
    }

    setServerError('');
    // Invalidate stale AI analysis immediately when replacing image
    invalidateImageAnalysis();

    try {
      const compressedDataUrl = await compressImageFile(file);
      if (compressedDataUrl) {
        setImagePreview(compressedDataUrl);
        setImageBase64(compressedDataUrl);
        setFormData((prev) => ({
          ...prev,
          imageUrl: compressedDataUrl,
          description: extractManualDescription(prev.description),
        }));
        return;
      }
    } catch {
      // Fallback to normal FileReader below
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setImageBase64(reader.result);
      setFormData((prev) => ({
        ...prev,
        imageUrl: reader.result,
        description: extractManualDescription(prev.description),
      }));
    };
    reader.readAsDataURL(file);
  };

  // Select demo preset
  const handleSelectPreset = (preset) => {
    // Invalidate stale AI analysis and strip previous AI evidence
    invalidateImageAnalysis();
    setImagePreview(preset.url);
    setImageBase64('');
    setFormData((prev) => {
      const manualDesc = extractManualDescription(prev.description);
      return {
        ...prev,
        imageUrl: preset.url,
        category: preset.category,
        address: preset.address,
        ward: preset.ward,
        latitude: preset.lat,
        longitude: preset.lng,
        description: manualDesc || preset.hint,
      };
    });
  };

  // Trigger AI Vision Scan
  const handleAiScan = async () => {
    if (!formData.imageUrl && !imageBase64) {
      setServerError('Please upload or select an issue photo first to run AI Severity Analysis.');
      return;
    }

    const scanId = ++activeScanIdRef.current;

    try {
      setIsAiScanning(true);
      setServerError('');
      const isHttp = typeof formData.imageUrl === 'string' && formData.imageUrl.startsWith('http');
      const isBase64 = (typeof formData.imageUrl === 'string' && formData.imageUrl.startsWith('data:image/')) || Boolean(imageBase64);

      // Pass only the citizen's manual description as hint, not stale AI evidence
      const manualDesc = extractManualDescription(formData.description);

      const res = await aiApi.analyzeComplaint({
        imageUrl: isHttp ? formData.imageUrl : undefined,
        imageBase64: isBase64 ? (imageBase64 || formData.imageUrl) : undefined,
        descriptionHint: manualDesc || formData.title,
        category: formData.category,
      });

      // Ignore older asynchronous responses if the image was replaced during scan
      if (scanId !== activeScanIdRef.current) {
        return;
      }

      if (res && res.success && res.data) {
        const ai = res.data;
        setAiResult(ai);

        const isNonCivic = Boolean(
          ai.isCivicIssue === false ||
          ai.civicIssue?.isCivicIssue === false ||
          ai.detectedCivicIssue?.toLowerCase().includes('no visible') ||
          ai.detectedCivicIssue?.toLowerCase().includes('non-civic') ||
          ai.confidenceScore === 0 ||
          (Array.isArray(ai.safetyHazards) && ai.safetyHazards.some(h => /non[-_]?civic|invoice|document|receipt/i.test(h)))
        );

        if (isNonCivic) {
          // Revert description AI block and do not auto-fill fake grievance info
          setFormData((prev) => ({
            ...prev,
            description: extractManualDescription(prev.description),
          }));
          setToastMessage('');
          setServerError('🛑 Non-Civic Image Detected! No municipal defect found in photo. Form progression and complaint submission are blocked.');
          return;
        }

        const aiTitle = ai.suggestedTitle || ai.title || 'Reported Civic Issue';
        const aiDesc = ai.visibleEvidence || ai.description || ai.generatedDescription || ai.reasoning || '';
        const aiCategory = ai.category || 'Roads & Potholes';
        const aiPriority = ai.priority || ai.severity || 'HIGH';

        setFormData((prev) => ({
          ...prev,
          title: prev.title.trim() ? prev.title : aiTitle,
          description: mergeDescriptionWithAiEvidence(prev.description, aiDesc),
          category: prev.category || aiCategory,
          priority: aiPriority,
        }));

        const isAiGen = Boolean(ai.authenticityAssessment?.possibleAiGenerated);
        if (isAiGen) {
          setToastMessage('🛑 AI-Created Image Detected! Complaint submission blocked. Authentic camera photo required.');
        } else {
          setToastMessage(`AI Scan Complete: Authentic Real Photo Verified! Status will automatically advance to UNDER_REVIEW on submission.`);
        }
      }
    } catch (err) {
      if (scanId !== activeScanIdRef.current) {
        return;
      }
      // On failure, clear stale result to avoid showing invalid information
      setAiResult(null);
      setServerError(err.message || 'AI analysis failed. You can continue filling the form manually.');
    } finally {
      if (scanId === activeScanIdRef.current) {
        setIsAiScanning(false);
      }
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

    // Latitude & Longitude pairing and PMC boundary validation
    const hasLat = formData.latitude !== '' && formData.latitude !== null && formData.latitude !== undefined;
    const hasLng = formData.longitude !== '' && formData.longitude !== null && formData.longitude !== undefined;
    if (hasLat !== hasLng) {
      newErrors.location = 'Latitude and longitude must both be provided together or left blank.';
    } else if (hasLat && hasLng) {
      const latNum = Number(formData.latitude);
      const lngNum = Number(formData.longitude);
      if (latNum < 18.30 || latNum > 18.70 || lngNum < 73.65 || lngNum > 74.05) {
        newErrors.location = 'Coordinates must fall within the Pune Municipal Corporation (PMC) boundary (Lat 18.30-18.70, Lng 73.65-74.05).';
      }
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

  const isNonCivicIssue = Boolean(
    aiResult && (
      aiResult.isCivicIssue === false ||
      aiResult.civicIssue?.isCivicIssue === false ||
      aiResult.detectedCivicIssue?.toLowerCase().includes('no visible') ||
      aiResult.detectedCivicIssue?.toLowerCase().includes('non-civic') ||
      aiResult.confidenceScore === 0 ||
      (Array.isArray(aiResult.safetyHazards) && aiResult.safetyHazards.some((h) => /non[-_]?civic|invoice|document|receipt/i.test(h)))
    )
  );

  const isAiGeneratedImage = Boolean(aiResult?.authenticityAssessment?.possibleAiGenerated);

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

    if (isNonCivicIssue) {
      setServerError('Complaint submission blocked: Uploaded photo does not depict an authentic municipal or civic issue (e.g. potholes, garbage, water leaks, drainage, streetlights). Fake, document, or non-civic images cannot be submitted.');
      const panel = document.getElementById('ai-civic-issue-panel');
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (isAiGeneratedImage) {
      setServerError('Complaint submission blocked: Uploaded photo is detected as AI-created / synthetic. CivicAI strictly requires authentic physical camera photographs.');
      const panel = document.getElementById('ai-authenticity-panel');
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

      setCreatedComplaintData(createdComplaint || payload);
      setStep7Completed(true);
      setToastMessage('Grievance submitted successfully! Step 7 Notification dispatched to municipal ward desk.');
      setIsSubmitting(false);

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          const utterance = new SpeechSynthesisUtterance('Your complaint has been successfully reported to Pune Municipal Corporation.');
          utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
        } catch {
          // Ignore
        }
      }
    } catch (err) {
      const msg = err.message || 'Failed to submit grievance. Please verify details and try again.';
      setServerError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <CitizenLayout>
      <div className="citizen-page-inner">
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

        {/* Step 7: Explicit Notification & Success Screen */}
        {step7Completed && createdComplaintData && (
          <section className="step7-success-card mb-4" role="region" aria-label="Step 7: Complaint Successfully Reported">
            <div className="step7-banner-header">
              <div className="step7-badge-pill">Step 7 of 7: Notification Dispatched</div>
              <div className="step7-icon-circle" aria-hidden="true">✓</div>
              <h2 className="step7-title">Your Complaint Has Been Successfully Reported!</h2>
              <p className="step7-subtitle">
                Grievance registered in the Pune Municipal Corporation civic intelligence network. In-app notification and SMS dispatch completed to the relevant department officer.
              </p>
            </div>

            <div className="step7-summary-grid">
              <div className="step7-detail-item">
                <span className="step7-detail-label">Grievance Tracking ID</span>
                <span className="step7-detail-value font-mono text-teal">
                  {createdComplaintData.complaintNumber || createdComplaintData._id || 'CIV-REG-001'}
                </span>
              </div>
              <div className="step7-detail-item">
                <span className="step7-detail-label">Category</span>
                <span className="step7-detail-value">{createdComplaintData.category || formData.category}</span>
              </div>
              <div className="step7-detail-item">
                <span className="step7-detail-label">Location / Ward</span>
                <span className="step7-detail-value">{createdComplaintData.location?.address || formData.address}</span>
              </div>
              <div className="step7-detail-item">
                <span className="step7-detail-label">Notification Status</span>
                <span className="step7-detail-value text-success">
                  🔔 Active — Notification Sent to Ward Desk
                </span>
              </div>
            </div>

            <div className="step7-actions-row">
              <Link
                to={`/complaints/${createdComplaintData._id || createdComplaintData.id || ''}`}
                className="btn btn-primary"
              >
                🔍 Track Live SLA Status &rarr;
              </Link>
              <Link to="/heatmap" className="btn btn-outline">
                🗺️ View on PMC Heatmap
              </Link>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setStep7Completed(false);
                  setCreatedComplaintData(null);
                  setFormData({
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
                  setImagePreview('');
                  setImageBase64('');
                  setAiResult(null);
                  setDuplicateMatches([]);
                  setToastMessage('');
                }}
              >
                + Report Another Issue
              </button>
            </div>
          </section>
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
              <strong>Notice:</strong> {serverError}
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
                <h3 className="scanner-title">Photo Attachment & AI Scanner</h3>
              </div>
              <span className="scanner-tag">Multimodal AI 1.5</span>
            </div>

            <p className="scanner-intro">
              Upload a picture of the civic problem. Our AI engine will analyze image patterns, estimate hazard severity, recommend the municipal department, and auto-populate your grievance.
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
                {/* Dedicated camera-only input */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                {/* Standard file/gallery input */}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary scanner-pick-btn"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isAiScanning}
                    style={{ background: '#0284C7', borderColor: '#0369A1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span>📷 Take Photo with Camera</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline scanner-pick-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAiScanning}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>🖼️ Choose from Gallery / Files</span>
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px', textAlign: 'center' }}>
                  * Camera capture required on-site. AI-generated images &amp; Google downloads are blocked.
                </div>

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
                      setImageBase64('');
                      invalidateImageAnalysis();
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
                          <span>AI Analyzing...</span>
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

            {/* AI Result Dual-Assessment Panels */}
            {aiResult && (
              <div className="ai-dual-panel-wrapper">
                <div className="ai-dual-panel-container">
                  {/* Panel A: Civic Issue Recognition */}
                  <div
                    className={`ai-panel ${isNonCivicIssue ? 'ai-panel--civic-danger' : 'ai-panel--civic'}`}
                    id="ai-civic-issue-panel"
                    style={isNonCivicIssue ? { border: '2px solid #EF4444', background: '#FEF2F2' } : {}}
                  >
                    <div className="ai-panel-header">
                      <div className="ai-panel-title">
                        <span>{isNonCivicIssue ? '🚫' : '🔍'}</span>
                        <strong style={isNonCivicIssue ? { color: '#991B1B' } : {}}>
                          {isNonCivicIssue ? 'No Civic Issue Detected' : 'Civic Issue Recognition'}
                        </strong>
                      </div>
                      <span className={`badge badge-${isNonCivicIssue ? 'critical' : (aiResult.severity || 'medium').toLowerCase()}`} style={isNonCivicIssue ? { background: '#DC2626', color: '#fff' } : {}}>
                        {isNonCivicIssue ? 'No Civic Defect (0/100)' : `${aiResult.severity || 'Medium'} Severity (${aiResult.severityScore ?? aiResult.score ?? 70}/100)`}
                      </span>
                    </div>
                    <div className="ai-panel-body">
                      <div>
                        <strong>Detected Civic Issue:</strong>{' '}
                        <span style={isNonCivicIssue ? { color: '#B91C1C', fontWeight: 600 } : {}}>
                          {aiResult.detectedCivicIssue || aiResult.civicIssue?.detectedCivicIssue || 'Civic Grievance'}
                        </span>
                      </div>
                      <div>
                        <strong>Category:</strong> {aiResult.category || 'Roads & Potholes'}
                      </div>
                      <div>
                        <strong>Visible Evidence:</strong>{' '}
                        <span>{aiResult.visibleEvidence || aiResult.evidenceDescription || aiResult.description || aiResult.reasoning}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>AI Confidence:</strong>
                        <span className={`badge badge-sm ${isNonCivicIssue ? 'badge-critical' : 'badge-primary'}`} style={isNonCivicIssue ? { background: '#DC2626', color: '#fff' } : {}}>
                          {Math.round(aiResult.confidenceScore ?? aiResult.confidence ?? 85)}% Match
                        </span>
                      </div>
                      <div>
                        <strong>Assigned Department:</strong>{' '}
                        {aiResult.department || aiResult.suggestedDepartment || 'Municipal Operations'}
                        <span className="ai-sla-pill" style={{ marginLeft: '8px' }}>
                          SLA: {formData.priority === 'CRITICAL' ? '1 Working Day (24x7)' : formData.priority === 'HIGH' ? '2 Working Days' : formData.priority === 'MEDIUM' ? '4 Working Days' : '7 Working Days'}
                        </span>
                      </div>
                      {((aiResult.safetyHazards && aiResult.safetyHazards.length > 0) || (aiResult.detectedIssues && aiResult.detectedIssues.length > 0)) && (
                        <div className="ai-hazards">
                          <strong>Identified Hazards:</strong> {(aiResult.safetyHazards || aiResult.detectedIssues).join(', ')}
                        </div>
                      )}
                      {isNonCivicIssue && (
                        <div
                          style={{
                            background: '#DC2626',
                            color: '#FFFFFF',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            marginTop: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>🚫</span>
                          <span>NON-CIVIC IMAGE: No municipal infrastructure defect identified. Grievance submission is blocked.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Panel B: Image Authenticity Assessment */}
                  {isAiGeneratedImage ? (
                    <div
                      className="ai-panel ai-panel--auth-danger"
                      id="ai-authenticity-panel"
                      style={{
                        border: '2px solid #EF4444',
                        background: '#FEF2F2',
                        borderRadius: '8px',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '22px' }}>🛑</span>
                          <strong style={{ fontSize: '15px', color: '#991B1B' }}>
                            AI-Created / Synthetic Image Detected
                          </strong>
                        </div>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: '#FEE2E2',
                            color: '#991B1B',
                            border: '1px solid #FCA5A5',
                          }}
                        >
                          Confidence: {aiResult.authenticityAssessment?.confidence || 'HIGH'}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#B91C1C', lineHeight: 1.5 }}>
                        CivicAI forensic inspection determined that this photograph exhibits generative AI synthesis characteristics (Midjourney, DALL-E, Stable Diffusion, or digital modification).
                      </p>
                      {aiResult.authenticityAssessment?.indicators?.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <strong style={{ fontSize: '12px', color: '#7F1D1D' }}>Observable AI Indicators:</strong>
                          <ul style={{ margin: '4px 0 0 18px', padding: 0, color: '#991B1B', fontSize: '12px' }}>
                            {aiResult.authenticityAssessment.indicators.map((ind, idx) => (
                              <li key={idx} style={{ marginBottom: '2px' }}>{ind}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div
                        style={{
                          background: '#DC2626',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          padding: '10px 14px',
                          fontSize: '13px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span>🚫</span>
                        <span>COMPLAINT SUBMISSION BLOCKED: AI-created images are strictly prohibited. You must upload an authentic physical camera photograph.</span>
                      </div>
                    </div>
                  ) : isNonCivicIssue ? (
                    <div
                      className="ai-panel ai-panel--auth-danger"
                      id="ai-authenticity-panel"
                      style={{
                        border: '2px solid #F59E0B',
                        background: '#FFFBEB',
                        borderRadius: '8px',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>⚠️</span>
                          <strong style={{ fontSize: '15px', color: '#B45309' }}>
                            Non-Civic Media / Document Detected
                          </strong>
                        </div>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: '#FEF3C7',
                            color: '#B45309',
                            border: '1px solid #FCD34D',
                          }}
                        >
                          Status: INELIGIBLE
                        </span>
                      </div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#92400E', lineHeight: 1.5 }}>
                        AI audit identified this photo as a receipt, invoice, document, or non-municipal media. Even if captured with a camera or downloaded via WhatsApp, it does not depict a municipal defect.
                      </p>
                      <div
                        style={{
                          background: '#D97706',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>🚫</span>
                        <span>Ineligible for grievance submission. Authentic photo of a civic issue required.</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="ai-panel ai-panel--auth"
                      id="ai-authenticity-panel"
                      style={{
                        border: '2px solid #22C55E',
                        background: '#F0FDF4',
                        borderRadius: '8px',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>✅</span>
                          <strong style={{ fontSize: '15px', color: '#166534' }}>
                            Authentic Real Camera Photo Verified
                          </strong>
                        </div>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: '#DCFCE7',
                            color: '#166534',
                            border: '1px solid #86EFAC',
                          }}
                        >
                          Confidence: {aiResult.authenticityAssessment?.confidence || 'HIGH'}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#15803D', lineHeight: 1.5 }}>
                        AI forensic audit confirms authentic physical camera capture with natural optical sensor noise, organic wear, and real-world lighting.
                      </p>
                      <div
                        style={{
                          background: '#16A34A',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>✓</span>
                        <span>Verified authentic physical camera evidence. Status will automatically be set to UNDER_REVIEW upon submission!</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Citizen Review & Edit Notice Banner */}
                {isNonCivicIssue ? (
                  <div
                    className="ai-review-banner"
                    style={{
                      background: '#FEF2F2',
                      borderColor: '#FCA5A5',
                      color: '#991B1B',
                    }}
                    role="alert"
                  >
                    <span className="ai-review-banner-icon">🚫</span>
                    <div className="ai-review-banner-text">
                      <strong>Issue Verification Failed:</strong> The uploaded image does not contain any visible municipal issue. Further steps and complaint submission are blocked. Please attach an authentic photograph of a civic problem (pothole, garbage, drainage, street light, etc.).
                    </div>
                  </div>
                ) : (
                  <div className="ai-review-banner" role="status" aria-live="polite">
                    <span className="ai-review-banner-icon">✏️</span>
                    <div className="ai-review-banner-text">
                      <strong>Citizen Review & Edit:</strong> The AI has analyzed your image and pre-filled the complaint form below.
                      You can freely review, edit, or customize any of the fields (Title, Category, Description, and Priority) before submitting.
                    </div>
                  </div>
                )}
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
                Priority & SLA Timeline (Working Days)
              </label>
              <select
                id="complaint-priority"
                name="priority"
                className="form-input form-select"
                value={formData.priority}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="CRITICAL">Critical (24x7 Emergency / 1 Working Day - Immediate Hazard)</option>
                <option value="HIGH">High (2 Working Days SLA - Severe Disruption)</option>
                <option value="MEDIUM">Medium (4 Working Days SLA - Standard Civic Issue)</option>
                <option value="LOW">Low (7 Working Days SLA - Minor Maintenance)</option>
              </select>
              <p className="form-input-hint" style={{ marginTop: '6px', fontSize: '0.8rem', color: '#64748b' }}>
                🗓️ <strong>Official Working Days:</strong> Issues are resolved during official municipal working days (Mon–Fri, excluding gazetted public holidays). Life-safety emergencies operate on a 24x7 protocol.
              </p>
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
            <div className="location-details-box">
              <div className="location-details-box__header">
                <div className="location-details-box__title-wrap">
                  <div className="location-pin-badge" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="location-box-title">Location Details</h3>
                    <p className="location-box-subtitle">
                      Specify street address or auto-detect with Pune GPS
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm geo-gps-btn"
                  onClick={handleGetLocation}
                  disabled={geoLoading || isSubmitting}
                  aria-label="Use device GPS location"
                  id="gps-autodetect-btn"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                  </svg>
                  <span>{geoLoading ? 'Detecting GPS...' : 'Use My Current Location'}</span>
                </button>
              </div>

              {geoNotice && (
                <div className="geo-notice-alert" role="status">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>{geoNotice}</span>
                </div>
              )}

              {/* Address input */}
              <div className={`form-group ${errors.address ? 'has-error' : ''}`}>
                <label htmlFor="complaint-address" className="form-label">
                  Street Address / Landmark <span className="required-star">*</span>
                </label>
                <div className="input-with-icon">
                  <span className="input-icon" aria-hidden="true">📍</span>
                  <input
                    type="text"
                    id="complaint-address"
                    name="address"
                    className="form-input input-has-icon"
                    placeholder="e.g. Near Ganpati Mandir, FC Road, Pune 411004"
                    value={formData.address}
                    onChange={handleChange}
                    maxLength={300}
                    aria-required="true"
                    aria-invalid={!!errors.address}
                    aria-describedby={errors.address ? 'complaint-address-error' : undefined}
                    disabled={isSubmitting}
                  />
                </div>
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
                <div className="input-with-icon">
                  <span className="input-icon" aria-hidden="true">🏢</span>
                  <select
                    id="complaint-ward"
                    name="ward"
                    className="form-input form-select input-has-icon"
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
              </div>

              {/* Interactive Pune Municipal Corporation Location Picker Map */}
              <LocationPickerMap
                latitude={formData.latitude}
                longitude={formData.longitude}
                onLocationChange={({ latitude, longitude, addressHint }) => {
                  setFormData((prev) => ({
                    ...prev,
                    latitude: latitude !== '' ? latitude : '',
                    longitude: longitude !== '' ? longitude : '',
                    address: prev.address || addressHint || prev.address,
                  }));
                }}
                disabled={isSubmitting}
              />

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
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <Link to="/complaints" className="btn btn-outline" tabIndex={isSubmitting ? -1 : 0}>
                Cancel
              </Link>

              {isAiGeneratedImage ? (
                <button
                  type="button"
                  className="btn btn-submit"
                  id="submit-complaint-button"
                  disabled={true}
                  style={{
                    background: '#DC2626',
                    borderColor: '#B91C1C',
                    color: '#FFFFFF',
                    cursor: 'not-allowed',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                  }}
                  title="Submission is blocked because the attached photo is an AI-created image."
                >
                  <span>🚫</span>
                  <span>Submission Blocked (AI Photo Detected)</span>
                </button>
              ) : isNonCivicIssue ? (
                <button
                  type="button"
                  className="btn btn-submit"
                  id="submit-complaint-button"
                  disabled={true}
                  style={{
                    background: '#DC2626',
                    borderColor: '#B91C1C',
                    color: '#FFFFFF',
                    cursor: 'not-allowed',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                  }}
                  title="Submission is blocked because no visible civic issue was detected in the uploaded image."
                >
                  <span>🚫</span>
                  <span>Submission Blocked (No Civic Issue Detected)</span>
                </button>
              ) : (
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
              )}
            </div>
          </form>
        </section>
      </div>
    </CitizenLayout>
  );
};

export default ComplaintFormPage;
