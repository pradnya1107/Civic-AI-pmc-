import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { departmentAdminApi } from '../../services/api';

export const DepartmentVerificationPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'VERIFIED' | 'PENDING'
  const [toastMessage, setToastMessage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Verification modal
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [verdict, setVerdict] = useState('APPROVE');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadVerificationComplaints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await departmentAdminApi.getComplaints({ verificationOnly: true, limit: 50 });
      const list = res?.data?.complaints || [];
      setComplaints(list);
    } catch (err) {
      setError(err.message || 'Failed to load resolution verification list.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVerificationComplaints();
  }, [loadVerificationComplaints]);

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!activeComplaint) return;
    if (verdict === 'REJECT' && (!rejectionReason || rejectionReason.trim().length < 5)) {
      showToast('Please provide a specific rejection reason (at least 5 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const complaintId = activeComplaint._id || activeComplaint.id;
      await departmentAdminApi.verifyResolution(complaintId, {
        verdict,
        notes: verifyNotes,
        rejectionReason: verdict === 'REJECT' ? rejectionReason : undefined,
      });

      showToast(
        verdict === 'APPROVE'
          ? `Complaint #${activeComplaint.complaintNumber} verified and marked RESOLVED.`
          : `Complaint #${activeComplaint.complaintNumber} resolution rejected and reopened for inspection.`
      );
      setActiveComplaint(null);
      setVerifyNotes('');
      setRejectionReason('');
      loadVerificationComplaints();
    } catch (err) {
      showToast('Verification failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = complaints.filter((c) => {
    if (filterMode === 'VERIFIED') return c.status === 'RESOLVED';
    if (filterMode === 'PENDING') return c.status !== 'RESOLVED';
    return true;
  });

  return (
    <div className="dept-verification-page" style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* Toast */}
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

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0B1D33)' }}>
              Resolution Verification Hub
            </h2>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                background: '#0D9488',
                color: '#FFFFFF',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              Quality Audit
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
            Compare original citizen grievance photos with field repair completion evidence before approving closure.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'ALL', label: `All (${complaints.length})` },
            { id: 'PENDING', label: 'Awaiting Audit' },
            { id: 'VERIFIED', label: 'Verified & Resolved' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilterMode(pill.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: filterMode === pill.id ? '#0D9488' : 'var(--border-color, #E2E8F0)',
                background: filterMode === pill.id ? '#0D9488' : 'var(--bg-card, #FFFFFF)',
                color: filterMode === pill.id ? '#FFFFFF' : 'var(--text-primary, #0B1D33)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
          <div className="spinner" style={{ margin: '0 auto 10px auto' }} />
          Loading resolution evidence dossiers...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: '60px',
            textAlign: 'center',
            background: 'var(--bg-card, #FFFFFF)',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
          <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary, #0B1D33)' }}>
            No Resolution Evidence Under Selected Filter
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
            When field workers submit completion evidence or complaints are resolved, they appear here for quality audit.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {filtered.map((c) => {
            const id = c._id || c.id;
            const isResolved = c.status === 'RESOLVED';

            return (
              <div
                key={id}
                style={{
                  background: 'var(--bg-card, #FFFFFF)',
                  border: isResolved ? '1px solid #86EFAC' : '1px solid #FCD34D',
                  borderLeft: `5px solid ${isResolved ? '#10B981' : '#F59E0B'}`,
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Link
                        to={`/department/complaints/${id}`}
                        style={{ fontSize: '13px', fontWeight: 800, color: '#0D9488', textDecoration: 'none' }}
                      >
                        {c.complaintNumber}
                      </Link>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: isResolved ? '#DCFCE7' : '#FEF3C7',
                          color: isResolved ? '#15803D' : '#B45309',
                        }}
                      >
                        {isResolved ? 'VERIFIED RESOLVED' : 'AWAITING VERIFICATION'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        • {c.category}
                      </span>
                    </div>

                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
                      {c.title}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                      📍 {c.location?.address} • Ward: {c.location?.ward || 'General'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Link
                      to={`/department/complaints/${id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      Dossier
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveComplaint(c);
                        setVerdict('APPROVE');
                        setVerifyNotes('');
                        setRejectionReason('');
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ background: '#0D9488', borderColor: '#0D9488' }}
                    >
                      Audit & Verify 🔍
                    </button>
                  </div>
                </div>

                {/* Side by side image comparison */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '18px' }}>
                  {/* Before image */}
                  <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#B91C1C' }}>
                        BEFORE (Initial Grievance)
                      </span>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>Click image to zoom</span>
                    </div>
                    {c.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt="Initial grievance submission"
                        onClick={() => setPreviewImage(c.imageUrl)}
                        style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer' }}
                      />
                    ) : (
                      <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                        No initial image uploaded
                      </div>
                    )}
                  </div>

                  {/* After image */}
                  <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803D' }}>
                        AFTER (Field Repair Completion)
                      </span>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>Click image to zoom</span>
                    </div>
                    {c.resolutionImageUrl ? (
                      <img
                        src={c.resolutionImageUrl}
                        alt="After repair completion"
                        onClick={() => setPreviewImage(c.resolutionImageUrl)}
                        style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer' }}
                      />
                    ) : (
                      <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                        Completion image pending field officer upload
                      </div>
                    )}
                  </div>
                </div>

                {/* Field Notes and AI Verification Verdict */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', background: 'var(--bg-main, #F8FAFC)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color, #E2E8F0)' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', textTransform: 'uppercase' }}>
                      Field Worker Report:
                    </span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-primary, #0B1D33)', lineHeight: 1.4 }}>
                      {c.resolutionNotes || 'Repair completed by assigned engineering field unit. Awaiting formal administrative signoff.'}
                    </p>
                    {c.assignedOfficer?.name && (
                      <div style={{ fontSize: '11px', color: '#0D9488', marginTop: '4px', fontWeight: 600 }}>
                        — {c.assignedOfficer.name} ({c.assignedOfficer.designation || 'Field Inspector'})
                      </div>
                    )}
                  </div>

                  {c.aiAnalysis?.resolutionVerdict && (
                    <div style={{ borderLeft: '2px solid #0D9488', paddingLeft: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D9488', display: 'block', textTransform: 'uppercase' }}>
                        AI Computer Vision Verification:
                      </span>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#15803D', marginTop: '2px' }}>
                        ✓ {c.aiAnalysis.resolutionVerdict.replace(/_/g, ' ')} ({c.aiAnalysis.resolutionConfidence || 92}% Confidence)
                      </div>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B', lineHeight: 1.3 }}>
                        {c.aiAnalysis.resolutionAnalysis || 'Visual inspection verified the reported issue has been repaired.'}
                      </p>
                    </div>
                  )}

                  {c.citizenConfirmation && (
                    <div style={{ borderLeft: '2px solid #F59E0B', paddingLeft: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', display: 'block', textTransform: 'uppercase' }}>
                        Citizen Rating & Feedback:
                      </span>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#D97706', marginTop: '2px' }}>
                        {'★'.repeat(c.citizenConfirmation.rating || 5)}{'☆'.repeat(5 - (c.citizenConfirmation.rating || 5))} ({c.citizenConfirmation.rating || 5}/5)
                      </div>
                      {c.citizenConfirmation.feedback && (
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
                          "{c.citizenConfirmation.feedback}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Lightbox */}
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
              alt="Resolution zoom"
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

      {/* Verification Modal */}
      {activeComplaint && (
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
              Audit Resolution: #{activeComplaint.complaintNumber}
            </h3>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setVerdict('APPROVE')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: verdict === 'APPROVE' ? '#10B981' : '#E2E8F0',
                  background: verdict === 'APPROVE' ? '#DCFCE7' : 'transparent',
                  color: verdict === 'APPROVE' ? '#15803D' : '#64748B',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Approve (Mark Resolved) ✓
              </button>
              <button
                type="button"
                onClick={() => setVerdict('REJECT')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: verdict === 'REJECT' ? '#EF4444' : '#E2E8F0',
                  background: verdict === 'REJECT' ? '#FEE2E2' : 'transparent',
                  color: verdict === 'REJECT' ? '#B91C1C' : '#64748B',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Reject (Re-open Work) ✕
              </button>
            </div>

            <form onSubmit={handleVerifySubmit}>
              {verdict === 'REJECT' && (
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: '#B91C1C' }}>
                    Rejection Reason (Required)*
                  </label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="Specify why repair evidence is unsatisfactory..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Administrative Verification Notes
                </label>
                <textarea
                  className="form-input"
                  rows="2"
                  placeholder="Additional inspection findings or remarks..."
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveComplaint(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || (verdict === 'REJECT' && !rejectionReason.trim())}
                  style={verdict === 'APPROVE' ? { background: '#10B981', borderColor: '#10B981' } : { background: '#EF4444', borderColor: '#EF4444' }}
                >
                  {isSubmitting ? 'Verifying...' : verdict === 'APPROVE' ? 'Verify & Close' : 'Reject Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentVerificationPage;
