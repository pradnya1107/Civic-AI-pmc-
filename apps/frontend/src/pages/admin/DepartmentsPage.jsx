import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { departmentApi, adminApi } from '../../services/api';

export const DEPARTMENT_CATEGORIES = [
  { value: '', label: 'Select Department Category *', disabled: true },
  { value: 'Roads & Potholes', label: 'Roads & Potholes (खड्डे आणि रस्ते)' },
  { value: 'Water Supply', label: 'Water Supply (पाणी पुरवठा)' },
  { value: 'Drainage & Sewerage', label: 'Drainage & Sewerage (ड्रेनेज आणि सांडपाणी)' },
  { value: 'Solid Waste & Garbage', label: 'Solid Waste & Garbage (कचरा व्यवस्थापन)' },
  { value: 'Street Lighting & Electrical', label: 'Street Lighting & Electrical (पथदिवे)' },
  { value: 'Health & Sanitation', label: 'Health & Sanitation (आरोग्य आणि स्वच्छता)' },
  { value: 'Garden & Tree Trimming', label: 'Garden & Tree Trimming (उद्यान आणि झाडे)' },
  { value: 'Encroachment', label: 'Encroachment (अतिक्रमण)' },
  { value: 'Traffic & Signage', label: 'Traffic & Signage (वाहतूक आणि फलक)' },
  { value: 'Building & Construction', label: 'Building & Construction (बांधकाम आणि परवानग्या)' },
  { value: 'General Administration', label: 'General Administration (सामान्य प्रशासन)' },
  { value: 'Other Civic Grievance', label: 'Other Civic Grievance (इतर नागरी तक्रार)' },
];

