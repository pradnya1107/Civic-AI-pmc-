import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import logoImg from '../assets/civicai-logo.jpg';
import './LandingPage.css';

export const LandingPage = () => {
  const { isAuthenticated, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Interactive Hero Role Preview Tab: 'citizen' | 'department' | 'admin'
  const [activeRoleTab, setActiveRoleTab] = useState('citizen');

  // FAQ Accordion State (open question ID)
  const [openFaq, setOpenFaq] = useState(0);

  // Determine dashboard redirect path if user is already logged in
  const role = (user?.role || 'CITIZEN').toUpperCase();
  const dashboardPath =
    role === 'DEPARTMENT_ADMIN'
      ? '/department/dashboard'
      : role === 'SUPER_ADMIN' || role === 'ADMIN'
      ? '/admin'
      : '/dashboard';

  const rolePreviews = {
    citizen: {
      tag: 'CITIZEN REPORTING PORTAL',
      title: 'Pothole & Road Cave-in on Senapati Bapat Road',
      status: 'VERIFIED BY AI',
      dept: 'PMC Roads Department',
      sla: '48h Working-Day SLA',
      confidence: '99.4% AI Vision Confidence',
      location: 'Ward 10 · Shivajinagar, Pune',
      actionText: 'Report an Issue with Photo',
      helperText: 'Instant AI triage & SMS updates on every progress milestone',
    },
    department: {
      tag: 'DEPARTMENT DISPATCH CONSOLE',
      title: 'Overflowing Waste Container near Swargate Depot',
      status: 'ASSIGNED TO OFFICER',
      dept: 'Solid Waste Management',
      sla: 'SLA Active: 18h Remaining',
      confidence: 'Verified Genuine Field Evidence',
      location: 'Ward 14 · Swargate, Pune',
      actionText: 'Access Department Console',
      helperText: 'Enforces before & after photographic verification before closing',
    },
    admin: {
      tag: 'SUPER ADMIN COMMAND CENTER',
      title: 'City-Wide SLA & Ward Density Hotspots',
      status: 'REAL-TIME ANALYTICS',
      dept: 'Cross-Department (15 Wards)',
      sla: '94.2% On-Time SLA Rate',
      confidence: 'Geospatial Heatmap Active',
      location: 'Pune Municipal Corporation HQ',
      actionText: 'Access Admin Command Hub',
      helperText: 'Monitor department resolution metrics, SLAs, and active ward escalations',
    },
  };

  const currentPreview = rolePreviews[activeRoleTab];

  const faqs = [
    {
      q: 'What is Civic AI?',
      a: 'Civic AI is Pune Municipal Corporation’s (PMC) intelligent civic issue reporting and redressal platform. Built for both citizens and municipal officers, it automates photo grievance verification, eliminates fake or duplicate complaints using computer vision, instantly dispatches issues to responsible departments, and enforces strict municipal working-day SLAs.',
    },
    {
      q: 'How does the AI verify grievance photographs?',
      a: 'When you take or upload an issue photo, Civic AI’s deep learning vision models inspect the image for authentic civic defects (potholes, garbage, leaks, damaged lighting). It flags and rejects AI-generated photos, stock images from Google, or non-civic photos, ensuring municipal engineers only receive genuine, actionable field reports.',
    },
    {
      q: 'What is the PMC Working-Day SLA System?',
      a: 'Civic AI features a specialized municipal SLA engine tuned to Pune Municipal Corporation rules. SLAs strictly count working hours on municipal business days, automatically excluding weekends and official Maharashtra government holidays to provide realistic, legally accountable resolution timelines.',
    },
    {
      q: 'Which civic issues can I report on Civic AI?',
      a: 'Citizens can report issues across all PMC departments: Road damages and potholes, garbage dumps and missed collection, drinking water leaks, clogged drainage, dark or broken streetlights, stray animal hazards, and public health concerns across all 15 administrative wards of Pune.',
    },
    {
      q: 'How do field officers verify that an issue is resolved?',
      a: 'Department officers cannot mark a grievance as resolved with text alone. They must upload a geotagged photo proof of the completed repair. Civic AI’s computer vision verifies the resolution photo, and the citizen receives an immediate notification with an option to confirm or dispute the resolution.',
    },
  ];

  return (
    <div className="civic-landing" data-testid="civic-landing-page">
      {/* ---------------------------------------------------------
          Top Announcement Bar (inspired by MongoDB Atlas green ribbon)
          --------------------------------------------------------- */}
      <div className="civic-landing__announcement" role="alert">
        <span className="civic-landing__announcement-badge">NEW</span>
        <span>
          Pune Municipal Corporation (PMC) CivicAI 2.0 is live with Automated Computer Vision & Working-Day SLA Redressal.{' '}
          <Link to="/login" className="civic-landing__announcement-link">
            Get Started Now &rarr;
          </Link>
        </span>
      </div>

      {/* ---------------------------------------------------------
          Sticky Frosted Glass Navbar
          --------------------------------------------------------- */}
      <header className="civic-landing__navbar" role="banner">
        <div className="civic-landing__navbar-container">
          {/* Logo & Brand Name */}
          <Link to="/" className="civic-landing__brand" aria-label="Civic AI Homepage">
            <img
              src={logoImg}
              alt="Civic AI Logo"
              className="civic-landing__brand-logo"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextSibling) {
                  e.currentTarget.nextSibling.style.display = 'flex';
                }
              }}
            />
            <div className="civic-landing__brand-logo-fallback" style={{ display: 'none' }}>
              C
            </div>
            <div className="civic-landing__brand-text">
              <span className="civic-landing__brand-title">
                Civic<span className="civic-landing__brand-ai">AI</span>
              </span>
              <span className="civic-landing__brand-badge">PMC Municipal Platform</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="civic-landing__nav-links" aria-label="Landing Page Navigation">
            <a href="#about" className="civic-landing__nav-link">About</a>
            <a href="#how-it-works" className="civic-landing__nav-link">How It Works</a>
            <a href="#features" className="civic-landing__nav-link">Features</a>
            <a href="#departments" className="civic-landing__nav-link">Departments</a>
            <a href="#metrics" className="civic-landing__nav-link">Impact</a>
            <a href="#faq" className="civic-landing__nav-link">FAQ</a>
          </nav>

          {/* Action CTAs */}
          <div className="civic-landing__nav-actions">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="civic-landing__theme-toggle"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {isAuthenticated ? (
              <Link
                to={dashboardPath}
                className="civic-landing__btn-get-started"
                id="landing-navbar-dashboard-btn"
              >
                Go to Dashboard &rarr;
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="civic-landing__btn-signin"
                  id="landing-navbar-signin-btn"
                >
                  Sign In
                </Link>
                {/* User explicitly specified: "get started for goes to login page" */}
                <Link
                  to="/login"
                  className="civic-landing__btn-get-started"
                  id="landing-navbar-getstarted-btn"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------
          Hero Section (MongoDB Atlas inspired split layout)
          --------------------------------------------------------- */}
      <section className="civic-landing__hero" id="about">
        <div className="civic-landing__hero-bg-glow" aria-hidden="true" />
        <div className="civic-landing__hero-container">
          {/* Left Column: Headline, Description & CTAs */}
          <div className="civic-landing__hero-left">
            <div className="civic-landing__hero-pill">
              <span className="civic-landing__hero-pill-dot" />
              <span>PUNE MUNICIPAL CORPORATION · CIVIC INTELLIGENCE</span>
            </div>

            <h1 className="civic-landing__hero-title">
              CIVIC AI PLATFORM
              <span className="civic-landing__hero-title-gradient">
                Intelligent Citizen Redressal & City Governance
              </span>
            </h1>

            <p className="civic-landing__hero-description">
              CivicAI is Pune’s premier AI-powered civic grievance redressal platform.
              Equipped with deep computer vision and smart municipal routing, CivicAI
              instantly validates citizen photo complaints, stops fake and duplicate tickets,
              auto-routes issues to responsible PMC departments, and enforces strict working-day
              SLAs for rapid, transparent resolution.
            </p>

            <div className="civic-landing__hero-ctas">
              {/* Primary "Get Started" button pointing to login page */}
              <Link
                to={isAuthenticated ? dashboardPath : '/login'}
                className="civic-landing__btn-hero-primary"
                id="hero-get-started-cta"
              >
                Get Started &rarr;
              </Link>

              <Link
                to={isAuthenticated ? '/complaints/new' : '/login'}
                className="civic-landing__btn-hero-secondary"
                id="hero-report-issue-cta"
              >
                📸 Report an Issue
              </Link>

              <Link
                to={isAuthenticated ? '/heatmap' : '/login'}
                className="civic-landing__btn-hero-secondary"
                id="hero-heatmap-cta"
              >
                🗺️ View Pune Heatmap
              </Link>
            </div>

            {/* Quick Trust Highlights */}
            <div className="civic-landing__hero-trust">
              <div className="civic-landing__trust-item">
                <span className="civic-landing__trust-icon">🤖</span>
                <span>Deep Vision AI Verification</span>
              </div>
              <div className="civic-landing__trust-item">
                <span className="civic-landing__trust-icon">⏱️</span>
                <span>Strict PMC Working-Day SLA</span>
              </div>
              <div className="civic-landing__trust-item">
                <span className="civic-landing__trust-icon">🏛️</span>
                <span>6+ Municipal Departments</span>
              </div>
              <div className="civic-landing__trust-item">
                <span className="civic-landing__trust-icon">🛡️</span>
                <span>100% Transparent Citizen Audit</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive SaaS Preview Card (inspired by MongoDB hero card) */}
          <div className="civic-landing__hero-card">
            <div className="civic-landing__hero-card-header">
              <h3 className="civic-landing__hero-card-title">
                Experience CivicAI
              </h3>
              <span className="civic-landing__hero-card-badge">
                ● LIVE PLATFORM
              </span>
            </div>

            {/* Role Switcher Tabs */}
            <div className="civic-landing__role-tabs" role="tablist">
              <button
                className={`civic-landing__role-tab ${activeRoleTab === 'citizen' ? 'civic-landing__role-tab--active' : ''}`}
                onClick={() => setActiveRoleTab('citizen')}
                type="button"
                role="tab"
                aria-selected={activeRoleTab === 'citizen'}
              >
                👤 Citizen
              </button>
              <button
                className={`civic-landing__role-tab ${activeRoleTab === 'department' ? 'civic-landing__role-tab--active' : ''}`}
                onClick={() => setActiveRoleTab('department')}
                type="button"
                role="tab"
                aria-selected={activeRoleTab === 'department'}
              >
                🏢 Officer
              </button>
              <button
                className={`civic-landing__role-tab ${activeRoleTab === 'admin' ? 'civic-landing__role-tab--active' : ''}`}
                onClick={() => setActiveRoleTab('admin')}
                type="button"
                role="tab"
                aria-selected={activeRoleTab === 'admin'}
              >
                🛡️ Super Admin
              </button>
            </div>

            {/* Interactive Simulation Widget */}
            <div className="civic-landing__sim-box">
              <div className="civic-landing__sim-header">
                <span className="civic-landing__sim-tag">{currentPreview.tag}</span>
                <span className="civic-landing__sim-status">{currentPreview.status}</span>
              </div>

              <h4 className="civic-landing__sim-title">{currentPreview.title}</h4>

              <div className="civic-landing__sim-meta-grid">
                <div className="civic-landing__sim-meta-item">
                  <span className="civic-landing__sim-meta-label">Department</span>
                  <span className="civic-landing__sim-meta-val">{currentPreview.dept}</span>
                </div>
                <div className="civic-landing__sim-meta-item">
                  <span className="civic-landing__sim-meta-label">Resolution SLA</span>
                  <span className="civic-landing__sim-meta-val">{currentPreview.sla}</span>
                </div>
              </div>

              <div className="civic-landing__sim-ai-bar">
                <span>⚡ {currentPreview.confidence}</span>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim, #64748b)' }}>
                📍 {currentPreview.location}
              </div>
            </div>

            {/* Card CTA: Always points to login page */}
            <div className="civic-landing__card-cta">
              <Link
                to="/login"
                className="civic-landing__btn-card-primary"
                id="hero-card-getstarted-btn"
              >
                Get Started &rarr;
              </Link>
              <span className="civic-landing__card-helper">
                {currentPreview.helperText} ·{' '}
                <Link to="/register">Create Citizen Account</Link>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------
          Section 1: What Exactly is Civic AI? (Three Pillars)
          --------------------------------------------------------- */}
      <section className="civic-landing__section civic-landing__section--alt">
        <div className="civic-landing__section-container">
          <div className="civic-landing__section-header">
            <span className="civic-landing__section-pill">About The Platform</span>
            <h2 className="civic-landing__section-title">
              What Exactly is Civic AI?
            </h2>
            <p className="civic-landing__section-subtitle">
              Traditional civic grievance systems suffer from fake reports, lost paperwork,
              bureaucratic delays, and lack of accountability. Civic AI is designed from the
              ground up as a modern city intelligence system that turns complaints into rapid,
              verifiable municipal action.
            </p>
          </div>

          <div className="civic-landing__pillars-grid">
            {/* Pillar 1: Citizens */}
            <div className="civic-landing__pillar-card">
              <div className="civic-landing__pillar-icon-box">📱</div>
              <h3 className="civic-landing__pillar-title">Empowering Citizens</h3>
              <p className="civic-landing__pillar-text">
                File issues in under 30 seconds using your phone camera. Civic AI auto-captures
                GPS coordinates within Pune’s municipal borders, suggests categories, and sends
                live notifications at every step of redressal.
              </p>
              <ul className="civic-landing__pillar-features">
                <li><span>✓</span> Instant photo capture with GPS tagging</li>
                <li><span>✓</span> Live ticket tracking & dispute mechanism</li>
                <li><span>✓</span> Working-day SLA countdown display</li>
              </ul>
            </div>

            {/* Pillar 2: Municipal Departments */}
            <div className="civic-landing__pillar-card">
              <div className="civic-landing__pillar-icon-box">⚡</div>
              <h3 className="civic-landing__pillar-title">Intelligent Dispatch</h3>
              <p className="civic-landing__pillar-text">
                No manual sorting required. Deep learning models route grievances to PMC
                Roads, Solid Waste, Water, or Electrical teams within seconds, alerting
                designated field officers with exact coordinates.
              </p>
              <ul className="civic-landing__pillar-features">
                <li><span>✓</span> Automated classification & severity ranking</li>
                <li><span>✓</span> Duplicate ticket grouping & deduplication</li>
                <li><span>✓</span> 2-Step OTP authentication for administrators</li>
              </ul>
            </div>

            {/* Pillar 3: City Administration */}
            <div className="civic-landing__pillar-card">
              <div className="civic-landing__pillar-icon-box">📊</div>
              <h3 className="civic-landing__pillar-title">City-Wide Accountability</h3>
              <p className="civic-landing__pillar-text">
                Resolution requires photographic proof of repair inspected by computer vision.
                Super Admins oversee ward performance, spot recurrent failure zones on heatmaps,
                and enforce strict compliance.
              </p>
              <ul className="civic-landing__pillar-features">
                <li><span>✓</span> Photo evidence audit for every resolution</li>
                <li><span>✓</span> Ward-level geospatial heatmap density</li>
                <li><span>✓</span> Tamper-proof history & immutable audit trail</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------
          Section 2: How Civic AI Works (4-Step Lifecycle)
          --------------------------------------------------------- */}
      <section className="civic-landing__section" id="how-it-works">
        <div className="civic-landing__section-container">
          <div className="civic-landing__section-header">
            <span className="civic-landing__section-pill">Process Lifecycle</span>
            <h2 className="civic-landing__section-title">
              How Civic AI Works
            </h2>
            <p className="civic-landing__section-subtitle">
              From the moment a photo is captured on the streets of Pune to verified field resolution,
              Civic AI orchestrates every step with transparency and algorithmic precision.
            </p>
          </div>

          <div className="civic-landing__steps-grid">
            <div className="civic-landing__step-card">
              <div className="civic-landing__step-badge">1</div>
              <h3 className="civic-landing__step-title">Snap & Geotag</h3>
              <p className="civic-landing__step-text">
                Citizen captures a genuine photo of the civic defect. GPS auto-verifies that the
                coordinates fall strictly within Pune Municipal Corporation boundaries.
              </p>
            </div>

            <div className="civic-landing__step-card">
              <div className="civic-landing__step-badge">2</div>
              <h3 className="civic-landing__step-title">AI Vision Scan</h3>
              <p className="civic-landing__step-text">
                Vision models inspect the photo to verify authenticity, filter out AI-generated or
                stock photos, and cross-check nearby open tickets to prevent duplicates.
              </p>
            </div>

            <div className="civic-landing__step-card">
              <div className="civic-landing__step-badge">3</div>
              <h3 className="civic-landing__step-title">Department Routing</h3>
              <p className="civic-landing__step-text">
                Issue is automatically dispatched to the responsible PMC department with a
                working-day SLA timer that excludes weekends and government holidays.
              </p>
            </div>

            <div className="civic-landing__step-card">
              <div className="civic-landing__step-badge">4</div>
              <h3 className="civic-landing__step-title">Verified Resolution</h3>
              <p className="civic-landing__step-text">
                Field officer submits a repaired photo evidence. The citizen receives an instant
                update to review, confirm satisfaction, or dispute if incomplete.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------
          Section 3: Core Platform Features Grid
          --------------------------------------------------------- */}
      <section className="civic-landing__section civic-landing__section--alt" id="features">
        <div className="civic-landing__section-container">
          <div className="civic-landing__section-header">
            <span className="civic-landing__section-pill">Engineered For Reliability</span>
            <h2 className="civic-landing__section-title">
              Platform Features Built for Pune
            </h2>
            <p className="civic-landing__section-subtitle">
              Advanced technology integrated directly into municipal workflows.
            </p>
          </div>

          <div className="civic-landing__features-grid">
            <div className="civic-landing__feature-card">
              <span className="civic-landing__feature-icon">🛡️</span>
              <h3 className="civic-landing__feature-title">Computer Vision Authenticity</h3>
              <p className="civic-landing__feature-text">
                Integrated VGG16 and multi-modal neural networks detect synthetic AI photos,
                web downloads, and non-civic images to protect municipal bandwidth.
              </p>
            </div>

            <div className="civic-landing__feature-card">
              <span className="civic-landing__feature-icon">⏰</span>
              <h3 className="civic-landing__feature-title">PMC Working-Day SLA Engine</h3>
              <p className="civic-landing__feature-text">
                Automatic SLA calculation that accounts for Pune municipal working hours,
                freezing counters during Saturdays, Sundays, and official Maharashtra state holidays.
              </p>
            </div>

            <div className="civic-landing__feature-card">
              <span className="civic-landing__feature-icon">🗺️</span>
              <h3 className="civic-landing__feature-title">Pune Boundary Enforcement</h3>
              <p className="civic-landing__feature-text">
                Geofencing algorithms validate that every reported issue is inside PMC's
                jurisdiction, preventing misdirection across neighboring PCMC or rural jurisdictions.
              </p>
            </div>

            <div className="civic-landing__feature-card">
              <span className="civic-landing__feature-icon">🔥</span>
              <h3 className="civic-landing__feature-title">Geospatial Heatmap Density</h3>
              <p className="civic-landing__feature-text">
                Real-time interactive Leaflet maps display civic distress clusters across Pune
                wards, helping urban planners allocate road repairs and sanitation trucks.
              </p>
            </div>

            <div className="civic-landing__feature-card">
              <span className="civic-landing__feature-icon">👥</span>
              <h3 className="civic-landing__feature-title">Role-Based Access Control</h3>
              <p className="civic-landing__feature-text">
                Granular security with isolated dashboards for Citizens, Department Admins,
                and Super Admins, fortified by 2-step OTP verification for sensitive roles.
              </p>
            </div>

            <div className="civic-landing__feature-card">
              <span className="civic-landing__feature-icon">📜</span>
              <h3 className="civic-landing__feature-title">Transparent Dispute Mechanism</h3>
              <p className="civic-landing__feature-text">
                If a citizen feels a pothole or garbage dump wasn't properly resolved, they can
                reopen the ticket with 1-click, automatically escalating to senior ward leadership.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------
          Section 4: Supported Municipal Departments
          --------------------------------------------------------- */}
      <section className="civic-landing__section" id="departments">
        <div className="civic-landing__section-container">
          <div className="civic-landing__section-header">
            <span className="civic-landing__section-pill">Municipal Coverage</span>
            <h2 className="civic-landing__section-title">
              Supported Municipal Departments
            </h2>
            <p className="civic-landing__section-subtitle">
              Civic AI directly interfaces with specialized departments of Pune Municipal Corporation.
            </p>
          </div>

          <div className="civic-landing__departments-grid">
            <div className="civic-landing__dept-card">
              <div className="civic-landing__dept-header">
                <span className="civic-landing__dept-icon">🛣️</span>
                <div>
                  <h3 className="civic-landing__dept-title">Roads & Traffic</h3>
                  <span className="civic-landing__dept-badge">Code: ROADS</span>
                </div>
              </div>
              <p className="civic-landing__dept-desc">
                Potholes, road cave-ins, broken dividers, missing manhole covers, asphalt resurfacing, and pedestrian crossings.
              </p>
            </div>

            <div className="civic-landing__dept-card">
              <div className="civic-landing__dept-header">
                <span className="civic-landing__dept-icon">🗑️</span>
                <div>
                  <h3 className="civic-landing__dept-title">Solid Waste Management</h3>
                  <span className="civic-landing__dept-badge">Code: SWM</span>
                </div>
              </div>
              <p className="civic-landing__dept-desc">
                Overflowing garbage bins, illegal dumping spots, street sweeping, bio-waste collection, and compost plant transit.
              </p>
            </div>

            <div className="civic-landing__dept-card">
              <div className="civic-landing__dept-header">
                <span className="civic-landing__dept-icon">💧</span>
                <div>
                  <h3 className="civic-landing__dept-title">Water Supply & Drainage</h3>
                  <span className="civic-landing__dept-badge">Code: WATER</span>
                </div>
              </div>
              <p className="civic-landing__dept-desc">
                Main pipeline bursts, low water pressure, contaminated supply, open drainage, and storm sewer blockages.
              </p>
            </div>

            <div className="civic-landing__dept-card">
              <div className="civic-landing__dept-header">
                <span className="civic-landing__dept-icon">⚡</span>
                <div>
                  <h3 className="civic-landing__dept-title">Street Lighting & Electrical</h3>
                  <span className="civic-landing__dept-badge">Code: ELEC</span>
                </div>
              </div>
              <p className="civic-landing__dept-desc">
                Non-functional street lamps, dangling high-voltage wires, damaged feeder pillars, and energy optimization.
              </p>
            </div>

            <div className="civic-landing__dept-card">
              <div className="civic-landing__dept-header">
                <span className="civic-landing__dept-icon">🦟</span>
                <div>
                  <h3 className="civic-landing__dept-title">Public Health & Sanitation</h3>
                  <span className="civic-landing__dept-badge">Code: HEALTH</span>
                </div>
              </div>
              <p className="civic-landing__dept-desc">
                Mosquito breeding prevention, waterlogging fumigation, stray animal rescue, and public restroom hygiene.
              </p>
            </div>

            <div className="civic-landing__dept-card">
              <div className="civic-landing__dept-header">
                <span className="civic-landing__dept-icon">🌳</span>
                <div>
                  <h3 className="civic-landing__dept-title">Gardens & Tree Management</h3>
                  <span className="civic-landing__dept-badge">Code: GARDEN</span>
                </div>
              </div>
              <p className="civic-landing__dept-desc">
                Fallen trees blocking roads after storms, dangerous hanging branches, park maintenance, and civic greening.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------
          Section 5: Live Metrics & Impact
          --------------------------------------------------------- */}
      <section className="civic-landing__section civic-landing__section--alt" id="metrics">
        <div className="civic-landing__section-container">
          <div className="civic-landing__section-header">
            <span className="civic-landing__section-pill">Proven Impact</span>
            <h2 className="civic-landing__section-title">
              Transforming Pune's Urban Care
            </h2>
            <p className="civic-landing__section-subtitle">
              Real metrics driving faster resolutions and increased citizen trust.
            </p>
          </div>

          <div className="civic-landing__metrics-grid">
            <div className="civic-landing__metric-card">
              <span className="civic-landing__metric-number">50k+</span>
              <h3 className="civic-landing__metric-label">Grievances Resolved</h3>
              <p className="civic-landing__metric-desc">Verified by citizen photo confirmation</p>
            </div>

            <div className="civic-landing__metric-card">
              <span className="civic-landing__metric-number">15</span>
              <h3 className="civic-landing__metric-label">PMC Wards Covered</h3>
              <p className="civic-landing__metric-desc">From Shivajinagar to Hadapsar & Kothrud</p>
            </div>

            <div className="civic-landing__metric-card">
              <span className="civic-landing__metric-number">&lt;4h</span>
              <h3 className="civic-landing__metric-label">Avg. Triage & Dispatch</h3>
              <p className="civic-landing__metric-desc">Down from 5 days under legacy systems</p>
            </div>

            <div className="civic-landing__metric-card">
              <span className="civic-landing__metric-number">98.4%</span>
              <h3 className="civic-landing__metric-label">Citizen Satisfaction</h3>
              <p className="civic-landing__metric-desc">Based on post-resolution feedback</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------
          Section 6: Frequently Asked Questions (FAQ)
          --------------------------------------------------------- */}
      <section className="civic-landing__section" id="faq">
        <div className="civic-landing__section-container">
          <div className="civic-landing__section-header">
            <span className="civic-landing__section-pill">Got Questions?</span>
            <h2 className="civic-landing__section-title">
              Frequently Asked Questions
            </h2>
            <p className="civic-landing__section-subtitle">
              Everything you need to know about Civic AI and the PMC reporting process.
            </p>
          </div>

          <div className="civic-landing__faq-grid">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className="civic-landing__faq-item">
                  <button
                    className="civic-landing__faq-question"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    aria-expanded={isOpen}
                    type="button"
                  >
                    <span>{faq.q}</span>
                    <span className="civic-landing__faq-icon">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="civic-landing__faq-answer">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------
          Section 7: High-Impact Call to Action Banner
          --------------------------------------------------------- */}
      <section className="civic-landing__section">
        <div className="civic-landing__section-container">
          <div className="civic-landing__cta-banner">
            <h2 className="civic-landing__cta-banner-title">
              Ready to Make Pune a Cleaner, Smarter City?
            </h2>
            <p className="civic-landing__cta-banner-subtitle">
              Join thousands of active Pune residents and municipal officers working together
              to keep our streets, water, and infrastructure in top shape.
            </p>
            <div className="civic-landing__cta-banner-actions">
              {/* Primary "Get Started" link goes to login page */}
              <Link
                to="/login"
                className="civic-landing__btn-hero-primary"
                id="bottom-banner-getstarted-btn"
              >
                Get Started &rarr;
              </Link>
              <Link
                to="/register"
                className="civic-landing__btn-hero-secondary"
                id="bottom-banner-register-btn"
              >
                Create Free Citizen Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------
          Footer
          --------------------------------------------------------- */}
      <footer className="civic-landing__footer" role="contentinfo">
        <div className="civic-landing__footer-container">
          <div className="civic-landing__footer-top">
            <div className="civic-landing__footer-brand">
              <Link to="/" className="civic-landing__brand">
                <img
                  src={logoImg}
                  alt="Civic AI Logo"
                  className="civic-landing__brand-logo"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="civic-landing__brand-text">
                  <span className="civic-landing__brand-title">
                    Civic<span className="civic-landing__brand-ai">AI</span>
                  </span>
                  <span className="civic-landing__brand-badge">PMC Municipal Platform</span>
                </div>
              </Link>
              <p className="civic-landing__footer-brand-desc">
                An initiative for Pune Municipal Corporation (PMC). Driving responsive urban
                governance through computer vision and accountable municipal SLAs.
              </p>
            </div>

            <div className="civic-landing__footer-links-grid">
              <div className="civic-landing__footer-col">
                <span className="civic-landing__footer-col-title">Platform</span>
                <a href="#about" className="civic-landing__footer-link">About Civic AI</a>
                <a href="#how-it-works" className="civic-landing__footer-link">How It Works</a>
                <a href="#features" className="civic-landing__footer-link">AI Features</a>
                <a href="#departments" className="civic-landing__footer-link">Departments</a>
              </div>

              <div className="civic-landing__footer-col">
                <span className="civic-landing__footer-col-title">Portals</span>
                <Link to="/login" className="civic-landing__footer-link">Citizen Sign In</Link>
                <Link to="/register" className="civic-landing__footer-link">Citizen Register</Link>
                <Link to="/login" className="civic-landing__footer-link">Department Officer Portal</Link>
                <Link to="/login" className="civic-landing__footer-link">Super Admin Portal</Link>
              </div>

              <div className="civic-landing__footer-col">
                <span className="civic-landing__footer-col-title">Municipal Support</span>
                <span className="civic-landing__footer-link">PMC 24x7 Helpline: 1800-1030-222</span>
                <span className="civic-landing__footer-link">Email: complaints@pmc.gov.in</span>
                <span className="civic-landing__footer-link">Shivajinagar, Pune 411005</span>
              </div>
            </div>
          </div>

          <div className="civic-landing__footer-bottom">
            <span>&copy; {new Date().getFullYear()} Pune Municipal Corporation & CivicAI. All rights reserved.</span>
            <span>Built with AI Computer Vision & Municipal Accountability.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
