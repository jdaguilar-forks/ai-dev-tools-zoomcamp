# Coding Interview App - README

A full-stack real-time collaborative coding platform for conducting online interviews. Supports 7 programming languages with server-side Docker sandboxing, real-time code synchronization, and live participant tracking.

## ✨ Features

- **Real-time Collaboration**: Multiple users edit code simultaneously with instant synchronization
- **Multi-Language Support**: JavaScript, Python, PHP, Go, Ruby, Java, Rust
- **Secure Code Execution**: Server-side Docker sandbox with resource limits and isolation
- **Shareable Sessions**: Generate unique session links to invite participants
- **Live Participants**: See who's currently in your session
- **Responsive UI**: Desktop, tablet, and mobile-friendly interface
- **Resizable Editor**: Drag to adjust editor/output panel split
- **Real-time Output**: View code execution results instantly

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Docker** or **Podman** ([Docker Desktop](https://www.docker.com/products/docker-desktop) / [Podman](https://podman.io/))

### Development Setup (5 minutes)

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install && cd ..

# Start both servers (or in separate terminals)
./run.sh both

# Or manually in separate terminals:
# Terminal 1 (Backend):
cd server && npm run dev

# Terminal 2 (Frontend):
cd client && npm run dev
```

Visit http://localhost:5173 in your browser.

### Production Setup

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive production deployment instructions.

## 📁 Project Structure

```
coding-interview-app/
├── server/                    # Node.js + Express + TypeScript backend
│   ├── src/
│   │   └── index.ts          # Express app, Socket.IO, code execution
│   ├── environments/         # Docker build contexts for languages
│   │   ├── go/
│   │   ├── java/
│   │   ├── node/
│   │   ├── php/
│   │   ├── python/
│   │   ├── ruby/
│   │   └── rust/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example          # Environment variable template
│   └── .env                  # Local development config (git-ignored)
├── client/                    # React 18 + Vite + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx           # Router setup
│   │   ├── index.css         # Responsive styles
│   │   └── pages/
│   │       ├── Home.tsx      # Session creation
│   │       └── Session.tsx   # Collaboration interface
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── .env.example          # Environment variable template
│   └── .env                  # Local development config (git-ignored)
├── docker-compose.yml         # Production Docker setup
├── DEPLOYMENT.md             # Deployment guide
├── PRODUCTION_CHECKLIST.md   # Production readiness checklist
└── SETUP.md                  # Detailed technical setup
```

## 🔧 Configuration

### Environment Variables

Both frontend and backend use environment variables for configuration. This allows the same code to run locally and in production with different settings.

#### Backend (`server/.env`)

```env
PORT=3001                          # Backend server port
NODE_ENV=development               # development or production
CORS_ORIGINS=http://localhost:5173 # Comma-separated allowed origins
CODE_EXECUTION_TIMEOUT=10000       # Code execution timeout (ms)
DOCKER_MEMORY_LIMIT=256m           # Docker container memory
DOCKER_CPU_LIMIT=0.5               # Docker container CPU
DOCKER_PID_LIMIT=64                # Docker max processes
LOG_LEVEL=debug                    # debug, info, warn, error
RATE_LIMIT_WINDOW_MS=60000         # Rate limit window (ms)
RATE_LIMIT_MAX_REQUESTS=100        # Max requests per window
MAX_CODE_LENGTH=50000              # Max code submission length
```

#### Frontend (`client/.env`)

```env
VITE_API_URL=http://localhost:3001    # Backend API URL
VITE_SOCKET_URL=http://localhost:3001 # WebSocket server URL
VITE_APP_ENV=development              # Environment identifier
```

**Local defaults are already configured.** To customize, edit `.env` files directly (they're git-ignored for security).

## 🏗️ Architecture

```
┌─ Frontend (React + Vite, Port 5173) ─┐
│  - Monaco Editor                      │
│  - Socket.IO Client                   │
│  - Responsive Flexbox Layout          │
└──────────────┬────────────────────────┘
               │ HTTP + WebSocket
┌──────────────▼────────────────────────┐
│ Backend (Express + Socket.IO, 3001)   │
│  - Session Management                 │
│  - Real-time Sync                     │
│  - Code Execution API                 │
└──────────────┬────────────────────────┘
               │ Docker CLI
┌──────────────▼────────────────────────┐
│ Docker Sandbox (Isolated Containers)  │
│  - php:8.1, python:3.11, node:18, etc │
│  - Memory: 256MB, CPU: 0.5, PIDs: 64  │
│  - Network: None (Isolated)           │
└───────────────────────────────────────┘
```

## 📡 Real-time Features

### Session Lifecycle

1. **Create**: Click "Create New Session" → Unique 8-char ID generated → Share link
2. **Join**: Paste/share link → Multiple users join same session
3. **Sync**: Code edits broadcast to all participants via WebSocket
4. **Execute**: Click "Run Code" → Server-side Docker execution
5. **Collaborate**: See live participants, real-time cursor positions (future)

### Code Execution

```javascript
// Frontend sends:
POST /api/execute
{ "language": "python", "code": "print('Hello')" }

// Backend returns:
{ 
  "stdout": "Hello\n", 
  "stderr": "", 
  "exitCode": 0 
}
```

Code runs in isolated Docker containers with:
- No network access
- Memory limits (256MB default)
- CPU limits (0.5 core default)
- Process limits (64 max processes)
- 10-second timeout

## 🔒 Security

- **CORS**: Limited to configured origins (frontend URL)
- **Rate Limiting**: 100 requests/minute per IP
- **Input Validation**: Code length, language, session ID checks
- **Docker Isolation**: Code runs in sandboxed containers with resource limits
- **Environment Variables**: Sensitive config never committed to Git
- **Error Handling**: Errors logged but don't leak internal details

## 🧪 Testing & Debugging

### Verify Setup

```bash
# Test backend API
curl http://localhost:3001/api/sessions

# Test WebSocket connection
# Open browser console at http://localhost:5173
# Should see "Socket.IO Client Connected" in console

# Test Docker
docker --version
docker run hello-world
```

### Debugging

**Frontend Issues**:
- Check browser console (F12) for JavaScript errors
- Check Network tab for API/WebSocket failures
- Verify `VITE_SOCKET_URL` matches backend address

**Backend Issues**:
- Check terminal logs from `npm run dev`
- Enable debug logging: `LOG_LEVEL=debug` in `.env`
- Verify port 3001 is available: `lsof -i :3001` (macOS/Linux)

**Code Execution Issues**:
- Verify Docker running: `docker ps`
- Check image availability: `docker images`
- Enable debug logs to see Docker command being executed

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment, Docker Compose, cloud platforms
- **[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)** - Readiness checklist, completed enhancements
- **[SETUP.md](./SETUP.md)** - Detailed technical setup and troubleshooting
- **[INTERVIEW_APP_README.md](./INTERVIEW_APP_README.md)** - API endpoints and WebSocket events

## 🚢 Production Deployment

### Docker Compose (Recommended)

```bash
# Build and start (includes frontend + backend + networking)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Cloud Platforms

Deploy to **Heroku**, **AWS**, **Render**, or any platform supporting Docker:

```bash
# Build image
docker build -t coding-interview-backend server/

# Push to registry
docker tag coding-interview-backend myregistry/coding-interview-backend:latest
docker push myregistry/coding-interview-backend:latest

# Deploy (platform-specific)
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed cloud platform instructions.

## 🔄 Development Workflow

### Local Development

- **Auto-reload**: Changes to frontend/backend restart automatically
- **Hot Module Replacement**: Frontend updates appear without refresh
- **Console Logs**: Debug messages appear in terminal and browser console
- **Environment**: Use `.env` files (already configured for localhost)

### Making Changes

1. **Edit code** in your IDE
2. **Server auto-reloads** (backend) or **HMR updates** (frontend)
3. **Test in browser** - Create session, invite user, run code
4. **Check logs** - Terminal shows backend logs, browser console shows frontend logs
5. **Commit** - Git ignores `.env` files automatically

### Adding Features

**New Language Support**:
1. Create a new directory in `server/environments/<language>`
2. Add a `Dockerfile` and entrypoint script (e.g., `run.sh` or `main.py`)
3. Add to `mapping` object in `server/index.ts` `runInDocker()` function
4. Add default snippet in `client/src/pages/Session.tsx` `handleLanguageChange()`
5. Add `<option>` to language dropdown
6. Test execution

**New API Endpoint**:
1. Add Express route in `server/index.ts`
2. Add error handling with try-catch
3. Add structured logging
4. Update frontend to call endpoint
5. Add rate limiting if needed

## 📊 Performance & Optimization

- **Code Execution**: 10-second timeout prevents infinite loops
- **Code Length**: 50KB limit prevents resource exhaustion
- **Memory**: Docker containers limited to 256MB
- **CPU**: Docker containers limited to 0.5 CPU core
- **Network**: Disabled in Docker (prevents external calls)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and test locally
3. Commit with clear messages
4. Push and create a pull request

## 📝 License

MIT

## 🆘 Support & Troubleshooting

See **[DEPLOYMENT.md](./DEPLOYMENT.md#troubleshooting)** for:
- Docker/Podman permission issues
- Connection problems
- Performance tuning
- Security configuration

**Quick Links**:
- [Setup Instructions](./SETUP.md)
- [API Documentation](./INTERVIEW_APP_README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Production Checklist](./PRODUCTION_CHECKLIST.md)

## 🎯 Roadmap

- [x] Real-time code collaboration
- [x] Multi-language support (7 languages)
- [x] Docker sandboxing
- [x] Responsive UI
- [x] Environment configuration
- [x] Production deployment guide
- [ ] Authentication (JWT/OAuth2)
- [ ] Session persistence (Redis/PostgreSQL)
- [ ] Code syntax highlighting improvements
- [ ] Execution history
- [ ] User profiles
- [ ] Collaborative cursor tracking
- [ ] Code snippets library
- [ ] Mobile app

---

**Version**: 1.0.0  
**Status**: Production-Ready  
**Last Updated**: 2024  

For questions or issues, check [DEPLOYMENT.md](./DEPLOYMENT.md) or review [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md).
