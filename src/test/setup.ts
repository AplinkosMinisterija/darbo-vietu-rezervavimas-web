import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount React trees + clear mock state between tests so module-level mocks
// don't bleed across files.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// jsdom doesn't implement matchMedia; some libs probe it. Provide a no-op stub.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