export const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [adminCandidates, setAdminCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'INACTIVE'

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [viewingDept, setViewingDept] = useState(null);
  const [deactivatingDept, setDeactivatingDept] = useState(null);
  const [createdAdminNotice, setCreatedAdminNotice] = useState(null);

  // Form states with compulsory fields
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    officialEmail: '',
    contactNumber: '',
    adminMode: 'NEW', // 'NEW' or 'EXISTING'
    adminId: '',
    existingAdminPassword: '',
    existingAdminConfirmPassword: '',
    newAdminName: '',
    newAdminEmail: '',
    newAdminPassword: '',
    newAdminConfirmPassword: '',
    isActive: true,
  });
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [showNewAdminConfirmPassword, setShowNewAdminConfirmPassword] = useState(false);
  const [showExistingAdminPassword, setShowExistingAdminPassword] = useState(false);
  const [showExistingAdminConfirmPassword, setShowExistingAdminConfirmPassword] = useState(false);
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

  const fetchAdminCandidates = async () => {
    try {
      if (departmentApi.getAdminCandidates) {
        const res = await departmentApi.getAdminCandidates();
        const list = res?.data?.candidates || res?.candidates || [];
        if (Array.isArray(list) && list.length > 0) {
          setAdminCandidates(list);
          return;
        }
      }
      // Fallback to getDepartmentAdmins
      const res2 = await adminApi.getDepartmentAdmins();
      const list2 = res2?.data?.admins || res2?.admins || [];
      setAdminCandidates(Array.isArray(list2) ? list2 : []);
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchAdminCandidates();
  }, []);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      name: '',
      code: '',
      category: '',
      officialEmail: '',
      contactNumber: '',
      adminMode: 'NEW',
      adminId: adminCandidates[0]?.id || '',
      existingAdminPassword: '',
      existingAdminConfirmPassword: '',
      newAdminName: '',
      newAdminEmail: '',
      newAdminPassword: '',
      newAdminConfirmPassword: '',
      isActive: true,
    });
    setShowNewAdminPassword(false);
    setShowNewAdminConfirmPassword(false);
    setShowExistingAdminPassword(false);
    setShowExistingAdminConfirmPassword(false);
    setFormErrors({});
    setIsCreateOpen(true);
    fetchAdminCandidates();
  };

  // Open Edit Modal
  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name || '',
      code: dept.code || dept.slug?.toUpperCase() || '',
      category: dept.category || '',
      officialEmail: dept.officialEmail || '',
      contactNumber: dept.contactNumber || '',
      adminMode: 'EXISTING',
      adminId: dept.adminId || dept.admin?.id || '',
      newAdminName: '',
      newAdminEmail: '',
      isActive: dept.isActive ?? true,
    });
    setFormErrors({});
    fetchAdminCandidates();
  };

  // Open View Modal
  const handleOpenView = async (dept) => {
    setViewingDept(dept);
    try {
      const res = await departmentApi.getDepartmentById(dept.id || dept._id);
      const data = res?.data?.department || res?.data || res?.department;
      if (data) {
        setViewingDept(data);
      }
    } catch {
      // Use existing dept state
    }
  };

  // Validation for Create Form
  const validateCreateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 1. Department Name – required
    if (!formData.name?.trim()) {
      errors.name = 'Department name is required.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Department name must be at least 2 characters.';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Department name must not exceed 100 characters.';
    }

    // 2. Department Code – required and unique
    if (!formData.code?.trim()) {
      errors.code = 'Department code is required.';
    } else if (formData.code.trim().length < 2) {
      errors.code = 'Department code must be at least 2 characters.';
    } else if (!/^[A-Z0-9_-]{2,30}$/i.test(formData.code.trim())) {
      errors.code = 'Code must contain only letters, numbers, hyphens or underscores.';
    }

    // 3. Department Category – required dropdown
    if (!formData.category?.trim()) {
      errors.category = 'Department category is required.';
    }

    // 4. Official Email – required
    if (!formData.officialEmail?.trim()) {
      errors.officialEmail = 'Official email is required.';
    } else if (!emailRegex.test(formData.officialEmail.trim())) {
      errors.officialEmail = 'Please enter a valid official email address.';
    }

    // 5. Contact Number – required
    if (!formData.contactNumber?.trim()) {
      errors.contactNumber = 'Official contact number is required.';
    } else if (formData.contactNumber.trim().length < 7) {
      errors.contactNumber = 'Contact number must be at least 7 digits/characters.';
    }

    // 6. Department Admin – select or create
    if (formData.adminMode === 'EXISTING') {
      if (!formData.adminId) {
        errors.adminId = 'Please select an administrator for this department.';
      }
      if (formData.existingAdminPassword) {
        if (formData.existingAdminPassword.length < 8) {
          errors.existingAdminPassword = 'Password must be at least 8 characters long.';
        } else if (!/[A-Z]/.test(formData.existingAdminPassword)) {
          errors.existingAdminPassword = 'Password must contain at least 1 uppercase letter.';
        } else if (!/[^A-Za-z0-9]/.test(formData.existingAdminPassword)) {
          errors.existingAdminPassword = 'Password must contain at least 1 specific symbol (e.g. !@#$%^&*).';
        }

        if (!formData.existingAdminConfirmPassword) {
          errors.existingAdminConfirmPassword = 'Confirm password is required.';
        } else if (formData.existingAdminPassword !== formData.existingAdminConfirmPassword) {
          errors.existingAdminConfirmPassword = 'Passwords do not match.';
        }
      } else if (formData.existingAdminConfirmPassword) {
        errors.existingAdminPassword = 'Password is required when confirming password.';
      }
    } else {
      if (!formData.newAdminName?.trim()) {
        errors.newAdminName = 'Administrator name is required.';
      }
      if (!formData.newAdminEmail?.trim()) {
        errors.newAdminEmail = 'Administrator email is required.';
      } else if (!emailRegex.test(formData.newAdminEmail.trim())) {
        errors.newAdminEmail = 'Please enter a valid administrator email.';
      }

      if (!formData.newAdminPassword) {
        errors.newAdminPassword = 'Password is required.';
      } else if (formData.newAdminPassword.length < 8) {
        errors.newAdminPassword = 'Password must be at least 8 characters long.';
      } else if (!/[A-Z]/.test(formData.newAdminPassword)) {
        errors.newAdminPassword = 'Password must contain at least 1 uppercase letter.';
      } else if (!/[^A-Za-z0-9]/.test(formData.newAdminPassword)) {
        errors.newAdminPassword = 'Password must contain at least 1 specific symbol (e.g. !@#$%^&*).';
      }

      if (!formData.newAdminConfirmPassword) {
        errors.newAdminConfirmPassword = 'Confirm password is required.';
      } else if (formData.newAdminPassword !== formData.newAdminConfirmPassword) {
        errors.newAdminConfirmPassword = 'Passwords do not match.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validation for Edit Form
  const validateEditForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.name?.trim()) {
      errors.name = 'Department name is required.';
    }
    if (!formData.code?.trim()) {
      errors.code = 'Department code is required.';
    }
    if (!formData.category?.trim()) {
      errors.category = 'Department category is required.';
    }
    if (!formData.officialEmail?.trim()) {
      errors.officialEmail = 'Official email is required.';
    } else if (!emailRegex.test(formData.officialEmail.trim())) {
      errors.officialEmail = 'Please enter a valid official email address.';
    }
    if (!formData.contactNumber?.trim()) {
      errors.contactNumber = 'Contact number is required.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create submission
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateCreateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        category: formData.category.trim(),
        officialEmail: formData.officialEmail.trim().toLowerCase(),
        contactNumber: formData.contactNumber.trim(),
      };

      if (formData.adminMode === 'EXISTING') {
        payload.adminId = formData.adminId;
        if (formData.existingAdminPassword) {
          payload.adminPassword = formData.existingAdminPassword;
          payload.adminConfirmPassword = formData.existingAdminConfirmPassword;
        }
      } else {
        payload.newAdmin = {
          fullName: formData.newAdminName.trim(),
          email: formData.newAdminEmail.trim().toLowerCase(),
          password: formData.newAdminPassword,
          confirmPassword: formData.newAdminConfirmPassword,
        };
      }

      const res = await departmentApi.createDepartment(payload);
      const resData = res?.data || res;
      setIsCreateOpen(false);

      if (resData?.createdAdminNotice) {
        const candidateObj = adminCandidates.find((c) => (c.id || c._id) === formData.adminId);
        setCreatedAdminNotice({
          fullName: resData.createdAdminNotice.admin?.fullName || (formData.adminMode === 'EXISTING' ? candidateObj?.fullName : formData.newAdminName),
          email: resData.createdAdminNotice.admin?.email || (formData.adminMode === 'EXISTING' ? candidateObj?.email : formData.newAdminEmail),
          departmentName: formData.name.trim(),
          temporaryPassword: resData.createdAdminNotice.temporaryPassword || formData.existingAdminPassword || formData.newAdminPassword,
          confirmationOtp: resData.createdAdminNotice.confirmationOtp,
        });
      } else {
        showToast(`Department "${formData.name.trim()}" (${formData.code.trim().toUpperCase()}) created successfully!`);
      }

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
    if (!validateEditForm()) return;

    setIsSubmitting(true);
    try {
      const deptId = editingDept.id || editingDept._id;
      await departmentApi.updateDepartment(deptId, {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        category: formData.category.trim(),
        officialEmail: formData.officialEmail.trim().toLowerCase(),
        contactNumber: formData.contactNumber.trim(),
        adminId: formData.adminId || null,
        isActive: formData.isActive,
      });

      showToast(`Department "${formData.name.trim()}" updated successfully!`);
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

  // Filter departments by search & status
  const filteredDepartments = departments.filter((dept) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && dept.isActive) ||
      (statusFilter === 'INACTIVE' && !dept.isActive);

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (dept.name && dept.name.toLowerCase().includes(q)) ||
      (dept.code && dept.code.toLowerCase().includes(q)) ||
      (dept.category && dept.category.toLowerCase().includes(q)) ||
      (dept.officialEmail && dept.officialEmail.toLowerCase().includes(q)) ||
      (dept.description && dept.description.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="admin-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast-notification toast-${toastMessage.type}`} role="status">
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Department Management</h1>
          <p className="admin-page-subtitle">
            Manage civic departments, codes, workloads, and administrative ownership across Pune Municipal Corporation.
          </p>
        </div>

        {/* Create Button with single plus sign */}
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
          <span>Create Department</span>
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
            placeholder="Search departments by name, code, category, or email..."
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-1">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Create First Department</span>
            </button>
          </div>
        ) : (
          <table className="admin-data-table" aria-label="Departments Directory">
            <thead>
              <tr>
                <th scope="col">Department & Code</th>
                <th scope="col">Category</th>
                <th scope="col">Official Contact</th>
                <th scope="col">Assigned Admin</th>
                <th scope="col">Complaints</th>
                <th scope="col">Resolution</th>
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
                        <div className="d-flex align-center gap-2">
                          <span className="font-semibold text-main">{dept.name}</span>
                          <span className="dept-code-pill font-mono">{dept.code || 'DEPT'}</span>
                        </div>
                        {dept.description && (
                          <span className="dept-table-desc truncate max-w-xs">{dept.description}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="category-tag text-xs">{dept.category || 'General'}</span>
                    </td>
                    <td>
                      <div className="dept-table-contact text-xs">
                        <span className="text-muted">✉️ {dept.officialEmail || 'N/A'}</span>
                        <span className="text-muted">📞 {dept.contactNumber || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      {dept.admin ? (
                        <div className="dept-admin-brief text-xs">
                          <span className="font-semibold text-main">{dept.admin.fullName}</span>
                          <span className="text-muted">{dept.admin.email}</span>
                        </div>
                      ) : (
                        <span className="admin-count-badge">
                          {dept.adminCount ?? 0} {dept.adminCount === 1 ? 'Admin' : 'Admins'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="dept-table-complaints">
                        <span className="font-semibold">{total}</span>
                        <span className="text-muted text-xs">({resolved} res.)</span>
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
          <div className="admin-modal-content max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Administrative Registry</span>
                <h3 id="create-dept-title" className="admin-modal-title">Create Civic Department</h3>
              </div>
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

            <form onSubmit={handleCreateSubmit} noValidate className="admin-modal-form">
              <div className="admin-modal-body">
                {formErrors.server && (
                  <div className="alert-banner alert-banner-error" role="alert">
                    <span>{formErrors.server}</span>
                  </div>
                )}

                {/* 1. Department Name */}
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
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        name,
                        code: prev.codeAutoTouched ? prev.code : name.replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase(),
                      }));
                    }}
                    disabled={isSubmitting}
                    required
                  />
                  {formErrors.name && <span className="field-error-text">{formErrors.name}</span>}
                </div>

                {/* 2. Department Code & 3. Department Category in a 2-column grid */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="dept-create-code" className="form-label">
                      Department Code <span className="required-star">*</span>
                    </label>
                    <input
                      id="dept-create-code"
                      type="text"
                      className={`form-input font-mono ${formErrors.code ? 'input-error' : ''}`}
                      placeholder="e.g. ROADS, DRAIN, ELEC"
                      value={formData.code}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          code: e.target.value.toUpperCase().replace(/\s+/g, '_'),
                          codeAutoTouched: true,
                        });
                      }}
                      disabled={isSubmitting}
                      maxLength={20}
                      required
                    />
                    <span className="form-help-text">Unique code identifier</span>
                    {formErrors.code && <span className="field-error-text">{formErrors.code}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="dept-create-category" className="form-label">
                      Department Category <span className="required-star">*</span>
                    </label>
                    <select
                      id="dept-create-category"
                      className={`form-select ${formErrors.category ? 'input-error' : ''}`}
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      disabled={isSubmitting}
                      required
                    >
                      {DEPARTMENT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value} disabled={c.disabled}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.category && <span className="field-error-text">{formErrors.category}</span>}
                  </div>
                </div>

                {/* 5. Official Email and Contact Number in a 2-column grid */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="dept-create-email" className="form-label">
                      Official Email <span className="required-star">*</span>
                    </label>
                    <input
                      id="dept-create-email"
                      type="email"
                      className={`form-input ${formErrors.officialEmail ? 'input-error' : ''}`}
                      placeholder="e.g. roads.dept@pmc.gov.in"
                      value={formData.officialEmail}
                      onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                      disabled={isSubmitting}
                      required
                    />
                    {formErrors.officialEmail && <span className="field-error-text">{formErrors.officialEmail}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="dept-create-phone" className="form-label">
                      Official Contact Number <span className="required-star">*</span>
                    </label>
                    <input
                      id="dept-create-phone"
                      type="tel"
                      className={`form-input ${formErrors.contactNumber ? 'input-error' : ''}`}
                      placeholder="e.g. +91 20 2550 1234"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                      disabled={isSubmitting}
                      required
                    />
                    {formErrors.contactNumber && <span className="field-error-text">{formErrors.contactNumber}</span>}
                  </div>
                </div>

                {/* 4. Department Admin */}
                <div className="form-group dept-admin-picker-box">
                  <label className="form-label d-flex justify-between align-center">
                    <span>Department Admin <span className="required-star">*</span></span>
                    <span className="text-xs text-muted">Assign or provision department administrator</span>
                  </label>

                  {/* Admin mode selection tabs */}
                  <div className="admin-mode-toggle-group">
                    <button
                      type="button"
                      className={`admin-mode-pill ${formData.adminMode === 'NEW' ? 'active' : ''}`}
                      onClick={() => {
                        setFormData({ ...formData, adminMode: 'NEW' });
                        setTimeout(() => {
                          const input = document.getElementById('new-admin-name');
                          if (input) {
                            input.focus();
                            input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          }
                        }, 50);
                      }}
                      disabled={isSubmitting}
                    >
                      + Create New Administrator
                    </button>
                    <button
                      type="button"
                      className={`admin-mode-pill ${formData.adminMode === 'EXISTING' ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, adminMode: 'EXISTING' })}
                      disabled={isSubmitting}
                    >
                      Select Existing User / Admin
                    </button>
                  </div>

                  {formData.adminMode === 'EXISTING' ? (
                    <div className="new-admin-inputs-box mt-2">
                      <div className="form-group mb-0">
                        <label htmlFor="dept-create-admin-id" className="form-sublabel">
                          Select Registered User / Admin <span className="required-star">*</span>
                        </label>
                        <select
                          id="dept-create-admin-id"
                          className={`form-select ${formErrors.adminId ? 'input-error' : ''}`}
                          value={formData.adminId}
                          onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
                          disabled={isSubmitting}
                        >
                          <option value="">-- Choose an existing administrator / user --</option>
                          {adminCandidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.fullName} ({c.email}) — [{c.role === 'DEPARTMENT_ADMIN' ? 'Dept Admin' : c.role}] {c.department ? `(Assigned: ${c.department.code || c.department.name})` : '(Unassigned)'}
                            </option>
                          ))}
                        </select>
                        {formErrors.adminId && <span className="field-error-text">{formErrors.adminId}</span>}
                        {adminCandidates.length === 0 && (
                          <p className="text-xs text-muted mt-1">
                            No existing admins found. Switch to "Create New Administrator" to provision one immediately.
                          </p>
                        )}
                      </div>

                      {/* Password & Confirm Password Inputs for Existing User */}
                      <div className="form-grid-2 mt-2">
                        <div className="form-group mb-0">
                          <label htmlFor="existing-admin-password" className="form-sublabel">
                            Admin Password
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              id="existing-admin-password"
                              type={showExistingAdminPassword ? 'text' : 'password'}
                              className={`form-input ${formErrors.existingAdminPassword ? 'input-error' : ''}`}
                              placeholder="e.g. PuneAdmin@2026"
                              value={formData.existingAdminPassword}
                              onChange={(e) => setFormData({ ...formData, existingAdminPassword: e.target.value })}
                              disabled={isSubmitting}
                              style={{ paddingRight: '40px' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowExistingAdminPassword(!showExistingAdminPassword)}
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
                              aria-label={showExistingAdminPassword ? 'Hide password' : 'Show password'}
                            >
                              {showExistingAdminPassword ? '🙈' : '👁️'}
                            </button>
                          </div>
                          {formErrors.existingAdminPassword && <span className="field-error-text">{formErrors.existingAdminPassword}</span>}
                        </div>

                        <div className="form-group mb-0">
                          <label htmlFor="existing-admin-confirm-password" className="form-sublabel">
                            Confirm Password
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              id="existing-admin-confirm-password"
                              type={showExistingAdminConfirmPassword ? 'text' : 'password'}
                              className={`form-input ${formErrors.existingAdminConfirmPassword ? 'input-error' : ''}`}
                              placeholder="Re-enter password"
                              value={formData.existingAdminConfirmPassword}
                              onChange={(e) => setFormData({ ...formData, existingAdminConfirmPassword: e.target.value })}
                              disabled={isSubmitting}
                              style={{ paddingRight: '40px' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowExistingAdminConfirmPassword(!showExistingAdminConfirmPassword)}
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
                              aria-label={showExistingAdminConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              {showExistingAdminConfirmPassword ? '🙈' : '👁️'}
                            </button>
                          </div>
                          {formErrors.existingAdminConfirmPassword && <span className="field-error-text">{formErrors.existingAdminConfirmPassword}</span>}
                        </div>
                      </div>

                      {/* Password Requirements Indicator */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: formData.existingAdminPassword?.length >= 8 ? '#DEF7EC' : '#F3F4F6',
                            color: formData.existingAdminPassword?.length >= 8 ? '#03543F' : '#6B7280',
                            fontWeight: 600,
                          }}
                        >
                          {formData.existingAdminPassword?.length >= 8 ? '✓' : '•'} 8+ Characters
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: /[A-Z]/.test(formData.existingAdminPassword || '') ? '#DEF7EC' : '#F3F4F6',
                            color: /[A-Z]/.test(formData.existingAdminPassword || '') ? '#03543F' : '#6B7280',
                            fontWeight: 600,
                          }}
                        >
                          {/[A-Z]/.test(formData.existingAdminPassword || '') ? '✓' : '•'} 1 Uppercase Letter
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: /[^A-Za-z0-9]/.test(formData.existingAdminPassword || '') ? '#DEF7EC' : '#F3F4F6',
                            color: /[^A-Za-z0-9]/.test(formData.existingAdminPassword || '') ? '#03543F' : '#6B7280',
                            fontWeight: 600,
                          }}
                        >
                          {/[^A-Za-z0-9]/.test(formData.existingAdminPassword || '') ? '✓' : '•'} 1 Specific Symbol
                        </span>
                        {formData.existingAdminConfirmPassword && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: formData.existingAdminPassword === formData.existingAdminConfirmPassword ? '#DEF7EC' : '#FDE8E8',
                              color: formData.existingAdminPassword === formData.existingAdminConfirmPassword ? '#03543F' : '#9B1C1C',
                              fontWeight: 600,
                            }}
                          >
                            {formData.existingAdminPassword === formData.existingAdminConfirmPassword ? '✓ Passwords Match' : '✕ Passwords Mismatch'}
                          </span>
                        )}
                      </div>

                      <div className="demo-notice-chip mt-2">
                        <span>ℹ️ Department administrator will be provisioned/updated with this password & assigned the <code>DEPARTMENT_ADMIN</code> role.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="new-admin-inputs-box mt-2">
                      <div className="form-grid-2">
                        <div className="form-group mb-0">
                          <label htmlFor="new-admin-name" className="form-sublabel">
                            Admin Full Name <span className="required-star">*</span>
                          </label>
                          <input
                            id="new-admin-name"
                            type="text"
                            className={`form-input ${formErrors.newAdminName ? 'input-error' : ''}`}
                            placeholder="e.g. Ramesh Kulkarni"
                            value={formData.newAdminName}
                            onChange={(e) => setFormData({ ...formData, newAdminName: e.target.value })}
                            disabled={isSubmitting}
                          />
                          {formErrors.newAdminName && <span className="field-error-text">{formErrors.newAdminName}</span>}
                        </div>
                        <div className="form-group mb-0">
                          <label htmlFor="new-admin-email" className="form-sublabel">
                            Admin Email <span className="required-star">*</span>
                          </label>
                          <input
                            id="new-admin-email"
                            type="email"
                            className={`form-input ${formErrors.newAdminEmail ? 'input-error' : ''}`}
                            placeholder="e.g. ramesh.kulkarni@pmc.gov.in"
                            value={formData.newAdminEmail}
                            onChange={(e) => setFormData({ ...formData, newAdminEmail: e.target.value })}
                            disabled={isSubmitting}
                          />
                          {formErrors.newAdminEmail && <span className="field-error-text">{formErrors.newAdminEmail}</span>}
                        </div>
                      </div>

                      {/* Password & Confirm Password Inputs */}
                      <div className="form-grid-2 mt-2">
                        <div className="form-group mb-0">
                          <label htmlFor="new-admin-password" className="form-sublabel">
                            Admin Password <span className="required-star">*</span>
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              id="new-admin-password"
                              type={showNewAdminPassword ? 'text' : 'password'}
                              className={`form-input ${formErrors.newAdminPassword ? 'input-error' : ''}`}
                              placeholder="e.g. PuneAdmin@2026"
                              value={formData.newAdminPassword}
                              onChange={(e) => setFormData({ ...formData, newAdminPassword: e.target.value })}
                              disabled={isSubmitting}
                              style={{ paddingRight: '40px' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
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
                              aria-label={showNewAdminPassword ? 'Hide password' : 'Show password'}
                            >
                              {showNewAdminPassword ? '🙈' : '👁️'}
                            </button>
                          </div>
                          {formErrors.newAdminPassword && <span className="field-error-text">{formErrors.newAdminPassword}</span>}
                        </div>

                        <div className="form-group mb-0">
                          <label htmlFor="new-admin-confirm-password" className="form-sublabel">
                            Confirm Password <span className="required-star">*</span>
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              id="new-admin-confirm-password"
                              type={showNewAdminConfirmPassword ? 'text' : 'password'}
                              className={`form-input ${formErrors.newAdminConfirmPassword ? 'input-error' : ''}`}
                              placeholder="Re-enter password"
                              value={formData.newAdminConfirmPassword}
                              onChange={(e) => setFormData({ ...formData, newAdminConfirmPassword: e.target.value })}
                              disabled={isSubmitting}
                              style={{ paddingRight: '40px' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewAdminConfirmPassword(!showNewAdminConfirmPassword)}
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
                              aria-label={showNewAdminConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              {showNewAdminConfirmPassword ? '🙈' : '👁️'}
                            </button>
                          </div>
                          {formErrors.newAdminConfirmPassword && <span className="field-error-text">{formErrors.newAdminConfirmPassword}</span>}
                        </div>
                      </div>

                      {/* Password Requirements Indicator */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: formData.newAdminPassword.length >= 8 ? '#DEF7EC' : '#F3F4F6',
                            color: formData.newAdminPassword.length >= 8 ? '#03543F' : '#6B7280',
                            fontWeight: 600,
                          }}
                        >
                          {formData.newAdminPassword.length >= 8 ? '✓' : '•'} 8+ Characters
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: /[A-Z]/.test(formData.newAdminPassword) ? '#DEF7EC' : '#F3F4F6',
                            color: /[A-Z]/.test(formData.newAdminPassword) ? '#03543F' : '#6B7280',
                            fontWeight: 600,
                          }}
                        >
                          {/[A-Z]/.test(formData.newAdminPassword) ? '✓' : '•'} 1 Uppercase Letter
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: /[^A-Za-z0-9]/.test(formData.newAdminPassword) ? '#DEF7EC' : '#F3F4F6',
                            color: /[^A-Za-z0-9]/.test(formData.newAdminPassword) ? '#03543F' : '#6B7280',
                            fontWeight: 600,
                          }}
                        >
                          {/[^A-Za-z0-9]/.test(formData.newAdminPassword) ? '✓' : '•'} 1 Specific Symbol
                        </span>
                        {formData.newAdminConfirmPassword && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: formData.newAdminPassword === formData.newAdminConfirmPassword ? '#DEF7EC' : '#FDE8E8',
                              color: formData.newAdminPassword === formData.newAdminConfirmPassword ? '#03543F' : '#9B1C1C',
                              fontWeight: 600,
                            }}
                          >
                            {formData.newAdminPassword === formData.newAdminConfirmPassword ? '✓ Passwords Match' : '✕ Passwords Mismatch'}
                          </span>
                        )}
                      </div>

                      <div className="demo-notice-chip mt-2">
                        <span>ℹ️ Department administrator will be provisioned with this password & assigned the <code>DEPARTMENT_ADMIN</code> role.</span>
                      </div>
                    </div>
                  )}
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
          <div className="admin-modal-content max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Department Configuration</span>
                <h3 id="edit-dept-title" className="admin-modal-title">Edit Department: {editingDept.name}</h3>
              </div>
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

            <form onSubmit={handleEditSubmit} noValidate className="admin-modal-form">
              <div className="admin-modal-body">
                {formErrors.server && (
                  <div className="alert-banner alert-banner-error" role="alert">
                    <span>{formErrors.server}</span>
                  </div>
                )}

                {/* Department Name */}
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

                {/* Department Code & Category */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="dept-edit-code" className="form-label">
                      Department Code <span className="required-star">*</span>
                    </label>
                    <input
                      id="dept-edit-code"
                      type="text"
                      className={`form-input font-mono ${formErrors.code ? 'input-error' : ''}`}
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                      disabled={isSubmitting}
                      maxLength={20}
                      required
                    />
                    {formErrors.code && <span className="field-error-text">{formErrors.code}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="dept-edit-category" className="form-label">
                      Department Category <span className="required-star">*</span>
                    </label>
                    <select
                      id="dept-edit-category"
                      className={`form-select ${formErrors.category ? 'input-error' : ''}`}
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      disabled={isSubmitting}
                      required
                    >
                      {DEPARTMENT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value} disabled={c.disabled}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.category && <span className="field-error-text">{formErrors.category}</span>}
                  </div>
                </div>

                {/* Official Email & Contact Number */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="dept-edit-email" className="form-label">
                      Official Email <span className="required-star">*</span>
                    </label>
                    <input
                      id="dept-edit-email"
                      type="email"
                      className={`form-input ${formErrors.officialEmail ? 'input-error' : ''}`}
                      value={formData.officialEmail}
                      onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                      disabled={isSubmitting}
                      required
                    />
                    {formErrors.officialEmail && <span className="field-error-text">{formErrors.officialEmail}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="dept-edit-phone" className="form-label">
                      Official Contact Number <span className="required-star">*</span>
                    </label>
                    <input
                      id="dept-edit-phone"
                      type="tel"
                      className={`form-input ${formErrors.contactNumber ? 'input-error' : ''}`}
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                      disabled={isSubmitting}
                      required
                    />
                    {formErrors.contactNumber && <span className="field-error-text">{formErrors.contactNumber}</span>}
                  </div>
                </div>

                {/* Department Admin Assignment */}
                <div className="form-group">
                  <label htmlFor="dept-edit-admin-id" className="form-label">
                    Department Administrator
                  </label>
                  <select
                    id="dept-edit-admin-id"
                    className="form-select"
                    value={formData.adminId || ''}
                    onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
                    disabled={isSubmitting}
                  >
                    <option value="">-- No specific primary admin assigned --</option>
                    {adminCandidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.email}) — [{c.role}] {c.department ? `(Current: ${c.department.code || c.department.name})` : ''}
                      </option>
                    ))}
                  </select>
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
          <div className="admin-modal-content max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <div className="d-flex align-center gap-2 mb-1">
                  <span className="badge badge-primary font-mono">{viewingDept.code || 'DEPT'}</span>
                  <span className={`dept-status-badge ${viewingDept.isActive ? 'active' : 'inactive'}`}>
                    {viewingDept.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
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
                  <span className="detail-label">Category</span>
                  <span className="font-semibold">{viewingDept.category || 'General'}</span>
                </div>
                <div className="detail-meta-item">
                  <span className="detail-label">Department Code</span>
                  <span className="font-mono font-bold text-primary">{viewingDept.code || 'N/A'}</span>
                </div>
                <div className="detail-meta-item">
                  <span className="detail-label">Complaints</span>
                  <span className="font-semibold text-lg">{viewingDept.complaintCount ?? 0}</span>
                </div>
                <div className="detail-meta-item">
                  <span className="detail-label">Resolution Rate</span>
                  <span className="font-semibold text-lg text-success">{viewingDept.resolutionRate ?? 100}%</span>
                </div>
              </div>

              {/* Official Contact Info Box */}
              <div className="dept-view-contact-card mt-3">
                <div className="contact-card-title">Official Department Contacts</div>
                <div className="contact-card-row">
                  <span className="contact-card-icon">✉️</span>
                  <div>
                    <span className="contact-label">Official Email:</span>
                    <a href={`mailto:${viewingDept.officialEmail}`} className="contact-val font-mono">
                      {viewingDept.officialEmail || 'N/A'}
                    </a>
                  </div>
                </div>
                <div className="contact-card-row">
                  <span className="contact-card-icon">📞</span>
                  <div>
                    <span className="contact-label">Contact Number:</span>
                    <a href={`tel:${viewingDept.contactNumber}`} className="contact-val font-mono">
                      {viewingDept.contactNumber || 'N/A'}
                    </a>
                  </div>
                </div>
              </div>

              {/* Assigned Administrator */}
              <div className="detail-field mt-3">
                <span className="detail-label">Assigned Department Administrator</span>
                {viewingDept.admin ? (
                  <div className="dept-admin-pill-card">
                    <div className="dept-admin-avatar">
                      {viewingDept.admin.fullName?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div className="dept-admin-info">
                      <div className="dept-admin-name">{viewingDept.admin.fullName}</div>
                      <div className="dept-admin-email">{viewingDept.admin.email}</div>
                    </div>
                    <span className="badge badge-sm badge-success ml-auto">
                      {viewingDept.admin.role || 'DEPARTMENT_ADMIN'}
                    </span>
                  </div>
                ) : Array.isArray(viewingDept.admins) && viewingDept.admins.length > 0 ? (
                  <div className="dept-admin-pill-card">
                    <div className="dept-admin-avatar">
                      {viewingDept.admins[0].fullName?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div className="dept-admin-info">
                      <div className="dept-admin-name">{viewingDept.admins[0].fullName}</div>
                      <div className="dept-admin-email">{viewingDept.admins[0].email}</div>
                    </div>
                    <span className="badge badge-sm badge-success ml-auto">
                      {viewingDept.admins[0].role || 'DEPARTMENT_ADMIN'}
                    </span>
                  </div>
                ) : (
                  <div className="info-box p-3 text-muted text-sm">
                    No administrator currently assigned. Click Edit to assign an admin.
                  </div>
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
                The department administrator account for <strong>{createdAdminNotice.fullName}</strong> has been created and bound to <strong>{createdAdminNotice.departmentName}</strong>.
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
                * Note: In production, the credentials are sent securely via official government email/SMS. This one-time display enables rapid local testing.
              </p>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCreatedAdminNotice(null)}
              >
                Acknowledge & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM STATUS TOGGLE DIALOG */}
      {deactivatingDept && (
        <div className="admin-modal-backdrop" onClick={() => setDeactivatingDept(null)} role="dialog" aria-modal="true" aria-labelledby="deactivate-dialog-title">
          <div className="admin-modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 id="deactivate-dialog-title" className="admin-modal-title">
                {deactivatingDept.isActive ? 'Deactivate Department?' : 'Activate Department?'}
              </h3>
            </div>
            <div className="admin-modal-body">
              <p className="text-sm">
                {deactivatingDept.isActive
                  ? `Are you sure you want to deactivate "${deactivatingDept.name}"? Citizens will no longer be able to select this department for new complaints.`
                  : `Are you sure you want to activate "${deactivatingDept.name}"? It will resume accepting incoming citizen grievances.`}
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
