/**
 * Test Setup File
 * Configures test environment
 */

import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock crypto for password hashing
const cryptoMock = {
  subtle: {
    digest: async (algorithm: string, data: Uint8Array) => {
      // Simple mock - returns a deterministic hash for testing
      const hash = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        hash[i] = (data[i % data.length] + i) % 256;
      }
      return hash;
    }
  },
  getRandomValues: ((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }) as typeof crypto.getRandomValues
};

Object.defineProperty(global, 'crypto', {
  value: cryptoMock,
  writable: true
});

// Mock TextEncoder
global.TextEncoder = class TextEncoder {
  encode(str: string): Uint8Array {
    return new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
  }
} as any;
