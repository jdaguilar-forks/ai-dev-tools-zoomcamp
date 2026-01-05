import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { exec, spawn, ChildProcess, ExecException } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import rateLimit from 'express-rate-limit';
import 'dotenv/config.js';

// Types
interface Session {
  id: string;
  code: string;
  language: string;
  participants: Participant[];
  createdAt: string;
}

interface Participant {
  id: string;
  username: string;
  joinedAt: string;
}

interface LanguageMapping {
  image: string;
  filename: string;
  cmd: string;
}

interface ExecResult {
  error: ExecException | null;
  stdout: string;
  stderr: string;
  code: number;
}

interface DockerResult {
  stdout: string;
  stderr: string;
  code: number;
  timedOut?: boolean;
  error?: string;
}

interface SocketData {
  sessionId?: string;
  participant?: Participant;
}

const app = express();
const server = createServer(app);

// Environment configuration
const PORT = process.env.PORT || 3001;
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');
const CODE_EXECUTION_TIMEOUT = parseInt(process.env.CODE_EXECUTION_TIMEOUT || '10000');
const MAX_CODE_LENGTH = parseInt(process.env.MAX_CODE_LENGTH || '50000');

// Logging utility
const log = (level: string, message: string, data: Record<string, unknown> = {}): void => {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, level, message, ...data }));
};

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: CORS_ORIGINS }));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests, please try again later.',
});
app.use('/api/', limiter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction): void => {
  log('error', 'Request error', { path: req.path, error: err.message });
  res.status(500).json({ error: 'Internal server error' });
});

// In-memory session storage
const sessions = new Map<string, Session>();

