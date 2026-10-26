import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CameraCaptureModal } from '../components/CameraCaptureModal';
import { LanguageProvider } from '../context/LanguageContext';

describe('CameraCaptureModal Component', () => {
  let mockTrackStop;
  let mockMediaStream;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTrackStop = vi.fn();
    mockMediaStream = {
      getTracks: () => [
        { stop: mockTrackStop, kind: 'video' },
      ],
    };

    // Mock HTMLMediaElement.prototype.play
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);

    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'videoinput', deviceId: 'cam1', label: 'Back Camera' },
          { kind: 'videoinput', deviceId: 'cam2', label: 'Front Camera' },
        ]),
      },
    });

    // Mock canvas getContext and toDataURL
    window.HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
    });
    window.HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,mockCapturedCameraFrame');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <LanguageProvider>
        <CameraCaptureModal isOpen={false} onClose={vi.fn()} onCapture={vi.fn()} />
      </LanguageProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('opens live camera stream and displays on-site viewfinder when isOpen is true', async () => {
    render(
      <LanguageProvider>
        <CameraCaptureModal isOpen={true} onClose={vi.fn()} onCapture={vi.fn()} />
      </LanguageProvider>
    );

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    expect(await screen.findByText(/Live On-Site Camera/i)).toBeInTheDocument();
    expect(screen.getByText(/PMC On-Site Real Capture/i)).toBeInTheDocument();
  });

  it('captures photo frame when shutter button is clicked and stops media tracks', async () => {
    const onCaptureMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <LanguageProvider>
        <CameraCaptureModal
          isOpen={true}
          onClose={onCloseMock}
          onCapture={onCaptureMock}
        />
      </LanguageProvider>
    );

    const shutterBtn = await screen.findByRole('button', { name: /Capture Photo/i });
    await waitFor(() => {
      expect(shutterBtn).not.toBeDisabled();
    });

    fireEvent.click(shutterBtn);

    expect(onCaptureMock).toHaveBeenCalledWith('data:image/jpeg;base64,mockCapturedCameraFrame');
    expect(onCloseMock).toHaveBeenCalled();
    expect(mockTrackStop).toHaveBeenCalled();
  });

  it('displays user-friendly error and fallback button when camera access is denied', async () => {
    const notAllowedErr = new Error('Permission denied');
    notAllowedErr.name = 'NotAllowedError';
    navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(notAllowedErr);

    const onFallbackMock = vi.fn();

    render(
      <LanguageProvider>
        <CameraCaptureModal
          isOpen={true}
          onClose={vi.fn()}
          onCapture={vi.fn()}
          onFallbackToFile={onFallbackMock}
        />
      </LanguageProvider>
    );

    expect(await screen.findByText(/Camera Unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/Camera permission was denied/i)).toBeInTheDocument();

    const fallbackBtn = screen.getByRole('button', { name: /Choose Photo/i });
    fireEvent.click(fallbackBtn);

    expect(onFallbackMock).toHaveBeenCalled();
  });

  it('stops video tracks and closes modal when Close button is clicked', async () => {
    const onCloseMock = vi.fn();

    render(
      <LanguageProvider>
        <CameraCaptureModal
          isOpen={true}
          onClose={onCloseMock}
          onCapture={vi.fn()}
        />
      </LanguageProvider>
    );

    const closeBtn = await screen.findByRole('button', { name: /Close Camera/i });
    fireEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalled();
    expect(mockTrackStop).toHaveBeenCalled();
  });

  it('closes modal on Escape key press', async () => {
    const onCloseMock = vi.fn();

    render(
      <LanguageProvider>
        <CameraCaptureModal
          isOpen={true}
          onClose={onCloseMock}
          onCapture={vi.fn()}
        />
      </LanguageProvider>
    );

    await screen.findByText(/Live On-Site Camera/i);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onCloseMock).toHaveBeenCalled();
    expect(mockTrackStop).toHaveBeenCalled();
  });
});
