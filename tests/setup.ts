import { webcrypto } from 'node:crypto';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
// jsdom does not implement native modal-dialog lifecycle methods.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
}

beforeEach(() => { if (typeof localStorage !== 'undefined') localStorage.clear(); });
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
