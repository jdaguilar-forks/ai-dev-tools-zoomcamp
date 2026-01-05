import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Session from './Session';

// Mock Socket.IO
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ onChange, value, language }: { onChange?: (value: string) => void; value: string; language: string; onMount?: () => void }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      data-language={language}
    />
  ),
}));

const renderSession = () => {
  return render(
    <BrowserRouter>
      <Session />
    </BrowserRouter>
  );
};

describe('Session Component', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render session page with header', () => {
    renderSession();
    expect(screen.getByText(/Session:/)).toBeInTheDocument();
  });

  it('should display session ID in header', () => {
    renderSession();
    const header = screen.getByText(/Session:/);
    expect(header).toBeInTheDocument();
  });

  it('should render language selector with all 7 languages', () => {
    renderSession();
    const languageSelect = screen.getByRole('combobox', { name: '' });
    const options = languageSelect.querySelectorAll('option');
    
    expect(options).toHaveLength(7);
  });

  it('should render Run Code button', () => {
    renderSession();
    const runButton = screen.getByRole('button', { name: /Run Code/ });
    expect(runButton).toBeInTheDocument();
  });

  it('should render Copy button for share link', () => {
    renderSession();
    const copyButton = screen.getByRole('button', { name: /Copy/ });
    expect(copyButton).toBeInTheDocument();
  });

  it('should render username input field', () => {
    renderSession();
    const usernameInput = screen.getByPlaceholderText('Your name');
    expect(usernameInput).toBeInTheDocument();
  });

  it('should render editor and output panels', () => {
    renderSession();
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    expect(screen.getByText(/Output/)).toBeInTheDocument();
  });

  it('should render participants panel', () => {
    renderSession();
    expect(screen.getByText(/Participants/)).toBeInTheDocument();
  });

  it('should render connection status indicator', () => {
    renderSession();
    const statusText = screen.getByText(/Connected|Disconnected/);
    expect(statusText).toBeInTheDocument();
  });
});

describe('Username Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should load username from localStorage if exists', () => {
    const testUsername = 'TestUser';
    localStorage.setItem('interview-username', testUsername);
    
    renderSession();
    const usernameInput = screen.getByPlaceholderText('Your name') as HTMLInputElement;
    expect(usernameInput.value).toBe(testUsername);
  });

  it('should generate default username if not in localStorage', () => {
    renderSession();
    const usernameInput = screen.getByPlaceholderText('Your name') as HTMLInputElement;
    
    expect(usernameInput.value).toMatch(/^User-/);
    expect(usernameInput.value.length).toBeGreaterThan(5);
  });

  it('should update localStorage when username changes', async () => {
    const user = userEvent.setup();
    renderSession();
    const usernameInput = screen.getByPlaceholderText('Your name');
    
    await user.clear(usernameInput);
    await user.type(usernameInput, 'NewUser');
    
    expect(localStorage.getItem('interview-username')).toBe('NewUser');
  });
});

describe('Language Selection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should default to JavaScript language', () => {
    renderSession();
    const languageSelect = screen.getByRole('combobox', { name: '' }) as HTMLSelectElement;
    expect(languageSelect.value).toBe('javascript');
  });

  it('should change language when select changes', async () => {
    const user = userEvent.setup();
    renderSession();
    const languageSelect = screen.getByRole('combobox', { name: '' }) as HTMLSelectElement;
    
    await user.selectOptions(languageSelect, 'python');
    
    expect(languageSelect.value).toBe('python');
  });

  it('should support all required languages', () => {
    renderSession();
    const languageSelect = screen.getByRole('combobox', { name: '' });
    
    const requiredLanguages = [
      'javascript',
      'python',
      'php',
      'go',
      'ruby',
      'java',
      'rust',
    ];
    
    requiredLanguages.forEach((lang) => {
      const option = languageSelect.querySelector(`option[value="${lang}"]`);
      expect(option).toBeInTheDocument();
    });
  });
});

describe('Editor Interaction', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should display editor with initial code', () => {
    renderSession();
    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    expect(editor.value).toContain('Loading');
  });

  it('should reflect language in editor', () => {
    renderSession();
    const languageSelect = screen.getByRole('combobox', { name: '' });
    fireEvent.change(languageSelect, { target: { value: 'python' } });
    
    const editor = screen.getByTestId('monaco-editor');
    expect(editor.getAttribute('data-language')).toBe('python');
  });
});

