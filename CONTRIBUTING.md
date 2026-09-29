# Contributing

Bug reports, enhancement requests, and code contributions are welcome.

## Feedback and security reports

For bugs, enhancement requests, or general feedback, open an issue in the [GitHub issue tracker](https://github.com/hamzahamidi/cookies-utils/issues). Include steps to reproduce a bug when possible, and check existing issues before opening a new one.

For a code or documentation change, open a pull request against `main`. Describe the reason for the change and its scope. Link a related issue when one exists.

For a suspected security vulnerability, follow [SECURITY.md](SECURITY.md). Do not report an unpatched vulnerability through a public issue.

## Tests and local checks

Behavior changes and new functionality should include appropriate automated tests. Bug fixes should include a regression test when practical.

Install dependencies with `npm ci`. Run the checks that apply to the change:

* `npm test` runs the unit tests.
* `npm run coverage` runs the unit tests with coverage, as in the build workflow.
* `npm run test:browser` runs the browser tests. The browser CI job installs Chromium, Firefox, and WebKit with `npx playwright install --with-deps chromium firefox webkit` first.
* `npm run typecheck` checks TypeScript and script types.
* `npm run build` builds the package.
* `npm run check:bundle` checks the gzipped browser bundle size.
* `npm run smoke` packs the package and checks its ESM, CommonJS, browser, and type exports.

GitHub Actions runs the build on Node.js 20, 22, and 24. It also runs browser tests, CodeQL, dependency review, and the release dry run. The required pull request checks are the source of truth before merge.

## Review

The project currently has one maintainer, so an independent approval is not required before merge. Independent reviews are welcome.
