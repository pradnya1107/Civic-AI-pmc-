import React, { useRef, useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export const CameraCaptureModal = ({ isOpen, onClose, onCapture, onFallbackToFile }) => {
  const { t } = useLanguage();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [facingMode, setFacingMode] = useState('environment');
  const [cameraStatus, setCameraStatus] = useState('initializing'); // 'initializing' | 'active' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [flashActive, setFlashActive] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const stopStream = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.error('Error stopping camera stream tracks:', err);
      }
      streamRef.current = null;
    }
  };

  const startCamera = async (targetFacing = facingMode) => {
    setCameraStatus('initializing');
    setErrorMessage('');

    stopStream();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('error');
      setErrorMessage(
        t('cameraNotSupported', 'Live camera stream is not supported in this browser environment. Please select photo manually.')
      );
      return;
    }

    try {
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        // Fallback constraint for desktop webcams that don't recognize environment facingMode
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraStatus('active');

      // Check available cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      } catch {
        // Ignored
      }
    } catch (err) {
      console.error('Camera stream access error:', err);
      setCameraStatus('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage(
          t('cameraPermissionDenied', 'Camera permission was denied. Please allow camera permissions in your browser address bar.')
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage(
          t('cameraNotFound', 'No camera detected on this system. Please connect a camera or choose a photo from files.')
        );
      } else {
        setErrorMessage(
          err.message || t('cameraUnavailable', 'Unable to start camera stream. Please check camera permissions.')
        );
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    stopStream();
    onClose();
  };

  const handleSwitchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleCapture = () => {
    if (!videoRef.current || cameraStatus !== 'active') return;

    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 180);

    try {
      const video = videoRef.current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (facingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

      stopStream();
      onCapture(dataUrl);
      onClose();
    } catch (err) {
      console.error('Error capturing live photo from canvas:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="camera-modal-overlay" role="dialog" aria-modal="true" aria-label="Live Camera Viewfinder">
      <div className="camera-modal-container">
        {/* Header */}
        <div className="camera-modal-header">
          <div className="camera-modal-title-box">
            <span className="camera-live-pulse-dot" />
            <h3 className="camera-modal-title">{t('liveCameraTitle', 'Live On-Site Camera')}</h3>
          </div>
          <button
            type="button"
            className="camera-modal-close-btn"
            onClick={handleClose}
            aria-label={t('closeCameraBtn', 'Close Camera')}
          >
            ✕
          </button>
        </div>

        {/* Viewfinder Window */}
        <div className="camera-viewfinder-wrapper">
          {flashActive && <div className="camera-shutter-flash" />}

          <video
            ref={videoRef}
            className={`camera-video-stream ${facingMode === 'user' ? 'mirrored' : ''}`}
            autoPlay
            playsInline
            muted
          />

          {/* Target Reticle Overlay */}
          {cameraStatus === 'active' && (
            <div className="camera-viewfinder-overlay">
              <div className="reticle-corner top-left" />
              <div className="reticle-corner top-right" />
              <div className="reticle-corner bottom-left" />
              <div className="reticle-corner bottom-right" />
              <div className="camera-grid-lines">
                <div className="grid-line horizontal" />
                <div className="grid-line vertical" />
              </div>
              <div className="camera-onsite-badge">
                <span>📍 PMC On-Site Real Capture</span>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {cameraStatus === 'initializing' && (
            <div className="camera-loading-overlay">
              <div className="camera-spinner" />
              <p>{t('startingCamera', 'Connecting to camera hardware...')}</p>
            </div>
          )}

          {/* Error Message */}
          {cameraStatus === 'error' && (
            <div className="camera-error-overlay">
              <div className="camera-error-icon">📷⚠️</div>
              <h4 className="camera-error-title">{t('cameraErrorTitle', 'Camera Unavailable')}</h4>
              <p className="camera-error-text">{errorMessage}</p>
              <div className="camera-error-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => startCamera(facingMode)}
                >
                  🔄 {t('retryCameraBtn', 'Try Again')}
                </button>
                {onFallbackToFile && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm camera-fallback-file-btn"
                    onClick={() => {
                      handleClose();
                      onFallbackToFile();
                    }}
                  >
                    📁 {t('browsePhotoBtn', 'Choose Photo from Files')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls Dock */}
        <div className="camera-controls-dock">
          {/* File select fallback */}
          <div className="camera-dock-side">
            {onFallbackToFile && (
              <button
                type="button"
                className="camera-dock-btn text-btn"
                onClick={() => {
                  handleClose();
                  onFallbackToFile();
                }}
                title={t('browsePhotoBtn', 'Choose Photo from Files')}
              >
                📁 {t('chooseFilesShort', 'Files')}
              </button>
            )}
          </div>

          {/* Big Shutter Button */}
          <div className="camera-dock-center">
            <button
              type="button"
              className="camera-shutter-btn"
              onClick={handleCapture}
              disabled={cameraStatus !== 'active'}
              aria-label={t('snapPhotoBtn', 'Capture Photo')}
              title={t('snapPhotoBtn', 'Capture Photo')}
            >
              <div className="camera-shutter-inner" />
            </button>
          </div>

          {/* Switch Camera */}
          <div className="camera-dock-side right">
            {(hasMultipleCameras || facingMode === 'user') && (
              <button
                type="button"
                className="camera-dock-btn flip-btn"
                onClick={handleSwitchCamera}
                disabled={cameraStatus !== 'active'}
                title={t('switchCameraBtn', 'Flip Camera')}
                aria-label={t('switchCameraBtn', 'Flip Camera')}
              >
                🔄
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
