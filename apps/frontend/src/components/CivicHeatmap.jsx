import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { complaintApi } from '../services/api';
import { Link } from 'react-router-dom';

// Fix Leaflet default icon issues in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Category Icon SVGs
const getCategoryIconSvg = (category) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('pothole') || cat.includes('road')) {
    return `<path d="M4 19h16M4 15h16M4 11h16M4 7h16" stroke="white" stroke-width="2" stroke-linecap="round"/>`;
  }
  if (cat.includes('garbage') || cat.includes('waste')) {
    return `<path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="white" stroke-width="2" fill="none"/>`;
  }
  if (cat.includes('water') || cat.includes('drainage') || cat.includes('leak')) {
    return `<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke="white" stroke-width="2" fill="none"/>`;
  }
  if (cat.includes('light') || cat.includes('electric') || cat.includes('lamp')) {
    return `<circle cx="12" cy="12" r="5" stroke="white" stroke-width="2" fill="none"/><line x1="12" y1="1" x2="12" y2="4" stroke="white" stroke-width="2"/><line x1="12" y1="20" x2="12" y2="23" stroke="white" stroke-width="2"/>`;
  }
  return `<circle cx="12" cy="12" r="3" fill="white"/>`;
};

// Severity color palette
const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#10b981',
};

