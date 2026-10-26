import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  clear() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  get length() {
    return Object.keys(this.store).length;
  }
  key(index) {
    return Object.keys(this.store)[index] || null;
  }
}

const localStorageMock = new LocalStorageMock();
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

const sessionStorageMock = new LocalStorageMock();
Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
    configurable: true,
  });
}

// Track active timers to prevent unhandled background timer callbacks after jsdom environment is torn down
const activeTimeouts = new Set();
const activeIntervals = new Set();
const origSetTimeout = globalThis.setTimeout;
const origClearTimeout = globalThis.clearTimeout;
const origSetInterval = globalThis.setInterval;
const origClearInterval = globalThis.clearInterval;

const safeSetTimeout = function (callback, delay, ...args) {
  let timerId;
  const wrappedCallback = (...cbArgs) => {
    activeTimeouts.delete(timerId);
    if (typeof window === 'undefined') return;
    try {
      return typeof callback === 'function' ? callback(...cbArgs) : undefined;
    } catch {
      if (typeof window === 'undefined') return;
    }
  };
  timerId = origSetTimeout(wrappedCallback, delay, ...args);
  activeTimeouts.add(timerId);
  return timerId;
};

const safeClearTimeout = function (timerId) {
  activeTimeouts.delete(timerId);
  return origClearTimeout(timerId);
};

const safeSetInterval = function (callback, delay, ...args) {
  let timerId;
  const wrappedCallback = (...cbArgs) => {
    if (typeof window === 'undefined') {
      activeIntervals.delete(timerId);
      origClearInterval(timerId);
      return;
    }
    try {
      return typeof callback === 'function' ? callback(...cbArgs) : undefined;
    } catch {
      if (typeof window === 'undefined') return;
    }
  };
  timerId = origSetInterval(wrappedCallback, delay, ...args);
  activeIntervals.add(timerId);
  return timerId;
};

const safeClearInterval = function (timerId) {
  activeIntervals.delete(timerId);
  return origClearInterval(timerId);
};

globalThis.setTimeout = safeSetTimeout;
globalThis.clearTimeout = safeClearTimeout;
globalThis.setInterval = safeSetInterval;
globalThis.clearInterval = safeClearInterval;

if (typeof window !== 'undefined') {
  window.setTimeout = safeSetTimeout;
  window.clearTimeout = safeClearTimeout;
  window.setInterval = safeSetInterval;
  window.clearInterval = safeClearInterval;
}

// Automatically clean up after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  activeTimeouts.forEach((id) => origClearTimeout(id));
  activeTimeouts.clear();
  activeIntervals.forEach((id) => origClearInterval(id));
  activeIntervals.clear();
});

// Polyfill window.matchMedia if not available in jsdom
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
