import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './AICitizenChatbot.css';

const STORAGE_KEY = 'civicai_citizen_chat_messages';
const CONVERSATION_ID_KEY = 'civicai_citizen_chat_conv_id';

const SAFE_PROTOCOLS = ['https:', 'http:', 'tel:', 'mailto:'];

const isSafeUrl = (url) => {
  if (!url) return false;
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url, 'https://dummy.base');
    return SAFE_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Safely parses inline markdown (bold, links, code, italic)
 */
export const renderInlineMarkdown = (text, keyPrefix = 'inline') => {
  if (!text) return null;

  const pattern = /(!?\[([^\]]+)\]\(([^)]+)\))|(https?:\/\/[^\s<)]+)|(\*\*([^*]+)\*\*)|(__([^_]+)__)|(`([^`]+)`)|(\*([^*]+)\*)|(_([^_]+)_)/g;

  const elements = [];
  let lastIndex = 0;
  let match;
  let idx = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    const [
      ,
      isMdLink,
      linkText,
      linkUrl,
      rawUrl,
      isDoubleStarBold,
      boldStarText,
      isDoubleUnderBold,
      boldUnderText,
      isCode,
      codeText,
      isStarItalic,
      italicStarText,
      isUnderItalic,
      italicUnderText,
    ] = match;

    if (isMdLink) {
      const cleanUrl = (linkUrl || '').trim();
      if (isSafeUrl(cleanUrl)) {
        const isExternal = cleanUrl.startsWith('http');
        elements.push(
          <a
            key={`${keyPrefix}-link-${idx++}`}
            href={cleanUrl}
            className="civic-chat-link"
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
          >
            {renderInlineMarkdown(linkText, `${keyPrefix}-sub-${idx}`)}
          </a>
        );
      } else {
        elements.push(linkText);
      }
    } else if (rawUrl) {
      if (isSafeUrl(rawUrl)) {
        elements.push(
          <a
            key={`${keyPrefix}-rawurl-${idx++}`}
            href={rawUrl}
            className="civic-chat-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {rawUrl}
          </a>
        );
      } else {
        elements.push(rawUrl);
      }
    } else if (isDoubleStarBold || isDoubleUnderBold) {
      const bText = boldStarText || boldUnderText;
      elements.push(<strong key={`${keyPrefix}-bold-${idx++}`}>{bText}</strong>);
    } else if (isCode) {
      elements.push(<code key={`${keyPrefix}-code-${idx++}`}>{codeText}</code>);
    } else if (isStarItalic || isUnderItalic) {
      const iText = italicStarText || italicUnderText;
      elements.push(<em key={`${keyPrefix}-italic-${idx++}`}>{iText}</em>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements;
};

/**
 * Cute Animated Robot Mascot SVG Icon
 */
export const CuteRobotAvatar = ({ size = 44, isHappy = true }) => {
  return (
    <div className="civic-robot-avatar" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="civic-robot-svg"
      >
        {/* Antenna */}
        <circle cx="50" cy="12" r="5" fill="#38bdf8" />
        <line x1="50" y1="17" x2="50" y2="30" stroke="#818cf8" strokeWidth="4" strokeLinecap="round" />
        <circle cx="50" cy="12" r="7" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />

        {/* Ears / Side Screws */}
        <rect x="16" y="44" width="6" height="14" rx="3" fill="#6366f1" />
        <rect x="78" y="44" width="6" height="14" rx="3" fill="#6366f1" />

        {/* Head Base */}
        <rect x="22" y="28" width="56" height="46" rx="14" fill="url(#robotHeadGrad)" stroke="#818cf8" strokeWidth="2.5" />

        {/* Visor Screen */}
        <rect x="28" y="34" width="44" height="24" rx="8" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />

        {/* Expressive Glowing Eyes */}
        <circle cx="39" cy="45" r="4.5" fill="#38bdf8">
          <animate attributeName="opacity" values="1;1;0.2;1" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle cx="61" cy="45" r="4.5" fill="#38bdf8">
          <animate attributeName="opacity" values="1;1;0.2;1" dur="4s" repeatCount="indefinite" />
        </circle>

        {/* Eye Highlights */}
        <circle cx="41" cy="43.5" r="1.5" fill="#ffffff" />
        <circle cx="63" cy="43.5" r="1.5" fill="#ffffff" />

        {/* Robot Smile */}
        {isHappy ? (
          <path d="M42 63 Q50 69 58 63" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        ) : (
          <line x1="44" y1="64" x2="56" y2="64" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
        )}

        {/* Cheeks */}
        <circle cx="33" cy="62" r="3" fill="#f43f5e" opacity="0.6" />
        <circle cx="67" cy="62" r="3" fill="#f43f5e" opacity="0.6" />

        {/* Body Peek */}
        <rect x="36" y="74" width="28" height="18" rx="6" fill="#1e1b4b" stroke="#6366f1" strokeWidth="2" />
        <circle cx="50" cy="83" r="3.5" fill="#10b981" />

        <defs>
          <linearGradient id="robotHeadGrad" x1="22" y1="28" x2="78" y2="74" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1e1b4b" />
            <stop offset="1" stopColor="#312e81" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export const AICitizenChatbot = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [conversationId, setConversationId] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Play subtle futuristic pop sound using Web Audio API
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio autoplay may be suppressed by browser
    }
  };

  // Initial welcome message from CivicBot
  const createInitialMessage = (displayName) => ({
    id: 'welcome-msg',
    role: 'assistant',
    content: `👋 Hello${displayName ? ` **${displayName}**` : ''}! I am **CivicBot 🤖**, the official AI mascot for **Pune Municipal Corporation (PMC)** on Civic AI!

