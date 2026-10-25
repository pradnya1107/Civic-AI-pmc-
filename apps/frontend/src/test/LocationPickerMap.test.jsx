import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocationPickerMap, isWithinPmc, PMC_BOUNDS } from '../components/LocationPickerMap';

// Mock Leaflet since jsdom does not implement Canvas / WebGL
vi.mock('leaflet', () => {
  const mapMock = {
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    panTo: vi.fn(),
    on: vi.fn(),
    removeLayer: vi.fn(),
  };

  const markerMock = {
    addTo: vi.fn().mockReturnThis(),
    setLatLng: vi.fn(),
    on: vi.fn(),
  };

  return {
    default: {
      map: vi.fn(() => mapMock),
      tileLayer: vi.fn(() => ({ addTo: vi.fn().mockReturnThis() })),
      rectangle: vi.fn(() => ({ addTo: vi.fn().mockReturnThis() })),
      marker: vi.fn(() => markerMock),
      Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
    },
    map: vi.fn(() => mapMock),
    tileLayer: vi.fn(() => ({ addTo: vi.fn().mockReturnThis() })),
    rectangle: vi.fn(() => ({ addTo: vi.fn().mockReturnThis() })),
    marker: vi.fn(() => markerMock),
  };
});

describe('Phase 4: LocationPickerMap & PMC Boundary Validation Component', () => {
  it('correctly validates coordinates within Pune Municipal Corporation limits', () => {
    // Inside PMC
    expect(isWithinPmc(18.5204, 73.8567)).toBe(true); // Shivajinagar
    expect(isWithinPmc(18.5074, 73.8077)).toBe(true); // Kothrud
    expect(isWithinPmc(18.5580, 73.8075)).toBe(true); // Aundh

    // Outside PMC
    expect(isWithinPmc(19.0760, 72.8777)).toBe(false); // Mumbai
    expect(isWithinPmc(18.2000, 73.8000)).toBe(false); // Below Min Lat
    expect(isWithinPmc(18.8000, 73.8000)).toBe(false); // Above Max Lat
  });

  it('renders interactive location picker map and controls', () => {
    render(<LocationPickerMap latitude="" longitude="" onLocationChange={vi.fn()} />);

    expect(screen.getByText(/Interactive PMC Location Picker/i)).toBeInTheDocument();
    expect(screen.getByText(/Click map or drag pin/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /My GPS Location/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Shivajinagar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kothrud/i })).toBeInTheDocument();
  });

  it('updates location when a valid PMC preset is clicked', () => {
    const handleLocationChange = vi.fn();
    render(<LocationPickerMap latitude="" longitude="" onLocationChange={handleLocationChange} />);

    const kothrudBtn = screen.getByRole('button', { name: /Kothrud/i });
    fireEvent.click(kothrudBtn);

    expect(handleLocationChange).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 18.5074,
        longitude: 73.8077,
      })
    );
  });
});
