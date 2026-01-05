import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import rateLimit from 'express-rate-limit';
import 'dotenv/config.js';

const app = express();
const server = createServer(app);

// Environment configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');
const CODE_EXECUTION_TIMEOUT = parseInt(process.env.CODE_EXECUTION_TIMEOUT || '10000');
const MAX_CODE_LENGTH = parseInt(process.env.MAX_CODE_LENGTH || '50000');
const DOCKER_MEMORY_LIMIT = process.env.DOCKER_MEMORY_LIMIT || '256m';
const DOCKER_CPU_LIMIT = process.env.DOCKER_CPU_LIMIT || '0.5';
const DOCKER_PID_LIMIT = process.env.DOCKER_PID_LIMIT || '64';

// Logging utility
const log = (level, message, data = {}) => {
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
app.use((err, req, res, next) => {
  log('error', 'Request error', { path: req.path, error: err.message });
  res.status(500).json({ error: 'Internal server error' });
});

// In-memory session storage
const sessions = new Map();

// Create a new interview session
app.post('/api/sessions', (req, res) => {
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
    log('error', 'Failed to create session', { error: err.message });
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get session info
app.get('/api/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Validate session ID format
    if (!/^[a-f0-9]{8}$/.test(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }
    
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (err) {
    log('error', 'Failed to get session', { error: err.message });
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * Helper: run command with promise
 */
function execAsync(cmd, options = {}) {
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
async function ensureImageAvailable(image) {
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
async function runInDocker(language, code) {
  try {
    const mapping = {
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
      return { stdout: '', stderr: err.message, code: 1 };
    }

    const tmpDir = await fs.mkdtemp(path.join('/tmp/exec', `exec-${language}-`));
    log('debug', 'Created temp directory', { tmpDir });
    
    const filePath = path.join(tmpDir, entry.filename);
    
    await fs.writeFile(filePath, code, 'utf8');
    log('debug', 'File written successfully', { filePath, codeLength: code.length });
    
    // Verify file was written
    const stats = await fs.stat(filePath);
    log('debug', 'File stats', { filePath, size: stats.size });
    
    // Make directory and file world-readable for rootless Podman/Docker
    await fs.chmod(tmpDir, 0o777);
    await fs.chmod(filePath, 0o644);

    const DOCKER_MEMORY = process.env.DOCKER_MEMORY_LIMIT || '256m';
    const DOCKER_CPU = process.env.DOCKER_CPU_LIMIT || '0.5';
    const DOCKER_PID = process.env.DOCKER_PID_LIMIT || '64';

    // Use podman when running in container, docker otherwise
    const isInContainer = fs.existsSync('/.dockerenv');
    const containerCmd = isInContainer ? 'podman' : 'docker';
    const unsernsFlag = isInContainer ? '--userns=keep-id' : '';
    const dockerCmd = `${containerCmd} run --rm ${unsernsFlag} --network none --pids-limit=${DOCKER_PID} --memory=${DOCKER_MEMORY} --cpus=${DOCKER_CPU} -v "${tmpDir}:/workspace" -w /workspace ${entry.image} sh -c '${entry.cmd.replace(/'/g, "'\\''")}'`.trim().replace(/  +/g, ' ');
    
    log('debug', 'Executing Docker command', { tmpDir, image: entry.image, cmd: entry.cmd });

    const timeoutMs = CODE_EXECUTION_TIMEOUT;
    let result;
    try {
      result = await execAsync(dockerCmd, { timeout: timeoutMs });
    } catch (err) {
      log('error', 'Docker execution failed', { error: err.message, stderr: err.stderr });
      result = { error: err, stdout: '', stderr: err?.message || String(err), code: 1 };
    }

    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      // ignore cleanup errors
    }

    const stdout = result.stdout || '';
    const stderr = result.stderr || (result.error ? result.error.message : '');
    const codeExit = result.code || (result.error ? 1 : 0);

    return { stdout, stderr, code: codeExit };
  } catch (err) {
    log('error', 'runInDocker fatal error', { language, error: err.message });
    return { stdout: '', stderr: err.message, code: 1 };
  }
}

/**
 * Endpoint: execute code on server using Docker sandbox.
 * Body: { language: 'php'|'go'|'ruby'|'java'|'rust'|'node'|'python', code: '...' }
 */
app.post('/api/execute', async (req, res) => {
  try {
    const { language, code } = req.body || {};
    if (!language || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing language or code in request body' });
    }

    // Validate language
    const validLanguages = ['php', 'go', 'ruby', 'java', 'rust', 'node', 'python'];
    if (!validLanguages.includes(language)) {
      return res.status(400).json({ error: `Unsupported language: ${language}` });
    }

    // Validate code length
    if (code.length > MAX_CODE_LENGTH) {
      return res.status(400).json({ error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters` });
    }

    try {
      const check = await execAsync('docker --version');
      if (check.error) {
        log('warn', 'Docker not available');
        return res.status(500).json({ error: 'Docker is required on the server but not available.' });
      }
    } catch (err) {
      log('error', 'Docker check failed', { error: err.message });
      return res.status(500).json({ error: 'Docker is required on the server but not available.' });
    }

    try {
      log('info', 'Executing code', { language, codeLength: code.length });
      const { stdout, stderr, code: exitCode } = await runInDocker(language, code);
      res.json({ stdout, stderr, exitCode });
    } catch (err) {
      log('error', 'Code execution failed', { language, error: err.message });
      res.status(500).json({ error: err?.message || 'Execution error' });
    }
  } catch (err) {
    log('error', 'Execute endpoint error', { error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join a session
  socket.on('join-session', ({ sessionId, username }) => {
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

    const participant = {
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
    socket.data.sessionId = sessionId;
    socket.data.participant = participant;
  });

  // Handle code changes
  socket.on('code-change', ({ sessionId, code, cursorPosition }) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.code = code;
      // Broadcast to all other clients in the session
      socket.to(sessionId).emit('code-update', {
        code,
        cursorPosition,
        userId: socket.id,
      });
    }
  });

  // Handle language changes
  socket.on('language-change', ({ sessionId, language }) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.language = language;
      socket.to(sessionId).emit('language-update', { language });
    }
  });

  // Handle cursor position updates
  socket.on('cursor-update', ({ sessionId, position, username }) => {
    socket.to(sessionId).emit('remote-cursor', {
      userId: socket.id,
      position,
      username,
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const { sessionId, participant } = socket.data;
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

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
