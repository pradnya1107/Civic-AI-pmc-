import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AICitizenChatbot, CuteRobotAvatar } from '../components/AICitizenChatbot';
import { chatApi } from '../services/api';
import { AuthContext } from '../context/AuthContext';

// Mock chatApi
vi.mock('../services/api', () => ({
  chatApi: {
    sendMessage: vi.fn(),
  },
  aiApi: {
    sendChatMessage: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderChatbot = (authOverrides = {}) => {
  const defaultAuth = {
    user: { name: 'Pradnya Ghodke', role: 'CITIZEN' },
    isAuthenticated: true,
    ...authOverrides,
  };

  return render(
    <MemoryRouter>
      <AuthContext.Provider value={defaultAuth}>
        <AICitizenChatbot />
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('AICitizenChatbot Component (Cute AI Robot Mascot & Guardrails)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the floating cute robot launcher button and speech bubble teaser', () => {
    renderChatbot();

    expect(screen.getByTestId('civic-ai-chatbot')).toBeInTheDocument();
    expect(screen.getByTestId('chatbot-launcher-btn')).toBeInTheDocument();
    expect(screen.getByText(/Hi! I'm CivicBot/i)).toBeInTheDocument();
    expect(screen.getByText(/Need help with Pune civic issues\? Click me!/i)).toBeInTheDocument();
    expect(screen.getByText(/Pune Civic Care/i)).toBeInTheDocument();
  });

  it('opens chat window with cute robot header, online status, and guardrail bar when clicked', () => {
    renderChatbot();

    const launcher = screen.getByTestId('chatbot-launcher-btn');
    fireEvent.click(launcher);

    expect(screen.getByTestId('chatbot-window')).toBeInTheDocument();
    expect(screen.getByText(/PMC Municipal Assistant · Online/i)).toBeInTheDocument();
    expect(screen.getByText(/Strictly dedicated to Pune Municipal Corporation & Civic AI/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask about potholes, garbage, water, SLAs.../i)).toBeInTheDocument();
  });

  it('displays initial welcome message from CivicBot with quick starter buttons', () => {
    renderChatbot();

    fireEvent.click(screen.getByTestId('chatbot-launcher-btn'));

    expect(screen.getByText(/Hello/i)).toBeInTheDocument();
    expect(screen.getByText(/Pradnya Ghodke/i)).toBeInTheDocument();
    expect(screen.getByText(/Reporting Civic Issues/i)).toBeInTheDocument();

    // Check starter buttons
    expect(screen.getByText(/Report Pothole →/i)).toBeInTheDocument();
    expect(screen.getByText(/Garbage Dump Issue →/i)).toBeInTheDocument();
    expect(screen.getByText(/Track My Complaint →/i)).toBeInTheDocument();
  });

  it('sends message to chatApi and displays bot response with suggested actions', async () => {
    chatApi.sendMessage.mockResolvedValueOnce({
      success: true,
      data: {
        reply: 'Roads & Potholes complaints are resolved within ~48 working hours by the PMC Roads Department.',
        conversationId: 'test-conv-123',
        suggestedActions: [
          { label: 'File Pothole Report', path: '/complaints/new', variant: 'primary' },
        ],
      },
    });

    renderChatbot();
    fireEvent.click(screen.getByTestId('chatbot-launcher-btn'));

    const input = screen.getByPlaceholderText(/Ask about potholes, garbage, water, SLAs.../i);
    fireEvent.change(input, { target: { value: 'How long does a pothole take to fix?' } });

    const submitBtn = screen.getByLabelText(/Send message/i);
    fireEvent.click(submitBtn);

    expect(chatApi.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'How long does a pothole take to fix?',
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Roads & Potholes complaints are resolved within ~48 working hours/i)
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/File Pothole Report →/i)).toBeInTheDocument();
  });

  it('navigates to relevant route when suggested action button is clicked', () => {
    renderChatbot();
    fireEvent.click(screen.getByTestId('chatbot-launcher-btn'));

    const potholeActionBtn = screen.getByText(/Report Pothole →/i);
    fireEvent.click(potholeActionBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/complaints/new');
  });

  it('toggles sound mute/unmute button', () => {
    renderChatbot();
    fireEvent.click(screen.getByTestId('chatbot-launcher-btn'));

    const soundBtn = screen.getByLabelText(/Mute sound/i);
    expect(soundBtn).toBeInTheDocument();

    fireEvent.click(soundBtn);
    expect(screen.getByLabelText(/Unmute sound/i)).toBeInTheDocument();
  });

  it('closes the chat window when close button is clicked', () => {
    renderChatbot();
    fireEvent.click(screen.getByTestId('chatbot-launcher-btn'));

    expect(screen.getByTestId('chatbot-window')).toBeInTheDocument();

    const closeBtn = screen.getByTestId('chatbot-close-btn');
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId('chatbot-window')).not.toBeInTheDocument();
    expect(screen.getByTestId('chatbot-launcher-btn')).toBeInTheDocument();
  });
});
