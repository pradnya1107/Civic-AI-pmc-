import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ComplaintFormPage } from '../pages/ComplaintFormPage';
import { complaintApi } from '../services/api';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Pooja Patil', email: 'pooja@example.com', role: 'CITIZEN' },
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

// Mock complaintApi
vi.mock('../services/api', () => ({
  complaintApi: {
    createComplaint: vi.fn(),
    getComplaints: vi.fn(),
    getComplaintById: vi.fn(),
    checkDuplicates: vi.fn().mockResolvedValue({ success: true, data: { duplicates: [] } }),
  },
}));

describe('ComplaintFormPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form inputs: title, category, description, and location', () => {
    render(
      <MemoryRouter>
        <ComplaintFormPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/Complaint Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Department \/ Grievance Category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Detailed Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Street Address \/ Landmark/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Grievance/i })).toBeInTheDocument();
  });

  it('Requirement / Acceptance Criteria: prevents submission and shows client-side error when title is empty', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ComplaintFormPage />
      </MemoryRouter>,
    );

    const submitBtn = screen.getByRole('button', { name: /Submit Grievance/i });
    await user.click(submitBtn);

    // Title error must be displayed
    expect(screen.getByText('Complaint title is required.')).toBeInTheDocument();
    // complaintApi.createComplaint must NOT be called
    expect(complaintApi.createComplaint).not.toHaveBeenCalled();
  });

  it('validates minimum character lengths for title and description', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ComplaintFormPage />
      </MemoryRouter>,
    );

    const titleInput = screen.getByLabelText(/Complaint Title/i);
    const descInput = screen.getByLabelText(/Detailed Description/i);
    const submitBtn = screen.getByRole('button', { name: /Submit Grievance/i });

    await user.type(titleInput, 'Hi');
    await user.type(descInput, 'Short');
    await user.click(submitBtn);

    expect(screen.getByText('Title must be at least 3 characters long.')).toBeInTheDocument();
    expect(screen.getByText('Description must be at least 10 characters long.')).toBeInTheDocument();
    expect(complaintApi.createComplaint).not.toHaveBeenCalled();
  });

  it('validates that category and address must be provided', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ComplaintFormPage />
      </MemoryRouter>,
    );

    const titleInput = screen.getByLabelText(/Complaint Title/i);
    const descInput = screen.getByLabelText(/Detailed Description/i);
    const submitBtn = screen.getByRole('button', { name: /Submit Grievance/i });

    fireEvent.change(titleInput, { target: { value: 'Severe water leakage in street pipe' } });
    fireEvent.change(descInput, { target: { value: 'Water is overflowing on the road for the past 48 hours causing wastage.' } });
    await user.click(submitBtn);

    expect(screen.getByText('Please select a grievance category.')).toBeInTheDocument();
    expect(screen.getByText('Location address or landmark is required.')).toBeInTheDocument();
    expect(complaintApi.createComplaint).not.toHaveBeenCalled();
  });

  it('submits valid grievance to POST /api/v1/complaints and shows success message', async () => {
    const user = userEvent.setup();

    complaintApi.createComplaint.mockResolvedValueOnce({
      success: true,
      data: {
        complaint: {
          _id: '670c538260ab55761a29381f',
          complaintNumber: 'CIV-TEST-001',
          title: 'Severe water leakage in street pipe',
          description: 'Water is overflowing on the road for the past 48 hours causing wastage.',
          category: 'Water Supply',
          location: { address: 'FC Road, Deccan Gymkhana, Pune' },
          status: 'SUBMITTED',
        },
      },
    });

    render(
      <MemoryRouter>
        <ComplaintFormPage />
      </MemoryRouter>,
    );

    const titleInput = screen.getByLabelText(/Complaint Title/i);
    const catSelect = screen.getByLabelText(/Department \/ Grievance Category/i);
    const descInput = screen.getByLabelText(/Detailed Description/i);
    const addrInput = screen.getByLabelText(/Street Address \/ Landmark/i);
    const submitBtn = screen.getByRole('button', { name: /Submit Grievance/i });

    fireEvent.change(titleInput, { target: { value: 'Severe water leakage in street pipe' } });
    fireEvent.change(catSelect, { target: { value: 'Water Supply' } });
    fireEvent.change(descInput, { target: { value: 'Water is overflowing on the road for the past 48 hours causing wastage.' } });
    fireEvent.change(addrInput, { target: { value: 'FC Road, Deccan Gymkhana, Pune' } });

    await user.click(submitBtn);

    expect(complaintApi.createComplaint).toHaveBeenCalledTimes(1);
    expect(complaintApi.createComplaint).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Severe water leakage in street pipe',
        category: 'Water Supply',
        description: 'Water is overflowing on the road for the past 48 hours causing wastage.',
        location: expect.objectContaining({
          address: 'FC Road, Deccan Gymkhana, Pune',
        }),
      }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Grievance submitted successfully!/i)).toBeInTheDocument();
    });
  });

  it('displays server error banner if API request fails', async () => {
    const user = userEvent.setup();

    complaintApi.createComplaint.mockRejectedValueOnce(
      new Error('PMC grievance service temporarily unavailable. Please retry later.'),
    );

    render(
      <MemoryRouter>
        <ComplaintFormPage />
      </MemoryRouter>,
    );

    const titleInput = screen.getByLabelText(/Complaint Title/i);
    const catSelect = screen.getByLabelText(/Department \/ Grievance Category/i);
    const descInput = screen.getByLabelText(/Detailed Description/i);
    const addrInput = screen.getByLabelText(/Street Address \/ Landmark/i);
    const submitBtn = screen.getByRole('button', { name: /Submit Grievance/i });

    fireEvent.change(titleInput, { target: { value: 'Severe water leakage in street pipe' } });
    fireEvent.change(catSelect, { target: { value: 'Water Supply' } });
    fireEvent.change(descInput, { target: { value: 'Water is overflowing on the road for the past 48 hours causing wastage.' } });
    fireEvent.change(addrInput, { target: { value: 'FC Road, Deccan Gymkhana, Pune' } });

    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/PMC grievance service temporarily unavailable/i),
      ).toBeInTheDocument();
    });
  });

  it('opens live camera viewfinder modal when Take Live Photo button is clicked', async () => {
    const user = userEvent.setup();
    const mockTrackStop = vi.fn();
    const mockMediaStream = {
      getTracks: () => [{ stop: mockTrackStop, kind: 'video' }],
    };

    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
    });

    render(
      <MemoryRouter>
        <ComplaintFormPage />
      </MemoryRouter>,
    );

    const liveCameraBtn = screen.getByRole('button', { name: /Take Live Photo/i });
    await user.click(liveCameraBtn);

    expect(await screen.findByText(/Live On-Site Camera/i)).toBeInTheDocument();
    expect(screen.getByText(/PMC On-Site Real Capture/i)).toBeInTheDocument();
  });
});
