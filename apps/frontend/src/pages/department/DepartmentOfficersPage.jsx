import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { departmentAdminApi } from '../../services/api';

export const DepartmentOfficersPage = () => {
  const navigate = useNavigate();
  const [officers, setOfficers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('ALL');

  // Add Officer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    designation: 'Field Operations Specialist',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadOfficers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await departmentAdminApi.getOfficers();
      const list = res?.data?.officers || [];
      setOfficers(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Failed to load department officers.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOfficers();
  }, [loadOfficers]);

  const handleAddOfficerSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.fullName.trim() || !addForm.email.trim()) return;

    setIsSubmitting(true);
    try {
      await departmentAdminApi.createOfficer(addForm);
      showToast('New field officer added successfully.');
      setShowAddModal(false);
      setAddForm({
        fullName: '',
        email: '',
        phoneNumber: '',
        designation: 'Field Operations Specialist',
      });
      loadOfficers();
    } catch (err) {
      showToast('Failed to create officer: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOfficers = officers.filter((o) => {
    const matchesSearch =
      !search ||
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.designation.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase());

    const matchesAvailability =
      filterAvailability === 'ALL' || o.availability === filterAvailability;

    return matchesSearch && matchesAvailability;
  });

  return (
    <div className="dept-officers-page" style={{ maxWidth: '1440px', margin: '0 auto' }}>
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
              Officer & Field Worker Management
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
              {officers.length} Active Staff
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
            Monitor real-time field officer capacity, open grievance workload, and resolution performance.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>+ Add Field Officer</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div
        style={{
          background: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            placeholder="Search officer by name, designation, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ height: '36px', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Availability:</span>
          {['ALL', 'AVAILABLE', 'MODERATE', 'BUSY'].map((av) => (
            <button
              key={av}
              type="button"
              onClick={() => setFilterAvailability(av)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                border: '1px solid',
                borderColor: filterAvailability === av ? '#0D9488' : 'var(--border-color, #E2E8F0)',
                background: filterAvailability === av ? '#0D9488' : 'transparent',
                color: filterAvailability === av ? '#FFFFFF' : 'var(--text-primary, #0B1D33)',
                cursor: 'pointer',
              }}
            >
              {av}
            </button>
          ))}
        </div>
      </div>

      {/* Officers Grid */}
      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
          <div className="spinner" style={{ margin: '0 auto 10px auto' }} />
          Loading department officers directory...
        </div>
      ) : filteredOfficers.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-card, #FFFFFF)', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>👷</div>
          <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary, #0B1D33)' }}>No Officers Match Search</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748B' }}>
            Try resetting your search filters or add a new officer.
          </p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterAvailability('ALL'); }}>
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredOfficers.map((officer) => {
            const maxCapacity = 8;
            const loadPercent = Math.min(100, Math.round((officer.activeCount / maxCapacity) * 100));

            return (
              <div
                key={officer.id || officer.name}
                style={{
                  background: 'var(--bg-card, #FFFFFF)',
                  border: '1px solid var(--border-color, #E2E8F0)',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: '#0D9488',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {officer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
                          {officer.name}
                        </h4>
                        <span style={{ fontSize: '12px', color: '#0D9488', fontWeight: 600 }}>
                          {officer.designation}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: officer.availability === 'BUSY' ? '#FEE2E2' : '#DCFCE7',
                        color: officer.availability === 'BUSY' ? '#B91C1C' : '#15803D',
                      }}
                    >
                      {officer.availability}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                    <div>📧 {officer.email}</div>
                    <div>📞 {officer.phone || '020-25501000'}</div>
                  </div>

                  {/* Workload Metric Bar */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>
                      <span>Current Workload</span>
                      <strong>{officer.activeCount} Active Cases</strong>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${loadPercent}%`,
                          height: '100%',
                          background: loadPercent > 75 ? '#EF4444' : '#0D9488',
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats Counter */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-main, #F8FAFC)', padding: '10px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Completed</span>
                      <strong style={{ fontSize: '15px', color: '#10B981' }}>{officer.completedCount}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Resolution Rate</span>
                      <strong style={{ fontSize: '15px', color: '#0D9488' }}>{officer.resolutionRate}%</strong>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/department/complaints?officerId=${officer.id}`}
                  className="btn btn-secondary"
                  style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}
                >
                  View Assigned Complaints ({officer.activeCount})
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Officer Modal */}
      {showAddModal && (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #0B1D33)' }}>
                Add New Field Officer
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddOfficerSubmit}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Officer Full Name*
                </label>
                <input
                  type="text"
                  placeholder="e.g. Officer Vinod Shinde"
                  className="form-input"
                  value={addForm.fullName}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Email Address*
                </label>
                <input
                  type="email"
                  placeholder="e.g. vinod.shinde@pmc.gov.in"
                  className="form-input"
                  value={addForm.email}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9822019900"
                  className="form-input"
                  value={addForm.phoneNumber}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Designation / Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Road Inspector"
                  className="form-input"
                  value={addForm.designation}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, designation: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentOfficersPage;