// Create a new interview session
app.post('/api/sessions', (req: Request, res: Response): void => {
  try {
    const sessionId = uuidv4().slice(0, 8);
    sessions.set(sessionId, {
      id: sessionId,
      code: '// Start coding here...\n',
      language: 'javascript',
      participants: [],
      createdAt: new Date().toISOString(),
    });
    log('info', 'Session created', { sessionId });
    res.json({ sessionId, shareableLink: `/session/${sessionId}` });
  } catch (err) {
    const error = err as Error;
    log('error', 'Failed to create session', { error: error.message });
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get session info
app.get('/api/sessions/:sessionId', (req: Request, res: Response): void => {
  try {
    const { sessionId } = req.params;

    // Validate session ID format
    if (!/^[a-f0-9]{8}$/.test(sessionId)) {
      res.status(400).json({ error: 'Invalid session ID format' });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  } catch (err) {
    const error = err as Error;
    log('error', 'Failed to get session', { error: error.message });
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * Helper: run command with promise
 */
function execAsync(cmd: string, options: Record<string, unknown> = {}): Promise<ExecResult> {
  return new Promise((resolve) => {
    exec(cmd, { ...options, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({
        error,
        stdout: stdout?.toString() || '',
        stderr: stderr?.toString() || '',
        code: error && typeof error.code === 'number' ? error.code : 0,
      });
    });
  });
}

/**
 * Ensure Docker image is available (pull if needed)
 */
async function ensureImageAvailable(image: string): Promise<void> {
  // Check if image exists locally
  const checkCmd = `docker image inspect ${image}`;
  const checkResult = await execAsync(checkCmd);

  if (checkResult.error) {
    // Image not found, pull it
    console.log(`Pulling Docker image: ${image}...`);
    const pullCmd = `docker pull ${image}`;
    const pullResult = await execAsync(pullCmd, { timeout: 120000 }); // 2 min timeout for pull

    if (pullResult.error) {
      throw new Error(`Failed to pull Docker image ${image}: ${pullResult.stderr}`);
    }
    console.log(`Successfully pulled ${image}`);
  }
}

/**
 * Run code inside a Docker container using a temporary workspace.
 * Returns { stdout, stderr, code }.
 */
async function runInDocker(language: string, code: string): Promise<DockerResult> {
  try {
    const mapping: Record<string, LanguageMapping> = {
      php: {
        image: 'php:8.1-cli',
        filename: 'index.php',
        cmd: `php index.php`,
      },
      ruby: {
        image: 'ruby:3.1',
        filename: 'main.rb',
        cmd: `ruby main.rb`,
      },
      go: {
        image: 'golang:1.20',
        filename: 'main.go',
        cmd: `go run main.go`,
      },
      java: {
        image: 'openjdk:17',
        filename: 'Main.java',
        cmd: `javac Main.java && java Main`,
      },
      rust: {
        image: 'rust:1.64',
        filename: 'main.rs',
        cmd: `rustc main.rs -o main && ./main`,
      },
      node: {
        image: 'node:18-alpine',
        filename: 'index.js',
        cmd: `node index.js`,
      },
      python: {
        image: 'python:3.11-alpine',
        filename: 'main.py',
        cmd: `python main.py`,
      },
    };

    const entry = mapping[language];
    if (!entry) {
      return { stdout: '', stderr: `Unsupported language: ${language}`, code: 1 };
    }

    // Ensure image is available before running
    try {
      await ensureImageAvailable(entry.image);
    } catch (err) {
      const error = err as Error;
      return { stdout: '', stderr: error.message, code: 1 };
    }

    // Create temp dir in a volume-mounted path accessible to Docker
    const tmpExecDir = '/tmp/exec';
    try {
      await fs.mkdir(tmpExecDir, { recursive: true });
    } catch (mkdirErr) {
      const error = mkdirErr as Error;
      log('warn', 'Failed to create /tmp/exec, creating in os.tmpdir', { error: error.message });
    }

    const tmpDir = await fs.mkdtemp(path.join(tmpExecDir, `exec-${language}-`));
    log('debug', 'Created temp directory', { tmpDir });

    const filePath = path.join(tmpDir, entry.filename);

    await fs.writeFile(filePath, code, 'utf8');
    log('debug', 'File written successfully', { filePath, codeLength: code.length });

    // Verify file was written
    const stats = await fs.stat(filePath);
    log('debug', 'File stats', { filePath, size: stats.size });

    // Make directory and file world-readable for Docker containers
    await fs.chmod(tmpDir, 0o777);
    await fs.chmod(filePath, 0o777);

    const DOCKER_MEMORY = process.env.DOCKER_MEMORY_LIMIT || '256m';
    const DOCKER_CPU = process.env.DOCKER_CPU_LIMIT || '0.5';
    const DOCKER_PID = process.env.DOCKER_PID_LIMIT || '64';

    // Use docker command to execute code
    // Both host /tmp is mounted in the container, so paths align
    const dockerCmd = `docker run --rm --network none --pids-limit=${DOCKER_PID} --memory=${DOCKER_MEMORY} --cpus=${DOCKER_CPU} -v "${tmpDir}:/workspace" -w /workspace ${entry.image} sh -c '${entry.cmd.replace(/'/g, "'\\''")}'`;

    log('debug', 'Executing Docker command', { tmpDir, image: entry.image, cmd: entry.cmd });

    const timeoutMs = CODE_EXECUTION_TIMEOUT;
    let result: DockerResult;
    try {
      result = await new Promise<DockerResult>((resolve) => {
        const proc: ChildProcess = spawn('sh', ['-c', dockerCmd]);
        let stdout = '';
        let stderr = '';
        let timedOut = false;

        const timeout = setTimeout(() => {
          timedOut = true;
          proc.kill();
          resolve({ stdout, stderr, code: 124, timedOut: true });
        }, timeoutMs);

        proc.stdout?.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        proc.stderr?.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        proc.on('close', (code: number | null) => {
          clearTimeout(timeout);
          if (!timedOut) {
            resolve({ stdout, stderr, code: code || 0 });
          }
        });

        proc.on('error', (err: Error) => {
          clearTimeout(timeout);
          resolve({ stdout, stderr, code: 1, error: err.message });
        });
      });
    } catch (err) {
      const error = err as Error;
      log('error', 'Docker execution failed', { error: error.message });
      result = { stdout: '', stderr: error?.message || String(err), code: 1 };
    }

    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }

    const stdout = result.stdout || '';
    const stderr = result.stderr || (result.error ? result.error : '');
    const codeExit = result.code || (result.error ? 1 : 0);

    return { stdout, stderr, code: codeExit };
  } catch (err) {
    const error = err as Error;
    log('error', 'runInDocker fatal error', { language, error: error.message });
    return { stdout: '', stderr: error.message, code: 1 };
  }
}

/**
 * Endpoint: execute code on server using Docker sandbox.
 * Body: { language: 'php'|'go'|'ruby'|'java'|'rust'|'node'|'python', code: '...' }
 */
app.post('/api/execute', async (req: Request, res: Response): Promise<void> => {
  try {
    const { language, code } = req.body || {};
    if (!language || typeof code !== 'string') {
      res.status(400).json({ error: 'Missing language or code in request body' });
      return;
    }

    // Validate language
    const validLanguages = ['php', 'go', 'ruby', 'java', 'rust', 'node', 'python'];
    if (!validLanguages.includes(language)) {
      res.status(400).json({ error: `Unsupported language: ${language}` });
      return;
    }

    // Validate code length
    if (code.length > MAX_CODE_LENGTH) {
      res.status(400).json({ error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters` });
      return;
    }

    try {
      const check = await execAsync('docker --version');
      if (check.error) {
        log('warn', 'Docker not available');
        res.status(500).json({ error: 'Docker is required on the server but not available.' });
        return;
      }
    } catch (err) {
      const error = err as Error;
      log('error', 'Docker check failed', { error: error.message });
      res.status(500).json({ error: 'Docker is required on the server but not available.' });
      return;
    }

    try {
      log('info', 'Executing code', { language, codeLength: code.length });
      const { stdout, stderr, code: exitCode } = await runInDocker(language, code);
      res.json({ stdout, stderr, exitCode });
    } catch (err) {
      const error = err as Error;
      log('error', 'Code execution failed', { language, error: error.message });
      res.status(500).json({ error: error?.message || 'Execution error' });
    }
  } catch (err) {
    const error = err as Error;
    log('error', 'Execute endpoint error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join a session
  socket.on('join-session', ({ sessionId, username }: { sessionId: string; username?: string }) => {
    let session = sessions.get(sessionId);

    // Create session if it doesn't exist
    if (!session) {
      session = {
        id: sessionId,
        code: '// Start coding here...\n',
        language: 'javascript',
        participants: [],
        createdAt: new Date().toISOString(),
      };
      sessions.set(sessionId, session);
    }

    socket.join(sessionId);

    const participant: Participant = {
      id: socket.id,
      username: username || `User-${socket.id.slice(0, 4)}`,
      joinedAt: new Date().toISOString(),
    };

    session.participants.push(participant);

    // Send current session state to the joining client
    socket.emit('session-state', {
      code: session.code,
      language: session.language,
      participants: session.participants,
    });

    // Notify others about the new participant
    socket.to(sessionId).emit('user-joined', participant);

    console.log(`${participant.username} joined session ${sessionId}`);

    // Store session info on socket for cleanup
    (socket.data as SocketData).sessionId = sessionId;
    (socket.data as SocketData).participant = participant;
  });

  // Handle code changes
  socket.on('code-change', ({ sessionId, code }: { sessionId: string; code: string; cursorPosition?: unknown }) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.code = code;
      // Broadcast to all other clients in the session
      socket.to(sessionId).emit('code-update', {
        code,
        userId: socket.id,
      });
      // Run the code asynchronously and stream results back to the sender
      (async () => {
        try {
          if (typeof code !== 'string') {
            socket.emit('execution-chunk', { chunk: '', isError: true });
            socket.emit('execution-result', { stdout: '', stderr: 'Invalid code payload', exitCode: 1 });
            return;
          }

          if (code.length > MAX_CODE_LENGTH) {
            socket.emit('execution-chunk', { chunk: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters\n`, isError: true });
            socket.emit('execution-result', {
              stdout: '',
              stderr: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`,
              exitCode: 1,
            });
            return;
          }

          // Emit execution-start event
          socket.emit('execution-start');

          const language = session.language || 'javascript';
          const result = await runInDocker(language, code);

          // Stream stdout in chunks
          if (result.stdout) {
            socket.emit('execution-chunk', { chunk: result.stdout, isError: false });
          }

          // Stream stderr in chunks
          if (result.stderr) {
            socket.emit('execution-chunk', { chunk: result.stderr, isError: true });
          }

          // Final result
          socket.emit('execution-result', {
            stdout: result.stdout || '',
            stderr: result.stderr || '',
            exitCode: typeof result.code === 'number' ? result.code : 0,
          });
        } catch (err) {
          const error = err as Error;
          socket.emit('execution-chunk', { chunk: error?.message || String(err), isError: true });
          socket.emit('execution-result', { stdout: '', stderr: error?.message || String(err), exitCode: 1 });
        }
      })();
    }
  });

  // Handle language changes
  socket.on('language-change', ({ sessionId, language }: { sessionId: string; language: string }) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.language = language;
      socket.to(sessionId).emit('language-update', { language });
    }
  });

  // Handle cursor position updates
  socket.on('cursor-update', ({ sessionId, position, username }: { sessionId: string; position: unknown; username: string }) => {
    socket.to(sessionId).emit('remote-cursor', {
      userId: socket.id,
      position,
      username,
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const { sessionId, participant } = socket.data as SocketData;
    if (sessionId && participant) {
      const session = sessions.get(sessionId);
      if (session) {
        session.participants = session.participants.filter(
          (p) => p.id !== socket.id
        );
        socket.to(sessionId).emit('user-left', { id: socket.id });
        console.log(`${participant.username} left session ${sessionId}`);

        // Clean up empty sessions after 1 hour
        if (session.participants.length === 0) {
          setTimeout(() => {
            const currentSession = sessions.get(sessionId);
            if (currentSession && currentSession.participants.length === 0) {
              sessions.delete(sessionId);
              console.log(`Session ${sessionId} cleaned up`);
            }
          }, 3600000);
        }
      }
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Export for testing
export { app, server };

// Only listen if not being imported for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
