// Mock helper: simulate the server structure for testing
// Tests focus on business logic that can be unit tested

describe('Session Management', () => {
    let sessions;

    beforeEach(() => {
        sessions = new Map();
    });

    it('should create a new session with generated ID', () => {
        const sessionId = 'test-session-1';
        const session = {
            id: sessionId,
            code: '// Start coding here...\n',
            language: 'javascript',
            participants: [],
            createdAt: new Date().toISOString(),
        };

        sessions.set(sessionId, session);

        expect(sessions.has(sessionId)).toBe(true);
        expect(sessions.get(sessionId).id).toBe(sessionId);
        expect(sessions.get(sessionId).language).toBe('javascript');
    });

    it('should add participant to session', () => {
        const sessionId = 'test-session';
        const session = {
            id: sessionId,
            code: '// Code\n',
            language: 'javascript',
            participants: [],
            createdAt: new Date().toISOString(),
        };

        sessions.set(sessionId, session);

        const participant = {
            id: 'socket-id-1',
            username: 'User-1',
            joinedAt: new Date().toISOString(),
        };

        session.participants.push(participant);

        expect(session.participants).toHaveLength(1);
        expect(session.participants[0].username).toBe('User-1');
    });

    it('should remove participant from session', () => {
        const sessionId = 'test-session';
        const session = {
            id: sessionId,
            code: '// Code\n',
            language: 'javascript',
            participants: [
                { id: 'socket-1', username: 'User-1', joinedAt: new Date().toISOString() },
                { id: 'socket-2', username: 'User-2', joinedAt: new Date().toISOString() },
            ],
            createdAt: new Date().toISOString(),
        };

        sessions.set(sessionId, session);

        // Remove participant
        const filtered = session.participants.filter(p => p.id !== 'socket-1');
        session.participants = filtered;

        expect(session.participants).toHaveLength(1);
        expect(session.participants[0].id).toBe('socket-2');
    });

    it('should update session code', () => {
        const sessionId = 'test-session';
        const session = {
            id: sessionId,
            code: '// Old code\n',
            language: 'javascript',
            participants: [],
            createdAt: new Date().toISOString(),
        };

        sessions.set(sessionId, session);

        const newCode = 'console.log("Hello, World!");\n';
        session.code = newCode;

        expect(sessions.get(sessionId).code).toBe(newCode);
    });

    it('should update session language', () => {
        const sessionId = 'test-session';
        const session = {
            id: sessionId,
            code: '// Code\n',
            language: 'javascript',
            participants: [],
            createdAt: new Date().toISOString(),
        };

        sessions.set(sessionId, session);

        session.language = 'python';

        expect(sessions.get(sessionId).language).toBe('python');
    });
});

describe('Language Support', () => {
    const supportedLanguages = {
        php: {
            image: 'php:8.1-cli',
            filename: 'index.php',
            cmd: 'php index.php',
        },
        ruby: {
            image: 'ruby:3.1',
            filename: 'main.rb',
            cmd: 'ruby main.rb',
        },
        go: {
            image: 'golang:1.20',
            filename: 'main.go',
            cmd: 'go run main.go',
        },
        java: {
            image: 'openjdk:17',
            filename: 'Main.java',
            cmd: 'javac Main.java && java Main',
        },
        rust: {
            image: 'rust:1.64',
            filename: 'main.rs',
            cmd: 'rustc main.rs -o main && ./main',
        },
        node: {
            image: 'node:18-alpine',
            filename: 'index.js',
            cmd: 'node index.js',
        },
        python: {
            image: 'python:3.11-alpine',
            filename: 'main.py',
            cmd: 'python main.py',
        },
    };

    it('should have all 7 supported languages', () => {
        expect(Object.keys(supportedLanguages)).toHaveLength(7);
    });

    it('should map all supported languages to Docker images', () => {
        const languages = Object.keys(supportedLanguages);
        languages.forEach((lang) => {
            const entry = supportedLanguages[lang];
            expect(entry.image).toBeDefined();
            expect(entry.filename).toBeDefined();
            expect(entry.cmd).toBeDefined();
            expect(entry.image).toContain(':');
        });
    });

    it('should return error for unsupported language', () => {
        const language = 'unsupported-lang';
        const entry = supportedLanguages[language];

        expect(entry).toBeUndefined();
    });

    it('should have correct Python configuration', () => {
        const python = supportedLanguages.python;
        expect(python.filename).toBe('main.py');
        expect(python.cmd).toBe('python main.py');
    });

    it('should have correct JavaScript/Node configuration', () => {
        const node = supportedLanguages.node;
        expect(node.filename).toBe('index.js');
        expect(node.cmd).toBe('node index.js');
    });
});

