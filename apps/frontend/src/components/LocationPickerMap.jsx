import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Configured Pune Municipal Corporation (PMC) Bounding Limits
export const PMC_BOUNDS = {
  minLat: 18.30,
  maxLat: 18.70,
  minLng: 73.65,
  maxLng: 74.05,
};

export const PUNE_DEFAULT_CENTER = [18.5204, 73.8567]; // PMC Head Office (Shivajinagar)

export const isWithinPmc = (lat, lng) => {
  return (
    lat >= PMC_BOUNDS.minLat &&
    lat <= PMC_BOUNDS.maxLat &&
    lng >= PMC_BOUNDS.minLng &&
    lng <= PMC_BOUNDS.maxLng
  );
};

// Common Pune Municipal Zones
const PMC_LOCALITIES = [
  { name: 'Shivajinagar (HQ)', lat: 18.5314, lng: 73.8446 },
  { name: 'Kothrud', lat: 18.5074, lng: 73.8077 },
  { name: 'Aundh / Baner', lat: 18.5580, lng: 73.8075 },
  { name: 'Hadapsar', lat: 18.5089, lng: 73.9259 },
  { name: 'Swargate', lat: 18.5018, lng: 73.8586 },
  { name: 'Viman Nagar', lat: 18.5679, lng: 73.9143 },
];

export const LocationPickerMap = ({
  latitude,
  longitude,
  onLocationChange,
  disabled = false,
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [validationError, setValidationError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState(
    latitude && longitude ? [Number(latitude), Number(longitude)] : null
  );

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      try {
        const initialCenter =
          latitude && longitude && isWithinPmc(Number(latitude), Number(longitude))
            ? [Number(latitude), Number(longitude)]
            : PUNE_DEFAULT_CENTER;

        const map = L.map(mapContainerRef.current, {
          center: initialCenter,
          zoom: 13,
          minZoom: 11,
          maxZoom: 18,
          scrollWheelZoom: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors | PMC CivicAI',
          maxZoom: 19,
        }).addTo(map);

        // PMC Municipal Boundary Visual Rectangle
        const boundsRectangle = [
          [PMC_BOUNDS.minLat, PMC_BOUNDS.minLng],
          [PMC_BOUNDS.maxLat, PMC_BOUNDS.maxLng],
        ];
        L.rectangle(boundsRectangle, {
          color: '#2563EB',
          weight: 2,
          dashArray: '6, 6',
          fillColor: '#3B82F6',
          fillOpacity: 0.05,
        }).addTo(map);

        // Marker for picked location
        if (latitude && longitude && isWithinPmc(Number(latitude), Number(longitude))) {
          markerRef.current = L.marker([Number(latitude), Number(longitude)], {
            draggable: !disabled,
          }).addTo(map);
        }

        // Click Handler on Map
        map.on('click', (e) => {
          if (disabled) return;
          const { lat, lng } = e.latlng;
          handleSetLocation(lat, lng, map);
        });

        mapInstanceRef.current = map;
      } catch (err) {
        console.error('Failed to initialize location picker map:', err);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleSetLocation = (lat, lng, mapOverride = null) => {
    const latNum = Number(Number(lat).toFixed(6));
    const lngNum = Number(Number(lng).toFixed(6));

    if (!isWithinPmc(latNum, lngNum)) {
      setValidationError(
        `Selected location (${latNum}, ${lngNum}) is outside Pune Municipal Corporation limits. Please choose a location within PMC boundary.`
      );
      return;
    }

    setValidationError('');
    setSelectedCoords([latNum, lngNum]);

    const map = mapOverride || mapInstanceRef.current;
    if (map) {
      if (markerRef.current) {
        markerRef.current.setLatLng([latNum, lngNum]);
      } else {
        markerRef.current = L.marker([latNum, lngNum], { draggable: !disabled }).addTo(map);
        markerRef.current.on('dragend', (evt) => {
          const pos = evt.target.getLatLng();
          handleSetLocation(pos.lat, pos.lng);
        });
      }
      map.panTo([latNum, lngNum]);
    }

    if (onLocationChange) {
      onLocationChange({
        latitude: latNum,
        longitude: lngNum,
        addressHint: `PMC Ward Location (${latNum}, ${lngNum})`,
      });
    }
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setValidationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setValidationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude: userLat, longitude: userLng } = position.coords;
        if (!isWithinPmc(userLat, userLng)) {
          setValidationError(
            `Your current GPS location (${userLat.toFixed(4)}, ${userLng.toFixed(4)}) is outside Pune/PMC boundary limits.`
          );
          return;
        }
        handleSetLocation(userLat, userLng);
      },
      (error) => {
        setIsLocating(false);
        setValidationError(`GPS error: ${error.message || 'Permission denied'}. Click map directly to pick.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleClearLocation = () => {
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    setSelectedCoords(null);
    setValidationError('');
    if (onLocationChange) {
      onLocationChange({ latitude: '', longitude: '', addressHint: '' });
    }
  };

  return (
    <div className="location-picker-map-container" style={{ margin: '14px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <label className="form-label" style={{ marginBottom: 0, fontWeight: 700 }}>
            🗺️ Interactive PMC Location Picker
          </label>
          <span className="text-xs text-muted d-block">
            Click map or drag pin to specify exact grievance location within Pune municipal limits.
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-xs btn-outline"
            onClick={handleUseGps}
            disabled={disabled || isLocating}
            id="use-gps-btn"
          >
            {isLocating ? 'Detecting GPS...' : '📍 My GPS Location'}
          </button>
          {selectedCoords && (
            <button
              type="button"
              className="btn btn-xs btn-outline text-danger"
              onClick={handleClearLocation}
              disabled={disabled}
            >
              Clear Pin
            </button>
          )}
        </div>
      </div>

      {/* Preset Ward Locality Quick Selectors */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '6px' }}>
        <span className="text-xs text-muted" style={{ alignSelf: 'center', whiteSpace: 'nowrap' }}>Presets:</span>
        {PMC_LOCALITIES.map((loc) => (
          <button
            key={loc.name}
            type="button"
            className="btn btn-xs btn-light"
            style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
            onClick={() => handleSetLocation(loc.lat, loc.lng)}
            disabled={disabled}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Leaflet Map Box */}
      <div
        ref={mapContainerRef}
        id="location-picker-map"
        style={{
          height: '240px',
          width: '100%',
          borderRadius: '8px',
          border: validationError ? '2px solid #EF4444' : '1px solid #D1D5DB',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
        }}
      />

      {/* Validation Message */}
      {validationError && (
        <div
          style={{
            marginTop: '6px',
            padding: '8px 12px',
            borderRadius: '6px',
            background: '#FEF2F2',
            border: '1px solid #F87171',
            color: '#991B1B',
            fontSize: '12px',
          }}
          id="location-picker-error"
        >
          {validationError}
        </div>
      )}

      {/* Selected Coordinates Status */}
      {selectedCoords && !validationError && (
        <div
          style={{
            marginTop: '6px',
            fontSize: '12px',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          id="location-picker-success"
        >
          <span>✓ Valid PMC Coordinates:</span>
          <strong>Lat: {selectedCoords[0]}, Lng: {selectedCoords[1]}</strong>
          <span className="badge badge-success" style={{ fontSize: '10px' }}>Within Pune Limits</span>
        </div>
      )}
    </div>
  );
};

export default LocationPickerMap;
