# Coding Interview App - AI Agent Instructions

## Project Overview

A full-stack real-time collaborative coding platform for conducting online interviews. Users can create shareable session links, edit code together in real-time, execute code in 7 languages (JavaScript, Python, PHP, Go, Ruby, Java, Rust) via Docker sandbox on the server, and track active participants with a responsive UI.

## Architecture

### Backend (Node.js/Express on port 3001)

- **server/index.ts**: Express + Socket.IO server managing session state and WebSocket communication
- **In-memory session storage**: Sessions stored as Map objects with `{id, code, language, participants, createdAt}`
- **Docker-based code execution**: All code runs in isolated containers with resource limits (256MB memory, 0.5 CPU, no network access)
- **Key endpoints**:
  - `POST /api/sessions` - Create session (generates 8-char UUID, returns shareable link)
  - `GET /api/sessions/:sessionId` - Fetch session data
  - `POST /api/execute` - Execute code in Docker sandbox (language, code) → {stdout, stderr, exitCode}
  - **Socket events**: `join-session`, `code-change`, `language-change`, `code-update`, `language-update`, `user-joined`, `user-left`, `session-state`

### Frontend (React 18 + Vite on port 5173)

- **client/src/App.tsx**: Router with Home (create session) and Session (collaboration) pages
- **client/src/pages/Session.tsx**: Main collaboration component using:
  - Monaco Editor (`@monaco-editor/react`) for syntax highlighting + code editing
  - Socket.IO client for real-time sync
  - Resizable editor/output panel with drag-to-resize handle
  - Server-side code execution via `/api/execute` endpoint
- **client/src/pages/Home.tsx**: Session creation and joining UI
- **Local state management**: useState for code, language, output, participants, username, editorHeight
- **Persistent storage**: Username stored in localStorage as `interview-username`
- **Responsive UI**: Flexbox layout with mobile-first breakpoints (480px, 768px, 1024px)

## Current Implementation Details

### Code Execution (Docker Sandbox)

- **Supported Languages**: php, python, go, ruby, java, rust, node (plus javascript mapped to node)
- **Environments**: Dockerfiles located in `server/environments/<language>/`
- **Dynamic Build**: Images are built dynamically from `server/environments` on demand using `docker build`
- **Security**: Docker containers run with:
  - `--network none` (no external network access)
  - `--pids-limit=64` (max 64 processes)
  - `--memory=256m` (256MB memory limit)
  - `--cpus=0.5` (0.5 CPU limit)
  - `--userns=keep-id` (rootless Podman compatibility)
  - `:Z` SELinux labeling (Podman permission handling)
- **Timeout**: 10 seconds per execution
- **Output**: Captures stdout, stderr, and exit code; displays formatted results to user

### Real-time Collaboration

- Client emits `code-change` event on every edit with updated code
- Server broadcasts `code-update` to all connected clients in session (except sender via `isLocalChange` ref flag)
- Language changes trigger `language-change` event with default code snippet for selected language
- Participants join/leave with socket events updating the participants list

### UI Features

- **Resizable Editor**: Drag handle between editor and output to adjust split (20-80% range)
- **Language Selector**: 7 languages with appropriate default code snippets
- **Username Input**: Persisted in localStorage, auto-generated if not set
- **Share Link**: Copy button with visual feedback (changes to "Copied!" for 2 seconds)
- **Connection Status**: Dot indicator shows connected/disconnected state
- **Responsive Design**: Mobile (480px), Tablet (768px), Desktop (1024px+) layouts

## Development Workflow

### Starting the Application

```bash
# Terminal 1: Backend
cd server && npm run dev  # Watches for changes with node --watch

# Terminal 2: Frontend
cd client && npm run dev  # Vite dev server with HMR

# Or use the shortcut:
./run.sh both
```

### Key Development Patterns

**Real-time Code Sync**:
- User edits → `handleEditorChange` sets local state and emits `code-change` event
- Server broadcasts `code-update` to all clients except sender
- Use `isLocalChange` ref flag to avoid echoing user's own changes back

