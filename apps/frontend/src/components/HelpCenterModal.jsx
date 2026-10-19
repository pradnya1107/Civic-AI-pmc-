import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export const HelpCenterModal = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [feedbackCategory, setFeedbackCategory] = useState('Suggestion');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackSubmitted(false);
      setFeedbackText('');
      onClose();
    }, 2000);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="help-modal-title">
      <div className="modal-content help-modal-content">
        <div className="modal-header">
          <div className="d-flex align-center gap-2">
            <div className="icon-circle icon-circle--teal" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h2 id="help-modal-title" className="modal-title">{t('helpTitle', 'Pune Municipal Corporation Help Center')}</h2>
              <p className="modal-subtitle">24x7 Citizen Grievance Assistance & Escalation Desk</p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close help center"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* Emergency Helplines */}
          <section className="helpline-banner" aria-label="Official PMC Helplines">
            <div className="helpline-row">
              <span className="helpline-icon">📞</span>
              <div>
                <strong>PMC 24x7 Citizen Helpline (Toll-Free):</strong>
                <a href="tel:18001030222" className="helpline-number">1800-1030-222</a>
              </div>
            </div>
            <div className="helpline-row">
              <span className="helpline-icon">💬</span>
              <div>
                <strong>WhatsApp Grievance Desk:</strong>
                <a href="https://wa.me/919689900002" target="_blank" rel="noopener noreferrer" className="helpline-number">+91 96899 00002</a>
              </div>
            </div>
            <div className="helpline-row">
              <span className="helpline-icon">🏛️</span>
              <div>
                <strong>PMC Central Headquarters:</strong>
                <span>Shivajinagar, Pune 411005 | Email: info@punecorporation.org</span>
              </div>
            </div>
          </section>

          {/* Quick FAQs */}
          <section className="faq-section mt-3">
            <h3 className="section-subtitle">Frequently Asked Questions</h3>
            <details className="faq-item">
              <summary>How does Gemini AI analyze my reported photo?</summary>
              <p>Our multimodal AI automatically detects the category (e.g. Pothole, Garbage, Waterlogging), measures visual severity (Low, Medium, High, Critical), estimates resolution SLA, and routes it directly to the responsible Pune Municipal Corporation department.</p>
            </details>
            <details className="faq-item">
              <summary>What are the SLA turnaround timelines?</summary>
              <p>Critical issues (main road cave-ins, live electrical wires) have a 12-hour resolution SLA. High priority issues have 24 hours. Standard grievances have a 48-hour SLA deadline enforced by automated officer escalation.</p>
            </details>
            <details className="faq-item">
              <summary>Can I dispute an unsatisfactory repair?</summary>
              <p>Yes! Once an officer marks a grievance resolved with after-repair photo proof, you have the option to confirm satisfaction or dispute the resolution with photographic evidence to reopen the grievance immediately.</p>
            </details>
          </section>

          {/* Citizen Feedback Form */}
          <section className="feedback-section mt-3">
            <h3 className="section-subtitle">Send Feedback to Municipal Commissioner</h3>
            {feedbackSubmitted ? (
              <div className="alert-banner alert-banner--success">
                Thank you! Your feedback has been submitted to PMC Citizen Services.
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="feedback-form">
                <div className="form-group mb-2">
                  <label htmlFor="feedback-cat" className="form-label text-xs">Feedback Type</label>
                  <select
                    id="feedback-cat"
                    className="form-select form-select-sm"
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value)}
                  >
                    <option value="Suggestion">Suggestion / Improvement</option>
                    <option value="Staff Appreciation">Civic Staff Appreciation</option>
                    <option value="Portal Issue">Technical Portal Feedback</option>
                    <option value="Escalation">Grievance Escalation</option>
                  </select>
                </div>
                <div className="form-group mb-2">
                  <label htmlFor="feedback-text" className="form-label text-xs">Your Message</label>
                  <textarea
                    id="feedback-text"
                    className="form-textarea"
                    rows="3"
                    placeholder="Share your experience or suggestions for PMC civic services..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    required
                  />
                </div>
                <div className="d-flex justify-end gap-2">
                  <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
                    Close
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Submit Feedback
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterModal;
