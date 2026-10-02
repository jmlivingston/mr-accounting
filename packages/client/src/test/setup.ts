import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { sessionStore } from '../session/sessionStore';

afterEach(() => {
  cleanup();
  sessionStore.reset();
});
