import basicSsl from '@vitejs/plugin-basic-ssl';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const browserInstances: { browser: 'chromium' | 'firefox' | 'webkit' }[] = [
  { browser: 'chromium' },
  { browser: 'firefox' },
  { browser: 'webkit' },
];

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
        // https is required for this suite: WebKit does not persist
        // cookieStore.set() writes on a plain http origin (it works
        // correctly over https), so the conformance suite is served over
        // https to exercise the Cookie Store backend on all three engines.
        // @vitejs/plugin-basic-ssl mints a throwaway self-signed
        // certificate; the Playwright provider sets ignoreHTTPSErrors: true
        // unconditionally, so no matching trust setup is needed on the
        // client side.
        plugins: [basicSsl()],
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
