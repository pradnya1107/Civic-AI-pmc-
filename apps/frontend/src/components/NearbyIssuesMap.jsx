import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { complaintApi } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { PMC_CATEGORIES } from '../pages/ComplaintFormPage';
import { CIVIC_MAP_LEGEND, getCategoryIconSvg } from './CivicHeatmap';

// Default Pune coordinates
const PUNE_CENTER = [18.5204, 73.8567];

// Fix Leaflet's default icon assets
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Category color badges
const CATEGORY_COLORS = {
  'Roads & Potholes': '#ef4444',
  'Solid Waste & Garbage': '#f59e0b',
  'Drainage & Sewerage': '#0284c7',
  'Street Lighting & Electrical': '#eab308',
  'Water Supply': '#06b6d4',
  'Health & Sanitation': '#10b981',
  'Garden & Tree Trimming': '#22c55e',
  'Encroachment': '#8b5cf6',
  'Traffic & Signage': '#ec4899',
  'Other Civic Grievance': '#64748b',
};

export const NearbyIssuesMap = ({ onSelectComplaint }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Fetch complaints for map
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await complaintApi.getComplaints({ limit: 100 });
        const list = res?.data?.complaints || res?.complaints || res?.data || [];
        if (Array.isArray(list) && isMounted) {
          // Never invent or fabricate fake coordinates: display only genuine grievances with validated PMC coordinates
          const genuineWithCoords = list
            .filter((c) => {
              const lat = Number(c.location?.latitude);
              const lng = Number(c.location?.longitude);
              return (
                !isNaN(lat) &&
                !isNaN(lng) &&
                lat >= 18.30 &&
                lat <= 18.70 &&
                lng >= 73.65 &&
                lng <= 74.05
              );
            })
            .map((c) => ({
              ...c,
              _computedLat: Number(c.location.latitude),
              _computedLng: Number(c.location.longitude),
            }));
          setComplaints(genuineWithCoords);
        }
      } catch (err) {
        if (isMounted) setMapError('Unable to load nearby complaints. Please check connection.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      try {
        const map = L.map(mapContainerRef.current, {
          center: PUNE_CENTER,
          zoom: 12,
          scrollWheelZoom: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors | PMC CivicAI',
          maxZoom: 19,
        }).addTo(map);

        markersLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
      } catch (err) {
        setMapError('Error initializing interactive map.');
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when complaints or filters change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const filtered = complaints.filter((c) => {
      const matchCat = !selectedCategory || c.category === selectedCategory;
      const matchStatus = !selectedStatus || c.status === selectedStatus;
      return matchCat && matchStatus;
    });

    filtered.forEach((complaint) => {
      const lat = complaint._computedLat;
      const lng = complaint._computedLng;
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      const color = CATEGORY_COLORS[complaint.category] || '#0D9488';
      const iconSvg = getCategoryIconSvg(complaint.category);

      // Custom pulsing SVG marker matching map legend
      const customIcon = L.divIcon({
        className: 'custom-civic-marker',
        html: `
          <div style="
            background-color: ${color};
            width: 26px;
            height: 26px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s ease;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              ${iconSvg}
            </svg>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      marker.on('click', () => {
        setActiveComplaint(complaint);
        if (onSelectComplaint) onSelectComplaint(complaint);
      });

      markersLayerRef.current.addLayer(marker);
    });
  }, [complaints, selectedCategory, selectedStatus, onSelectComplaint]);

  // Request user location
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const { latitude, longitude } = pos.coords;
        setUserLocation({ latitude, longitude });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 14, { duration: 1.2 });

          // Add user pulse marker
          const userMarkerIcon = L.divIcon({
            className: 'user-geo-marker',
            html: `
              <div style="
                background: #0D9488;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                border: 3px solid #ffffff;
                box-shadow: 0 0 12px #0D9488;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                📍
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          L.marker([latitude, longitude], { icon: userMarkerIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup('<strong>You are here</strong><br/>Nearby PMC Civic Grievances')
            .openPopup();
        }
      },
      () => {
        setLocatingUser(false);
        alert('Location access was denied. Showing Pune Municipal Corporation central view.');
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  };

  return (
    <div className="nearby-map-card">
      <div className="nearby-map-header">
        <div>
          <h2 className="nearby-map-title">Nearby Civic Issues & Ward Map</h2>
          <p className="nearby-map-subtitle">
            Interactive GIS map of citizen-reported grievances with live department assignment and severity markers.
          </p>
        </div>

        {/* Filters & Geolocation Button */}
        <div className="nearby-map-controls">
          <select
            className="form-select form-select-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter Map by Category"
          >
            <option value="">All Categories</option>
            {PMC_CATEGORIES.filter((c) => c.value).map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.value}
              </option>
            ))}
          </select>

          <select
            className="form-select form-select-sm"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter Map by Status"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleLocateMe}
            disabled={locatingUser}
            title="Locate my position on map"
          >
            {locatingUser ? (
              <span className="spinner spinner-xs" aria-hidden="true" />
            ) : (
              '📍 My Location'
            )}
          </button>
        </div>
      </div>

      {mapError && (
        <div className="alert-banner alert-banner--error m-2">{mapError}</div>
      )}

      {/* Map Body and Split Detail Panel */}
      <div className="nearby-map-layout">
        <div
          ref={mapContainerRef}
          className="nearby-map-canvas"
          style={{ height: '420px', width: '100%', position: 'relative' }}
          role="region"
          aria-label="Pune Interactive Civic Map"
        />

        {/* Short Map Legend Table in Bottom Right - same as Explore Map */}
        {!activeComplaint && (
          <div className="heatmap-compact-legend" aria-label="Map Legend">
            <div className="compact-legend-header">
              <span className="compact-legend-title">LEGEND</span>
            </div>
            <table className="compact-legend-table">
              <thead>
                <tr>
                  <th className="th-issue">Issue</th>
                  <th className="th-symbol">Symbol</th>
                </tr>
              </thead>
              <tbody>
                {CIVIC_MAP_LEGEND.map((item) => (
                  <tr key={item.issue} className="compact-legend-row">
                    <td className="td-issue">
                      <span className="issue-text">{item.issue}</span>
                    </td>
                    <td className="td-symbol">
                      <div className="symbol-cell-content" title={`${item.issue} map symbol`}>
                        <span className="legend-mini-pin" style={{ background: item.color }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="legend-pin-svg">
                            {item.svg}
                          </svg>
                        </span>
                        <span className="legend-emoji" aria-hidden="true">{item.emoji}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Severity Pin Color Sub-legend */}
            <div className="compact-legend-footer">
              <div className="legend-footer-title">Severity Pin Color (Working Days SLA):</div>
              <div className="legend-footer-dots">
                <span className="legend-dot-pill" title="Critical (24x7 / 1 Working Day SLA)">
                  <span className="dot dot-crit" /> 1 Day
                </span>
                <span className="legend-dot-pill" title="High (2 Working Days SLA)">
                  <span className="dot dot-high" /> 2 Days
                </span>
                <span className="legend-dot-pill" title="Medium (4 Working Days SLA)">
                  <span className="dot dot-med" /> 4 Days
                </span>
                <span className="legend-dot-pill" title="Low (7 Working Days SLA)">
                  <span className="dot dot-low" /> 7 Days
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Selected Complaint Detail Popover */}
        {activeComplaint && (
          <aside className="nearby-map-detail-panel" aria-label="Selected Issue Details">
            <div className="d-flex justify-between align-center mb-2">
              <span className="badge badge-primary text-xs">
                {activeComplaint.complaintNumber || 'Grievance Pin'}
              </span>
              <button
                type="button"
                className="close-pin-btn"
                onClick={() => setActiveComplaint(null)}
                aria-label="Close issue details"
              >
                &times;
              </button>
            </div>

            {activeComplaint.imageUrl && (
              <img
                src={activeComplaint.imageUrl}
                alt="Civic issue evidence"
                className="nearby-pin-thumbnail"
              />
            )}

            <h3 className="nearby-pin-title mt-2">{activeComplaint.title}</h3>
            <p className="nearby-pin-address text-xs text-muted">
              📍 {activeComplaint.location?.address || 'Pune'}
            </p>

            <div className="d-flex align-center gap-2 mt-2">
              <StatusBadge status={activeComplaint.status} />
              <span className="text-xs text-muted">
                {activeComplaint.category}
              </span>
            </div>

            <p className="nearby-pin-desc text-xs mt-2">
              {activeComplaint.description?.slice(0, 100)}...
            </p>

            <Link
              to={`/complaints/${activeComplaint._id || activeComplaint.id}`}
              className="btn btn-primary btn-sm btn-block mt-3"
            >
              View Full Grievance Details &rarr;
            </Link>
          </aside>
        )}
      </div>

      <div className="nearby-map-footer text-xs text-muted">
        <span>Click any marker to inspect photos and SLA progress. See bottom-right legend for issue symbols and SLA deadlines.</span>
      </div>
    </div>
  );
};

export default NearbyIssuesMap;
