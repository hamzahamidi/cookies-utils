import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// No @types/node is installed. Declare just enough of the Node global this
// file reads rather than adding a devDependency for one property lookup.
declare const process: { env: Record<string, string | undefined> };

// WebKit is excluded from the default matrix: on this Playwright WebKit build,
// cookieStore.set() resolves without throwing but the write does not persist,
// so the conformance suite cannot tell a passing write from a silently dropped
// one there. Run `npm run test:browser:webkit` to include it on demand, for
// example after a Playwright upgrade, to check whether this has been fixed.
const browserInstances: { browser: 'chromium' | 'firefox' | 'webkit' }[] = [
  { browser: 'chromium' },
  { browser: 'firefox' },
];

if (process.env.INCLUDE_WEBKIT === '1') {
  browserInstances.push({ browser: 'webkit' });
}

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
      reporter: ['text-summary', 'lcov'],
      thresholds: { branches: 90, functions: 90, lines: 90, statements: 90 },
    },
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.spec.ts', 'scripts/**/*.spec.ts'],
        },
      },
      {
        test: {
          name: 'browser',
          include: ['test/browser/**/*.spec.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: browserInstances,
          },
        },
      },
    ],
  },
});
