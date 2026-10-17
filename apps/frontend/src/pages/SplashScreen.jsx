import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BUILDINGS = [
  { width: 46, height: 102, tone: '#173C48' },
  { width: 57, height: 145, tone: '#204B56' },
  { width: 42, height: 122, tone: '#143744' },
  { width: 62, height: 178, tone: '#1D4652' },
  { width: 45, height: 132, tone: '#183C48' },
  { width: 57, height: 158, tone: '#214C58' },
  { width: 43, height: 112, tone: '#163844' },
];

export const SplashScreen = ({ autoRedirect = true, redirectDelay = 3200 }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isFadingOut, setIsFadingOut] = useState(false);

  const destination = isAuthenticated ? '/dashboard' : '/login';

  const handleProceed = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      navigate(destination, { replace: true });
    }, 250);
  };

  useEffect(() => {
    if (!autoRedirect) return;

    const timer = setTimeout(() => {
      handleProceed();
    }, redirectDelay);

    return () => clearTimeout(timer);
  }, [autoRedirect, redirectDelay, destination]);

  return (
    <div
      className={`splash-container ${isFadingOut ? 'splash-fading' : ''}`}
      data-testid="splash-screen"
      role="region"
      aria-label="CivicAI Pune Splash Welcome"
    >
      <div className="splash-aura" aria-hidden="true" />

      {/* Top Brand Logo */}
      <div className="splash-brand-block">
        <div className="splash-logo-mark" aria-hidden="true">
          <div className="splash-logo-orbit" />
          <span className="splash-logo-c">C</span>
          <div className="splash-logo-spark" />
        </div>
        <div className="splash-logo-text">
          <div className="splash-logo-title">
            Civic<span className="splash-logo-accent">AI</span>
          </div>
          <div className="splash-logo-caption">CIVIC TECHNOLOGY FOR PUNE</div>
        </div>
      </div>

      {/* Pune Cityscape Card */}
      <div
        className="splash-cityscape"
        role="img"
        aria-label="Illustration of a greener Pune skyline at dusk"
      >
        <div className="city-sky-glow" aria-hidden="true" />
        <div className="city-moon" aria-hidden="true" />

        <div className="city-stars" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((star) => (
            <div
              key={star}
              className="city-star"
              style={{
                left: `${8 + star * 14}%`,
                top: `${14 + (star % 3) * 18}px`,
                animationDelay: `${star * 0.4}s`,
              }}
            />
          ))}
        </div>

        <div className="city-skyline" aria-hidden="true">
          {BUILDINGS.map((building, i) => (
            <div
              key={i}
              className="city-building"
              style={{
                width: `${building.width}px`,
                height: `${building.height}px`,
                backgroundColor: building.tone,
              }}
            >
              <div className="city-windows">
                {Array.from({ length: 10 }).map((_, wIdx) => (
                  <div
                    key={wIdx}
                    className={`city-window ${(wIdx + i) % 3 === 0 ? 'city-window-lit' : ''}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="city-treeline" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, tree) => (
            <div key={tree} className="city-tree">
              <div className="city-tree-top" />
              <div className="city-tree-trunk" />
            </div>
          ))}
        </div>

        <div className="city-ground" aria-hidden="true" />
        <div className="city-road" aria-hidden="true" />
        <div className="city-road-stripe" aria-hidden="true" />
        <div className="city-light-trail" aria-hidden="true" />

        <div className="city-badge">
          <span className="city-live-dot" aria-hidden="true" />
          <span>PUNE · A CITY IN MOTION</span>
        </div>
      </div>

      {/* Hero Copy */}
      <div className="splash-copy">
        <h1 className="splash-heading">
          Smarter Cities,
          <br />
          Brighter Communities
        </h1>
        <p className="splash-subheading">Building a better Pune, together.</p>
      </div>

      {/* Action Navigation */}
      <div className="splash-actions">
        <button
          type="button"
          onClick={handleProceed}
          className="btn btn-primary splash-btn-primary"
          id="splash-get-started"
          aria-label="Get Started and enter portal"
        >
          <span>Get Started</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <div className="splash-links">
          <Link to="/login" className="splash-link" id="splash-login-link">
            Citizen Sign In
          </Link>
          <span className="splash-link-divider" aria-hidden="true">·</span>
          <Link to="/register" className="splash-link" id="splash-register-link">
            Create Account
          </Link>
        </div>
      </div>

      {/* Municipal Footer Tagline */}
      <footer className="splash-footer">
        <div className="splash-footer-line" aria-hidden="true" />
        <span className="splash-footer-text">MADE FOR OUR CITY · PMC CIVIC-AI</span>
        <div className="splash-footer-line" aria-hidden="true" />
      </footer>
    </div>
  );
};

export default SplashScreen;
