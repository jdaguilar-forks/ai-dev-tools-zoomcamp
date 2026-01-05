import { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import Editor, { OnMount } from '@monaco-editor/react';
import { io, Socket } from 'socket.io-client';
import type { editor } from 'monaco-editor';

// Get Socket URL from environment or use default for local development
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
// Get API URL from environment or derive from Socket URL
// API_URL was removed as it was unused and causing build errors

interface Participant {
  id: string;
  username: string;
  joinedAt: string;
}

interface SessionState {
  code: string;
  language: string;
  participants: Participant[];
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface ExecutionChunk {
  chunk: string;
  isError: boolean;
}

type SupportedLanguage = 'javascript' | 'python' | 'php' | 'go' | 'ruby' | 'java' | 'rust';

const languageDefaults: Record<SupportedLanguage, string> = {
  python: '# Start coding here...\n\nprint("Hello, World!")\n',
  javascript: '// Start coding here...\n\nconsole.log("Hello, World!");\n',
  php: '<?php\n\necho "Hello, World!";\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, World!")\n}\n',
  ruby: 'puts "Hello, World!"\n',
  java: 'public class Main {\n\tpublic static void main(String[] args) {\n\t\tSystem.out.println("Hello, World!");\n\t}\n}\n',
  rust: 'fn main() {\n\tprintln!("Hello, world!");\n}\n',
};

function Session() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [code, setCode] = useState('// Loading...\n');
  const [language, setLanguage] = useState<SupportedLanguage>('javascript');
  const [output, setOutput] = useState('');
  const [outputType, setOutputType] = useState<'' | 'success' | 'error'>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('interview-username') || `User-${Math.random().toString(36).slice(2, 6)}`;
  });
  const [isConnected, setIsConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editorHeight, setEditorHeight] = useState(60);
  const [isExecuting, setIsExecuting] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const isLocalChange = useRef(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const isResizing = useRef(false);

  useEffect(() => {
    localStorage.setItem('interview-username', username);
  }, [username]);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join-session', { sessionId, username });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('session-state', ({ code: sessionCode, language: sessionLang, participants: sessionParticipants }: SessionState) => {
      setCode(sessionCode);
      setLanguage(sessionLang as SupportedLanguage);
      setParticipants(sessionParticipants);
    });

    socket.on('code-update', ({ code: newCode }: { code: string }) => {
      isLocalChange.current = false;
      setCode(newCode);
    });

    socket.on('language-update', ({ language: newLang }: { language: string }) => {
      setLanguage(newLang as SupportedLanguage);
    });

    socket.on('user-joined', (participant: Participant) => {
      setParticipants((prev) => [...prev, participant]);
    });

    socket.on('user-left', ({ id }: { id: string }) => {
      setParticipants((prev) => prev.filter((p) => p.id !== id));
    });

    // Receive execution-start notification
    socket.on('execution-start', () => {
      setOutput('');
      setOutputType('');
      setIsExecuting(true);
    });

    // Receive execution chunks progressively
    socket.on('execution-chunk', ({ chunk, isError }: ExecutionChunk) => {
      setOutput((prev) => prev + chunk);
      setOutputType(isError ? 'error' : 'success');
    });

    // Receive execution results from server (emitted after code-change runs)
    socket.on('execution-result', ({ stdout, stderr, exitCode }: ExecutionResult) => {
      setIsExecuting(false);
      const parts: string[] = [];
      if (stdout) parts.push(stdout);
      if (stderr) parts.push(`STDERR:\n${stderr}`);
      const out = parts.join('\n') || `Process exited with code ${exitCode}`;
      setOutput(out);
      setOutputType(exitCode === 0 ? 'success' : 'error');
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, username]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      isLocalChange.current = true;
      setCode(value);
      socketRef.current?.emit('code-change', {
        sessionId,
        code: value,
      });
    }
  }, [sessionId]);

  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as SupportedLanguage;
    setLanguage(newLang);
    socketRef.current?.emit('language-change', { sessionId, language: newLang });

    const defaultCode = languageDefaults[newLang] || languageDefaults.javascript;

    if (code.includes('Start coding here') || code.trim() === '') {
      handleEditorChange(defaultCode);
    }
  };

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const runCode = () => {
    if (!socketRef.current || !isConnected) {
      setOutput('Error: Not connected to server');
      setOutputType('error');
      return;
    }

    setOutput('Waiting for server...');
    setOutputType('');
    setIsExecuting(true);

    socketRef.current.emit('run-code', {
      sessionId,
      code,
    });
  };

  const copyShareLink = async () => {
    const link = `${window.location.origin}/session/${sessionId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResizeStart = () => {
    isResizing.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;

      const contentArea = document.querySelector('.content-area');
      if (!contentArea) return;

      const containerRect = contentArea.getBoundingClientRect();
      const newHeight = ((e.clientY - containerRect.top) / containerRect.height) * 100;

      if (newHeight > 20 && newHeight < 80) {
        setEditorHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <>
      <header className="header">
        <h1>Session: {sessionId}</h1>
        <div className="header-controls">
          <div className="share-link-container">
            <span className="share-link">{window.location.href}</span>
            <button className="btn btn-secondary copy-btn" onClick={copyShareLink}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <select
            className="language-select"
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="php">PHP</option>
            <option value="go">Go</option>
            <option value="ruby">Ruby</option>
            <option value="java">Java</option>
            <option value="rust">Rust</option>
          </select>
          <input
            type="text"
            className="username-input"
            placeholder="Your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button className="btn btn-success" onClick={runCode}>
            Run Code
          </button>
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'status-connected' : 'status-disconnected'}`} />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </header>

      <div className="main-container">
        <div className="content-area">
          <div className="editor-section" style={{ height: `${editorHeight}%` }}>
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
          </div>

          <div className="resize-handle" onMouseDown={handleResizeStart} />

          <div className="output-panel" style={{ height: `${100 - editorHeight}%` }}>
            <h3>Output {isExecuting && <span style={{ fontSize: '0.8em', color: '#999' }}>(Executing...)</span>}</h3>
            <div className={`output-content ${outputType === 'error' ? 'output-error' : ''} ${outputType === 'success' ? 'output-success' : ''}`}>
              {output || (isExecuting ? 'Executing code...' : 'Click "Run Code" to execute...')}
            </div>
          </div>
        </div>

        <div className="sidebar">
          <div className="participants-panel">
            <h3>Participants ({participants.length})</h3>
            {participants.map((participant) => (
              <div key={participant.id} className="participant">
                <span className="participant-indicator" />
                <span className="participant-name">{participant.username}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default Session;