**Language Support**:
- Default code snippets defined in `defaults` object in `handleLanguageChange`
- Language change emits `language-change` event to all participants
- Code execution calls `/api/execute` endpoint with language + code payload

**Code Execution**:
- All languages execute via server `/api/execute` endpoint
- Client POSTs `{language, code}` → receives `{stdout, stderr, exitCode}`
- Output displayed with color coding (green for success, red for errors)

## Important Conventions

1. **Session IDs**: Generated as `uuidv4().slice(0, 8)` (8 chars) for shareability
2. **Socket URL**: Hardcoded to `http://localhost:3001` (update for production via env var)
3. **CORS**: Backend allows only `localhost:5173` and `127.0.0.1:5173` origins
4. **Data Isolation**: Sessions are isolated in memory; joining with any sessionId auto-creates it if missing
5. **Output States**: Empty string (waiting), success (green text), error (red text)
6. **Docker Permission Fix**: Temp files get `0o777` (dir) and `0o644` (file) perms for Podman rootless mode

## Architecture Evaluation & Recommendations

### Current State
The application follows a **straightforward monolithic + client-server pattern** suitable for its current scope:
- Single-responsibility functions (session management, socket handling, code execution)
- Clear separation of concerns (backend/frontend, UI/state/networking)
- Minimal dependencies and good runtime performance

### Architectural Improvements (Recommended for Growth)

**Short-term (MVP → Production)**:
1. **Environment Configuration**: Move hardcoded values (SOCKET_URL, CORS origins, Docker images, memory limits, timeouts) to `.env` files
2. **Error Handling**: Add structured error classes and consistent error responses (standardize error format across API/WebSocket)
3. **Input Validation**: Validate code length, language values, and session IDs before processing
4. **Logging**: Implement structured logging (Winston/Pino) with request IDs for debugging and tracing

**Medium-term (Production → Scale)**:
1. **Clean Architecture**: Separate concerns into:
   - **Controllers** (Express route handlers, Socket event handlers)
   - **Services** (SessionService, CodeExecutionService, UserService)
   - **Repositories** (SessionRepository - currently Map-based, migrate to DB)
   - **DTOs** (Data Transfer Objects for API contracts)
2. **SOLID Principles**:
   - **S**ingle Responsibility: CodeExecutor class for Docker logic, SessionManager for session state
   - **O**pen/Closed: Language configurations as pluggable objects (add Kotlin without modifying code)
   - **L**iskov Substitution: Abstract code executor interface (support WASM/Node/Docker implementations)
   - **I**nterface Segregation: Separate socket handlers into focused modules (CodeHandler, UserHandler, SessionHandler)
   - **D**ependency Inversion: Inject Docker runner/database into services, not hard-coded

**Long-term (Enterprise Scale)**:
1. **Hexagonal Architecture**: Separate application logic from external concerns:
   - **Core domain**: Session, Participant, CodeExecution (pure business logic)
   - **Adapters**: HTTP API, WebSocket, Docker CLI, Database, Message Queue
   - Allows swapping Docker → Kubernetes or switching databases without core changes
2. **Event Sourcing**: Store all user actions (code edits, language changes) as immutable events
   - Enables audit trails, replay sessions, undo/redo, conflict resolution
3. **Microservices** (if needed):
   - Separate code-execution service (scale independently)
   - Session service (user/collaboration logic)
   - Auth service (if adding authentication)

### Current Best Practices Implemented
✅ Real-time sync with idempotent operations (code-change is idempotent)
✅ Resource-isolated execution (Docker containers with limits)
✅ Graceful error handling (try-catch with user-friendly messages)
✅ Responsive UI (mobile-first, flexbox layout)
✅ Efficient state management (minimal re-renders with useCallback, useRef)

