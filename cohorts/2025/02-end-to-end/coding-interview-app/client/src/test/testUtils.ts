import { vi, Mock } from 'vitest';

interface MockSocket {
  on: Mock;
  emit: Mock;
  off: Mock;
  disconnect: Mock;
  listeners: Record<string, unknown>;
}

/**
 * Mock Socket.IO client for testing
 */
export const createMockSocket = (): MockSocket => ({
  on: vi.fn(),
  emit: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
  listeners: {},
});

/**
 * Helper to simulate socket events for testing
 */
export const emitSocketEvent = <T>(mockSocket: MockSocket, eventName: string, data: T): void => {
  const listeners = mockSocket.on.mock.calls
    .filter((call: [string, (data: T) => void]) => call[0] === eventName)
    .map((call: [string, (data: T) => void]) => call[1]);

  listeners.forEach((listener: (data: T) => void) => listener(data));
};

interface FetchResponse<T> {
  ok: boolean;
  json: () => Promise<T>;
  status: number;
}

/**
 * Mock fetch for testing API calls
 */
export const mockFetchResponse = <T>(data: T, ok = true): Mock<[], Promise<FetchResponse<T>>> => {
  return vi.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(data),
      status: ok ? 200 : 400,
    } as FetchResponse<T>)
  );
};

/**
 * Wait for async operations to complete
 */
export const waitForAsync = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));
