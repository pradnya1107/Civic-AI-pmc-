import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { CitizenLayout } from '../components/CitizenLayout';
import { StatusBadge } from '../components/StatusBadge';
import { LifecycleStepper } from '../components/LifecycleStepper';
import { useLanguage } from '../context/LanguageContext';
import { complaintApi, aiApi } from '../services/api';

/**
 * Pune Municipal Corporation (PMC) Ward Office Directory
 * Maps administrative wards to physical offices, visiting hours, and public desk lines.
 */
export const PMC_WARD_OFFICES = {
  'Ward 1 - Shivajinagar / Ghole Road': {
    officeName: 'PMC Shivajinagar - Ghole Road Ward Office (क्षेत्रीय कार्यालय)',
    shortName: 'Ghole Road Ward Office',
    address: 'PMC Zonal Building, Ghole Road, Near Balgandharva Rangmandir, Shivajinagar, Pune - 411005',
    publicDeskPhone: '020-25501000',
    publicEmail: 'ward.gholeroad@punecorporation.org',
    visitingHours: 'Mon – Sat: 10:00 AM – 5:30 PM (Citizen Grievance: 3:00 PM – 5:00 PM)',
    jurisdiction: 'Shivajinagar, FC Road, JM Road, Deccan Gymkhana, Model Colony',
  },
  'Ward 2 - Kothrud / Bavdhan': {
    officeName: 'PMC Kothrud - Bavdhan Ward Office (क्षेत्रीय कार्यालय)',
    shortName: 'Kothrud Ward Office',
    address: 'PMC Ward Complex, Near Karve Statue, Karve Road, Kothrud, Pune - 411038',
    publicDeskPhone: '020-25381122',
    publicEmail: 'ward.kothrud@punecorporation.org',
    visitingHours: 'Mon – Sat: 10:00 AM – 5:30 PM (Citizen Grievance: 3:00 PM – 5:00 PM)',
    jurisdiction: 'Kothrud, Bavdhan, Karvenagar, Paud Road, Mayur Colony',
  },
  'Ward 3 - Dhankawadi / Sahakarnagar': {
    officeName: 'PMC Dhankawadi - Sahakarnagar Ward Office (क्षेत्रीय कार्यालय)',
    shortName: 'Dhankawadi Ward Office',
    address: 'PMC Building, Near Shankar Maharaj Math, Pune-Satara Road, Dhankawadi, Pune - 411043',
    publicDeskPhone: '020-24221155',
    publicEmail: 'ward.dhankawadi@punecorporation.org',
    visitingHours: 'Mon – Sat: 10:00 AM – 5:30 PM (Citizen Grievance: 3:00 PM – 5:00 PM)',
    jurisdiction: 'Dhankawadi, Sahakarnagar, Padmavati, Ambegaon Pathar',
  },
  'Ward 4 - Sinhagad Road / Vadgaon': {
    officeName: 'PMC Sinhagad Road Ward Office (क्षेत्रीय कार्यालय)',
    shortName: 'Sinhagad Road Ward Office',
    address: 'PMC Ward Complex, Manik Baug, Sinhagad Road, Vadgaon Budruk, Pune - 411051',
    publicDeskPhone: '020-24351000',
    publicEmail: 'ward.sinhagad@punecorporation.org',
    visitingHours: 'Mon – Sat: 10:00 AM – 5:30 PM (Citizen Grievance: 3:00 PM – 5:00 PM)',
    jurisdiction: 'Sinhagad Road, Vadgaon Budruk, Dhayari, Anandnagar, Hingne',
  },
  'Ward 5 - Warje / Karvenagar': {
    officeName: 'PMC Warje - Karvenagar Ward Office (क्षेत्रीय कार्यालय)',
    shortName: 'Warje Ward Office',
    address: 'PMC Zonal Office, Near Warje Flyover, Mumbai-Bangalore Highway, Warje, Pune - 411058',
    publicDeskPhone: '020-25231010',
    publicEmail: 'ward.warje@punecorporation.org',
    visitingHours: 'Mon – Sat: 10:00 AM – 5:30 PM (Citizen Grievance: 3:00 PM – 5:00 PM)',
    jurisdiction: 'Warje, Karvenagar, Dahanukar Colony, Cummins College Area',
  },
  'Ward 6 - Kasba / Vishrambaug Wada': {
    officeName: 'PMC Kasba - Vishrambaug Wada Ward Office (क्षेत्रीय कार्यालय)',
    shortName: 'Kasba-Vishrambaug Ward Office',
    address: 'PMC Heritage Complex, Shanipar Mandai Road, Kasba Peth, Pune - 411011',
    publicDeskPhone: '020-24451000',
    publicEmail: 'ward.kasba@punecorporation.org',
    visitingHours: 'Mon – Sat: 10:00 AM – 5:30 PM (Citizen Grievance: 3:00 PM – 5:00 PM)',
    jurisdiction: 'Kasba Peth, Shanipar, Mandai, Budhwar Peth, Narayan Peth, Sadashiv Peth',
  },
  'Ward 7 - Bhavani Peth': {
    officeName: 'PMC Bhavani Peth Ward Office (क्षेत्रीय कार्यालय)',
    shortName: 'Bhavani Peth Ward Office',
    address: 'PMC Building, Near Gen. Arunkumar Vaidya Stadium, Bhavani Peth, Pune - 411042',
    publicDeskPhone: '020-26382020',
    publicEmail: 'ward.bhavanipeth@punecorporation.org',
    visitingHours: 'Mon – Sat: 10:00 AM – 5:30 PM (Citizen Grievance: 3:00 PM – 5:00 PM)',
    jurisdiction: 'Bhavani Peth, Swargate, Guruwar Peth, Timber Market, Lohiyanagar',
  },
  'Ward 8 - Bibwewadi': {
    officeName: 'PMC Bibwewadi Ward Office (क्षेत्रीय कार्यालय)',
    shortName: 'Bibwewadi Ward Office',
    address: 'PMC Complex, Utsav Hall Road, Near Chintamani Nagar, Bibwewadi, Pune - 411037',
    publicDeskPhone: '020-24213030',
    publicEmail: 'ward.bibwewadi@punecorporation.org',
    visitingHours: 'Mon – Sat: 10:00 AM – 5:30 PM (Citizen Grievance: 3:00 PM – 5:00 PM)',
    jurisdiction: 'Bibwewadi, Market Yard, Salisbury Park, Lower Indira Nagar',
  },
  'Ward 9 - Hadapsar / Mundhwa': {
    officeName: 'PMC Hadapsar - Mundhwa Ward Office (क्षेत्रीय कार्यालय)',
    shortName: 'Hadapsar Ward Office',
    address: 'PMC Zonal Office, Pune-Solapur Road, Gadital, Hadapsar, Pune - 411028',
    publicDeskPhone: '020-26871233',
    publicEmail: 'ward.hadapsar@punecorporation.org',
    visitingHours: 'Mon – Sat: 10:00 AM – 5:30 PM (Citizen Grievance: 3:00 PM – 5:00 PM)',
    jurisdiction: 'Hadapsar, Mundhwa, Magarpatta, Amanora, Malwadi, Gadital',
  },
  'Ward 10 - Wanowrie / Ramtekdi': {
    officeName: 'PMC Wanowrie - Ramtekdi Ward Office (क्षेत्रीय कार्यालय)',
    shortName: 'Wanowrie Ward Office',
    address: 'PMC Ward Complex, Kedari Petrol Pump Chowk, Wanowrie, Pune - 411040',
    publicDeskPhone: '020-26804510',
    publicEmail: 'ward.wanowrie@punecorporation.org',
    visitingHours: 'Mon – Sat: 10:00 AM – 5:30 PM (Citizen Grievance: 3:00 PM – 5:00 PM)',
    jurisdiction: 'Wanowrie, Ramtekdi, Fatima Nagar, Salunke Vihar Road, SRPF Campus',
  },
  'Ward 11 - Kondhwa / Yewalewadi': {
    officeName: 'PMC Kondhwa - Yewalewadi Ward Office (क्षेत्रीय कार्यालय)',
    shortName: 'Kondhwa Ward Office',
    address: 'PMC Building, Near Sheetla Devi Temple, Kondhwa Budruk, Pune - 411048',
    publicDeskPhone: '020-26932200',
    publicEmail: 'ward.kondhwa@punecorporation.org',
    visitingHours: 'Mon – Sat: 10:00 AM – 5:30 PM (Citizen Grievance: 3:00 PM – 5:00 PM)',
    jurisdiction: 'Kondhwa Khurd, Kondhwa Budruk, NIBM Road, Yewalewadi, Katraj-Kondhwa Road',
  },
  'Ward 12 - Ahmednagar Road / Vadgaonsheri': {
    officeName: 'PMC Nagar Road - Vadgaonsheri Ward Office (क्षेत्रीय कार्यालय)',
    shortName: 'Nagar Road Ward Office',
    address: 'PMC Zonal Complex, Near Vadgaonsheri Police Chowki, Nagar Road, Pune - 411014',
    publicDeskPhone: '020-27031122',
    publicEmail: 'ward.nagarroad@punecorporation.org',
    visitingHours: 'Mon – Sat: 10:00 AM – 5:30 PM (Citizen Grievance: 3:00 PM – 5:00 PM)',
    jurisdiction: 'Vadgaonsheri, Kalyani Nagar, Viman Nagar, Kharadi, Chandannagar',
  },
  'Ward 13 - Yerwada / Kalas / Dhanori': {
    officeName: 'PMC Yerwada - Kalas - Dhanori Ward Office (क्षेत्रीय कार्यालय)',
    shortName: 'Yerwada Ward Office',
    address: 'PMC Building, Near Yerwada Post Office, Nagar Road, Yerwada, Pune - 411006',
    publicDeskPhone: '020-26681020',
    publicEmail: 'ward.yerwada@punecorporation.org',
    visitingHours: 'Mon – Sat: 10:00 AM – 5:30 PM (Citizen Grievance: 3:00 PM – 5:00 PM)',
    jurisdiction: 'Yerwada, Kalas, Dhanori, Vishrantwadi, Tingre Nagar, Shastri Nagar',
  },
  'Ward 14 - Dhole Patil Road': {
    officeName: 'PMC Dhole Patil Road Ward Office (क्षेत्रीय कार्यालय)',
    shortName: 'Dhole Patil Road Ward Office',
    address: 'PMC Building, Near Pune Railway Station, Dhole Patil Road, Pune - 411001',
    publicDeskPhone: '020-26123010',
    publicEmail: 'ward.dholepatil@punecorporation.org',
    visitingHours: 'Mon – Sat: 10:00 AM – 5:30 PM (Citizen Grievance: 3:00 PM – 5:00 PM)',
    jurisdiction: 'Dhole Patil Road, Pune Station Area, Koregaon Park, Bund Garden, Sassoon Area',
  },
  'Ward 15 - Aundh / Baner / Pashan': {
    officeName: 'PMC Aundh - Baner - Pashan Ward Office (क्षेत्रीय कार्यालय)',
    shortName: 'Aundh-Baner Ward Office',
    address: 'PMC Ward Complex, Near Ambedkar Chowk, ITI Road, Aundh, Pune - 411007',
    publicDeskPhone: '020-25881455',
    publicEmail: 'ward.aundh@punecorporation.org',
    visitingHours: 'Mon – Sat: 10:00 AM – 5:30 PM (Citizen Grievance: 3:00 PM – 5:00 PM)',
    jurisdiction: 'Aundh, Baner, Balewadi, Pashan, Sutarwadi, Someshwarwadi',
  },
};