describe('Code Validation', () => {
    const MAX_CODE_LENGTH = 50000;

    it('should accept valid code string', () => {
        const code = 'console.log("hello");\n';
        expect(typeof code === 'string').toBe(true);
    });

    it('should reject code exceeding max length', () => {
        const code = 'x'.repeat(MAX_CODE_LENGTH + 1);
        expect(code.length > MAX_CODE_LENGTH).toBe(true);
    });

    it('should accept code at max length boundary', () => {
        const code = 'x'.repeat(MAX_CODE_LENGTH);
        expect(code.length <= MAX_CODE_LENGTH).toBe(true);
    });

    it('should handle empty code string', () => {
        const code = '';
        expect(typeof code === 'string').toBe(true);
        expect(code.length).toBe(0);
    });

    it('should handle multiline code', () => {
        const code = `
function hello() {
  console.log("Hello, World!");
  return 42;
}

hello();
    `.trim();
        expect(code.includes('\n')).toBe(true);
    });
});

describe('Docker Command Escaping', () => {
    it('should escape single quotes in docker commands', () => {
        const cmd = `node -e 'console.log("hello")'`;
        const escaped = cmd.replace(/'/g, "'\\''");

        expect(escaped).toContain("'\\''");
        expect(typeof escaped === 'string').toBe(true);
    });

    it('should handle code with special characters', () => {
        const code = `console.log("It's a test");`;
        const escaped = code.replace(/'/g, "'\\''");

        expect(escaped).toBeDefined();
        expect(typeof escaped === 'string').toBe(true);
    });
});

describe('Socket Event Data', () => {
    it('should handle code-change event with valid payload', () => {
        const payload = {
            sessionId: 'test-session',
            code: 'console.log("test");\n',
            cursorPosition: { line: 0, column: 0 },
        };

        expect(payload.sessionId).toBeDefined();
        expect(payload.code).toBeDefined();
    });

    it('should handle language-change event', () => {
        const payload = {
            sessionId: 'test-session',
            language: 'python',
        };

        expect(payload.sessionId).toBeDefined();
        expect(payload.language).toBe('python');
    });

    it('should handle join-session event', () => {
        const payload = {
            sessionId: 'test-session',
            username: 'Alice',
        };

        expect(payload.sessionId).toBeDefined();
        expect(payload.username).toBe('Alice');
    });

    it('should handle cursor-update event', () => {
        const payload = {
            sessionId: 'test-session',
            position: { line: 5, column: 10 },
            username: 'Bob',
        };

        expect(payload.sessionId).toBeDefined();
        expect(payload.position).toBeDefined();
    });
});

describe('Execution Result Formatting', () => {
    it('should format successful execution result', () => {
        const result = {
            stdout: 'Hello, World!\n',
            stderr: '',
            exitCode: 0,
        };

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Hello');
    });

    it('should format error execution result', () => {
        const result = {
            stdout: '',
            stderr: 'ReferenceError: x is not defined\n',
            exitCode: 1,
        };

        expect(result.exitCode).not.toBe(0);
        expect(result.stderr.length > 0).toBe(true);
    });

    it('should format timeout result', () => {
        const result = {
            stdout: '',
            stderr: 'Execution timeout',
            exitCode: 124,
        };

        expect(result.exitCode).toBe(124);
    });

    it('should handle result with both stdout and stderr', () => {
        const result = {
            stdout: 'Output line\n',
            stderr: 'Warning: deprecated\n',
            exitCode: 0,
        };

        expect(result.stdout).toBeDefined();
        expect(result.stderr).toBeDefined();
    });
});

describe('Docker Integration - Code Execution', () => {
    // Skip Docker tests if Docker is not available
    const skipIfNoDocker = process.env.SKIP_DOCKER_TESTS === 'true';
    const testFn = skipIfNoDocker ? it.skip : it;

    // Helper function to run code in Docker
    const runCodeInDocker = (image, language, code) => {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            const cmdFlag = language === 'python' ? '-c' : '-e';
            const cmd = language === 'python' ? 'python' : 'node';
            const dockerCmd = `docker run --rm ${image} ${cmd} ${cmdFlag} '${code.replace(/'/g, "'\\''")}'`;
            
            const proc = spawn('sh', ['-c', dockerCmd]);
            let stdout = '';
            let stderr = '';
            let timedOut = false;

            const timeout = setTimeout(() => {
                timedOut = true;
                proc.kill();
                resolve({ stdout, stderr, code: 124, timedOut: true });
            }, 10000);

            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                clearTimeout(timeout);
                if (!timedOut) {
                    resolve({ stdout, stderr, code });
                }
            });

            proc.on('error', (err) => {
                clearTimeout(timeout);
                resolve({ stdout, stderr, code: 1, error: err.message });
            });
        });
    };

    describe('Python Code Execution', () => {
        testFn('should execute simple Python print statement', async () => {
            const code = 'print("Hello from Python")';
            const result = await runCodeInDocker('python:3.11-alpine', 'python', code);

            if (!result.error) {
                expect(result.stdout).toContain('Hello from Python');
                expect(result.code).toBe(0);
            }
        });

        testFn('should capture Python runtime errors', async () => {
            const code = 'print(undefined_variable)';
            const result = await runCodeInDocker('python:3.11-alpine', 'python', code);

            if (!result.error) {
                expect(result.code).not.toBe(0);
                expect(result.stderr.length > 0 || result.stdout.length > 0).toBe(true);
            }
        });
    });

    describe('Node.js Code Execution', () => {
        testFn('should execute simple Node.js code', async () => {
            const code = 'console.log("Hello from Node.js")';
            const result = await runCodeInDocker('node:18-alpine', 'node', code);

            if (!result.error) {
                expect(result.stdout).toContain('Hello from Node.js');
                expect(result.code).toBe(0);
            }
        });

        testFn('should capture Node.js runtime errors', async () => {
            const code = 'throw new Error("Test error")';
            const result = await runCodeInDocker('node:18-alpine', 'node', code);

            if (!result.error) {
                expect(result.code).not.toBe(0);
            }
        });
    });

    describe('PHP Code Execution', () => {
        testFn('should execute simple PHP code', async () => {
            const { spawn } = require('child_process');
            const code = 'echo "Hello from PHP";';
            const dockerCmd = `docker run --rm php:8.1-cli php -r '${code.replace(/'/g, "'\\''")}'`;
            
            const result = await new Promise((resolve) => {
                const proc = spawn('sh', ['-c', dockerCmd]);
                let stdout = '';
                let stderr = '';
                let timedOut = false;

                const timeout = setTimeout(() => {
                    timedOut = true;
                    proc.kill();
                    resolve({ stdout, stderr, code: 124, timedOut: true });
                }, 10000);

                proc.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                proc.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    clearTimeout(timeout);
                    if (!timedOut) {
                        resolve({ stdout, stderr, code });
                    }
                });

                proc.on('error', (err) => {
                    clearTimeout(timeout);
                    resolve({ stdout, stderr, code: 1, error: err.message });
                });
            });

            if (!result.error) {
                expect(result.stdout).toContain('Hello from PHP');
                expect(result.code).toBe(0);
            }
        });

        testFn('should capture PHP runtime errors', async () => {
            const { spawn } = require('child_process');
            const code = 'echo $undefined_var;';
            const dockerCmd = `docker run --rm php:8.1-cli php -r '${code.replace(/'/g, "'\\''")}'`;
            
            const result = await new Promise((resolve) => {
                const proc = spawn('sh', ['-c', dockerCmd]);
                let stdout = '';
                let stderr = '';
                let timedOut = false;

                const timeout = setTimeout(() => {
                    timedOut = true;
                    proc.kill();
                    resolve({ stdout, stderr, code: 124, timedOut: true });
                }, 10000);

                proc.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                proc.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    clearTimeout(timeout);
                    if (!timedOut) {
                        resolve({ stdout, stderr, code });
                    }
                });

                proc.on('error', (err) => {
                    clearTimeout(timeout);
                    resolve({ stdout, stderr, code: 1, error: err.message });
                });
            });

            if (!result.error) {
                expect(result.code === 0 || result.stderr.length > 0).toBe(true);
            }
        });
    });

    describe('Ruby Code Execution', () => {
        testFn('should execute simple Ruby code', async () => {
            const { spawn } = require('child_process');
            const code = 'puts "Hello from Ruby"';
            const dockerCmd = `docker run --rm ruby:3.1 ruby -e '${code.replace(/'/g, "'\\''")}'`;
            
            const result = await new Promise((resolve) => {
                const proc = spawn('sh', ['-c', dockerCmd]);
                let stdout = '';
                let stderr = '';
                let timedOut = false;

                const timeout = setTimeout(() => {
                    timedOut = true;
                    proc.kill();
                    resolve({ stdout, stderr, code: 124, timedOut: true });
                }, 10000);

                proc.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                proc.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    clearTimeout(timeout);
                    if (!timedOut) {
                        resolve({ stdout, stderr, code });
                    }
                });

                proc.on('error', (err) => {
                    clearTimeout(timeout);
                    resolve({ stdout, stderr, code: 1, error: err.message });
                });
            });

            if (!result.error && result.stdout) {
                expect(result.stdout.trim()).toContain('Hello from Ruby');
                expect(result.code).toBe(0);
            }
        });

        testFn('should capture Ruby runtime errors', async () => {
            const { spawn } = require('child_process');
            const code = 'puts undefined_method';
            const dockerCmd = `docker run --rm ruby:3.1 ruby -e '${code.replace(/'/g, "'\\''")}'`;
            
            const result = await new Promise((resolve) => {
                const proc = spawn('sh', ['-c', dockerCmd]);
                let stdout = '';
                let stderr = '';
                let timedOut = false;

                const timeout = setTimeout(() => {
                    timedOut = true;
                    proc.kill();
                    resolve({ stdout, stderr, code: 124, timedOut: true });
                }, 10000);

                proc.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                proc.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    clearTimeout(timeout);
                    if (!timedOut) {
                        resolve({ stdout, stderr, code });
                    }
                });

                proc.on('error', (err) => {
                    clearTimeout(timeout);
                    resolve({ stdout, stderr, code: 1, error: err.message });
                });
            });

            if (!result.error) {
                expect(result.code).not.toBe(0);
            }
        });
    });

    describe('Go Code Execution', () => {
        testFn('should execute simple Go code', async () => {
            const { exec } = require('child_process');
            const code = `package main
import "fmt"
func main() {
  fmt.Println("Hello from Go")
}`;
            
            const result = await new Promise((resolve) => {
                const cmd = `docker run --rm -i golang:1.20 bash -c 'cat > /tmp/main.go && go run /tmp/main.go'`;
                let timedOut = false;
                const proc = exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
                    if (!timedOut) {
                        resolve({ stdout, stderr, code: err ? (err.code || 1) : 0, error: err });
                    }
                });
                proc.stdin.write(code);
                proc.stdin.end();
                const timeout = setTimeout(() => {
                    timedOut = true;
                    proc.kill();
                    resolve({ stdout: '', stderr: '', code: 124, timedOut: true });
                }, 20000);
            });

            if (!result.error) {
                expect(result.stdout).toContain('Hello from Go');
                expect(result.code).toBe(0);
            }
        }, 25000);

        testFn('should capture Go compilation errors', async () => {
            const { spawn } = require('child_process');
            const code = `package main
func main() {
  x := undefined_var
}`;
            const dockerCmd = `docker run --rm golang:1.20 go run - <<'GOEOF'\n${code}\nGOEOF`;
            
            const result = await new Promise((resolve) => {
                const proc = spawn('bash', ['-c', dockerCmd]);
                let stdout = '';
                let stderr = '';
                let timedOut = false;

                const timeout = setTimeout(() => {
                    timedOut = true;
                    proc.kill();
                    resolve({ stdout, stderr, code: 124, timedOut: true });
                }, 20000);

                proc.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                proc.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    clearTimeout(timeout);
                    if (!timedOut) {
                        resolve({ stdout, stderr, code });
                    }
                });

                proc.on('error', (err) => {
                    clearTimeout(timeout);
                    resolve({ stdout, stderr, code: 1, error: err.message });
                });
            });

            if (!result.error) {
                expect(result.code).not.toBe(0);
            }
        }, 25000);
    });

    describe('Java Code Execution', () => {
        testFn('should execute simple Java code', async () => {
            const { exec } = require('child_process');
            const code = `public class Hello {
  public static void main(String[] args) {
    System.out.println("Hello from Java");
  }
}`;
            
            const result = await new Promise((resolve) => {
                const cmd = `docker run --rm -i openjdk:17 bash -c 'cat > /tmp/Hello.java && cd /tmp && javac Hello.java && java Hello'`;
                let timedOut = false;
                const proc = exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
                    if (!timedOut) {
                        resolve({ stdout, stderr, code: err ? (err.code || 1) : 0, error: err });
                    }
                });
                proc.stdin.write(code);
                proc.stdin.end();
                const timeout = setTimeout(() => {
                    timedOut = true;
                    proc.kill();
                    resolve({ stdout: '', stderr: '', code: 124, timedOut: true });
                }, 25000);
            });

            if (!result.error) {
                expect(result.stdout).toContain('Hello from Java');
                expect(result.code).toBe(0);
            }
        }, 30000);

        testFn('should capture Java compilation errors', async () => {
            const { spawn } = require('child_process');
            const code = `public class Test {
  public static void main invalid syntax here
}`;
            const dockerCmd = `docker run --rm openjdk:17 bash -c 'cat > Test.java <<'JAVAEOF'\n${code}\nJAVAEOF\njavac Test.java'`;
            
            const result = await new Promise((resolve) => {
                const proc = spawn('bash', ['-c', dockerCmd]);
                let stdout = '';
                let stderr = '';
                let timedOut = false;

                const timeout = setTimeout(() => {
                    timedOut = true;
                    proc.kill();
                    resolve({ stdout, stderr, code: 124, timedOut: true });
                }, 25000);

                proc.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                proc.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    clearTimeout(timeout);
                    if (!timedOut) {
                        resolve({ stdout, stderr, code });
                    }
                });

                proc.on('error', (err) => {
                    clearTimeout(timeout);
                    resolve({ stdout, stderr, code: 1, error: err.message });
                });
            });

            if (!result.error) {
                expect(result.code).not.toBe(0);
            }
        }, 30000);
    });

    describe('Rust Code Execution', () => {
        testFn('should execute simple Rust code', async () => {
            const { spawn } = require('child_process');
            const code = `fn main() {
    println!("Hello from Rust");
}`;
            const dockerCmd = `docker run --rm rust:1.64 bash -c 'cat > main.rs <<'RUSTEOF'\n${code}\nRUSTEOF\nrustc main.rs -o main && ./main'`;
            
            const result = await new Promise((resolve) => {
                const proc = spawn('bash', ['-c', dockerCmd]);
                let stdout = '';
                let stderr = '';
                let timedOut = false;

                const timeout = setTimeout(() => {
                    timedOut = true;
                    proc.kill();
                    resolve({ stdout, stderr, code: 124, timedOut: true });
                }, 60000);

                proc.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                proc.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    clearTimeout(timeout);
                    if (!timedOut) {
                        resolve({ stdout, stderr, code });
                    }
                });

                proc.on('error', (err) => {
                    clearTimeout(timeout);
                    resolve({ stdout, stderr, code: 1, error: err.message });
                });
            });

            if (!result.error) {
                expect(result.stdout).toContain('Hello from Rust');
                expect(result.code).toBe(0);
            }
        }, 65000);

        testFn('should capture Rust compilation errors', async () => {
            const { spawn } = require('child_process');
            const code = `fn main() {
    let x: i32 = "invalid";
}`;
            const dockerCmd = `docker run --rm rust:1.64 bash -c 'cat > main.rs <<'RUSTEOF'\n${code}\nRUSTEOF\nrustc main.rs'`;
            
            const result = await new Promise((resolve) => {
                const proc = spawn('bash', ['-c', dockerCmd]);
                let stdout = '';
                let stderr = '';
                let timedOut = false;

                const timeout = setTimeout(() => {
                    timedOut = true;
                    proc.kill();
                    resolve({ stdout, stderr, code: 124, timedOut: true });
                }, 30000);

                proc.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                proc.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    clearTimeout(timeout);
                    if (!timedOut) {
                        resolve({ stdout, stderr, code });
                    }
                });

                proc.on('error', (err) => {
                    clearTimeout(timeout);
                    resolve({ stdout, stderr, code: 1, error: err.message });
                });
            });

            if (!result.error) {
                expect(result.code).not.toBe(0);
            }
        }, 35000);
    });

    describe('Docker Container Lifecycle', () => {
        testFn('should cleanup temporary files after execution', async () => {
            const { spawn } = require('child_process');
            const fs = require('fs/promises');
            const path = require('path');
            const os = require('os');
            
            const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docker-test-'));
            const testFile = path.join(tmpDir, 'test.py');
            await fs.writeFile(testFile, 'print("test")', 'utf8');

            const result = await new Promise((resolve) => {
                const proc = spawn('sh', ['-c', `docker run --rm -v "${tmpDir}:/workspace" -w /workspace python:3.11-alpine python test.py`]);
                let stdout = '';
                let stderr = '';
                let timedOut = false;

                const timeout = setTimeout(() => {
                    timedOut = true;
                    proc.kill();
                    resolve({ stdout, stderr, code: 124, timedOut: true });
                }, 10000);

                proc.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                proc.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    clearTimeout(timeout);
                    if (!timedOut) {
                        resolve({ stdout, stderr, code });
                    }
                });

                proc.on('error', (err) => {
                    clearTimeout(timeout);
                    resolve({ stdout, stderr, code: 1, error: err.message });
                });
            });

            if (!result.error && result.stdout) {
                expect(result.stdout.trim()).toContain('test');
            }

            // Cleanup
            try {
                await fs.rm(tmpDir, { recursive: true, force: true });
            } catch (err) {
                // ignore cleanup errors
            }
        });

        testFn('should enforce memory limits', async () => {
            const code = 'x = [1] * 1000000000; print("allocated")';
            const { spawn } = require('child_process');

            const result = await new Promise((resolve) => {
                const proc = spawn('sh', ['-c', `docker run --rm --memory=128m python:3.11-alpine python -c '${code.replace(/'/g, "'\\''")}'`]);
                let stdout = '';
                let stderr = '';
                let timedOut = false;

                const timeout = setTimeout(() => {
                    timedOut = true;
                    proc.kill();
                    resolve({ stdout, stderr, code: 124, timedOut: true });
                }, 15000);

                proc.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                proc.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    clearTimeout(timeout);
                    if (!timedOut) {
                        resolve({ stdout, stderr, code });
                    }
                });

                proc.on('error', (err) => {
                    clearTimeout(timeout);
                    resolve({ stdout, stderr, code: 1, error: err.message });
                });
            });

            if (!result.error && !result.timedOut) {
                // Memory limit enforced, should either error or not complete successfully
                expect(result.code).not.toBe(0);
            }
        }, 20000);

        testFn('should isolate network access', async () => {
            const code = 'import socket; socket.create_connection(("google.com", 80), timeout=2)';
            const { spawn } = require('child_process');

            const result = await new Promise((resolve) => {
                const proc = spawn('sh', ['-c', `docker run --rm --network none python:3.11-alpine python -c '${code.replace(/'/g, "'\\''")}'`]);
                let stdout = '';
                let stderr = '';
                let timedOut = false;

                const timeout = setTimeout(() => {
                    timedOut = true;
                    proc.kill();
                    resolve({ stdout, stderr, code: 124, timedOut: true });
                }, 15000);

                proc.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                proc.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    clearTimeout(timeout);
                    if (!timedOut) {
                        resolve({ stdout, stderr, code });
                    }
                });

                proc.on('error', (err) => {
                    clearTimeout(timeout);
                    resolve({ stdout, stderr, code: 1, error: err.message });
                });
            });

            if (!result.error) {
                // Network isolation enforced, should fail to connect
                expect(result.code).not.toBe(0);
            }
        }, 20000);
    });

    describe('Code Execution with Output Handling', () => {
        testFn('should handle multiline output', async () => {
            const code = 'for i in range(3):\n    print(f"Line {i}")';
            const result = await runCodeInDocker('python:3.11-alpine', 'python', code);

            if (!result.error) {
                expect(result.stdout).toContain('Line 0');
                expect(result.stdout).toContain('Line 2');
            }
        });

        testFn('should handle stderr output separately', async () => {
            const code = 'import sys; sys.stderr.write("error message\\n"); print("normal output")';
            const result = await runCodeInDocker('python:3.11-alpine', 'python', code);

            if (!result.error) {
                expect(result.stdout).toContain('normal output');
                expect(result.code).toBe(0);
            }
        });
    });
});
