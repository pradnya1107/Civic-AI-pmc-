import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'civicai_citizen_chat_messages';
const INITIAL_CONVERSATION_ID_KEY = 'civicai_citizen_chat_conv_id';

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
 * Safely parses inline markdown tokens (bold, links, code, italic, raw URLs)
 * into native React elements without raw HTML strings or XSS vulnerabilities.
 */
export const renderInlineMarkdown = (text, keyPrefix = 'inline') => {
  if (!text) return null;

  // Regex pattern matching:
  // 1. Markdown links: [text](url)
  // 2. Raw URLs: https?://...
  // 3. Bold text: **text** or __text__
  // 4. Inline code: `code`
  // 5. Italic text: *text* or _text_
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
      elements.push(
        <strong key={`${keyPrefix}-bold-${idx++}`} className="civic-chat-strong">
          {renderInlineMarkdown(bText, `${keyPrefix}-subb-${idx}`)}
        </strong>
      );
    } else if (isCode) {
      elements.push(
        <code key={`${keyPrefix}-code-${idx++}`} className="civic-chat-inline-code">
          {codeText}
        </code>
      );
    } else if (isStarItalic || isUnderItalic) {
      const iText = italicStarText || italicUnderText;
      elements.push(
        <em key={`${keyPrefix}-italic-${idx++}`} className="civic-chat-em">
          {iText}
        </em>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements.length === 1 ? elements[0] : elements;
};

/**
 * Parses block-level structure (paragraphs, bullet lists, numbered lists, headings)
 * and eliminates all raw Markdown artifacts (**bold**, • lists, [link](url)).
 */
export const FormattedChatMessage = ({ content }) => {
  if (!content) return null;

  const rawLines = content.split('\n');
  const blocks = [];
  let currentList = null; // { type: 'ul' | 'ol', items: [] }

  const flushList = () => {
    if (currentList) {
      blocks.push({
        type: currentList.type,
        items: currentList.items,
      });
      currentList = null;
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // Empty lines trigger list flushing and section separation
    if (!trimmed) {
      flushList();
      continue;
    }

    // Bullet items: lines beginning with •, *, or -
    const bulletMatch = trimmed.match(/^([•\*\-])\s+(.*)$/);
    if (bulletMatch && !trimmed.startsWith('***')) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[2]);
      continue;
    }

    // Numbered items: lines beginning with 1. or 2.
    const numberedMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)$/);
    if (numberedMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numberedMatch[2]);
      continue;
    }

    // Normal text lines flush any open list
    flushList();

    // Heading lines: ### or ##
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        text: headingMatch[2],
      });
      continue;
    }

    blocks.push({
      type: 'p',
      text: trimmed,
    });
  }

  flushList();

  return (
    <div className="civic-chat-formatted-body">
      {blocks.map((block, bIdx) => {
        if (block.type === 'ul') {
          return (
            <ul key={`ul-${bIdx}`} className="civic-chat-list civic-chat-list--bullet">
              {block.items.map((item, itemIdx) => (
                <li key={`li-${itemIdx}`} className="civic-chat-list-item">
                  {renderInlineMarkdown(item, `ul-${bIdx}-li-${itemIdx}`)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol key={`ol-${bIdx}`} className="civic-chat-list civic-chat-list--numbered">
              {block.items.map((item, itemIdx) => (
                <li key={`li-${itemIdx}`} className="civic-chat-list-item">
                  {renderInlineMarkdown(item, `ol-${bIdx}-li-${itemIdx}`)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === 'heading') {
          return (
            <h4 key={`h-${bIdx}`} className="civic-chat-heading">
              {renderInlineMarkdown(block.text, `h-${bIdx}`)}
            </h4>
          );
        }

        return (
          <p key={`p-${bIdx}`} className="civic-chat-p">
            {renderInlineMarkdown(block.text, `p-${bIdx}`)}
          </p>
        );
      })}
    </div>
  );
};

// Initial welcome guidance with options displayed directly after message
const DEFAULT_WELCOME_MESSAGE = {
  id: 'welcome-msg',
  role: 'assistant',
  content: `👋 Hi! I'm **CivicAI Assistant**, your official smart civic guide for Pune Municipal Corporation (PMC).

I can help you:
• **Report civic defects** (potholes, garbage, water leaks, streetlights, drainage)
• **Check complaint status & track progress**
• **Find the right municipal department**
• **Access official PMC helpline information**

How can I help you today?`,
  suggestedActions: [
    { label: '📝 Report Issue', path: '/complaints/new', variant: 'primary' },
    { label: '🔍 Track Status', text: 'Check status of my complaints' },
    { label: '🏛️ Departments', text: 'Which municipal department handles my issue?' },
    { label: '📞 Help', text: 'What are the official PMC helpline numbers?' },
  ],
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export const AICitizenChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Safe fallback
    }
    return [DEFAULT_WELCOME_MESSAGE];
  });

  const [conversationId, setConversationId] = useState(() => {
    try {
      return sessionStorage.getItem(INITIAL_CONVERSATION_ID_KEY) || '';
    } catch {
      return '';
    }
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Save conversation state to session storage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      if (conversationId) {
        sessionStorage.setItem(INITIAL_CONVERSATION_ID_KEY, conversationId);
      }
    } catch {
      // Storage restricted fallback
    }
  }, [messages, conversationId]);

  // Scroll to bottom smoothly when messages change
  useEffect(() => {
    if (isOpen && typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when chat window opens
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSendMessage = async (customText = null) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || isLoading) return;

    setInputMessage('');

    const userMessageId = `user-${Date.now()}`;
    const userMsg = {
      id: userMessageId,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setIsLoading(true);

    try {
      const historyContext = updatedHistory
        .filter((m) => m.id !== 'welcome-msg')
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await chatApi.sendMessage({
        message: textToSend,
        conversationId: conversationId || undefined,
        history: historyContext,
      });

      const replyData = res?.data || res;
      const assistantMsg = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: replyData?.reply || 'I am processing your municipal request. How else may I assist?',
        suggestedActions: replyData?.suggestedActions || [],
        provider: replyData?.provider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (replyData?.conversationId) {
        setConversationId(replyData.conversationId);
      }

      setMessages((prev) => [...prev, assistantMsg]);
      if (!isOpen) {
        setHasUnread(true);
      }
    } catch (err) {
      console.error('[AICitizenChatbot] Request failed:', err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        isError: true,
        content: '⚠️ Unable to connect to CivicAI Assistant right now. You can retry your message or check official PMC helplines directly.',
        suggestedActions: [
          { label: '🔄 Try Again', retryText: textToSend },
          { label: '📝 Report Issue', path: '/complaints/new', variant: 'primary' },
          { label: '📞 Call 1800-1030-222', action: 'call_helpline' },
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action) => {
    if (!action) return;

    // 1. Help Actions (e.g. PMC Help, Help, PMC Helplines):
    // Always render help content inside the existing chat conversation and keep the chatbot open
    const isHelpAction =
      action.action === 'help' ||
      action.action === 'pmc_help' ||
      /\b(pmc\s+)?help(lines?)?\b/i.test(action.label || '');

    if (isHelpAction) {
      handleSendMessage(action.text || 'What are the official PMC helpline numbers?');
      return;
    }

    // 2. Dashboard Navigation (e.g. Go Dashboard, Go to Dashboard, path === '/dashboard'):
    // Intentionally close the chatbot and navigate to /dashboard so citizen can view the dashboard
    const isDashboardAction =
      action.path === '/dashboard' ||
      /\b(go\s+)?(to\s+)?dashboard\b/i.test(action.label || '');

    if (isDashboardAction) {
      setIsOpen(false);
      navigate('/dashboard');
      return;
    }

    // 3. Other Path Navigations (e.g. /complaints/new):
    if (action.path) {
      navigate(action.path);
      if (window.innerWidth <= 640) {
        setIsOpen(false);
      }
      return;
    }

    // 4. Retry
    if (action.retryText) {
      handleSendMessage(action.retryText);
      return;
    }

    // 5. Query Text
    if (action.text) {
      handleSendMessage(action.text);
      return;
    }

    // 6. Direct Helpline Phone Call
    if (action.action === 'call_helpline') {
      window.location.href = 'tel:18001030222';
      return;
    }
  };

  const handleClearChat = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(INITIAL_CONVERSATION_ID_KEY);
    } catch {
      // Storage safe fallback
    }
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    setConversationId('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="civic-chatbot-wrapper" aria-label="CivicAI Citizen Assistant">
      {/* 1. Floating Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          className={`civic-chatbot-launcher ${hasUnread ? 'civic-chatbot-launcher--unread' : ''}`}
          onClick={() => setIsOpen(true)}
          aria-expanded={false}
          aria-haspopup="dialog"
          aria-label="Open CivicAI Citizen Support Chatbot"
          id="civicai-chatbot-launcher"
        >
          <div className="civic-chatbot-launcher__icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8V4H8" />
              <rect width="16" height="12" x="4" y="8" rx="2" />
              <path d="M2 14h2" />
              <path d="M20 14h2" />
              <path d="M15 13v2" />
              <path d="M9 13v2" />
            </svg>
            <span className="civic-chatbot-launcher__pulse" />
          </div>
          <span className="civic-chatbot-launcher__label">Ask CivicAI</span>
          {hasUnread && <span className="civic-chatbot-launcher__badge" aria-label="New reply">1</span>}
        </button>
      )}

      {/* 2. Interactive Chat Panel / Dialog */}
      {isOpen && (
        <section
          className="civic-chatbot-window"
          role="dialog"
          aria-labelledby="civic-chat-title"
          aria-modal="false"
        >
          {/* Header with verified subtitle and single close button */}
          <header className="civic-chatbot-header">
            <div className="civic-chatbot-header__identity">
              <div className="civic-chatbot-header__avatar" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8V4H8" />
                  <rect width="16" height="12" x="4" y="8" rx="2" />
                  <path d="M2 14h2" />
                  <path d="M20 14h2" />
                  <path d="M15 13v2" />
                  <path d="M9 13v2" />
                </svg>
                <span className="status-dot status-dot--online" />
              </div>
              <div className="civic-chatbot-header__titles">
                <h3 id="civic-chat-title" className="civic-chatbot-header__title">
                  CivicAI Assistant
                </h3>
                <span className="civic-chatbot-header__subtitle">
                  Pune Municipal Corporation · Citizen Support
                </span>
              </div>
            </div>

            <div className="civic-chatbot-header__controls">
              <button
                type="button"
                className="civic-chatbot-ctrl-btn civic-chatbot-ctrl-btn--close"
                onClick={() => setIsOpen(false)}
                title="Close chat (Esc)"
                aria-label="Close CivicAI chat"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </header>

          {/* User Status Bar with discreet conversation reset control */}
          <div className="civic-chatbot-user-bar">
            <div className="civic-chatbot-user-bar__status">
              {user ? (
                <>Authenticated as <strong>{user.name || user.fullName || 'Citizen'}</strong></>
              ) : (
                <>Browsing as <strong>Guest Citizen</strong> • <button type="button" className="inline-link-btn" onClick={() => navigate('/login')}>Sign in</button></>
              )}
            </div>
            <button
              type="button"
              className="civic-chatbot-reset-link"
              onClick={handleClearChat}
              title="Restart conversation"
              aria-label="Restart conversation"
            >
              Restart
            </button>
          </div>

          {/* Messages Stream */}
          <div
            className="civic-chatbot-messages"
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`civic-chat-bubble-row civic-chat-bubble-row--${msg.role} ${msg.isError ? 'civic-chat-bubble-row--error' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="civic-chat-avatar" aria-hidden="true">
                    PMC
                  </div>
                )}

                <div className="civic-chat-bubble-wrapper">
                  <div className="civic-chat-bubble">
                    <div className="civic-chat-bubble__text">
                      <FormattedChatMessage content={msg.content} />
                    </div>
                    <span className="civic-chat-bubble__time">{msg.timestamp}</span>
                  </div>

                  {/* Contextual Action Chips (only when specific actions are provided for this response) */}
                  {Array.isArray(msg.suggestedActions) && msg.suggestedActions.length > 0 && (
                    <div className="civic-chat-actions-container" aria-label="Suggested actions">
                      {msg.suggestedActions.map((act, actIdx) => (
                        <button
                          key={actIdx}
                          type="button"
                          className={`civic-chat-action-btn ${act.variant === 'primary' ? 'civic-chat-action-btn--primary' : ''}`}
                          onClick={() => handleActionClick(act)}
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="civic-chat-bubble-row civic-chat-bubble-row--assistant">
                <div className="civic-chat-avatar" aria-hidden="true">
                  PMC
                </div>
                <div className="civic-chat-bubble civic-chat-bubble--typing" aria-label="Assistant is typing">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input & Submit */}
          <footer className="civic-chatbot-footer">
            <form
              className="civic-chatbot-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <input
                ref={inputRef}
                type="text"
                className="civic-chatbot-input"
                placeholder="Ask CivicAI about civic issues, tracking..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                maxLength={1000}
                aria-label="Type your message to CivicAI Assistant"
              />
              <button
                type="submit"
                className="civic-chatbot-send-btn"
                disabled={!inputMessage.trim() || isLoading}
                aria-label="Send message"
                title="Send message (Enter)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
            <div className="civic-chatbot-disclaimer">
              <span>CivicAI provides navigation & information • Always submit formal grievances via official forms</span>
            </div>
          </footer>
        </section>
      )}
    </div>
  );
};

export default AICitizenChatbot;