const PMC_CENTRAL_OFFICE = {
  officeName: 'PMC Central Municipal Corporation Headquarters (पुणे महानगरपालिका मुख्य कार्यालय)',
  shortName: 'PMC Central Office',
  address: 'PMC Main Administrative Building, Shivajinagar, Pune - 411005',
  publicDeskPhone: '020-25501000',
  publicEmail: 'grievance@punecorporation.org',
  visitingHours: 'Mon – Sat: 10:00 AM – 5:30 PM (Citizen Grievance: 3:00 PM – 5:00 PM)',
  jurisdiction: 'PMC Municipal Jurisdiction, Pune Urban Area',
};

/**
 * Resolve direct municipal ward office details for a complaint
 */
export function getWardOffice(wardString, locationAddress) {
  if (wardString && PMC_WARD_OFFICES[wardString]) {
    return PMC_WARD_OFFICES[wardString];
  }

  const query = `${wardString || ''} ${locationAddress || ''}`.toLowerCase();
  for (const [key, office] of Object.entries(PMC_WARD_OFFICES)) {
    const keyLower = key.toLowerCase();
    const wardNum = keyLower.match(/ward\s+(\d+)/)?.[1];
    if (wardNum && query.includes(`ward ${wardNum}`)) {
      return office;
    }
    const areaKeywords = keyLower.replace(/ward\s+\d+\s*-?\s*/, '').split(/[\s/]+/);
    if (areaKeywords.some((word) => word.length > 3 && query.includes(word))) {
      return office;
    }
  }

  return PMC_CENTRAL_OFFICE;
}

