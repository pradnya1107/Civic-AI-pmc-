import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { departmentApi } from '../../services/api';

export const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'INACTIVE'

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [viewingDept, setViewingDept] = useState(null);
  const [deactivatingDept, setDeactivatingDept] = useState(null);

  // Form states
  const [formData, setFormData] = useState({ name: '', slug: '', description: '' });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchDepartments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await departmentApi.getDepartments({ includeInactive: true });
      const list = res?.data?.departments || res?.departments || res?.data || [];
      setDepartments(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || 'Failed to load civic departments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({ name: '', slug: '', description: '' });
    setFormErrors({});
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name || '',
      slug: dept.slug || '',
      description: dept.description || '',
      isActive: dept.isActive ?? true,
    });
    setFormErrors({});
  };

  // Open View Modal
  const handleOpenView = async (dept) => {
    setViewingDept(dept);
    try {
      const res = await departmentApi.getDepartmentById(dept.id || dept._id);
      if (res?.data) {
        setViewingDept(res.data);
      }
    } catch {
      // Use existing dept state
    }
  };

  // Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Department name is required.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Department name must be at least 2 characters.';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Department name must not exceed 100 characters.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create submission
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await departmentApi.createDepartment({
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        description: formData.description.trim() || undefined,
      });
      showToast(`Department "${formData.name.trim()}" created successfully!`);
      setIsCreateOpen(false);
      await fetchDepartments();
    } catch (err) {
      setFormErrors({ server: err?.message || 'Failed to create department.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const deptId = editingDept.id || editingDept._id;
      await departmentApi.updateDepartment(deptId, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        isActive: formData.isActive,
      });
      showToast(`Department updated successfully!`);
      setEditingDept(null);
      await fetchDepartments();
    } catch (err) {
      setFormErrors({ server: err?.message || 'Failed to update department.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status toggle confirmation
  const handleToggleStatus = async (dept) => {
    const deptId = dept.id || dept._id;
    const newStatus = !dept.isActive;
    try {
      await departmentApi.updateDepartment(deptId, { isActive: newStatus });
      showToast(`Department "${dept.name}" ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      setDeactivatingDept(null);
      await fetchDepartments();
    } catch (err) {
      showToast(err?.message || 'Failed to update department status.', 'error');
    }
  };

  // Filtered departments
  const filteredDepartments = departments.filter((dept) => {
    const matchesSearch =
      dept.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.slug?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') return dept.isActive === true;
    if (statusFilter === 'INACTIVE') return dept.isActive === false;
    return true;
  });

  return (
    <div className="admin-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`admin-toast admin-toast-${toastMessage.type}`} role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {toastMessage.type === 'error' ? (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </>
            ) : (
              <>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </>
            )}
          </svg>
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Department Management</h1>
          <p className="admin-page-subtitle">
            Manage civic departments, workloads, and administrative ownership across Pune Municipal Corporation.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenCreate}
          id="btn-create-department"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>+ Create Department</span>
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
            placeholder="Search departments by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search departments"
          />
        </div>

        <div className="admin-filter-group">
          <label htmlFor="dept-status-filter" className="filter-label">Status:</label>
          <select
            id="dept-status-filter"
            className="admin-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="alert-banner alert-banner-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline" onClick={fetchDepartments}>
            Retry
          </button>
        </div>
      )}

      {/* Departments Table */}
      <div className="admin-table-container">
        {isLoading ? (
          <div className="admin-loading-table">
            <div className="spinner" />
            <p>Loading civic departments...</p>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="admin-empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <h3>No departments found</h3>
            <p>No departments match your filter criteria or none have been created yet.</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
              + Create First Department
            </button>
          </div>
        ) : (
          <table className="admin-data-table" aria-label="Departments Directory">
            <thead>
              <tr>
                <th scope="col">Department Name</th>
                <th scope="col">Category / Slug</th>
                <th scope="col">Complaints</th>
                <th scope="col">Resolved Rate</th>
                <th scope="col">Assigned Admins</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepartments.map((dept) => {
                const total = dept.complaintCount ?? 0;
                const resolved = dept.resolvedCount ?? 0;
                const rate = dept.resolutionRate ?? (total > 0 ? Math.round((resolved / total) * 100) : 100);

                return (
                  <tr key={dept.id || dept._id}>
                    <td>
                      <div className="dept-table-name-wrap">
                        <span className="font-semibold">{dept.name}</span>
                        {dept.description && (
                          <span className="dept-table-desc truncate max-w-xs">{dept.description}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="category-tag font-mono text-xs">{dept.slug || 'municipal'}</span>
                    </td>
                    <td>
                      <div className="dept-table-complaints">
                        <span className="font-semibold">{total}</span>
                        <span className="text-muted text-xs">({resolved} resolved)</span>
                      </div>
                    </td>
                    <td>
                      <div className="dept-table-rate-wrap">
                        <span className="text-xs font-semibold">{rate}%</span>
                        <div className="mini-progress-track">
                          <div className="mini-progress-fill" style={{ width: `${rate}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="admin-count-badge">
                        {dept.adminCount ?? 0} {dept.adminCount === 1 ? 'Admin' : 'Admins'}
                      </span>
                    </td>
                    <td>
                      <span className={`dept-status-badge ${dept.isActive ? 'active' : 'inactive'}`}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="table-actions-row">
                        <button
                          type="button"
                          className="btn btn-xs btn-outline"
                          onClick={() => handleOpenView(dept)}
                          title="View Department Details"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-secondary"
                          onClick={() => handleOpenEdit(dept)}
                          title="Edit Department"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`btn btn-xs ${dept.isActive ? 'btn-danger-outline' : 'btn-success-outline'}`}
                          onClick={() => setDeactivatingDept(dept)}
                          title={dept.isActive ? 'Deactivate Department' : 'Activate Department'}
                        >
                          {dept.isActive ? 'Deactivate' : 'Activate'}
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

      {/* CREATE DEPARTMENT MODAL */}
      {isCreateOpen && (
        <div className="admin-modal-backdrop" onClick={() => !isSubmitting && setIsCreateOpen(false)} role="dialog" aria-modal="true" aria-labelledby="create-dept-title">
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 id="create-dept-title" className="admin-modal-title">Create Civic Department</h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} noValidate>
              <div className="admin-modal-body">
                {formErrors.server && (
                  <div className="alert-banner alert-banner-error" role="alert">
                    <span>{formErrors.server}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="dept-create-name" className="form-label">
                    Department Name <span className="required-star">*</span>
                  </label>
                  <input
                    id="dept-create-name"
                    type="text"
                    className={`form-input ${formErrors.name ? 'input-error' : ''}`}
                    placeholder="e.g. Roads & Infrastructure"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={isSubmitting}
                    required
                  />
                  {formErrors.name && <span className="field-error-text">{formErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="dept-create-slug" className="form-label">
                    Category Slug <span className="text-muted">(Optional identifier)</span>
                  </label>
                  <input
                    id="dept-create-slug"
                    type="text"
                    className="form-input"
                    placeholder="e.g. roads-infrastructure"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dept-create-desc" className="form-label">
                    Description & Jurisdiction
                  </label>
                  <textarea
                    id="dept-create-desc"
                    className="form-textarea"
                    rows={3}
                    placeholder="Describe municipal responsibilities, service boundaries, and grievance scope..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  id="submit-create-department"
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner" style={{ width: '1rem', height: '1rem' }} />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Department</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DEPARTMENT MODAL */}
      {editingDept && (
        <div className="admin-modal-backdrop" onClick={() => !isSubmitting && setEditingDept(null)} role="dialog" aria-modal="true" aria-labelledby="edit-dept-title">
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 id="edit-dept-title" className="admin-modal-title">Edit Department</h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setEditingDept(null)}
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
                  <label htmlFor="dept-edit-name" className="form-label">
                    Department Name <span className="required-star">*</span>
                  </label>
                  <input
                    id="dept-edit-name"
                    type="text"
                    className={`form-input ${formErrors.name ? 'input-error' : ''}`}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={isSubmitting}
                    required
                  />
                  {formErrors.name && <span className="field-error-text">{formErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="dept-edit-desc" className="form-label">
                    Description & Jurisdiction
                  </label>
                  <textarea
                    id="dept-edit-desc"
                    className="form-textarea"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      disabled={isSubmitting}
                    />
                    <span>Department is Active (Accepts civic grievances)</span>
                  </label>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingDept(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DEPARTMENT MODAL */}
      {viewingDept && (
        <div className="admin-modal-backdrop" onClick={() => setViewingDept(null)} role="dialog" aria-modal="true" aria-labelledby="view-dept-title">
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className="modal-eyebrow font-mono">Department ID: {viewingDept.id || viewingDept._id}</span>
                <h3 id="view-dept-title" className="admin-modal-title">{viewingDept.name}</h3>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setViewingDept(null)}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="detail-meta-row">
                <div className="detail-meta-item">
                  <span className="detail-label">Status</span>
                  <span className={`dept-status-badge ${viewingDept.isActive ? 'active' : 'inactive'}`}>
                    {viewingDept.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="detail-meta-item">
                  <span className="detail-label">Slug</span>
                  <span className="category-tag font-mono">{viewingDept.slug}</span>
                </div>
                <div className="detail-meta-item">
                  <span className="detail-label">Complaints</span>
                  <span className="font-semibold text-lg">{viewingDept.complaintCount ?? 0}</span>
                </div>
                <div className="detail-meta-item">
                  <span className="detail-label">Resolution Rate</span>
                  <span className="font-semibold text-lg text-primary">{viewingDept.resolutionRate ?? 100}%</span>
                </div>
              </div>

              <div className="detail-field">
                <span className="detail-label">Description & Scope</span>
                <p className="detail-val-box">
                  {viewingDept.description || 'No detailed description provided.'}
                </p>
              </div>

              {/* Assigned Administrators */}
              <div className="detail-field">
                <span className="detail-label">Assigned Administrators</span>
                {Array.isArray(viewingDept.admins) && viewingDept.admins.length > 0 ? (
                  <ul className="admin-mini-list">
                    {viewingDept.admins.map((adm, i) => (
                      <li key={i} className="admin-mini-item">
                        <span className="font-medium">{adm.fullName}</span>
                        <span className="text-muted text-sm">({adm.email})</span>
                        <span className="badge-sm">{adm.accountStatus || 'ACTIVE'}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted text-sm">
                    No administrators assigned yet. You can assign admins from the Department Admins page.
                  </p>
                )}
              </div>
            </div>

            <div className="admin-modal-footer">
              <Link
                to={`/admin/complaints?departmentId=${viewingDept.id || viewingDept._id}`}
                className="btn btn-outline"
                onClick={() => setViewingDept(null)}
              >
                View Department Complaints
              </Link>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setViewingDept(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM STATUS TOGGLE DIALOG */}
      {deactivatingDept && (
        <div className="admin-modal-backdrop" onClick={() => setDeactivatingDept(null)} role="dialog" aria-modal="true" aria-labelledby="confirm-status-title">
          <div className="admin-modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 id="confirm-status-title" className="admin-modal-title">
                {deactivatingDept.isActive ? 'Deactivate Department?' : 'Activate Department?'}
              </h3>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setDeactivatingDept(null)}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <div className="admin-modal-body">
              <p>
                {deactivatingDept.isActive ? (
                  <>
                    Are you sure you want to deactivate <strong>"{deactivatingDept.name}"</strong>?
                    Citizens will not be able to select this department for new complaints until reactivated. Existing complaints will remain intact.
                  </>
                ) : (
                  <>
                    Are you sure you want to activate <strong>"{deactivatingDept.name}"</strong>?
                    The department will be available for grievance submissions across PMC jurisdictions.
                  </>
                )}
              </p>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeactivatingDept(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${deactivatingDept.isActive ? 'btn-danger' : 'btn-success'}`}
                onClick={() => handleToggleStatus(deactivatingDept)}
              >
                {deactivatingDept.isActive ? 'Yes, Deactivate' : 'Yes, Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsPage;