I can assist you exclusively with:
• **Reporting Civic Issues:** Potholes, garbage accumulation, water pipeline leaks, dark streetlights, drainage chokes.
• **Tracking Complaint Status:** Enter your PMC complaint ID or check your recent grievances.
• **PMC Department & SLAs:** Learn which department handles your issue and target resolution timelines.
• **Official PMC Helplines:** Access emergency and ward contacts.

How can I assist your neighborhood today?`,
    suggestedActions: [
      { label: 'Report Pothole', path: '/complaints/new', variant: 'primary' },
      { label: 'Garbage Dump Issue', path: '/complaints/new' },
      { label: 'Water Leak Help', path: '/complaints/new' },
      { label: 'Track My Complaint', path: '/complaints' },
      { label: 'Pune City Heatmap', path: '/heatmap' },
      { label: 'PMC Helplines', text: 'What are the official PMC helpline numbers?' },
    ],
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedConvId = localStorage.getItem(CONVERSATION_ID_KEY);
    if (savedConvId) {
      setConversationId(savedConvId);
    }

    const savedMessages = localStorage.getItem(STORAGE_KEY);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch {
        // Fallback to initial
      }
    }

    const initial = [createInitialMessage(user?.name || user?.fullName)];
    setMessages(initial);
  }, [user]);

  // Save messages to localStorage when updated
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      inputRef.current?.focus();
    }
  }, [isOpen, messages, isLoading]);

  const handleOpenChat = () => {
    setIsOpen(true);
    setShowTeaser(false);
  };

  const handleCloseChat = () => {
    setIsOpen(false);
  };

  const handleClearChat = () => {
    const freshConvId = `conv-${Date.now().toString(36)}`;
    setConversationId(freshConvId);
    localStorage.setItem(CONVERSATION_ID_KEY, freshConvId);

    const initial = [createInitialMessage(user?.name || user?.fullName)];
    setMessages(initial);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  };

  const handleSendMessage = async (textToSend) => {
    const messageText = (textToSend || inputValue).trim();
    if (!messageText || isLoading) return;

    setInputValue('');

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      // Build history for backend API (last 6 messages)
      const history = nextMessages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const payload = {
        message: messageText,
        conversationId: conversationId || undefined,
        history,
      };

      const res = await chatApi.sendMessage(payload);

      if (res?.success && res?.data) {
        if (res.data.conversationId && res.data.conversationId !== conversationId) {
          setConversationId(res.data.conversationId);
          localStorage.setItem(CONVERSATION_ID_KEY, res.data.conversationId);
        }

        const botReply = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: res.data.reply,
          suggestedActions: res.data.suggestedActions || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, botReply]);
        playChime();
      } else {
        throw new Error('Unexpected response format');
      }
    } catch {
      // Fallback friendly error
      const errorReply = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `I am currently experiencing network latency reaching PMC Civic servers. 

