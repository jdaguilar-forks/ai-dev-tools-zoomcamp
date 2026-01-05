/**
 * Test Utilities for Integration Testing
 * This module provides helpers for testing Socket.IO events and API interactions
 */

/**
 * Mock Socket.IO client for testing
 * @example
 * const mockSocket = createMockSocket();
 * mockSocket.emit('join-session', { sessionId, username });
 * expect(mockSocket.on).toHaveBeenCalledWith('user-joined', expect.any(Function));
 */
export const createMockSocket = () => ({
  on: vi.fn(),
  emit: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
  listeners: {},
});

/**
 * Helper to simulate socket events for testing
 * @example
 * const socket = createMockSocket();
 * emitSocketEvent(socket, 'code-update', { code: 'new code' });
 */
export const emitSocketEvent = (mockSocket, eventName, data) => {
  const listeners = mockSocket.on.mock.calls
    .filter(call => call[0] === eventName)
    .map(call => call[1]);
  
  listeners.forEach(listener => listener(data));
};

/**
 * Mock fetch for testing API calls
 * @example
 * const mockFetch = mockFetchResponse({ stdout: 'Output' });
 * global.fetch = mockFetch;
 */
export const mockFetchResponse = (data, ok = true) => {
  return vi.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(data),
      status: ok ? 200 : 400,
    })
  );
};

/**
 * Wait for async operations to complete
 * Useful for testing Socket.IO and fetch operations
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));