### Current Best Practices Gaps (Priority)
❌ **No persistence**: Sessions lost on server restart (add Redis/PostgreSQL)
❌ **No authentication**: Anyone can join any session (add OAuth2 or JWT)
❌ **No rate limiting**: No protection against abuse
❌ **No tests**: No coverage for critical paths (code execution, session sync)
❌ **No monitoring**: No visibility into failures or performance

## Testing Strategy

### Unit Tests (to implement)

**Backend** (`server/index.test.ts`):
```javascript
// Language mapping validation
test('runInDocker maps all supported languages to Docker images')

// Session management
test('session creation generates unique 8-char IDs')
test('participants list updates correctly on join/leave')

// Code execution
test('docker command escapes quotes correctly')
test('timeout error is caught and returned')
test('temp directory is cleaned up after execution')
```

**Frontend** (`client/src/pages/Session.test.tsx`):
```javascript
// Editor state
test('handleEditorChange updates code state')
test('handleLanguageChange sets correct default snippet')

// API calls
test('runCode POSTs language + code to /api/execute')
test('runCode handles error responses gracefully')

// UI state
test('editorHeight updates on resize-handle drag')
test('connection status shows connected/disconnected')
```

### Integration Tests (to implement)

**E2E Scenarios** (using Playwright/Cypress):
```javascript
// Session creation flow
test('User A creates session → User B joins → both see same code')

// Real-time sync
test('User A edits code → User B sees updates within 100ms')

// Code execution
test('User runs Python code → stdout displays in output panel')

// Error handling
test('Docker timeout → user sees "Execution timeout" message')
```

**Server Integration**:
```javascript
// Socket events
test('join-session creates session + broadcasts user-joined')
test('code-change broadcasts code-update to other clients')

// API execution
test('POST /api/execute with Python → returns stdout')
test('POST /api/execute with invalid language → returns 400 error')
```

### Test Framework Recommendations

- **Backend**: Jest (simple, built-in mocking, good for Node.js)
- **Frontend**: Vitest + React Testing Library (fast, intuitive DOM queries)
- **E2E**: Playwright (headless, multi-browser, great for real-time apps)
- **Coverage target**: 70%+ for critical paths (session management, code execution)

## Files to Reference

- **server/index.ts**: Socket.IO events, session lifecycle, Docker sandbox executor
- **client/src/pages/Session.tsx**: Collaboration UI, resizable editor, server code execution
- **client/src/pages/Home.tsx**: Session creation flow
- **SETUP.md**: Port configuration, Docker/Podman setup, troubleshooting
- **INTERVIEW_APP_README.md**: API endpoints and WebSocket event contracts

## Common Tasks

**Adding Features**:
1. Define new Socket event in server (emit/on)
2. Connect in Session.jsx with socketRef
3. Add unit test for new logic
4. Test with multiple browser tabs (one joins as User-1, another as User-2)

**Adding a New Language**:
1. Create a new directory `server/environments/<language>`
2. Add a `Dockerfile` and entrypoint script
3. Add to `mapping` object in `runInDocker()` with Docker image + filename + run command
4. Add default snippet to `defaults` object in `handleLanguageChange()`
5. Add `<option>` to language select dropdown
6. Test execution and output formatting

**Debugging**:
- Check backend logs: `npm run dev` shows `Client connected: [socket.id]`
- Check frontend: Browser console shows Socket.IO connection status
- Verify ports: Backend 3001, Frontend 5173
- Docker/Podman issues: Run `docker --version` or `podman --version`
- Permission errors: Check `/tmp/exec-*` directory permissions

**Production Deployment**:
1. Store sessions in Redis (currently in-memory Map)
2. Add environment variables for SOCKET_URL, CORS origins, Docker image list
3. Implement authentication (OAuth2 or JWT)
4. Add rate limiting per session/IP
5. Set up logging and monitoring (Datadog, New Relic)
6. Use Docker Compose or Kubernetes for orchestration
7. Add CI/CD pipeline with automated tests and linting
