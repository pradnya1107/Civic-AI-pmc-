import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AICitizenChatbot } from '../components/AICitizenChatbot';
import { chatApi } from '../services/api';

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock chatApi
vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    chatApi: {
      sendMessage: vi.fn(),
    },
  };
});

describe('AICitizenChatbot Component', () => {
  const mockUser = {
    name: 'Rohan Deshmukh',
    fullName: 'Rohan Deshmukh',
    email: 'rohan.deshmukh@example.com',
    role: 'CITIZEN',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    });
  });

  const renderChatbot = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route
            path="/"
            element={
              <div>
                <h1>Citizen Page</h1>
                <AICitizenChatbot />
              </div>
            }
          />
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Citizen Dashboard Page</div>} />
          <Route path="/complaints/new" element={<div data-testid="new-complaint-page">New Complaint Page</div>} />
          <Route path="/complaints" element={<div data-testid="complaint-list-page">Complaint List Page</div>} />
          <Route path="/heatmap" element={<div data-testid="heatmap-page">Heatmap Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('Requirement 1: renders floating launcher button with "Ask CivicAI"', () => {
    renderChatbot();

    const launcher = screen.getByRole('button', { name: /Open CivicAI Citizen Support Chatbot/i });
    expect(launcher).toBeInTheDocument();
    expect(launcher).toHaveTextContent('Ask CivicAI');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Requirement 2: clicking launcher opens the chat dialog with refined subtitle and deduplicated quick actions', async () => {
    const user = userEvent.setup();
    renderChatbot();

    const launcher = screen.getByRole('button', { name: /Open CivicAI Citizen Support Chatbot/i });
    await user.click(launcher);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CivicAI Assistant' })).toBeInTheDocument();
    expect(screen.getByText(/Pune Municipal Corporation · Citizen Support/i)).toBeInTheDocument();

    // Authenticated user status bar
    expect(screen.getByText(/Authenticated as/i)).toBeInTheDocument();
    expect(screen.getByText('Rohan Deshmukh')).toBeInTheDocument();

    // Default welcome message content (formatted without raw asterisks)
    expect(screen.getByText(/your official smart civic guide for Pune Municipal Corporation/i)).toBeInTheDocument();
    
    // Top row quick bar is deleted
    expect(document.querySelector('.civic-chatbot-quick-bar')).not.toBeInTheDocument();

    // Options are rendered directly after the welcome message
    expect(screen.getByRole('button', { name: /Report Issue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Track Status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Departments/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Help/i })).toBeInTheDocument();
  });

  it('Requirement 3: displays guest status when citizen is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    const user = userEvent.setup();
    renderChatbot();

    await user.click(screen.getByRole('button', { name: /Open CivicAI Citizen Support Chatbot/i }));

    expect(screen.getByText(/Browsing as/i)).toBeInTheDocument();
    expect(screen.getByText('Guest Citizen')).toBeInTheDocument();
  });

  it('Requirement 4: closes chat dialog when clicking the close button', async () => {
    const user = userEvent.setup();
    renderChatbot();

    await user.click(screen.getByRole('button', { name: /Open CivicAI Citizen Support Chatbot/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /Close CivicAI chat/i });
    await user.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open CivicAI Citizen Support Chatbot/i })).toBeInTheDocument();
  });

  it('Requirement 5: sends message on form submit and displays user message and AI response', async () => {
    const user = userEvent.setup();
    chatApi.sendMessage.mockResolvedValueOnce({
      success: true,
      data: {
        reply: 'The PMC Road Department maintains city roads and fills potholes within 48 to 72 hours.',
        suggestedActions: [
          { label: '📝 File Pothole Complaint', path: '/complaints/new', variant: 'primary' },
          { label: '📞 Call Road Dept: 020-25501000', text: 'What is the contact for road repairs?' },
        ],
        conversationId: 'conv-test-123',
      },
    });

    renderChatbot();
    await user.click(screen.getByRole('button', { name: /Open CivicAI Citizen Support Chatbot/i }));

    const input = screen.getByLabelText(/Type your message to CivicAI Assistant/i);
    const sendBtn = screen.getByRole('button', { name: /Send message/i });

    await user.type(input, 'Who repairs potholes in Pune?');
    expect(input).toHaveValue('Who repairs potholes in Pune?');

    await user.click(sendBtn);

    // User message should be rendered
    expect(screen.getByText('Who repairs potholes in Pune?')).toBeInTheDocument();

    // Input should be cleared
    expect(input).toHaveValue('');

    // Wait for AI reply
    await waitFor(() => {
      expect(screen.getByText(/The PMC Road Department maintains city roads/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: '📝 File Pothole Complaint' })).toBeInTheDocument();
    expect(chatApi.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Who repairs potholes in Pune?',
      })
    );
  });

  it('Requirement 6: clicking quick action routes user to new complaint page', async () => {
    const user = userEvent.setup();
    renderChatbot();

    await user.click(screen.getByRole('button', { name: /Open CivicAI Citizen Support Chatbot/i }));

    const reportIssueChip = screen.getByRole('button', { name: /Report Issue/i });
    await user.click(reportIssueChip);

    await waitFor(() => {
      expect(screen.getByTestId('new-complaint-page')).toBeInTheDocument();
    });
  });

  it('Requirement 7: displays error banner and retry option when API request fails', async () => {
    const user = userEvent.setup();
    chatApi.sendMessage.mockRejectedValueOnce(new Error('Network error'));

    renderChatbot();
    await user.click(screen.getByRole('button', { name: /Open CivicAI Citizen Support Chatbot/i }));

    const input = screen.getByLabelText(/Type your message to CivicAI Assistant/i);
    await user.type(input, 'Pothole issue on FC Road');
    await user.click(screen.getByRole('button', { name: /Send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/⚠️ Unable to connect to CivicAI Assistant right now/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: '🔄 Try Again' })).toBeInTheDocument();
  });

  it('Requirement 8: clear chat restarts conversation and clears session storage', async () => {
    const user = userEvent.setup();
    chatApi.sendMessage.mockResolvedValueOnce({
      success: true,
      data: {
        reply: 'Here are your active complaints: CIV-2026-001 (Under Review).',
        suggestedActions: [],
      },
    });

    renderChatbot();
    await user.click(screen.getByRole('button', { name: /Open CivicAI Citizen Support Chatbot/i }));

    const input = screen.getByLabelText(/Type your message to CivicAI Assistant/i);
    await user.type(input, 'Status check');
    await user.click(screen.getByRole('button', { name: /Send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/Here are your active complaints/i)).toBeInTheDocument();
    });

    const clearBtn = screen.getByRole('button', { name: /Restart conversation/i });
    await user.click(clearBtn);

    // Old conversation message should be gone
    expect(screen.queryByText(/Here are your active complaints/i)).not.toBeInTheDocument();
    // Welcome message should be present
    expect(screen.getByText(/your official smart civic guide for Pune Municipal Corporation/i)).toBeInTheDocument();
  });

  it('Requirement 9: pressing Escape closes the chatbot dialog', async () => {
    const user = userEvent.setup();
    renderChatbot();

    await user.click(screen.getByRole('button', { name: /Open CivicAI Citizen Support Chatbot/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('Requirement 10: renders bold text cleanly as <strong> without raw ** artifacts', async () => {
    const user = userEvent.setup();
    chatApi.sendMessage.mockResolvedValueOnce({
      success: true,
      data: {
        reply: 'Please contact the **Water Supply Department** for pipe bursts.',
        suggestedActions: [],
      },
    });

    renderChatbot();
    await user.click(screen.getByRole('button', { name: /Open CivicAI Citizen Support Chatbot/i }));

    const input = screen.getByLabelText(/Type your message to CivicAI Assistant/i);
    await user.type(input, 'Water problem');
    await user.click(screen.getByRole('button', { name: /Send message/i }));

    await waitFor(() => {
      const strongEl = screen.getByText('Water Supply Department');
      expect(strongEl).toBeInTheDocument();
      expect(strongEl.tagName).toBe('STRONG');
    });

    // Verify raw asterisks are not present
    expect(screen.queryByText('**Water Supply Department**')).not.toBeInTheDocument();
  });

  it('Requirement 11: renders helpline response with clickable tel: and https: links without raw brackets', async () => {
    const user = userEvent.setup();
    chatApi.sendMessage.mockResolvedValueOnce({
      success: true,
      data: {
        reply: `📞 **Official Pune Municipal Corporation Helplines:**\n\n• **PMC 24x7 Citizen Care (Toll-Free):** [1800-1030-222](tel:18001030222)\n• **Disaster Management Cell:** [020-25501269](tel:02025501269)\n• **Official PMC Portal:** https://pmc.gov.in`,
        suggestedActions: [],
      },
    });

    renderChatbot();
    await user.click(screen.getByRole('button', { name: /Open CivicAI Citizen Support Chatbot/i }));

    const input = screen.getByLabelText(/Type your message to CivicAI Assistant/i);
    await user.type(input, 'helpline numbers');
    await user.click(screen.getByRole('button', { name: /Send message/i }));

    await waitFor(() => {
      expect(screen.getByText('Official Pune Municipal Corporation Helplines:')).toBeInTheDocument();
    });

    // Check clickable phone link
    const phoneLink = screen.getByRole('link', { name: '1800-1030-222' });
    expect(phoneLink).toBeInTheDocument();
    expect(phoneLink).toHaveAttribute('href', 'tel:18001030222');

    // Check official portal link
    const portalLink = screen.getByRole('link', { name: 'https://pmc.gov.in' });
    expect(portalLink).toBeInTheDocument();
    expect(portalLink).toHaveAttribute('href', 'https://pmc.gov.in');
    expect(portalLink).toHaveAttribute('target', '_blank');

    // Verify raw markdown brackets and asterisks are NOT in the text
    expect(screen.queryByText(/\[1800-1030-222\]/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\*\*PMC 24x7/)).not.toBeInTheDocument();
  });

  it('Requirement 12: clicking Go Dashboard navigates to /dashboard and intentionally closes chatbot', async () => {
    const user = userEvent.setup();
    chatApi.sendMessage.mockResolvedValueOnce({
      success: true,
      data: {
        reply: 'You can check your overview on the citizen dashboard.',
        suggestedActions: [
          { label: 'Go Dashboard', path: '/dashboard' },
        ],
      },
    });

    renderChatbot();
    await user.click(screen.getByRole('button', { name: /Open CivicAI Citizen Support Chatbot/i }));

    const input = screen.getByLabelText(/Type your message to CivicAI Assistant/i);
    await user.type(input, 'Where is dashboard?');
    await user.click(screen.getByRole('button', { name: /Send message/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Go Dashboard' })).toBeInTheDocument();
    });

    const goDashboardBtn = screen.getByRole('button', { name: 'Go Dashboard' });
    await user.click(goDashboardBtn);

    // Chatbot window should close and dashboard page should be navigated to
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  it('Requirement 13: clicking PMC Help renders help content in chat and does NOT close chatbot', async () => {
    const user = userEvent.setup();
    chatApi.sendMessage.mockResolvedValueOnce({
      success: true,
      data: {
        reply: 'Here are the official PMC helplines: 1800-1030-222',
        suggestedActions: [],
      },
    });

    renderChatbot();
    await user.click(screen.getByRole('button', { name: /Open CivicAI Citizen Support Chatbot/i }));

    // Find the Help action button inside the welcome message
    const helpBtn = screen.getByRole('button', { name: /Help/i });
    expect(helpBtn).toBeInTheDocument();

    await user.click(helpBtn);

    // Chatbot dialog MUST remain open
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // The message should be sent to chatApi without navigating or closing
    await waitFor(() => {
      expect(chatApi.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'What are the official PMC helpline numbers?',
        })
      );
      expect(screen.getByText(/Here are the official PMC helplines/i)).toBeInTheDocument();
    });

    // Chatbot is STILL open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

