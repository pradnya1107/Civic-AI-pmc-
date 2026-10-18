import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { departmentAdminApi } from '../../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const LIFECYCLE_STEPS = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED', label: 'Resolved' },
];

export const DepartmentComplaintDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Modals & form state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyVerdict, setVerifyVerdict] = useState('APPROVE');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadComplaint = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await departmentAdminApi.getComplaintById(id);
      if (res?.data) {
        setComplaint(res.data.complaint);
        setAuditLogs(res.data.auditLogs || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load complaint details.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadOfficers = async () => {
    try {
      const res = await departmentAdminApi.getOfficers();
      setOfficers(res?.data?.officers || []);
    } catch {
      // Continue
    }
  };

  useEffect(() => {
    loadComplaint();
    loadOfficers();
  }, [loadComplaint]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!complaint?.location?.latitude || !complaint?.location?.longitude) return;
    if (!mapContainerRef.current) return;

    const lat = complaint.location.latitude;
    const lng = complaint.location.longitude;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Custom marker pin
      const icon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background:#0D9488;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 3px 6px rgba(0,0,0,0.3);font-size:16px;">📍</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`<b>${complaint.complaintNumber}</b><br/>${complaint.location.address || 'Pune'}`)
        .openPopup();

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lng], 15);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [complaint]);

  // Status update
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!newStatus) return;
    setIsSubmitting(true);
    try {
      await departmentAdminApi.updateComplaintStatus(id, {
        status: newStatus,
        notes: statusNotes,
      });
      showToast(`Status updated to ${newStatus}.`);
      setShowStatusModal(false);
      setStatusNotes('');
      loadComplaint();
    } catch (err) {
      showToast('Update failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Assign officer
  const handleAssignOfficer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const off = officers.find((o) => o.id === selectedOfficerId || o.name === selectedOfficerId);
      await departmentAdminApi.assignOfficer(id, {
        officerId: off?.id,
        name: off?.name || selectedOfficerId,
        phone: off?.phone,
        designation: off?.designation,
      });
      showToast('Field officer assigned successfully.');
      setShowAssignModal(false);
      loadComplaint();
    } catch (err) {
      showToast('Assignment failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add internal note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setIsSubmitting(true);
    try {
      await departmentAdminApi.addInternalNote(id, { note: newNoteText.trim() });
      showToast('Internal note saved.');
      setNewNoteText('');
      loadComplaint();
    } catch (err) {
      showToast('Failed to add note: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify resolution
  const handleVerifyResolution = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await departmentAdminApi.verifyResolution(id, {
        verdict: verifyVerdict,
        notes: verifyNotes,
        rejectionReason: verifyVerdict === 'REJECT' ? rejectionReason : undefined,
      });
      showToast(
        verifyVerdict === 'APPROVE'
          ? 'Resolution verified and complaint closed.'
          : 'Resolution rejected. Reopened for field correction.'
      );
      setShowVerifyModal(false);
      setVerifyNotes('');
      setRejectionReason('');
      loadComplaint();
    } catch (err) {
      showToast('Verification failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepIndex = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return 0;
      case 'UNDER_REVIEW':
        return 1;
      case 'ASSIGNED':
        return 2;
      case 'IN_PROGRESS':
        return 3;
      case 'RESOLVED':
        return 4;
      default:
        return 1;
    }
  };

  const currentStepIdx = complaint ? getStepIndex(complaint.status) : 0;
  const isOverdue =
    complaint &&
    new Date(complaint.slaDeadline) < new Date() &&
    complaint.status !== 'RESOLVED' &&
    complaint.status !== 'REJECTED';

  const getPriorityBadgeStyle = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return { background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' };
      case 'HIGH':
        return { background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' };
      case 'MEDIUM':
        return { background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' };
      default:
        return { background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' };
    }
  };

  if (isLoading && !complaint) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
        <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
        <p>Loading complaint investigation dossier...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '24px', background: 'var(--bg-card, #fff)', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
        <h3 style={{ color: '#EF4444', margin: '0 0 10px 0' }}>Access Denied / Not Found</h3>
        <p style={{ color: '#64748B', marginBottom: '20px' }}>
          {error || 'The requested complaint cannot be found or does not belong to your authorized department.'}
        </p>
        <Link to="/department/complaints" className="btn btn-primary">
          ← Return to Complaint Management
        </Link>
      </div>
    );
  }

  return (
    <div className="dept-complaint-detail-page" style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#0B1D33',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 9999,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb & Actions Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <Link to="/department/dashboard" style={{ color: '#0D9488', textDecoration: 'none', fontWeight: 600 }}>
            Dashboard
          </Link>
          <span style={{ color: '#94A3B8' }}>/</span>
          <Link to="/department/complaints" style={{ color: '#0D9488', textDecoration: 'none', fontWeight: 600 }}>
            Complaints
          </Link>
          <span style={{ color: '#94A3B8' }}>/</span>
          <span style={{ color: 'var(--text-primary, #0B1D33)', fontWeight: 700 }}>
            {complaint.complaintNumber}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setNewStatus(complaint.status);
              setShowStatusModal(true);
            }}
          >
            Update Status
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSelectedOfficerId(complaint.assignedOfficer?.id || '');
              setShowAssignModal(true);
            }}
          >
            {complaint.assignedOfficer?.name ? 'Reassign Officer' : 'Assign Officer'}
          </button>

          {/* Verification trigger if resolution image or status is resolved */}
          {(complaint.resolutionImageUrl || complaint.status === 'RESOLVED') && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setVerifyVerdict('APPROVE');
                setShowVerifyModal(true);
              }}
              style={{ background: '#0D9488', borderColor: '#0D9488' }}
            >
              Verify Resolution 🔍
            </button>
          )}
        </div>
      </div>

      {/* Header Banner */}
      <div
        style={{
          background: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: '14px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0D9488' }}>
                {complaint.complaintNumber}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  ...getPriorityBadgeStyle(complaint.priority),
                }}
              >
                {complaint.priority} PRIORITY
              </span>
              {isOverdue && (
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#EF4444', color: '#fff' }}>
                  ⚠️ SLA OVERDUE
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary, #0B1D33)' }}>
              {complaint.title}
            </h1>
            <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>📁 {complaint.category}</span>
              <span>📍 {complaint.location?.address}</span>
              <span>📅 Submitted {new Date(complaint.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
              SLA Resolution Target
            </span>
            <div style={{ fontSize: '16px', fontWeight: 700, color: isOverdue ? '#EF4444' : '#0D9488', marginTop: '2px' }}>
              {complaint.slaDeadline ? new Date(complaint.slaDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Standard 48h'}
            </div>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              {isOverdue ? 'Target SLA Breached' : 'Within Expected Window'}
            </span>
          </div>
        </div>

        {/* Visual Lifecycle Stepper */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-color, #E2E8F0)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '16px' }}>
            Lifecycle Progression
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            {/* Background connecting bar */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '20px',
                right: '20px',
                height: '3px',
                background: '#E2E8F0',
                zIndex: 1,
              }}
            />
            {/* Active connecting bar */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '20px',
                width: `${(currentStepIdx / (LIFECYCLE_STEPS.length - 1)) * 100}%`,
                height: '3px',
                background: '#0D9488',
                zIndex: 2,
                transition: 'width 0.3s ease',
              }}
            />

            {LIFECYCLE_STEPS.map((step, idx) => {
              const isPassed = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div
                  key={step.key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    zIndex: 3,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isPassed ? '#0D9488' : 'var(--bg-card, #FFFFFF)',
                      border: `2px solid ${isPassed ? '#0D9488' : '#CBD5E1'}`,
                      color: isPassed ? '#FFFFFF' : '#94A3B8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px',
                      boxShadow: isCurrent ? '0 0 0 4px rgba(13, 148, 136, 0.2)' : 'none',
                    }}
                  >
                    {isPassed ? '✓' : idx + 1}
                  </div>
                  <span
                    style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? '#0D9488' : isPassed ? 'var(--text-primary, #0B1D33)' : '#94A3B8',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Left investigation columns & Right sidebar controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Left Column: Visual evidence, AI analysis, Citizen narrative */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Photographic Evidence Card */}
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-color, #E2E8F0)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            }}
          >
            <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
              Photographic Evidence
            </h3>

            {complaint.imageUrl ? (
              <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', background: '#0B1D33' }}>
                <img
                  src={complaint.imageUrl}
                  alt="Citizen uploaded grievance evidence"
                  onClick={() => setPreviewImage(complaint.imageUrl)}
                  style={{
                    width: '100%',
                    maxHeight: '360px',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    display: 'block',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setPreviewImage(complaint.imageUrl)}
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    background: 'rgba(11, 29, 51, 0.75)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.3)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  🔍 Click to Zoom
                </button>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', background: '#F8FAFC', borderRadius: '8px', color: '#94A3B8' }}>
                No image uploaded with this grievance.
              </div>
            )}
          </div>

          {/* AI Intelligence Card */}
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              border: '1px solid rgba(13, 148, 136, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 10px rgba(13, 148, 136, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '20px' }}>🤖</span>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F766E' }}>
                Gemini Vision AI Analysis
              </h3>
            </div>

            {complaint.aiAnalysis ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ padding: '10px', background: 'rgba(13, 148, 136, 0.06)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Predicted Category</span>
                    <strong style={{ fontSize: '14px', color: '#0D9488' }}>
                      {complaint.aiAnalysis.suggestedDepartment || complaint.category}
                    </strong>
                  </div>

                  <div style={{ padding: '10px', background: 'rgba(13, 148, 136, 0.06)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Severity Score</span>
                    <strong style={{ fontSize: '14px', color: '#D97706' }}>
                      {complaint.aiAnalysis.score ? `${complaint.aiAnalysis.score}/100 (${complaint.aiAnalysis.severity || 'HIGH'})` : 'Auto-Classified'}
                    </strong>
                  </div>
                </div>

                {complaint.aiAnalysis.reasoning && (
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                      AI Assessment Reasoning:
                    </span>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary, #0B1D33)', lineHeight: 1.5 }}>
                      {complaint.aiAnalysis.reasoning}
                    </p>
                  </div>
                )}

                {complaint.aiAnalysis.generatedDescription && (
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                      AI Generated Diagnostic:
                    </span>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary, #0B1D33)', fontStyle: 'italic', lineHeight: 1.5 }}>
                      "{complaint.aiAnalysis.generatedDescription}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                AI visual diagnostics completed upon submission. Verified under municipal classification rules.
              </p>
            )}
          </div>

          {/* Citizen Description Card */}
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-color, #E2E8F0)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
              Citizen Grievance Description
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary, #0B1D33)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {complaint.description}
            </p>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color, #F1F5F9)', fontSize: '12px', color: '#64748B', display: 'flex', gap: '16px' }}>
              <span>Citizen: <strong>{complaint.citizenId?.fullName || 'Verified Citizen'}</strong></span>
              <span>Phone: <strong>{complaint.citizenId?.phoneNumber || 'On File'}</strong></span>
              <span>Support: <strong>{complaint.supportCount || 0} Upvotes</strong></span>
            </div>
          </div>

          {/* Side-by-Side Resolution Verification Card (if resolution image exists) */}
          {(complaint.resolutionImageUrl || complaint.resolutionNotes) && (
            <div
              style={{
                background: 'var(--bg-card, #FFFFFF)',
                border: '1px solid #10B981',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📸</span>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#047857' }}>
                    Resolution Evidence (Before vs After)
                  </h3>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: '#15803D' }}>
                  WORK COMPLETED
                </span>
              </div>

              {/* Photos Side by Side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', display: 'block', marginBottom: '4px' }}>
                    BEFORE (Citizen Submission)
                  </span>
                  <img
                    src={complaint.imageUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800'}
                    alt="Before repair"
                    onClick={() => setPreviewImage(complaint.imageUrl)}
                    style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
                  />
                </div>

                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', display: 'block', marginBottom: '4px' }}>
                    AFTER (Field Repair Evidence)
                  </span>
                  <img
                    src={complaint.resolutionImageUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800'}
                    alt="After repair"
                    onClick={() => setPreviewImage(complaint.resolutionImageUrl)}
                    style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {complaint.resolutionNotes && (
                <div style={{ padding: '12px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0', marginBottom: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803D', display: 'block', marginBottom: '2px' }}>
                    Field Officer Completion Report:
                  </span>
                  <p style={{ margin: 0, fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
                    {complaint.resolutionNotes}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setVerifyVerdict('REJECT');
                    setShowVerifyModal(true);
                  }}
                  style={{ color: '#EF4444', borderColor: '#FCA5A5' }}
                >
                  Reject & Reopen
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setVerifyVerdict('APPROVE');
                    setShowVerifyModal(true);
                  }}
                  style={{ background: '#10B981', borderColor: '#10B981' }}
                >
                  Approve & Verify Resolution ✓
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Location Map, Officer Assignment, Internal Notes, Audit Trail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Location & Map Card */}
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-color, #E2E8F0)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
              Geo-Location & Ward Coordinates
            </h3>

            <div style={{ marginBottom: '12px', fontSize: '13px' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary, #0B1D33)' }}>
                📍 {complaint.location?.address}
              </div>
              <div style={{ color: '#64748B', fontSize: '12px', marginTop: '2px' }}>
                {complaint.location?.ward || 'Pune Ward'} • Coordinates: {complaint.location?.latitude?.toFixed(4)}, {complaint.location?.longitude?.toFixed(4)}
              </div>
            </div>

            {/* Interactive Leaflet Map Container */}
            <div
              ref={mapContainerRef}
              style={{
                width: '100%',
                height: '220px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                zIndex: 1,
              }}
            />
          </div>

          {/* Assigned Officer Card */}
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-color, #E2E8F0)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
                Assigned Field Officer
              </h3>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setSelectedOfficerId(complaint.assignedOfficer?.id || '');
                  setShowAssignModal(true);
                }}
              >
                {complaint.assignedOfficer?.name ? 'Change' : 'Assign'}
              </button>
            </div>

            {complaint.assignedOfficer?.name ? (
              <div style={{ padding: '12px', background: 'var(--bg-main, #F8FAFC)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary, #0B1D33)' }}>
                  👤 {complaint.assignedOfficer.name}
                </div>
                <div style={{ fontSize: '12px', color: '#0D9488', fontWeight: 600, marginTop: '2px' }}>
                  {complaint.assignedOfficer.designation || 'Field Engineer'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  📞 {complaint.assignedOfficer.phone || '020-25501000'}
                </div>
                {complaint.assignedOfficer.assignedAt && (
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                    Assigned on {new Date(complaint.assignedOfficer.assignedAt).toLocaleDateString('en-IN')}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', background: '#F8FAFC', borderRadius: '8px', color: '#94A3B8' }}>
                No field officer assigned yet. Click Assign above.
              </div>
            )}
          </div>

          {/* Internal Notes Card */}
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-color, #E2E8F0)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            }}
          >
            <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
              Internal Investigation Notes
            </h3>

            {/* Note input form */}
            <form onSubmit={handleAddNote} style={{ marginBottom: '16px' }}>
              <textarea
                className="form-input"
                rows="2"
                placeholder="Write an internal operational note..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                style={{ fontSize: '13px', marginBottom: '8px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary"
                  disabled={isSubmitting || !newNoteText.trim()}
                >
                  {isSubmitting ? 'Adding...' : '+ Add Note'}
                </button>
              </div>
            </form>

            {/* Notes list */}
            {complaint.internalNotes?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                {complaint.internalNotes.map((n, i) => (
                  <div
                    key={n._id || i}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--bg-main, #F8FAFC)',
                      borderRadius: '8px',
                      borderLeft: '3px solid #0D9488',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--text-primary, #0B1D33)' }}>{n.authorName || 'Administrator'}</strong>
                      <span>{n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-IN') : 'Recent'}</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-primary, #0B1D33)', lineHeight: 1.4 }}>
                      {n.note}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', padding: '10px' }}>
                No internal notes recorded yet.
              </div>
            )}
          </div>

          {/* Action History / Audit Log */}
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-color, #E2E8F0)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            }}
          >
            <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
              Audit History & Timeline
            </h3>

            {auditLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '260px', overflowY: 'auto' }}>
                {auditLogs.map((log) => (
                  <div
                    key={log._id || log.id}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'var(--bg-main, #F8FAFC)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                      <span style={{ fontWeight: 700, color: '#0D9488' }}>{log.action.replace(/_/g, ' ')}</span>
                      <span>{new Date(log.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ color: 'var(--text-primary, #0B1D33)', marginTop: '2px' }}>
                      By: {log.actorRef?.fullName || 'System Admin'}
                      {log.metadata?.notes ? ` • Note: "${log.metadata.notes}"` : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', padding: '10px' }}>
                Initial submission recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '850px', maxHeight: '90vh' }}>
            <img
              src={previewImage}
              alt="Evidence zoom"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain' }}
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                background: '#FFFFFF',
                color: '#0B1D33',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              borderRadius: '12px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
              Update Complaint Status
            </h3>
            <form onSubmit={handleUpdateStatus}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Select Workflow Status
                </label>
                <select
                  className="form-input"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  required
                >
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Reason / Action Note
                </label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="Provide context or explanation for this status change..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              borderRadius: '12px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
              Assign Field Officer
            </h3>
            <form onSubmit={handleAssignOfficer}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Field Officer
                </label>
                <select
                  className="form-input"
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  required
                >
                  <option value="">-- Select Field Worker / Officer --</option>
                  {officers.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.name} ({off.designation} - {off.availability})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting || !selectedOfficerId}>
                  {isSubmitting ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verify / Reject Resolution Modal */}
      {showVerifyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
              {verifyVerdict === 'APPROVE' ? 'Verify & Close Complaint' : 'Reject Resolution Evidence'}
            </h3>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setVerifyVerdict('APPROVE')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: verifyVerdict === 'APPROVE' ? '#10B981' : '#E2E8F0',
                  background: verifyVerdict === 'APPROVE' ? '#DCFCE7' : 'transparent',
                  color: verifyVerdict === 'APPROVE' ? '#15803D' : '#64748B',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Approve (Resolve) ✓
              </button>
              <button
                type="button"
                onClick={() => setVerifyVerdict('REJECT')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: verifyVerdict === 'REJECT' ? '#EF4444' : '#E2E8F0',
                  background: verifyVerdict === 'REJECT' ? '#FEE2E2' : 'transparent',
                  color: verifyVerdict === 'REJECT' ? '#B91C1C' : '#64748B',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Reject (Re-open) ✕
              </button>
            </div>

            <form onSubmit={handleVerifyResolution}>
              {verifyVerdict === 'REJECT' && (
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#B91C1C' }}>
                    Rejection Reason (Required)*
                  </label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="Describe why repair evidence was insufficient or what remains to be fixed..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Verification Notes (Optional)
                </label>
                <textarea
                  className="form-input"
                  rows="2"
                  placeholder="Add inspection notes or comments..."
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowVerifyModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || (verifyVerdict === 'REJECT' && !rejectionReason.trim())}
                  style={verifyVerdict === 'APPROVE' ? { background: '#10B981', borderColor: '#10B981' } : { background: '#EF4444', borderColor: '#EF4444' }}
                >
                  {isSubmitting ? 'Processing...' : verifyVerdict === 'APPROVE' ? 'Confirm Resolution' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentComplaintDetailPage;
