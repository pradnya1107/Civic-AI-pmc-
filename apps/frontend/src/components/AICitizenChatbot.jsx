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
 * Intelligent Client-side Response Generator for Pune Municipal Corporation
 * Guarantees rich, multi-turn answers even when the backend is offline or on Vercel preview
 */
export const getLocalCivicResponse = (query, displayName) => {
  const q = (query || '').toLowerCase().trim();

  // Pothole / Roads
  if (/pothole|crater|asphalt|tar road|divider|cave-in|swargate|fc road|katraj|baner|kothrud/i.test(q)) {
    return {
      reply: `🛣️ **Roads & Infrastructure Department (PMC)**
• **Issue Type:** Pothole / Damaged Road Surface
• **Target SLA:** **2 Working Days (48 Hours)**
• **Municipal Action:** Dispatching road maintenance truck for asphalt cold/hot-mix patching.
• **Roads Helpline:** **[020-25501000](tel:02025501000)**

You can upload a photo of the road defect for automatic AI severity scoring!`,
      suggestedActions: [
        { label: 'Report Road Pothole', path: '/complaints/new', variant: 'primary' },
        { label: 'View Pune Heatmap', path: '/heatmap' },
        { label: 'Track Existing Complaint', path: '/complaints' },
      ],
    };
  }

  // Garbage / Waste / Solid Waste
  if (/garbage|waste|trash|dump|overflow|debris|litter|cleanliness|kachra/i.test(q)) {
    return {
      reply: `🗑️ **Solid Waste Management Department (PMC)**
• **Issue Type:** Overflowing Waste / Unattended Community Dump
• **Target SLA:** **1 Working Day (24 Hours)**
• **Municipal Action:** Mechanical collection vehicle and sanitary inspectors dispatched for clearance.
• **PMC Waste WhatsApp Helpline:** **[9689900002](tel:9689900002)**

Please submit a photo on the portal to alert your ward sanitary officer immediately!`,
      suggestedActions: [
        { label: 'Report Garbage Dump', path: '/complaints/new', variant: 'primary' },
        { label: 'My Complaints', path: '/complaints' },
      ],
    };
  }

  // Water / Pipeline / Leakage
  if (/water|pipeline|leak|burst|contamination|drinking water|pressure|pani/i.test(q)) {
    return {
      reply: `💧 **Water Supply Department (PMC)**
• **Issue Type:** Pipeline Burst / Supply Disruption / Contamination
• **Target SLA:** **24 Hours** for pipeline bursts / **48 Hours** for pressure issues.
• **Water Control Room:** **[020-25501383](tel:02025501383)**

Municipal water engineering teams address main pipeline failures on high priority.`,
      suggestedActions: [
        { label: 'Report Water Leak', path: '/complaints/new', variant: 'primary' },
        { label: 'PMC Helplines', text: 'What are the official PMC helpline numbers?' },
      ],
    };
  }

  // Drainage / Sewer / Gutters / Flood
  if (/drain|sewer|gutter|waterlog|flood|clog|nalah|drainage/i.test(q)) {
    return {
      reply: `🌊 **Drainage & Sewerage Department (PMC)**
• **Issue Type:** Blocked Gutter / Stormwater Backflow / Overflow
• **Target SLA:** **24 Hours**
• **Drainage Emergency Cell:** **[020-25501269](tel:02025501269)**

Suction jetting machines and municipal cleaning crews are deployed for obstructed drains.`,
      suggestedActions: [
        { label: 'Report Drainage Block', path: '/complaints/new', variant: 'primary' },
      ],
    };
  }

  // Streetlights / Electrical
  if (/light|street\s*light|dark|pole|wire|cable|bulb/i.test(q)) {
    return {
      reply: `💡 **Street Lighting & Electrical Department (PMC)**
• **Issue Type:** Non-Functional Streetlight / Damaged Pole
• **Target SLA:** **2 Working Days (48 Hours)**
• **Lighting Cell:** **[1800-1030-222](tel:18001030222)**

Repairs include timer resetting, LED driver replacement, and cabling safety checks.`,
      suggestedActions: [
        { label: 'Report Streetlight Outage', path: '/complaints/new', variant: 'primary' },
      ],
    };
  }

  // Tracking complaints
  if (/track|status|my complaint|complaint id|ticket|progress|where is my/i.test(q)) {
    return {
      reply: `🔍 **Grievance Tracking on Civic AI**
• Every registered issue receives a unique tracking number (e.g., \`CIV-REG-001\`).
• Visit the **[My Complaints](/complaints)** dashboard to view real-time status transitions (\`SUBMITTED\` ➔ \`UNDER_REVIEW\` ➔ \`ASSIGNED\` ➔ \`IN_PROGRESS\` ➔ \`RESOLVED\`).
• Assigned field officer names and remaining working-day SLA deadlines are displayed on each ticket.`,
      suggestedActions: [
        { label: 'Go to My Complaints', path: '/complaints', variant: 'primary' },
        { label: 'Report New Issue', path: '/complaints/new' },
      ],
    };
  }

  // Helplines / Emergency Contacts
  if (/helpline|phone|number|contact|call|emergency|customer care/i.test(q)) {
    return {
      reply: `📞 **Official Pune Municipal Corporation (PMC) Helplines:**
• **Central PMC Citizen Toll-Free:** **[1800-1030-222](tel:18001030222)** (24x7)
• **PMC Head Office Switchboard:** **[020-25501000](tel:02025501000)**
• **Solid Waste & Garbage WhatsApp:** **[9689900002](tel:9689900002)**
• **Water Supply Emergency Cell:** **[020-25501383](tel:02025501383)**
• **Drainage Control Room:** **[020-25501269](tel:02025501269)**
• **Disaster Management Cell (Monsoon/Floods):** **[020-25506800](tel:02025506800)**`,
      suggestedActions: [
        { label: 'Report Grievance Online', path: '/complaints/new', variant: 'primary' },
        { label: 'View Heatmap', path: '/heatmap' },
      ],
    };
  }

  // Working-Day SLA & Holidays
  if (/sla|working day|holiday|timeline|how long|resolution time/i.test(q)) {
    return {
      reply: `🗓️ **PMC Working-Day SLA System**
• Official PMC working days are **Monday through Friday (9:30 AM – 6:00 PM)**, excluding gazetted public holidays.
• Standard SLAs by severity:
  - **CRITICAL:** **1 Working Day (24x7 Emergency protocol)**
  - **HIGH:** **2 Working Days (48 Hours)**
  - **MEDIUM:** **4 Working Days**
  - **LOW:** **7 Working Days**
• Automated AI escalations occur if SLAs are near expiry!`,
      suggestedActions: [
        { label: 'Report an Issue Now', path: '/complaints/new', variant: 'primary' },
      ],
    };
  }

  // Fallback greeting / civic guidance
  return {
    reply: `🤖 I am **CivicBot**, your official Pune Municipal Corporation civic guide!

I can assist you with:
• **Road Potholes & Infrastructure** (48h SLA)
• **Solid Waste & Overflowing Garbage** (24h SLA)
• **Water Pipeline Bursts & Contamination** (24h SLA)
• **Drainage Chokes & Stormwater Flooding** (24h SLA)
• **Streetlight Outages & Dark Spots** (48h SLA)
• **Grievance Tracking & Field Officer Status**

Please select an option below or type your municipal question!`,
    suggestedActions: [
      { label: 'Report Pothole', path: '/complaints/new', variant: 'primary' },
      { label: 'Report Garbage Dump', path: '/complaints/new' },
      { label: 'Water Leak Help', path: '/complaints/new' },
      { label: 'Track My Grievance', path: '/complaints' },
      { label: 'Official PMC Helplines', text: 'What are the official PMC helpline numbers?' },
    ],
  };
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

  // Chat window state: stays open across page transitions until user clicks the cross (✕)
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return sessionStorage.getItem('civicai_citizen_chat_open') === 'true';
    } catch {
      return false;
    }
  });

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
    try {
      sessionStorage.setItem('civicai_citizen_chat_open', 'true');
    } catch {}
  };

  // Chatbot only closes when the user clicks the cross button (✕)
  const handleCloseChat = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem('civicai_citizen_chat_open', 'false');
    } catch {}
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
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Append user message to full multi-turn conversation thread
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build history for backend API (last 8 messages)
      const history = [...messages, userMessage]
        .slice(-8)
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
          id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      // Intelligent PMC domain response: continuous multi-turn replies even when offline/Vercel preview
      const localResponse = getLocalCivicResponse(messageText, user?.name || user?.fullName);
      const botReply = {
        id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        content: localResponse.reply,
        suggestedActions: localResponse.suggestedActions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botReply]);
      playChime();
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action) => {
    if (action.path) {
      // IMPORTANT: DO NOT close the chat window! The user must click the cross (✕) to exit
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
