import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  ComplaintFormPage,
  extractManualDescription,
  mergeDescriptionWithAiEvidence,
} from '../pages/ComplaintFormPage';
import { aiApi, complaintApi } from '../services/api';

// Mock dependencies
vi.mock('../services/api', () => ({
  aiApi: {
    analyzeComplaint: vi.fn(),
  },
  complaintApi: {
    createComplaint: vi.fn(),
    checkDuplicates: vi.fn().mockResolvedValue({ success: true, data: { duplicates: [] } }),
    supportComplaint: vi.fn(),
  },
}));

vi.mock('../components/CitizenLayout', () => ({
  CitizenLayout: ({ children }) => <div data-testid="citizen-layout">{children}</div>,
}));

describe('Phase 1: Image Description Refresh & Separation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Pure Helper Functions', () => {
    it('extractManualDescription correctly strips [AI Visible Evidence] blocks', () => {
      const userText = 'Deep pothole outside Swargate station causing traffic hazard.';
      const combined = `${userText}\n\n[AI Visible Evidence]: Visible circular pavement depression with jagged aggregate edge.`;

      expect(extractManualDescription(combined)).toBe(userText);
      expect(extractManualDescription(userText)).toBe(userText);
      expect(extractManualDescription('')).toBe('');
      expect(extractManualDescription(null)).toBe('');
    });

    it('mergeDescriptionWithAiEvidence replaces previous evidence without duplicating tags', () => {
      const manual = 'Water pipe burst near FC road.';
      const evidence1 = 'High pressure water fountain leaking onto sidewalk.';
      const merged1 = mergeDescriptionWithAiEvidence(manual, evidence1);

      expect(merged1).toBe(`${manual}\n\n[AI Visible Evidence]: ${evidence1}`);

      // Second scan on new image should replace evidence1, not accumulate multiple tags
      const evidence2 = 'Dry road with minor surface crack.';
      const merged2 = mergeDescriptionWithAiEvidence(merged1, evidence2);

      expect(merged2).toBe(`${manual}\n\n[AI Visible Evidence]: ${evidence2}`);
      expect((merged2.match(/\[AI Visible Evidence\]/g) || []).length).toBe(1);
    });
  });

  describe('2. Component Image Invalidation and Refresh', () => {
    it('clears stale AI results when a demo preset or new image is selected', async () => {
      aiApi.analyzeComplaint.mockResolvedValueOnce({
        success: true,
        data: {
          suggestedTitle: 'Pothole on Main Road',
          visibleEvidence: 'Asphalt cavity detected with 90% confidence.',
          category: 'Roads & Potholes',
          severity: 'HIGH',
          confidenceScore: 92,
        },
      });

      render(
        <MemoryRouter>
          <ComplaintFormPage />
        </MemoryRouter>,
      );

      // Select preset 1
      const potholePresetBtn = screen.getByRole('button', { name: /Road Pothole/i });
      fireEvent.click(potholePresetBtn);

      // Scan preset 1
      const scanBtn = screen.getByRole('button', { name: /Scan & Auto-Fill with AI/i });
      fireEvent.click(scanBtn);

      await waitFor(() => {
        expect(screen.getByText(/Civic Issue Recognition/i)).toBeInTheDocument();
      });

      // Now switch to Garbage preset 2
      const garbagePresetBtn = screen.getByRole('button', { name: /Garbage Overflow/i });
      fireEvent.click(garbagePresetBtn);

      // Verify previous AI analysis panel is immediately cleared (invalidated)
      expect(screen.queryByText(/Civic Issue Recognition/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Asphalt cavity detected/i)).not.toBeInTheDocument();
    });

    it('discards an older asynchronous AI response when user replaces the image during scanning', async () => {
      let resolveFirstScan;
      const delayedFirstScanPromise = new Promise((resolve) => {
        resolveFirstScan = resolve;
      });

      aiApi.analyzeComplaint.mockReturnValueOnce(delayedFirstScanPromise);

      render(
        <MemoryRouter>
          <ComplaintFormPage />
        </MemoryRouter>,
      );

      // Select preset 1 and trigger AI scan (which is delayed)
      const potholePresetBtn = screen.getByRole('button', { name: /Road Pothole/i });
      fireEvent.click(potholePresetBtn);

      const scanBtn = screen.getByRole('button', { name: /Scan & Auto-Fill with AI/i });
      fireEvent.click(scanBtn);

      expect(screen.getByText(/AI Analyzing.../i)).toBeInTheDocument();

      // While first scan is in-flight, user switches to Garbage preset
      const garbagePresetBtn = screen.getByRole('button', { name: /Garbage Overflow/i });
      fireEvent.click(garbagePresetBtn);

      // Now first scan finishes late
      resolveFirstScan({
        success: true,
        data: {
          suggestedTitle: 'Delayed Pothole Result',
          visibleEvidence: 'Stale pothole evidence from older image.',
          category: 'Roads & Potholes',
          severity: 'HIGH',
        },
      });

      // Wait a tick and verify the delayed result was discarded and did not overwrite the garbage preset
      await waitFor(() => {
        expect(screen.queryByText(/Delayed Pothole Result/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Stale pothole evidence/i)).not.toBeInTheDocument();
      });
    });

    it('clears stale AI results when an AI scan fails', async () => {
      aiApi.analyzeComplaint.mockRejectedValueOnce(new Error('Network gateway timeout'));

      render(
        <MemoryRouter>
          <ComplaintFormPage />
        </MemoryRouter>,
      );

      const potholePresetBtn = screen.getByRole('button', { name: /Road Pothole/i });
      fireEvent.click(potholePresetBtn);

      const scanBtn = screen.getByRole('button', { name: /Scan & Auto-Fill with AI/i });
      fireEvent.click(scanBtn);

      await waitFor(() => {
        expect(screen.getByText(/Network gateway timeout/i)).toBeInTheDocument();
        expect(screen.queryByText(/Civic Issue Recognition/i)).not.toBeInTheDocument();
      });
    });

    it('blocks submission button and displays warning when non-civic receipt/document image is scanned', async () => {
      aiApi.analyzeComplaint.mockResolvedValueOnce({
        success: true,
        data: {
          isCivicIssue: false,
          detectedCivicIssue: 'No Visible Civic Issue',
          category: 'Other Civic Grievance',
          suggestedTitle: 'No Visible Civic Issue',
          visibleEvidence: 'The image displays a blank paper receipt or cash sale invoice book page with no civic infrastructure defects.',
          severity: 'LOW',
          confidenceScore: 0,
          authenticityAssessment: {
            possibleAiGenerated: false,
            isDocumentOrNonCivic: true,
            confidence: 'HIGH',
            indicators: ['Image depicts an invoice or document'],
          },
          safetyHazards: ['Non-civic image', 'Invoice document'],
        },
      });

      render(
        <MemoryRouter>
          <ComplaintFormPage />
        </MemoryRouter>,
      );

      const potholePresetBtn = screen.getByRole('button', { name: /Road Pothole/i });
      fireEvent.click(potholePresetBtn);

      const scanBtn = screen.getByRole('button', { name: /Scan & Auto-Fill with AI/i });
      fireEvent.click(scanBtn);

      await waitFor(() => {
        expect(screen.getByText('No Civic Issue Detected')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Submission Blocked \(No Civic Issue Detected\)/i })).toBeInTheDocument();
        expect(screen.getByText(/Non-Civic Media \/ Document Detected/i)).toBeInTheDocument();
        expect(screen.queryByText(/Authentic Real Camera Photo Verified/i)).not.toBeInTheDocument();
      });

      const submitBlockedBtn = screen.getByRole('button', { name: /Submission Blocked \(No Civic Issue Detected\)/i });
      expect(submitBlockedBtn).toBeDisabled();
    });
  });
});