// Create custom colored SVG marker icon
const createMarkerIcon = (severity, category, isPulse = false) => {
  const color = SEVERITY_COLORS[severity] || '#3b82f6';
  const pulseHtml = (severity === 'CRITICAL' || isPulse) 
    ? `<span class="heatmap-pulse-ring" style="border-color: ${color}"></span>` 
    : '';

  const html = `
    <div class="heatmap-marker-wrap">
      ${pulseHtml}
      <div class="heatmap-marker-pin" style="background: ${color}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="heatmap-marker-icon">
          ${getCategoryIconSvg(category)}
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-heatmap-icon',
    html,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -34],
  });
};

export const CivicHeatmap = ({ isAdmin = false, height = '600px' }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const circlesLayerRef = useRef(null);

  const [points, setPoints] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDensityCircles, setShowDensityCircles] = useState(true);

  // Load points from API
  const loadHeatmapData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await complaintApi.getHeatmapData({
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
      });

      const rawPoints = res?.data?.points || res?.points || [];
      const normalized = (Array.isArray(rawPoints) ? rawPoints : []).map((pt, idx) => {
        const lat = Number(pt.lat ?? pt.location?.latitude ?? (18.5204 + (idx % 15) * 0.01 - 0.07));
        const lng = Number(pt.lng ?? pt.location?.longitude ?? (73.8567 + ((idx * 3) % 15) * 0.01 - 0.07));
        const severity = String(pt.severity || pt.priority || 'MEDIUM').toUpperCase();
        const status = String(pt.status || 'SUBMITTED').toUpperCase();
        const title = String(pt.title || 'Civic Issue');
        const category = String(pt.category || 'Other');
        const ward = String(pt.ward || pt.location?.ward || 'Pune Municipal Corporation');
        const id = String(pt.id || pt._id || `pt-${idx}`);
        return {
          ...pt,
          id,
          lat,
          lng,
          severity,
          status,
          title,
          category,
          ward,
        };
      });

      setPoints(normalized);

      // Compute summary metrics if backend doesn't provide them
      const summaryData = res?.data?.summary || {
        total: normalized.length,
        bySeverity: {
          CRITICAL: normalized.filter((p) => p.severity === 'CRITICAL').length,
          HIGH: normalized.filter((p) => p.severity === 'HIGH').length,
          MEDIUM: normalized.filter((p) => p.severity === 'MEDIUM').length,
          LOW: normalized.filter((p) => p.severity === 'LOW').length,
        },
      };
      setSummary(summaryData);
    } catch (err) {
      setError(err?.message || 'Failed to load civic heatmap data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHeatmapData();
  }, [categoryFilter, severityFilter]);

  // Initialize Map safely (immune to React 18/19 StrictMode double-mount)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapContainerRef.current && mapContainerRef.current._leaflet_id) {
      mapContainerRef.current._leaflet_id = null;
    }

    if (!mapInstanceRef.current && mapContainerRef.current) {
      try {
        // Pune Coordinates: 18.5204° N, 73.8567° E
        const map = L.map(mapContainerRef.current, {
          center: [18.5204, 73.8567],
          zoom: 12,
          scrollWheelZoom: true,
        });

        // OpenStreetMap standard tiles (Free, open-source, no API key required)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | PMC Smart City',
          maxZoom: 19,
        }).addTo(map);

        markersLayerRef.current = L.layerGroup().addTo(map);
        circlesLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
      } catch (err) {
        console.warn('Leaflet map initialization warning:', err);
      }
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // graceful cleanup ignore
        }
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current && mapContainerRef.current._leaflet_id) {
        mapContainerRef.current._leaflet_id = null;
      }
    };
  }, []);

  // Filtered Points
  const filteredPoints = useMemo(() => {
    return points.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesWard = (p.ward || '').toLowerCase().includes(q);
        const matchesTitle = (p.title || '').toLowerCase().includes(q);
        const matchesCat = (p.category || '').toLowerCase().includes(q);
        return matchesWard || matchesTitle || matchesCat;
      }
      return true;
    });
  }, [points, statusFilter, searchQuery]);

  // Update map markers when points or filter change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    try {
      markersLayerRef.current.clearLayers();
      if (circlesLayerRef.current) circlesLayerRef.current.clearLayers();

      filteredPoints.forEach((pt) => {
        if (!pt.lat || !pt.lng || isNaN(pt.lat) || isNaN(pt.lng)) return;

        const severity = (pt.severity || 'LOW').toUpperCase();
        const status = (pt.status || 'PENDING').toUpperCase();
        const marker = L.marker([pt.lat, pt.lng], {
          icon: createMarkerIcon(severity, pt.category),
          title: pt.title,
        });

        // Interactive popup
        const detailUrl = isAdmin ? `/admin/complaints/${pt.id}` : `/complaints/${pt.id}`;
        const imageTag = pt.imageUrl
          ? `<div class="popup-img-wrap"><img src="${pt.imageUrl}" alt="${pt.title}" class="popup-thumb" onerror="this.style.display='none'" /></div>`
          : '';

        const popupContent = `
          <div class="civic-popup-card">
            ${imageTag}
            <div class="popup-header">
              <span class="popup-severity-tag severity-${severity.toLowerCase()}">${severity}</span>
              <span class="popup-status-tag status-${status.toLowerCase().replace(/_/g, '-')}">${status.replace(/_/g, ' ')}</span>
            </div>
            <h4 class="popup-title">${pt.title || 'Civic Issue'}</h4>
            <p class="popup-meta">
              <strong>Ward:</strong> ${pt.ward || 'Pune Central'} | <strong>Cat:</strong> ${pt.category || 'General'}
            </p>
            <div class="popup-stats">
              <span class="popup-stat-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                ${pt.supportCount || 1} Citizens Impacted
              </span>
              ${pt.aiScore ? `<span class="popup-stat-item ai-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> AI Score: ${pt.aiScore}</span>` : ''}
            </div>
            <div class="popup-actions">
              <a href="${detailUrl}" class="popup-link-btn">View Full Grievance &rarr;</a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 300, minWidth: 260 });
        markersLayerRef.current.addLayer(marker);

        // Add density circles if enabled for high/critical issues
        if (showDensityCircles && circlesLayerRef.current && (severity === 'CRITICAL' || severity === 'HIGH')) {
          const radius = severity === 'CRITICAL' ? 350 : 200;
          const color = SEVERITY_COLORS[severity] || '#ef4444';
          const circle = L.circle([pt.lat, pt.lng], {
            color: color,
            fillColor: color,
            fillOpacity: 0.12,
            weight: 1.5,
            radius: radius,
          });
          circlesLayerRef.current.addLayer(circle);
        }
      });

      // If points exist and map is active, fit bounds if more than 1 point
      if (filteredPoints.length > 1 && mapInstanceRef.current) {
        const bounds = L.latLngBounds(filteredPoints.map((p) => [p.lat, p.lng]));
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      }
    } catch (err) {
      console.warn('Error updating heatmap markers:', err);
    }
  }, [filteredPoints, showDensityCircles, isAdmin]);

  return (
    <div className="civic-heatmap-wrapper">
      {/* Heatmap Control & Filter Header */}
      <div className="heatmap-controls-bar">
        <div className="heatmap-controls-row">
          <div className="heatmap-control-group">
            <label htmlFor="heatmap-cat-filter">Category</label>
            <select
              id="heatmap-cat-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-select form-select-sm"
            >
              <option value="ALL">All Categories</option>
              <option value="Roads & Potholes">Roads & Potholes</option>
              <option value="Solid Waste Management">Garbage & Waste</option>
              <option value="Water Supply & Drainage">Water & Drainage</option>
              <option value="Street Lighting">Streetlights</option>
              <option value="Traffic & Encroachment">Traffic & Encroachment</option>
            </select>
          </div>

          <div className="heatmap-control-group">
            <label htmlFor="heatmap-sev-filter">Severity</label>
            <select
              id="heatmap-sev-filter"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="form-select form-select-sm"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical (12h SLA)</option>
              <option value="HIGH">High (24h SLA)</option>
              <option value="MEDIUM">Medium (48h SLA)</option>
              <option value="LOW">Low (72h SLA)</option>
            </select>
          </div>

          <div className="heatmap-control-group">
            <label htmlFor="heatmap-status-filter">Status</label>
            <select
              id="heatmap-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select form-select-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <div className="heatmap-control-group flex-1">
            <label htmlFor="heatmap-search">Search Ward / Issue</label>
            <input
              id="heatmap-search"
              type="text"
              placeholder="Filter by Shivajinagar, Kothrud, pothole..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input form-input-sm"
            />
          </div>

          <div className="heatmap-control-actions">
            <button
              type="button"
              className={`btn btn-sm ${showDensityCircles ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setShowDensityCircles(!showDensityCircles)}
              title="Toggle severity impact circles"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              {showDensityCircles ? 'Impact Radii: ON' : 'Impact Radii: OFF'}
            </button>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={loadHeatmapData}
              disabled={loading}
              title="Refresh Heatmap Live Data"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'spin' : ''}>
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Live Metrics Summary Bar */}
        {summary && (
          <div className="heatmap-summary-strip">
            <div className="summary-stat-pill">
              <span className="summary-pill-label">Total Geo-Grievances:</span>
              <strong className="summary-pill-value">{summary.total}</strong>
            </div>
            <div className="summary-stat-pill pill-critical">
              <span className="summary-pill-dot dot-critical" />
              <span className="summary-pill-label">Critical:</span>
              <strong className="summary-pill-value">{summary.bySeverity?.CRITICAL || 0}</strong>
            </div>
            <div className="summary-stat-pill pill-high">
              <span className="summary-pill-dot dot-high" />
              <span className="summary-pill-label">High:</span>
              <strong className="summary-pill-value">{summary.bySeverity?.HIGH || 0}</strong>
            </div>
            <div className="summary-stat-pill pill-medium">
              <span className="summary-pill-dot dot-medium" />
              <span className="summary-pill-label">Medium:</span>
              <strong className="summary-pill-value">{summary.bySeverity?.MEDIUM || 0}</strong>
            </div>
            <div className="summary-stat-pill pill-low">
              <span className="summary-pill-dot dot-low" />
              <span className="summary-pill-label">Low:</span>
              <strong className="summary-pill-value">{summary.bySeverity?.LOW || 0}</strong>
            </div>
            <div className="summary-stat-pill ml-auto">
              <span className="summary-pill-label">Visible on Map:</span>
              <strong className="summary-pill-value">{filteredPoints.length}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="heatmap-map-container" style={{ height }}>
        {loading && (
          <div className="heatmap-loading-overlay">
            <div className="spinner" />
            <p>Plotting Pune Civic Coordinates & AI Severities...</p>
          </div>
        )}
        {error && (
          <div className="heatmap-error-overlay">
            <p className="error-text">{error}</p>
            <button type="button" className="btn btn-sm btn-primary" onClick={loadHeatmapData}>
              Try Again
            </button>
          </div>
        )}
        <div ref={mapContainerRef} className="leaflet-map-element" style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Map Legend */}
      <div className="heatmap-legend">
        <div className="legend-title">PMC Severity SLA Index:</div>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-dot" style={{ background: SEVERITY_COLORS.CRITICAL }} />
            <span>Critical (&lt; 12h SLA)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: SEVERITY_COLORS.HIGH }} />
            <span>High (&lt; 24h SLA)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: SEVERITY_COLORS.MEDIUM }} />
            <span>Medium (&lt; 48h SLA)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: SEVERITY_COLORS.LOW }} />
            <span>Low (&lt; 72h SLA)</span>
          </div>
        </div>
        <div className="legend-note">
          Click any pinpoint for community impact count & quick grievance access.
        </div>
      </div>
    </div>
  );
};

export default CivicHeatmap;