describe('Output Display', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should show default output message', () => {
    renderSession();
    expect(screen.getByText(/Click "Run Code" to execute/)).toBeInTheDocument();
  });

  it('should render Output heading', () => {
    renderSession();
    const outputHeading = screen.getByText(/Output/);
    expect(outputHeading).toBeInTheDocument();
  });

  it('should have output panel with correct styling classes', () => {
    renderSession();
    const outputContent = screen.getByText(/Click "Run Code" to execute/).parentElement;
    expect(outputContent).toHaveClass('output-content');
  });
});

describe('Copy Share Link', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should show Copy button', () => {
    renderSession();
    const copyButton = screen.getByRole('button', { name: /Copy/ });
    expect(copyButton).toBeInTheDocument();
  });

  it('should display share link', () => {
    renderSession();
    const shareLink = screen.getByText(/http/);
    expect(shareLink).toBeInTheDocument();
  });

  it('should have correct class on copy button', () => {
    renderSession();
    const copyButton = screen.getByRole('button', { name: /Copy/ });
    expect(copyButton).toHaveClass('btn', 'btn-secondary', 'copy-btn');
  });
});

describe('Resizable Layout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render resize handle', () => {
    renderSession();
    const container = screen.getByTestId('monaco-editor').closest('.content-area');
    const resizeHandle = container?.querySelector('.resize-handle');
    expect(resizeHandle).toBeInTheDocument();
  });

  it('should have editor and output panels with flex layout', () => {
    renderSession();
    const contentArea = screen.getByTestId('monaco-editor').closest('.content-area');
    expect(contentArea).toHaveClass('content-area');
  });
});

describe('Connection Status', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should display connection status indicator', () => {
    renderSession();
    const statusIndicator = screen.getByText(/Connected|Disconnected/);
    expect(statusIndicator).toBeInTheDocument();
  });

  it('should have status dot element', () => {
    renderSession();
    const statusArea = screen.getByText(/Connected|Disconnected/).parentElement;
    const statusDot = statusArea?.querySelector('[class*="status-"]');
    expect(statusDot).toBeInTheDocument();
  });
});

describe('Participants List', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should display Participants heading', () => {
    renderSession();
    expect(screen.getByText(/Participants/)).toBeInTheDocument();
  });

  it('should show participants count', () => {
    renderSession();
    const participantsHeading = screen.getByText(/Participants/);
    expect(participantsHeading.textContent).toMatch(/Participants \(\d+\)/);
  });

  it('should have sidebar for participants', () => {
    renderSession();
    const sidebar = screen.getByText(/Participants/).closest('.sidebar');
    expect(sidebar).toBeInTheDocument();
  });
});

describe('UI Element Structure', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should have proper header structure', () => {
    renderSession();
    const header = document.querySelector('header');
    expect(header).toHaveClass('header');
  });

  it('should have main container with content area', () => {
    renderSession();
    const mainContainer = document.querySelector('.main-container');
    expect(mainContainer).toBeInTheDocument();
    
    const contentArea = mainContainer?.querySelector('.content-area');
    expect(contentArea).toBeInTheDocument();
  });

  it('should have editor section with height percentage', () => {
    renderSession();
    const editorSection = document.querySelector('.editor-section') as HTMLElement;
    expect(editorSection).toBeInTheDocument();
    expect(editorSection.style.height).toMatch(/\d+%/);
  });

  it('should have output panel with height percentage', () => {
    renderSession();
    const outputPanel = document.querySelector('.output-panel') as HTMLElement;
    expect(outputPanel).toBeInTheDocument();
    expect(outputPanel.style.height).toMatch(/\d+%/);
  });
});

describe('Button Styling', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should have Run Code button with success class', () => {
    renderSession();
    const runButton = screen.getByRole('button', { name: /Run Code/ });
    expect(runButton).toHaveClass('btn', 'btn-success');
  });

  it('should have Copy button with secondary class', () => {
    renderSession();
    const copyButton = screen.getByRole('button', { name: /Copy/ });
    expect(copyButton).toHaveClass('btn', 'btn-secondary');
  });
});
