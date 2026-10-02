import { defineConfig } from 'vitest/config';

// Lets one Vitest process (and one UI) run the tests for every package
export default defineConfig({
  test: { projects: ['packages/api', 'packages/client'] },
});