For urgent civic hazards (flooding, open live wires, major pipeline bursts), please call the PMC 24x7 Citizen Helpline directly at **[1800-1030-222](tel:18001030222)**.`,
        suggestedActions: [
          { label: 'Report Grievance', path: '/complaints/new', variant: 'primary' },
          { label: 'View Dashboard', path: '/dashboard' },
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action) => {
    if (action.path) {
      setIsOpen(false);
      navigate(action.path);
    } else if (action.text) {
      handleSendMessage(action.text);
    }
  };

  return (
    <div className="civic-chatbot-wrapper" data-testid="civic-ai-chatbot">
      {/* ---------------------------------------------------------
          Speech Bubble Teaser / Invitation (Visitor click magnet)
          --------------------------------------------------------- */}
      {showTeaser && !isOpen && (
        <div
          className="civic-chatbot-teaser"
          onClick={handleOpenChat}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleOpenChat()}
          aria-label="Open CivicBot Assistant"
        >
          <button
            className="civic-chatbot-teaser__close"
            onClick={(e) => {
              e.stopPropagation();
              setShowTeaser(false);
            }}
            title="Dismiss"
            aria-label="Dismiss greeting"
          >
            &times;
          </button>
          <div className="civic-chatbot-teaser__content">
            <span style={{ fontSize: '1.25rem' }}>🤖</span>
            <div>
              <strong>Hi! I'm CivicBot</strong>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                Need help with Pune civic issues? Click me!
              </div>
            </div>
          </div>
          <div className="civic-chatbot-teaser__arrow" />
        </div>
      )}

      {/* ---------------------------------------------------------
          Floating Launcher Button (Cute AI Robot)
          --------------------------------------------------------- */}
      {!isOpen && (
        <button
          className="civic-chatbot-launcher"
          onClick={handleOpenChat}
          data-testid="chatbot-launcher-btn"
          aria-label="Open CivicBot AI Support Chat"
          title="Chat with CivicBot AI"
        >
          <CuteRobotAvatar size={42} isHappy={true} />
          <div className="civic-chatbot-launcher__text">
            <span className="civic-chatbot-launcher__title">
              CivicBot AI
              <span className="civic-chatbot-beacon" aria-hidden="true" />
            </span>
            <span className="civic-chatbot-launcher__subtitle">Pune Civic Care</span>
          </div>
        </button>
      )}

      {/* ---------------------------------------------------------
          Chat Window Modal
          --------------------------------------------------------- */}
      {isOpen && (
        <div
          className="civic-chat-window"
          role="dialog"
          aria-label="CivicBot AI Support Chatbot"
          data-testid="chatbot-window"
        >
          {/* Header */}
          <div className="civic-chat-header">
            <div className="civic-chat-header__brand">
              <CuteRobotAvatar size={34} isHappy={!isLoading} />
              <div className="civic-chat-header__info">
                <span className="civic-chat-header__title">
                  CivicBot AI
                  <span className="civic-chatbot-beacon" />
                </span>
                <span className="civic-chat-header__status">
                  PMC Municipal Assistant · Online
                </span>
              </div>
            </div>

            <div className="civic-chat-header__actions">
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled((prev) => !prev)}
                className="civic-chat-header__btn"
                title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
                aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
              >
                {soundEnabled ? '🔔' : '🔕'}
              </button>

              {/* Clear / Restart Chat */}
              <button
                onClick={handleClearChat}
                className="civic-chat-header__btn"
                title="Restart conversation"
                aria-label="Restart conversation"
              >
                🔄
              </button>

              {/* Close Button */}
              <button
                onClick={handleCloseChat}
                className="civic-chat-header__btn"
                title="Minimize chat"
                aria-label="Close chat"
                data-testid="chatbot-close-btn"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Strict Civic AI Guardrail Bar */}
          <div className="civic-chat-guardrail-bar">
            <span>🛡️</span>
            <span>Strictly dedicated to Pune Municipal Corporation & Civic AI</span>
          </div>

          {/* Messages Container */}
          <div className="civic-chat-messages" role="log" aria-live="polite">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`civic-chat-message-row civic-chat-message-row--${msg.role === 'user' ? 'user' : 'bot'}`}
              >
                {msg.role !== 'user' && (
                  <div className="civic-chat-avatar-mini">
                    <CuteRobotAvatar size={24} />
                  </div>
                )}

                <div className={`civic-chat-bubble civic-chat-bubble--${msg.role === 'user' ? 'user' : 'bot'}`}>
                  {renderInlineMarkdown(msg.content)}

                  {/* Suggested action buttons */}
                  {Array.isArray(msg.suggestedActions) && msg.suggestedActions.length > 0 && (
                    <div className="civic-chat-actions">
                      {msg.suggestedActions.map((action, idx) => (
                        <button
                          key={idx}
                          className={`civic-chat-action-btn ${action.variant === 'primary' ? 'civic-chat-action-btn--primary' : ''}`}
                          onClick={() => handleActionClick(action)}
                        >
                          {action.label} &rarr;
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="civic-chat-timestamp">{msg.timestamp}</div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="civic-chat-message-row civic-chat-message-row--bot">
                <div className="civic-chat-avatar-mini">
                  <CuteRobotAvatar size={24} />
                </div>
                <div className="civic-chat-bubble civic-chat-bubble--bot">
                  <div className="civic-chat-typing">
                    <span className="civic-chat-typing-dot" />
                    <span className="civic-chat-typing-dot" />
                    <span className="civic-chat-typing-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="civic-chat-footer">
            <form
              className="civic-chat-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <input
                ref={inputRef}
                type="text"
                className="civic-chat-input"
                placeholder="Ask about potholes, garbage, water, SLAs..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                maxLength={1000}
                aria-label="Civic chat message input"
              />
              <button
                type="submit"
                className="civic-chat-send-btn"
                disabled={!inputValue.trim() || isLoading}
                aria-label="Send message"
              >
                ➤
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