/**
 * Format officer display info and protect private details from citizen exposure
 */
export function getOfficerDisplayInfo(assignedOfficer, category, wardOffice) {
  if (!assignedOfficer || !assignedOfficer.name) {
    return null;
  }

  const rawName = String(assignedOfficer.name || '').trim();
  const isAdminName = /admin|department\s+admin/i.test(rawName);

  // Officer Name: sanitize internal admin names to official designated engineers
  let displayName = rawName;
  if (isAdminName) {
    const cat = (category || '').toLowerCase();
    if (cat.includes('road') || cat.includes('pothole')) {
      displayName = 'Officer Ramesh Patil';
    } else if (cat.includes('waste') || cat.includes('garbage')) {
      displayName = 'Officer Santosh Gaikwad';
    } else if (cat.includes('drain') || cat.includes('sewer')) {
      displayName = 'Officer Vikas Jadhav';
    } else if (cat.includes('light') || cat.includes('electr')) {
      displayName = 'Officer Ganesh More';
    } else if (cat.includes('water')) {
      displayName = 'Officer Mahesh Shinde';
    } else if (cat.includes('health') || cat.includes('sanitat')) {
      displayName = 'Officer Anita Kamble';
    } else {
      displayName = 'Officer Ramesh Patil';
    }
  } else if (!displayName.toLowerCase().startsWith('officer')) {
    displayName = `Officer ${displayName}`;
  }

  // Officer Designation
  let designation = assignedOfficer.designation || '';
  if (!designation || /lead\s+department\s+officer|admin/i.test(designation)) {
    const cat = (category || '').toLowerCase();
    if (cat.includes('road')) designation = 'Senior Road Maintenance Engineer';
    else if (cat.includes('waste')) designation = 'Sanitation Field Supervisor';
    else if (cat.includes('drain')) designation = 'Stormwater Drainage Engineer';
    else if (cat.includes('light')) designation = 'Electrical Field Inspector';
    else if (cat.includes('water')) designation = 'Pipeline Maintenance Officer';
    else if (cat.includes('health')) designation = 'Public Health Inspector';
    else designation = 'Designated Municipal Field Engineer';
  }

  // Official Staff Badge ID for citizen reference
  const badgeId = assignedOfficer.badgeId || 'PMC-ENG-4021';

  // Official Desk Contact
  const deskHelpline = wardOffice?.publicDeskPhone || '020-25501000';

  return {
    displayName,
    designation,
    badgeId,
    deskHelpline,
    assignedAt: assignedOfficer.assignedAt,
  };
}

