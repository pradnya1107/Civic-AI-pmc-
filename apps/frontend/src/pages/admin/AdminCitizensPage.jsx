import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';

export const AdminCitizensPage = () => {
  const [citizens, setCitizens] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleToggleStatus = async (citizen) => {
    const isCurrentlyActive = (citizen.accountStatus || 'ACTIVE') === 'ACTIVE';
    const newStatus = isCurrentlyActive ? 'DISABLED' : 'ACTIVE';
    setTogglingId(citizen.id);
    try {
      await adminApi.updateCitizenStatus(citizen.id, { accountStatus: newStatus });
      setCitizens((prev) =>
        prev.map((c) => (c.id === citizen.id ? { ...c, accountStatus: newStatus } : c))
      );
      showToast(`Citizen account status updated to ${newStatus}.`);
    } catch (err) {
      showToast(err?.message || 'Failed to update citizen status.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const fetchCitizens = async (page = 1, searchQuery = search) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getCitizens({ page, limit: 20, search: searchQuery || undefined });
      const data = res?.data || res;
      setCitizens(data?.citizens || []);
      if (data?.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load registered citizens directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCitizens(1, search);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCitizens(1, search);
  };

  return (
    <div className="admin-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`admin-toast admin-toast-${toastMessage.type}`} role="alert" style={{ marginBottom: '1rem' }}>
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Citizen Directory & User Management</h1>
          <p className="admin-page-subtitle">
            Registered citizens, account verification status, and communication channels across Pune Municipal Corporation.
          </p>
        </div>

        <div className="admin-page-header-actions">
          <span className="total-records-count">
            Total Registered Citizens: <strong>{pagination.total}</strong>
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="admin-table-filters">
        <form onSubmit={handleSearchSubmit} className="admin-search-box flex-grow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            className="admin-filter-input"
            placeholder="Search citizens by name, email, or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search citizens"
          />
        </form>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => fetchCitizens(1, search)}>
          Search
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="alert-banner alert-banner-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => fetchCitizens(pagination.page, search)}>
            Retry
          </button>
        </div>
      )}

      {/* Citizens Table */}
      <div className="admin-table-container">
        {isLoading ? (
          <div className="admin-loading-table">
            <div className="spinner" />
            <p>Loading citizens directory...</p>
          </div>
        ) : citizens.length === 0 ? (
          <div className="admin-empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="7" r="4" />
              <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
            </svg>
            <h3>No citizens found</h3>
            <p>No citizens match your search query.</p>
          </div>
        ) : (
          <table className="admin-data-table" aria-label="Citizens Directory">
            <thead>
              <tr>
                <th scope="col">Citizen Name</th>
                <th scope="col">Email Verified</th>
                <th scope="col">Account Status</th>
                <th scope="col">Joined Date</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {citizens.map((c) => {
                const isAct = (c.accountStatus || 'ACTIVE') === 'ACTIVE';
                const createdStr = c.createdAt
                  ? new Date(c.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'N/A';

                return (
                  <tr key={c.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-cell-avatar">
                          {c.fullName?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <span className="font-semibold">{c.fullName}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`dept-status-badge ${c.emailVerified ? 'active' : 'inactive'}`}>
                        {c.emailVerified ? 'Verified' : 'Pending OTP'}
                      </span>
                    </td>
                    <td>
                      <span className={`dept-status-badge ${isAct ? 'active' : 'inactive'}`}>
                        {c.accountStatus || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="text-muted text-sm">{createdStr}</td>
                    <td>
                      <button
                        type="button"
                        className={`btn btn-xs ${isAct ? 'btn-outline' : 'btn-primary'}`}
                        onClick={() => handleToggleStatus(c)}
                        disabled={togglingId === c.id}
                        aria-label={`${isAct ? 'Deactivate' : 'Activate'} ${c.fullName}`}
                        style={isAct ? { borderColor: 'var(--color-danger, #ef4444)', color: 'var(--color-danger, #ef4444)' } : undefined}
                      >
                        {togglingId === c.id ? 'Updating...' : isAct ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="admin-pagination-bar">
          <span className="pagination-count-label">
            Page {pagination.page} of {pagination.pages} ({pagination.total} registered citizens)
          </span>

          <div className="pagination-buttons">
            <button
              type="button"
              className="btn btn-xs btn-outline"
              disabled={pagination.page <= 1}
              onClick={() => fetchCitizens(pagination.page - 1)}
            >
              &larr; Previous
            </button>
            <button
              type="button"
              className="btn btn-xs btn-outline"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchCitizens(pagination.page + 1)}
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCitizensPage;
