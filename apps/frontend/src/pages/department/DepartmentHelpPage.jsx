import React from 'react';
import { Link } from 'react-router-dom';

export const DepartmentHelpPage = () => {
  return (
    <div className="dept-help-page" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0B1D33)' }}>
          Department Operations SOP & Support
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
          Standard operating procedures, emergency escalation contacts, and platform guidelines for Department Admins.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* SOP Workflow Guidelines */}
        <div
          style={{
            background: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
            Standard Operating Procedures (SOP)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#0D9488',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                1
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary, #0B1D33)' }}>
                  Grievance Triage & Assignment
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                  Review new complaints under <em>Submitted</em> status. Check AI predicted category, location coordinates, and photographic evidence. Assign an authorized departmental field officer.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#0D9488',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary, #0B1D33)' }}>
                  SLA Monitoring & Priority Escalation
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                  Keep track of SLA countdown timers. Critical complaints (12 hrs) and High priority complaints (24 hrs) must receive field dispatch within 2 hours of assignment.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#0D9488',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                3
              </div>
              <div>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary, #0B1D33)' }}>
                  Resolution Quality Verification
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                  When field personnel submit completion photos and notes, navigate to the <em>Resolution Verification</em> hub. Compare the initial citizen photo side-by-side with the repair completion evidence before approving closure.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Escalation Matrix */}
        <div
          style={{
            background: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
            PMC Escalation & Contact Directory
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '14px', background: 'var(--bg-main, #F8FAFC)', borderRadius: '8px', border: '1px solid var(--border-color, #E2E8F0)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D9488', textTransform: 'uppercase' }}>
                Central PMC Control Room
              </span>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary, #0B1D33)', marginTop: '4px' }}>
                📞 020-25501000 / 25501001
              </div>
              <span style={{ fontSize: '12px', color: '#64748B' }}>24/7 Municipal Operations Hub</span>
            </div>

            <div style={{ padding: '14px', background: 'var(--bg-main, #F8FAFC)', borderRadius: '8px', border: '1px solid var(--border-color, #E2E8F0)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D9488', textTransform: 'uppercase' }}>
                Disaster & Flood Cell
              </span>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary, #0B1D33)', marginTop: '4px' }}>
                📞 020-25506800
              </div>
              <span style={{ fontSize: '12px', color: '#64748B' }}>Emergency Drainage & Tree Fall</span>
            </div>

            <div style={{ padding: '14px', background: 'var(--bg-main, #F8FAFC)', borderRadius: '8px', border: '1px solid var(--border-color, #E2E8F0)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D9488', textTransform: 'uppercase' }}>
                Super Admin Support
              </span>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary, #0B1D33)', marginTop: '4px' }}>
                📧 admin@civicai.com
              </div>
              <span style={{ fontSize: '12px', color: '#64748B' }}>Technical Administration & Accounts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentHelpPage;
