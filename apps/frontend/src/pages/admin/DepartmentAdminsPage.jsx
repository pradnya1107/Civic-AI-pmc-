import React, { useState, useEffect } from 'react';
import { adminApi, departmentApi } from '../../services/api';

export const DepartmentAdminsPage = () => {
  const [admins, setAdmins] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [viewingAdmin, setViewingAdmin] = useState(null);
  const [createdAdminNotice, setCreatedAdminNotice] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    departmentId: '',
    password: '',
    confirmPassword: '',
  });
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showAdminConfirmPassword, setShowAdminConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [adminRes, deptRes] = await Promise.all([
        adminApi.getDepartmentAdmins(),
        departmentApi.getDepartments({ includeInactive: false }),
      ]);

      const adminList = adminRes?.data?.admins || adminRes?.admins || [];
      const deptList = deptRes?.data?.departments || deptRes?.departments || deptRes?.data || [];

      setAdmins(Array.isArray(adminList) ? adminList : []);
      setDepartments(Array.isArray(deptList) ? deptList : []);
    } catch (err) {
      setError(err?.message || 'Failed to load department administrators.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      fullName: '',
      email: '',
      departmentId: departments[0]?.id || departments[0]?._id || '',
      password: '',
      confirmPassword: '',
    });
    setShowAdminPassword(false);
    setShowAdminConfirmPassword(false);
    setFormErrors({});
    setIsAddOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (adm) => {
    setEditingAdmin(adm);
    setFormData({
      fullName: adm.fullName || '',
      email: adm.email || '',
      departmentId: adm.department?.id || adm.departmentId || '',
      accountStatus: adm.accountStatus || 'ACTIVE',
    });
    setFormErrors({});
  };

  // Validation
  const validateAddForm = () => {
    const errors = {};
    if (!formData.fullName.trim()) {
      errors.fullName = 'Administrator name is required.';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Name must be at least 2 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!formData.departmentId) {
      errors.departmentId = 'Department assignment is required.';
    }

    if (formData.password || formData.confirmPassword) {
      if (!formData.password) {
        errors.password = 'Password is required.';
      } else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters long.';
      } else if (!/[A-Z]/.test(formData.password)) {
        errors.password = 'Password must contain at least 1 uppercase letter.';
      } else if (!/[^A-Za-z0-9]/.test(formData.password)) {
        errors.password = 'Password must contain at least 1 specific symbol (e.g. !@#$%^&*).';
      }

      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Confirm password is required.';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Add Admin Submission
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validateAddForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        departmentId: formData.departmentId,
      };
      if (formData.password) {
        payload.password = formData.password;
        payload.confirmPassword = formData.confirmPassword;
      }
      const res = await adminApi.createDepartmentAdmin(payload);

      const responseData = res?.data || res;
      setIsAddOpen(false);

      // If demo mode returned temporary password & OTP, show secure one-time notice
      if (responseData?.temporaryPassword || responseData?.confirmationOtp) {
        setCreatedAdminNotice({
          fullName: responseData.admin?.fullName || formData.fullName,
          email: responseData.admin?.email || formData.email,
          departmentName: responseData.admin?.department?.name || 'Assigned Department',
          temporaryPassword: responseData.temporaryPassword,
          confirmationOtp: responseData.confirmationOtp,
        });
      } else {
        showToast(`Administrator account for "${formData.fullName.trim()}" created successfully!`);
      }

      await fetchData();
    } catch (err) {
      setFormErrors({ server: err?.message || 'Failed to create department administrator.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Admin Submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adminApi.updateDepartmentAdmin(editingAdmin.id || editingAdmin._id, {
        fullName: formData.fullName.trim(),
        departmentId: formData.departmentId || null,
        accountStatus: formData.accountStatus,
      });

      showToast(`Administrator updated successfully!`);
      setEditingAdmin(null);
      await fetchData();
    } catch (err) {
      setFormErrors({ server: err?.message || 'Failed to update department administrator.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Status Toggle
  const handleToggleStatus = async (adm) => {
    const newStatus = adm.accountStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await adminApi.updateDepartmentAdmin(adm.id || adm._id, { accountStatus: newStatus });
      showToast(`Administrator ${newStatus === 'ACTIVE' ? 'activated' : 'disabled'} successfully!`);
      await fetchData();
    } catch (err) {
      showToast(err?.message || 'Failed to change administrator status.', 'error');
    }
  };

  // Filtering
  const filteredAdmins = admins.filter((adm) => {
    const matchesSearch =
      adm.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.email?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (deptFilter !== 'ALL') {
      const deptId = adm.department?.id || adm.departmentId;
      if (deptId !== deptFilter) return false;
    }

    if (statusFilter !== 'ALL') {
      if ((adm.accountStatus || 'ACTIVE') !== statusFilter) return false;
    }

    return true;
  });

  return (
    <div className="admin-page-container">
      {/* Toast */}
      {toastMessage && (
        <div className={`admin-toast admin-toast-${toastMessage.type}`} role="alert">
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Department Administrators</h1>
          <p className="admin-page-subtitle">
            Manage department-level administrators, jurisdictional assignments, and account security.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenAdd}
          id="btn-add-dept-admin"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>+ Add Department Admin</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-table-filters">
        <div className="admin-search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            className="admin-filter-input"
            placeholder="Search by administrator name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search administrators"
          />
        </div>

        <div className="admin-filter-group">
          <label htmlFor="admin-dept-filter" className="filter-label">Department:</label>
          <select
            id="admin-dept-filter"
            className="admin-filter-select"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id || d._id} value={d.id || d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-filter-group">
          <label htmlFor="admin-status-filter" className="filter-label">Status:</label>
          <select
            id="admin-status-filter"
            className="admin-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="alert-banner alert-banner-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline" onClick={fetchData}>
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="admin-table-container">
        {isLoading ? (
          <div className="admin-loading-table">
            <div className="spinner" />
            <p>Loading department administrators...</p>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="admin-empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <h3>No department administrators found</h3>
            <p>Provision department administrators to oversee civic grievances.</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
              + Add First Administrator
            </button>
          </div>
        ) : (
          <table className="admin-data-table" aria-label="Department Administrators Directory">
            <thead>
              <tr>
                <th scope="col">Administrator</th>
                <th scope="col">Email</th>
                <th scope="col">Assigned Department</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Created</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map((adm) => {
                const deptName = adm.department?.name || 'Unassigned';
                const isAct = (adm.accountStatus || 'ACTIVE') === 'ACTIVE';
                const createdDate = adm.createdAt
                  ? new Date(adm.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'N/A';

                return (
                  <tr key={adm.id || adm._id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-cell-avatar">
                          {adm.fullName?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <span className="font-semibold">{adm.fullName}</span>
                      </div>
                    </td>
                    <td className="font-mono text-sm text-muted">{adm.email}</td>
                    <td>
                      <span className="font-medium text-sm">{deptName}</span>
                    </td>
                    <td>
                      <span className="admin-role-pill font-mono text-xs">{adm.role}</span>
                    </td>
                    <td>
                      <span className={`dept-status-badge ${isAct ? 'active' : 'inactive'}`}>
                        {isAct ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="text-muted text-sm">{createdDate}</td>
                    <td className="text-right">
                      <div className="table-actions-row">
                        <button
                          type="button"
                          className="btn btn-xs btn-outline"
                          onClick={() => setViewingAdmin(adm)}
                          title="View Admin Profile"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-secondary"
                          onClick={() => handleOpenEdit(adm)}
                          title="Edit Admin"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`btn btn-xs ${isAct ? 'btn-danger-outline' : 'btn-success-outline'}`}
                          onClick={() => handleToggleStatus(adm)}
                          title={isAct ? 'Disable Account' : 'Activate Account'}
                        >
                          {isAct ? 'Disable' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ADD DEPARTMENT ADMIN MODAL */}
      {isAddOpen && (
        <div className="admin-modal-backdrop" onClick={() => !isSubmitting && setIsAddOpen(false)} role="dialog" aria-modal="true" aria-labelledby="add-admin-title">
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 id="add-admin-title" className="admin-modal-title">Add Department Administrator</h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setIsAddOpen(false)}
                disabled={isSubmitting}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddSubmit} noValidate>
              <div className="admin-modal-body">
                {formErrors.server && (
                  <div className="alert-banner alert-banner-error" role="alert">
                    <span>{formErrors.server}</span>
                  </div>
                )}

                <div className="admin-security-callout">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <div>
                    <strong>Zero Plaintext Password Exposure:</strong> A cryptographically secure temporary password and OTP verification code will be generated by the backend and dispatched.
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="admin-full-name" className="form-label">
                    Full Name <span className="required-star">*</span>
                  </label>
                  <input
                    id="admin-full-name"
                    type="text"
                    className={`form-input ${formErrors.fullName ? 'input-error' : ''}`}
                    placeholder="e.g. Rajesh Deshmukh"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    disabled={isSubmitting}
                    required
                  />
                  {formErrors.fullName && <span className="field-error-text">{formErrors.fullName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="admin-email" className="form-label">
                    Email Address <span className="required-star">*</span>
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    className={`form-input ${formErrors.email ? 'input-error' : ''}`}
                    placeholder="e.g. roads.admin@punecorporation.org"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isSubmitting}
                    required
                  />
                  {formErrors.email && <span className="field-error-text">{formErrors.email}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="admin-department-select" className="form-label">
                    Assigned Civic Department <span className="required-star">*</span>
                  </label>
                  <select
                    id="admin-department-select"
                    className={`form-select ${formErrors.departmentId ? 'input-error' : ''}`}
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    disabled={isSubmitting}
                    required
                  >
                    <option value="" disabled>Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id || dept._id} value={dept.id || dept._id}>
                        {dept.name} ({dept.slug})
                      </option>
                    ))}
                  </select>
                  {formErrors.departmentId && <span className="field-error-text">{formErrors.departmentId}</span>}
                </div>

                {/* Password & Confirm Password Inputs */}
                <div className="form-grid-2">
                  <div className="form-group mb-0">
                    <label htmlFor="modal-admin-password" className="form-label">
                      Password (Optional)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="modal-admin-password"
                        type={showAdminPassword ? 'text' : 'password'}
                        className={`form-input ${formErrors.password ? 'input-error' : ''}`}
                        placeholder="e.g. PuneAdmin@2026"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        disabled={isSubmitting}
                        style={{ paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        tabIndex={-1}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: '#64748B',
                          fontSize: '14px',
                        }}
                        aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                      >
                        {showAdminPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                    {formErrors.password && <span className="field-error-text">{formErrors.password}</span>}
                  </div>

                  <div className="form-group mb-0">
                    <label htmlFor="modal-admin-confirm-password" className="form-label">
                      Confirm Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="modal-admin-confirm-password"
                        type={showAdminConfirmPassword ? 'text' : 'password'}
                        className={`form-input ${formErrors.confirmPassword ? 'input-error' : ''}`}
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        disabled={isSubmitting}
                        style={{ paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminConfirmPassword(!showAdminConfirmPassword)}
                        tabIndex={-1}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: '#64748B',
                          fontSize: '14px',
                        }}
                        aria-label={showAdminConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showAdminConfirmPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                    {formErrors.confirmPassword && <span className="field-error-text">{formErrors.confirmPassword}</span>}
                  </div>
                </div>

                {formData.password && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: formData.password.length >= 8 ? '#DEF7EC' : '#F3F4F6',
                        color: formData.password.length >= 8 ? '#03543F' : '#6B7280',
                        fontWeight: 600,
                      }}
                    >
                      {formData.password.length >= 8 ? '✓' : '•'} 8+ Characters
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: /[A-Z]/.test(formData.password) ? '#DEF7EC' : '#F3F4F6',
                        color: /[A-Z]/.test(formData.password) ? '#03543F' : '#6B7280',
                        fontWeight: 600,
                      }}
                    >
                      {/[A-Z]/.test(formData.password) ? '✓' : '•'} 1 Uppercase Letter
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: /[^A-Za-z0-9]/.test(formData.password) ? '#DEF7EC' : '#F3F4F6',
                        color: /[^A-Za-z0-9]/.test(formData.password) ? '#03543F' : '#6B7280',
                        fontWeight: 600,
                      }}
                    >
                      {/[^A-Za-z0-9]/.test(formData.password) ? '✓' : '•'} 1 Specific Symbol
                    </span>
                    {formData.confirmPassword && (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: formData.password === formData.confirmPassword ? '#DEF7EC' : '#FDE8E8',
                          color: formData.password === formData.confirmPassword ? '#03543F' : '#9B1C1C',
                          fontWeight: 600,
                        }}
                      >
                        {formData.password === formData.confirmPassword ? '✓ Passwords Match' : '✕ Passwords Mismatch'}
                      </span>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <input
                    type="text"
                    className="form-input"
                    value="DEPARTMENT_ADMIN (Municipal Department Admin)"
                    disabled
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsAddOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  id="submit-add-admin"
                >
                  {isSubmitting ? 'Provisioning Account...' : 'Provision Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DEPARTMENT ADMIN MODAL */}
      {editingAdmin && (
        <div className="admin-modal-backdrop" onClick={() => !isSubmitting && setEditingAdmin(null)} role="dialog" aria-modal="true" aria-labelledby="edit-admin-title">
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 id="edit-admin-title" className="admin-modal-title">Edit Administrator Profile</h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setEditingAdmin(null)}
                disabled={isSubmitting}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} noValidate>
              <div className="admin-modal-body">
                {formErrors.server && (
                  <div className="alert-banner alert-banner-error" role="alert">
                    <span>{formErrors.server}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="edit-admin-name" className="form-label">
                    Full Name <span className="required-star">*</span>
                  </label>
                  <input
                    id="edit-admin-name"
                    type="text"
                    className="form-input"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    disabled
                    title="Email cannot be altered once provisioned."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-admin-dept" className="form-label">
                    Reassign Department
                  </label>
                  <select
                    id="edit-admin-dept"
                    className="form-select"
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    disabled={isSubmitting}
                  >
                    <option value="">No Department Assigned</option>
                    {departments.map((dept) => (
                      <option key={dept.id || dept._id} value={dept.id || dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-admin-status" className="form-label">
                    Account Status
                  </label>
                  <select
                    id="edit-admin-status"
                    className="form-select"
                    value={formData.accountStatus}
                    onChange={(e) => setFormData({ ...formData, accountStatus: e.target.value })}
                    disabled={isSubmitting}
                  >
                    <option value="ACTIVE">ACTIVE (Authorized to manage department)</option>
                    <option value="DISABLED">DISABLED (Access suspended)</option>
                  </select>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingAdmin(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ADMIN DETAILS MODAL */}
      {viewingAdmin && (
        <div className="admin-modal-backdrop" onClick={() => setViewingAdmin(null)} role="dialog" aria-modal="true" aria-labelledby="view-admin-title">
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className="modal-eyebrow font-mono">Administrator ID: {viewingAdmin.id || viewingAdmin._id}</span>
                <h3 id="view-admin-title" className="admin-modal-title">{viewingAdmin.fullName}</h3>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setViewingAdmin(null)}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="detail-meta-row">
                <div className="detail-meta-item">
                  <span className="detail-label">Status</span>
                  <span className={`dept-status-badge ${viewingAdmin.accountStatus === 'ACTIVE' ? 'active' : 'inactive'}`}>
                    {viewingAdmin.accountStatus || 'ACTIVE'}
                  </span>
                </div>
                <div className="detail-meta-item">
                  <span className="detail-label">Role</span>
                  <span className="admin-role-pill font-mono">{viewingAdmin.role}</span>
                </div>
                <div className="detail-meta-item">
                  <span className="detail-label">Department</span>
                  <span className="font-semibold">{viewingAdmin.department?.name || 'Unassigned'}</span>
                </div>
              </div>

              <div className="detail-field">
                <span className="detail-label">Official Registered Email</span>
                <p className="detail-val font-mono">{viewingAdmin.email}</p>
              </div>

              <div className="detail-field">
                <span className="detail-label">Provisioned Date</span>
                <p className="detail-val">
                  {viewingAdmin.createdAt ? new Date(viewingAdmin.createdAt).toLocaleString('en-IN') : 'N/A'}
                </p>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setViewingAdmin(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONE-TIME CREATION NOTIFICATION BANNER (DEMO MODE CREDENTIALS) */}
      {createdAdminNotice && (
        <div className="admin-modal-backdrop" onClick={() => setCreatedAdminNotice(null)} role="dialog" aria-modal="true" aria-labelledby="notice-title">
          <div className="admin-modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header bg-success-subtle">
              <div>
                <span className="text-xs font-semibold text-success uppercase tracking-wider">Account Provisioned</span>
                <h3 id="notice-title" className="admin-modal-title">Department Admin Ready</h3>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setCreatedAdminNotice(null)}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <div className="admin-modal-body">
              <p className="text-sm mb-4">
                The department administrator account has been created and bound to <strong>{createdAdminNotice.departmentName}</strong>.
              </p>

              <div className="credentials-box">
                <div className="cred-row">
                  <span className="cred-label">Login Email:</span>
                  <span className="cred-val font-mono">{createdAdminNotice.email}</span>
                </div>
                <div className="cred-row">
                  <span className="cred-label">Temporary Password:</span>
                  <span className="cred-val font-mono text-primary font-bold">
                    {createdAdminNotice.temporaryPassword}
                  </span>
                </div>
                {createdAdminNotice.confirmationOtp && (
                  <div className="cred-row">
                    <span className="cred-label">Terminal OTP Code:</span>
                    <span className="cred-val font-mono text-success font-bold">
                      {createdAdminNotice.confirmationOtp}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted mt-3">
                * Note: In production, the password is transmitted securely via government email/SMS. This one-time demo display enables rapid local testing.
              </p>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCreatedAdminNotice(null)}
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentAdminsPage;