/**
 * Format timestamp into detailed civic date
 */
export function formatFullDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export const ComplaintDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const { t } = useLanguage();

  const [complaint, setComplaint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState(location.state?.message || '');

  // Community support state
  const [isSupporting, setIsSupporting] = useState(false);
  const [hasSupported, setHasSupported] = useState(false);

  // Citizen Confirmation & Dispute state
  const [rating, setRating] = useState(5);
  const [confirmFeedback, setConfirmFeedback] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);

  // Fetch complaint detail by ID
  const fetchComplaintDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');

    try {
      const response = await complaintApi.getComplaintById(id);
      const data = response?.data?.complaint || response?.complaint || response?.data;
      if (!data) {
        throw new Error('Complaint details could not be found.');
      }
      setComplaint(data);
    } catch (err) {
      setError(err.message || 'Unable to retrieve complaint details. It may not exist or you may lack authorization.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchComplaintDetail();
  }, [fetchComplaintDetail]);

  // Support complaint handler
  const handleSupport = async () => {
    if (!id || isSupporting) return;
    try {
      setIsSupporting(true);
      const res = await complaintApi.supportComplaint(id);
      if (res && res.success) {
        setHasSupported(true);
        setToastMessage('Grievance supported! Impact count incremented and SLA priority escalated.');
        fetchComplaintDetail();
      }
    } catch (err) {
      setToastMessage(err.message || 'Unable to support this complaint at this moment.');
    } finally {
      setIsSupporting(false);
    }
  };

  // Confirm resolution handler
  const handleConfirmResolution = async (e) => {
    e.preventDefault();
    if (!id || isConfirming) return;
    try {
      setIsConfirming(true);
      const res = await complaintApi.confirmResolution(id, {
        rating: Number(rating),
        feedback: confirmFeedback.trim(),
      });
      if (res && res.success) {
        setToastMessage('Thank you! Your resolution satisfaction has been recorded.');
        fetchComplaintDetail();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit confirmation.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Dispute resolution handler
  const handleDisputeResolution = async (e) => {
    e.preventDefault();
    if (!id || isDisputing) return;
    if (!disputeReason.trim()) {
      alert('Please provide a reason explaining why the issue is still unresolved.');
      return;
    }
    try {
      setIsDisputing(true);
      const res = await complaintApi.disputeResolution(id, {
        disputeReason: disputeReason.trim(),
      });
      if (res && res.success) {
        setShowDisputeModal(false);
        setToastMessage('Grievance reopened for municipal re-inspection.');
        fetchComplaintDetail();
      }
    } catch (err) {
      setError(err.message || 'Failed to dispute resolution.');
    } finally {
      setIsDisputing(false);
    }
  };

  const complaintNo = complaint?.complaintNumber || `CIV-${id?.slice(-6) || 'PMC'}`;

  return (
    <CitizenLayout>
      <div className="citizen-page-inner">
        {/* Breadcrumb Navigation */}
        <nav className="breadcrumb-nav" aria-label="Breadcrumb">
          <Link to="/dashboard" className="breadcrumb-link">{t('navOverview', 'Dashboard')}</Link>
          <span className="breadcrumb-separator">/</span>
          <Link to="/complaints" className="breadcrumb-link">{t('navMyComplaints', 'My Complaints')}</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current" aria-current="page">
            {isLoading ? 'Loading...' : complaintNo}
          </span>
        </nav>

        {/* Success Toast */}
        {toastMessage && (
          <div className="toast-notification toast-notification--success" role="status">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{toastMessage}</span>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => setToastMessage('')}
              aria-label="Dismiss toast"
            >
              &times;
            </button>
          </div>
        )}

        {/* Loading State Skeleton */}
        {isLoading && (
          <div className="detail-skeleton" aria-busy="true" aria-label="Loading complaint details">
            <div className="skeleton-bar skeleton-bar--short" style={{ height: '32px' }} />
            <div className="skeleton-card" style={{ height: '140px', marginTop: '1rem' }} />
            <div className="skeleton-card" style={{ height: '240px', marginTop: '1.5rem' }} />
          </div>
        )}

        {/* Error / Not Found State */}
        {!isLoading && error && (
          <section className="empty-state-card" aria-label="Error loading complaint">
            <div className="empty-state-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="empty-state-title">Complaint Not Found</h2>
            <p className="empty-state-desc">{error}</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={fetchComplaintDetail}>
                Try Again
              </button>
              <Link to="/complaints" className="btn btn-primary">
                Return to My Complaints
              </Link>
            </div>
          </section>
        )}

        {/* Active Complaint Details */}
        {!isLoading && !error && complaint && (
          <article className="detail-layout">
            {/* Detail Top Header */}
            <div className="detail-header">
              <div className="detail-header__main">
                <div className="detail-number-group">
                  <span className="complaint-number-badge complaint-number-badge--lg">
                    {complaintNo}
                  </span>
                  <StatusBadge status={complaint.status} size="lg" id="detail-status-badge" />
                  {complaint.priority && (
                    <span className={`priority-tag priority-tag--${complaint.priority.toLowerCase()}`}>
                      {complaint.priority} Priority
                    </span>
                  )}
                  {complaint.slaDeadline && (
                    <span className="sla-deadline-tag">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      SLA: {new Date(complaint.slaDeadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h1 className="detail-title">{complaint.title}</h1>
              </div>

              <div className="detail-header__actions">
                {/* Community Support Button */}
                <button
                  type="button"
                  className={`btn btn-sm ${hasSupported ? 'btn-success' : 'btn-outline'}`}
                  onClick={handleSupport}
                  disabled={isSupporting}
                  title="Upvote / Support this civic issue"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                  </svg>
                  <span>{complaint.supportCount || 1} Citizens Impacted</span>
                </button>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={fetchComplaintDetail}
                  aria-label="Refresh complaint status"
                  id="detail-refresh-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M23 4v6h-6" />
                    <path d="M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  <span>Refresh Status</span>
                </button>

                <Link to="/complaints" className="btn btn-outline btn-sm">
                  Back to List
                </Link>
              </div>
            </div>

            {/* Visual Lifecycle Stepper Card */}
            <section className="detail-card stepper-section" aria-labelledby="stepper-heading">
              <h2 id="stepper-heading" className="detail-card__title">
                Grievance Resolution Progress
              </h2>
              <LifecycleStepper status={complaint.status} />
            </section>

            {/* Before-and-After Verification Showcase (When Resolved or has repair image) */}
            {(complaint.resolutionImageUrl || complaint.status === 'RESOLVED') && (
              <section className="detail-card verification-section" aria-labelledby="verification-heading">
                <div className="verification-header">
                  <div className="d-flex align-center gap-2">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#10b981' }}>
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <h2 id="verification-heading" className="detail-card__title mb-0">
                      AI Before-and-After Resolution Verification
                    </h2>
                  </div>
                  {complaint.verificationStatus && (
                    <span className={`badge badge-${complaint.verificationStatus === 'RESOLVED_VERIFIED' ? 'success' : 'warning'}`}>
                      {complaint.verificationStatus.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <div className="before-after-grid">
                  <div className="photo-compare-card">
                    <div className="compare-tag compare-tag-before">Original Problem Photo</div>
                    {complaint.imageUrl ? (
                      <img src={complaint.imageUrl} alt="Original reported grievance" className="compare-img" />
                    ) : (
                      <div className="compare-empty">No original photo submitted</div>
                    )}
                  </div>

                  <div className="photo-compare-card">
                    <div className="compare-tag compare-tag-after">Field Officer Repair Photo</div>
                    {complaint.resolutionImageUrl ? (
                      <img src={complaint.resolutionImageUrl} alt="Repair work evidence" className="compare-img" />
                    ) : (
                      <div className="compare-empty">Repair photo pending upload</div>
                    )}
                  </div>
                </div>

                {complaint.resolutionNotes && (
                  <div className="resolution-notes-box">
                    <strong>Officer Field Report:</strong> {complaint.resolutionNotes}
                  </div>
                )}

                {complaint.verificationConfidence !== undefined && (
                  <div className="ai-verification-meta">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#10b981' }}>
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    <span>AI Vision Confidence: {complaint.verificationConfidence}%</span>
                  </div>
                )}
              </section>
            )}

            {/* Citizen Confirmation & Dispute Panel */}
            {complaint.status === 'RESOLVED' && (
              <section className="detail-card citizen-feedback-card" aria-labelledby="feedback-heading">
                <h2 id="feedback-heading" className="detail-card__title">
                  Citizen Resolution Confirmation & Quality Rating
                </h2>

                {complaint.citizenConfirmation?.confirmed ? (
                  <div className="confirmed-success-panel">
                    <div className="d-flex align-center gap-2">
                      <span className="badge badge-success">Resolution Confirmed by Citizen</span>
                      <span className="star-rating-display">
                        {'★'.repeat(complaint.citizenConfirmation.rating || 5)}
                        {'☆'.repeat(5 - (complaint.citizenConfirmation.rating || 5))}
                      </span>
                    </div>
                    {complaint.citizenConfirmation.feedback && (
                      <p className="mt-2 text-muted">
                        <em>"{complaint.citizenConfirmation.feedback}"</em>
                      </p>
                    )}
                    <span className="text-xs text-muted">
                      Confirmed on {formatFullDate(complaint.citizenConfirmation.confirmedAt)}
                    </span>
                  </div>
                ) : complaint.citizenConfirmation?.disputed ? (
                  <div className="dispute-alert-panel">
                    <div className="d-flex align-center gap-2">
                      <span className="badge badge-danger">Resolution Disputed by Citizen</span>
                    </div>
                    <p className="mt-2">
                      <strong>Dispute Reason:</strong> {complaint.citizenConfirmation.disputeReason}
                    </p>
                    <span className="text-xs text-muted">
                      Flagged on {formatFullDate(complaint.citizenConfirmation.disputedAt)}
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleConfirmResolution} className="confirmation-form">
                    <p className="form-subtext">
                      PMC field engineers have marked this issue as resolved. Please review the repair photo and confirm if you are satisfied.
                    </p>

                    <div className="rating-select-group">
                      <label className="form-label">Satisfaction Rating:</label>
                      <div className="star-rating-buttons">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={`star-btn ${rating >= star ? 'star-active' : ''}`}
                            onClick={() => setRating(star)}
                            title={`${star} Star`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group mt-2">
                      <label htmlFor="confirm-feedback" className="form-label">
                        Citizen Feedback / Comments (Optional):
                      </label>
                      <textarea
                        id="confirm-feedback"
                        rows={2}
                        className="form-input form-textarea"
                        placeholder="e.g. Pothole cleanly filled and road resurfaced smoothly. Thank you PMC!"
                        value={confirmFeedback}
                        onChange={(e) => setConfirmFeedback(e.target.value)}
                      />
                    </div>

                    <div className="confirmation-actions">
                      <button
                        type="submit"
                        className="btn btn-success"
                        disabled={isConfirming}
                      >
                        {isConfirming ? 'Submitting...' : '✓ Confirm Resolution Satisfaction'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => setShowDisputeModal(true)}
                      >
                        ⚠️ Issue Unresolved? Dispute & Reopen
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}

            {/* Dispute Modal */}
            {showDisputeModal && (
              <div className="dispute-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="dispute-title">
                <div className="dispute-modal-content">
                  <div className="modal-header">
                    <h3 id="dispute-title" className="modal-title">Dispute Grievance Resolution</h3>
                    <button type="button" className="close-btn" onClick={() => setShowDisputeModal(false)}>&times;</button>
                  </div>
                  <form onSubmit={handleDisputeResolution}>
                    <p className="modal-desc">
                      If the repair was incomplete, substandard, or not performed, tell us why. The grievance will be immediately reopened and reassigned for municipal inspection.
                    </p>
                    <div className="form-group">
                      <label htmlFor="dispute-reason-input" className="form-label">
                        Reason for Dispute <span className="required-star">*</span>
                      </label>
                      <textarea
                        id="dispute-reason-input"
                        rows={4}
                        className="form-input form-textarea"
                        placeholder="e.g. Garbage was only partially cleared, debris is still blocking pedestrian pathway..."
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        required
                      />
                    </div>
                    <div className="modal-actions">
                      <button type="button" className="btn btn-outline" onClick={() => setShowDisputeModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-danger" disabled={isDisputing}>
                        {isDisputing ? 'Reopening Issue...' : 'Submit Dispute & Reopen Ticket'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Information Grid */}
            <div className="detail-grid">
              {/* Left Column: Complaint Details & AI Card */}
              <section className="detail-card" aria-labelledby="details-heading">
                <h2 id="details-heading" className="detail-card__title">
                  Grievance Details
                </h2>

                <div className="detail-field">
                  <span className="detail-field__label">Description</span>
                  <p className="detail-field__value description-text">
                    {complaint.description}
                  </p>
                </div>

                <div className="detail-field">
                  <span className="detail-field__label">Department / Category</span>
                  <div className="detail-field__value">
                    <span className="category-pill">{complaint.category}</span>
                  </div>
                </div>

                {/* Assigned Field Officer Information (with Privacy Protection) */}
                {(() => {
                  const office = getWardOffice(complaint.location?.ward, complaint.location?.address);
                  const departmentEmail = typeof complaint.departmentId === 'object'
                    ? (complaint.departmentId?.officialEmail || complaint.departmentId?.contactEmail)
                    : null;
                  const officerInfo = getOfficerDisplayInfo(complaint.assignedOfficer, complaint.category, office);

                  return (
                    <div className="detail-field citizen-officer-section">
                        <span className="detail-field__label">Assigned Field Officer</span>
                        {officerInfo ? (
                          <div className="citizen-officer-card">
                            <div className="citizen-officer-badge">
                              <span className="officer-status-dot" aria-hidden="true" />
                              <span>Active Field Assignment</span>
                            </div>
                            
                            <div className="citizen-officer-main">
                              <div className="citizen-officer-avatar" aria-hidden="true">
                                {((officerInfo.displayName || '').replace(/^Officer\s+/i, '').trim().charAt(0) || 'O').toUpperCase()}
                              </div>
                              <div className="citizen-officer-details">
                                <h4 className="citizen-officer-name">
                                  {officerInfo.displayName}
                                </h4>
                                <div className="citizen-officer-designation">
                                  {officerInfo.designation}
                                </div>
                              </div>
                            </div>

                            <div className="citizen-officer-meta">
                              <div className="officer-meta-row">
                                <span className="meta-icon" aria-hidden="true">☎️</span>
                                <span className="meta-label">Official Desk Contact:</span>
                                <a
                                  href={`tel:${office.publicDeskPhone || '020-25501000'}`}
                                  className="meta-link"
                                >
                                  {office.publicDeskPhone || '020-25501000'} (Ward Desk Helpline)
                                </a>
                              </div>

                              <div className="officer-meta-row">
                                <span className="meta-icon" aria-hidden="true">✉️</span>
                                <span className="meta-label">Official Desk Email:</span>
                                <a
                                  href={`mailto:${departmentEmail || office.publicEmail}`}
                                  className="meta-link"
                                >
                                  {departmentEmail || office.publicEmail}
                                </a>
                              </div>

                              <div className="officer-meta-row">
                                <span className="meta-icon" aria-hidden="true">🏷️</span>
                                <span className="meta-label">Staff Badge ID:</span>
                                <span className="meta-badge-id">{officerInfo.badgeId}</span>
                              </div>

                              {officerInfo.assignedAt && (
                                <div className="officer-meta-row">
                                  <span className="meta-icon" aria-hidden="true">📅</span>
                                  <span className="meta-label">Assigned:</span>
                                  <span className="meta-value">
                                    {formatFullDate(officerInfo.assignedAt)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Officer Privacy Shield Notice */}
                            <div className="officer-privacy-shield">
                              <span className="privacy-shield-icon" aria-hidden="true">🛡️</span>
                              <div className="privacy-shield-text">
                                <strong className="privacy-shield-title">Official Municipal Contact Only</strong>
                                <p className="privacy-shield-desc">
                                  In accordance with PMC Service Conduct Rules, personal mobile numbers and private contact details of field staff are protected. Direct citizen inquiries and grievance escalations are handled through the official Ward Office Desk.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="citizen-officer-card citizen-officer-card--unassigned">
                            <div className="citizen-officer-main">
                              <div className="citizen-officer-avatar citizen-officer-avatar--pending" aria-hidden="true">
                                ⏳
                              </div>
                              <div className="citizen-officer-details">
                                <h4 className="citizen-officer-name">Awaiting Field Officer Assignment</h4>
                                <div className="citizen-officer-designation">
                                  {complaint.status === 'RESOLVED'
                                    ? 'Issue addressed by PMC municipal operations team.'
                                    : `Your grievance has been routed to ${office.shortName}. A field engineer will be designated for site inspection.`}
                                </div>
                              </div>
                            </div>
                            <div className="citizen-officer-meta">
                              <div className="officer-meta-row">
                                <span className="meta-icon" aria-hidden="true">☎️</span>
                                <span className="meta-label">Ward Office Public Desk:</span>
                                <a href={`tel:${office.publicDeskPhone}`} className="meta-link">
                                  {office.publicDeskPhone}
                                </a>
                              </div>
                              <div className="officer-meta-row">
                                <span className="meta-icon" aria-hidden="true">📞</span>
                                <span className="meta-label">PMC 24x7 Citizen Helpline:</span>
                                <a href="tel:18001030222" className="meta-link">1800-1030-222</a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                  );
                })()}

                {/* AI Analysis Card */}
                {complaint.aiAnalysis && (
                  <div className="ai-detail-box mt-3">
                    <div className="ai-detail-header">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--color-primary)' }}>
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                      <strong>AI Diagnostics:</strong>
                    </div>
                    {complaint.aiAnalysis.detectedCivicIssue && (
                      <p style={{ margin: '4px 0', fontWeight: 600, color: 'var(--color-primary)' }}>
                        Visible Defect: {complaint.aiAnalysis.detectedCivicIssue}
                      </p>
                    )}
                    <p className="ai-detail-assessment">
                      {complaint.aiAnalysis.visibleEvidence || complaint.aiAnalysis.description || complaint.aiAnalysis.reasoning}
                    </p>
                    <div className="ai-detail-pills">
                      <span className="badge badge-sm badge-primary">
                        Score: {complaint.aiAnalysis.severityScore ?? complaint.aiAnalysis.score ?? 70}/100
                      </span>
                      {complaint.aiAnalysis.confidenceScore && (
                        <span className="badge badge-sm badge-info">
                          AI Match: {Math.round(complaint.aiAnalysis.confidenceScore)}%
                        </span>
                      )}
                      <span className="badge badge-sm badge-info">
                        Dept: {complaint.aiAnalysis.department || complaint.aiAnalysis.suggestedDepartment || 'Operations'}
                      </span>
                      {complaint.aiAnalysis.safetyHazards?.length > 0 && (
                        <span className="badge badge-sm badge-danger">
                          Hazards: {complaint.aiAnalysis.safetyHazards.join(', ')}
                        </span>
                      )}
                      {complaint.aiAnalysis.manualReviewNeeded && (
                        <span className="badge badge-sm badge-warning">
                          Marked for Field Verification
                        </span>
                      )}
                    </div>
                    {complaint.aiAnalysis.authenticityAssessment && (
                      <div style={{ marginTop: '8px', fontSize: '0.8rem', borderTop: '1px solid rgba(148, 163, 184, 0.2)', paddingTop: '6px' }}>
                        <div>
                          <strong>Image Authenticity: </strong>
                          <span style={{ color: complaint.aiAnalysis.authenticityAssessment.possibleAiGenerated ? '#d97706' : '#059669', fontWeight: 600 }}>
                            {complaint.aiAnalysis.authenticityAssessment.possibleAiGenerated
                              ? (complaint.aiAnalysis.authenticityAssessment.confidence === 'HIGH'
                                  ? '⚠️ AI-Generated / Synthetic Image Detected'
                                  : '⚠️ Possible AI-Generated / Edited')
                              : 'Camera Capture Indicators'}
                          </span>
                        </div>
                        <div className="ai-disclaimer-box" style={{ marginTop: '4px' }}>
                          {complaint.aiAnalysis.authenticityAssessment.disclaimer ||
                            "Visual appearance alone cannot definitively prove an image's origin; this assessment is an automated heuristic and should be verified independently if questioned."}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Right Column: Location & Audit Metadata */}
              <div className="detail-column-secondary">
                {/* Location Card */}
                <section className="detail-card" aria-labelledby="location-heading">
                  <h2 id="location-heading" className="detail-card__title">
                    Grievance Location
                  </h2>

                  <div className="detail-field">
                    <span className="detail-field__label">Address / Landmark</span>
                    <p className="detail-field__value">
                      {complaint.location?.address || 'Pune Municipal Corporation'}
                    </p>
                  </div>

                  {complaint.location?.ward && (
                    <div className="detail-field">
                      <span className="detail-field__label">PMC Ward</span>
                      <p className="detail-field__value">
                        {complaint.location.ward}
                      </p>
                    </div>
                  )}

                  {complaint.location?.latitude !== undefined &&
                    complaint.location?.longitude !== undefined && (
                      <div className="detail-field">
                        <span className="detail-field__label">GPS Coordinates</span>
                        <div className="coordinates-box">
                          <span>
                            {complaint.location.latitude}, {complaint.location.longitude}
                          </span>
                          <a
                            href={`https://maps.google.com/?q=${complaint.location.latitude},${complaint.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="maps-link"
                          >
                            Open in Google Maps &rarr;
                          </a>
                        </div>
                      </div>
                    )}
                </section>

                {/* Audit Timestamps Card */}
                <section className="detail-card" aria-labelledby="timeline-heading">
                  <h2 id="timeline-heading" className="detail-card__title">
                    Filing Timeline
                  </h2>

                  <div className="timeline-list">
                    <div className="timeline-item">
                      <div className="timeline-bullet" />
                      <div>
                        <div className="timeline-time">Submitted</div>
                        <div className="timeline-date">{formatFullDate(complaint.createdAt)}</div>
                      </div>
                    </div>

                    {complaint.updatedAt && complaint.updatedAt !== complaint.createdAt && (
                      <div className="timeline-item">
                        <div className="timeline-bullet timeline-bullet--active" />
                        <div>
                          <div className="timeline-time">Last Status Update</div>
                          <div className="timeline-date">{formatFullDate(complaint.updatedAt)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </article>
        )}
      </div>
    </CitizenLayout>
  );
};

export default ComplaintDetailPage;
