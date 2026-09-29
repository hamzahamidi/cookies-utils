# cookies-utils roadmap

## Direction

`cookies-utils` should remain a small browser-focused cookie library built around one idea:

> Use modern Cookie Store semantics without making application code deal with browser support, implementation differences, or the `document.cookie` fallback.

The project should optimize for:

- predictable behavior across backends
- explicit errors instead of silent incompatibilities
- modern cookie security rules
- strong TypeScript support
- SSR-safe imports
- zero runtime dependencies
- a small bundle
- direct alignment with the Cookie Store API where practical

It should **not** try to become a general HTTP cookie framework.

---

# Current foundation (2.0.x)

The 2.0 rewrite established the core architecture.

Shipped:

- asynchronous API
- `get()`
- `getAll()`
- `has()`
- `set()`
- `delete()`
- `cookies` namespace
- Cookie Store API backend
- `document.cookie` fallback
- backend selection per operation
- SSR-safe imports
- `SameSite`
- `Secure`
- `Path`
- `Domain`
- `Expires`
- `Max-Age`
- `Partitioned` / CHIPS
- `__Secure-` validation
- `__Host-` validation
- typed `CookieError`
- ESM
- CommonJS
- TypeScript declarations
- browser bundle
- zero runtime dependencies
- Chromium, Firefox and WebKit browser tests
- HTTPS browser tests
- plain-HTTP fallback handling
- documented migration from 1.x

This is the base to harden rather than redesign.

---

# 2.1.0: Spec and correctness hardening

**Priority: highest**

Before adding new API surface, make the existing API as deterministic as possible across Cookie Store and `document.cookie`.

The objective is:

> An input should either behave consistently across supported backends or fail before reaching the backend.

## Runtime option validation

TypeScript types are not sufficient because JavaScript consumers can pass anything.

Validate the runtime types of all options.

### `set()`

Reject invalid runtime values for:

- `path`
- `domain`
- `expires`
- `maxAge`
- `secure`
- `sameSite`
- `partitioned`

Examples that should produce `CookieError` rather than native `TypeError` or backend-dependent behavior:

```ts
set("a", "b", { path: 123 });
set("a", "b", { domain: {} });
set("a", "b", { secure: "yes" });
set("a", "b", { partitioned: 1 });
set("a", "b", { maxAge: NaN });
set("a", "b", { maxAge: Infinity });
```

### `delete()`

Apply equivalent validation to:

- `path`
- `domain`
- `partitioned`

## Cookie Store path semantics

Reject paths that cannot be represented consistently.

A non-empty explicit path must start with `/`.

```ts
set("a", "b", { path: "account" }); // INVALID_OPTIONS
set("a", "b", { path: "/account" }); // valid
```

Decide explicitly how `path: ""` behaves.

Preferred rule:

- normalize `undefined` to `/`
- reject `""`

Do not inherit backend-specific current-document path behavior because that defeats the package's normalized semantics.

## Domain validation

Normalize the subset of domain semantics that can be validated without reproducing an entire public-suffix implementation.

At minimum:

- reject control characters
- reject semicolons
- reject a leading `.`
- reject empty explicit domain values
- reject values that are obviously syntactically impossible

Do **not** attempt to duplicate browser domain/public-suffix validation.

The browser remains authoritative for whether a domain is actually valid for the current origin.

## Size limits

Validate Cookie Store-compatible size limits before selecting the backend.

Enforce:

- encoded cookie name + value <= 4096 bytes
- encoded path <= 1024 bytes
- encoded domain <= 1024 bytes

Measure the values that will actually be sent to the backend, not merely JavaScript string length.

Use UTF-8 byte length.

Because `cookies-utils` percent-encodes names and values, tests must cover cases where:

```text
raw length != encoded wire length != UTF-8 byte length
```

Add explicit error messages describing which limit was exceeded.

## JavaScript-inaccessible cookie prefixes

Recognize:

```text
__Http-
__Host-Http-
```

These cookies require `HttpOnly` and therefore cannot be created or modified by browser JavaScript.

Reject attempts explicitly:

```ts
await set("__Http-session", "...");
await set("__Host-Http-session", "...");
```

Preferred error:

```text
UNSUPPORTED
```

with a message explaining that the prefix requires an `HttpOnly` cookie created through `Set-Cookie`.

Do not silently attempt the write.

Maintain existing checks for:

```text
__Secure-
__Host-
```

Add case-sensitive prefix tests.

## Normalize backend failures

Today validation errors are controlled by `cookies-utils`, while errors generated inside the native Cookie Store API may escape as browser-specific `TypeError` or `DOMException`.

Establish one public error contract.

Add an error code such as:

```ts
'OPERATION_FAILED'
```

or:

```ts
'BACKEND_ERROR'
```

Wrap unexpected backend errors:

```ts
throw new CookieError(
  "OPERATION_FAILED",
  "Failed to set cookie.",
  { cause }
);
```

Preserve the original exception through `Error.cause`.

Do not wrap programming errors produced by `cookies-utils` itself.

The resulting contract should be:

```text
INVALID_NAME
INVALID_VALUE
INVALID_OPTIONS
UNSUPPORTED
NO_COOKIE_ACCESS
OPERATION_FAILED
```

## `maxAge` compatibility

The current compatibility conversion from:

```ts
maxAge
```

to:

```ts
expires = Date.now() + maxAge * 1000
```

for Cookie Store should remain while browser support for native `maxAge` is inconsistent.

However:

- update comments that currently say `maxAge` does not exist in `CookieInit`
- document that this is now a compatibility normalization
- test the native behavior periodically
- remove the conversion only when doing so does not change supported-browser behavior

Do not rush to native `maxAge` merely because it exists in the Living Standard.

Backend consistency takes priority.

## Duplicate-name behavior

Add tests for cookies sharing a name but differing by:

- path
- domain
- partition
- host-only vs domain cookie where practical

Document that `get(name)` necessarily returns one matching cookie while multiple matching cookies can exist.

Ensure neither backend accidentally deduplicates `getAll()`.

## Acceptance criteria

2.1.0 ships when:

- all public inputs are runtime validated
- invalid inputs never produce accidental native JavaScript errors
- known Cookie Store constraints are checked consistently
- `__Http-` and `__Host-Http-` writes are rejected explicitly
- native backend failures use the public error model
- browser parity tests cover all validation rules
- Chromium, Firefox and WebKit pass on HTTPS
- `document.cookie` fallback tests pass on HTTP
- no runtime dependency is added

---

# 2.2.0: Query improvements

Keep this release deliberately small.

## `getAll(name?)`

Support filtering by name:

```ts
await cookies.getAll();
await cookies.getAll("session");
```

Equivalent named export:

```ts
await getAll("session");
```

Return:

```ts
Promise<Cookie[]>
```

The fallback can implement this correctly because `document.cookie` exposes every currently readable matching name/value pair.

This is particularly useful because multiple cookies can legally have the same name.

## Do not expand into arbitrary query objects yet

Do not immediately mirror the full native API:

```ts
cookieStore.getAll({
  name,
  url,
});
```

The URL semantics cannot be reproduced faithfully with `document.cookie`.

Only add query options that both backends can implement with equivalent semantics.

## Document `get()` ambiguity

Explain that:

```ts
await get("theme");
```

does not mean that only one `theme` cookie can exist.

Recommend:

```ts
await getAll("theme");
```

when callers care about duplicates.

## Acceptance criteria

- `getAll()` remains backward compatible
- `getAll(name)` works through both backends
- duplicate names have browser tests
- no URL-query API is exposed without a parity story
- bundle impact remains negligible

---

# 2.3.0: Cookie change events

Cookie Store change events are now mature enough to expose, but the fallback behavior must remain explicit.

## Window API

Add:

```ts
const unsubscribe = cookies.onChange((event) => {
  console.log(event.changed);
  console.log(event.deleted);
});
```

Possible named export:

```ts
import { onChange } from "cookies-utils";
```

Return an unsubscribe function:

```ts
const unsubscribe = onChange(handler);

unsubscribe();
```

## Normalized event type

Expose a small library-owned type instead of leaking browser event objects directly.

For example:

```ts
interface CookieChange {
  changed: Cookie[];
  deleted: Cookie[];
}
```

This protects callers from browser object-shape differences.

## No polling fallback

When native change events are unavailable:

```ts
onChange(...)
```

must reject or throw `UNSUPPORTED`.

Do not implement:

```ts
setInterval(() => document.cookie, ...)
```

Reasons:

- unnecessary wakeups
- unreliable change detection
- impossible attribute reconstruction
- poor service-worker behavior
- extra hidden complexity
- weakens the package's predictable semantics

## Event semantics documentation

Document native limitations, including cases where replacing an existing cookie does not necessarily produce the intuitive change event developers might expect.

The package should normalize representation, not invent events the browser never emitted.

## Acceptance criteria

- native `CookieStore` change event used directly
- listener removal verified
- `changed` and `deleted` normalized
- unsupported environments fail explicitly
- no polling
- no timers
- no runtime dependency
- browser tests cover create/delete/change behavior

---

# 2.4.0: Developer experience and trust

This milestone is mostly documentation, packaging and maintenance quality.

## README positioning

Lead with the differentiator:

> A safe, typed Cookie Store API with a `document.cookie` fallback.

Avoid positioning the package merely as a "cookie utility."

Make the first screen answer:

1. Why does this exist?
2. Why not `js-cookie`?
3. Why not use `cookieStore` directly?
4. What happens in browsers without Cookie Store?
5. What behavior does the library normalize?

## Comparison table

Add a compact comparison against:

- direct `document.cookie`
- `js-cookie`
- native Cookie Store
- Cookie Store polyfills

Compare:

- async API
- native Cookie Store
- fallback
- global patching
- TypeScript
- CHIPS
- prefix validation
- SSR-safe import
- error normalization
- dependencies

Keep statements factual.

## Recipes

Add concise recipes for the cases developers actually encounter.

### Basic cookie

```ts
await cookies.set("theme", "dark");
```

### Cross-site cookie

```ts
await cookies.set("widget", "enabled", {
  sameSite: "none",
  secure: true,
});
```

### Host-bound cookie

```ts
await cookies.set("__Host-session-hint", "1", {
  secure: true,
});
```

### Partitioned cookie

```ts
await cookies.set("__Host-widget", "enabled", {
  secure: true,
  sameSite: "none",
  partitioned: true,
});
```

### Explicit scope deletion

```ts
await cookies.delete("preferences", {
  path: "/account",
});
```

### Duplicate names

Show when `getAll(name)` should be preferred.

## Security documentation

Create or expand `SECURITY.md`.

Document explicitly that:

- JavaScript cannot access `HttpOnly` cookies
- this library is not an authentication system
- cookie prefixes do not replace server-side security
- `Path` is not a security boundary
- `SameSite` is defense-in-depth rather than a complete CSRF strategy
- `Secure` does not encrypt cookie values
- client-readable session tokens remain vulnerable to XSS
- the library does not bypass third-party-cookie restrictions

## Release integrity

Move publishing toward the strongest available npm release path.

Target:

- npm provenance
- OIDC/trusted publishing where available
- no long-lived npm token
- protected release workflow
- minimal GitHub Actions permissions
- dependency review
- CodeQL
- Dependabot
- OpenSSF Scorecard
- private vulnerability reporting
- release smoke test against the packed npm artifact

## Package smoke tests

Test the actual packed output, not only source files.

Verify:

```text
ESM import
CommonJS require
TypeScript declarations
NodeNext resolution
Bundler resolution
named imports
cookies namespace
browser bundle
tree shaking
sideEffects: false
```

Ensure publishing cannot succeed with missing declaration files or broken exports.

## Bundle budget

Keep a documented bundle-size budget. The browser bundle currently measures
about 3.3 kB gzip after correctness hardening, name filtering and native event
support. The earlier 2.5 kB target is aspirational and already exceeded by the
supported feature set. CI enforces a 4,096-byte ceiling. A feature that exceeds
that limit needs a measured explanation and a user benefit. Size should not be
reduced at the expense of correctness.

Before publishing, verify the npm trusted publisher points to GitHub user
`hamzahamidi`, repository `cookies-utils`, workflow `release.yml` and the
`npm-publish` environment. Permit direct `npm publish` because
`semantic-release` publishes through that command. The GitHub environment must
have required reviewers configured in repository settings. The workflow file
does not create those settings.

GitHub private vulnerability reporting is a separate repository setting.
Keep it enabled so the private form linked from `SECURITY.md` remains available.

---

# 2.5.x: Compatibility maintenance

Not every browser/spec change requires a feature release.

Treat compatibility as an ongoing part of the project.

## Browser matrix

Continuously test:

- Chromium
- Firefox
- WebKit

Test both:

```text
HTTPS → native Cookie Store where supported
HTTP  → document.cookie fallback
```

Also preserve tests for contexts without:

```text
document
cookieStore
```

to guarantee SSR-safe behavior.

## Spec drift

Review changes to:

- Cookie Store Living Standard
- HTTP cookie specification
- browser Cookie Store implementations
- CHIPS
- cookie prefixes

When a native browser feature becomes consistent across all supported engines, evaluate whether compatibility code can be removed.

Do not remove compatibility normalization solely because a feature has reached the specification.

## Browser regressions

When browsers disagree:

1. reproduce in real-browser tests
2. determine whether normalization is possible
3. normalize when safe
4. otherwise return `UNSUPPORTED` or document the difference
5. never silently pretend parity exists

---

# Later: Service-worker subscriptions

The core API already benefits from Cookie Store being usable in service workers.

Change subscriptions are different.

Service workers use cookie subscriptions and `cookiechange` rather than the normal Window `change` event.

Do not force both models into `onChange()` if doing so creates misleading semantics.

If real demand appears, evaluate a dedicated API such as:

```ts
import { subscribe } from "cookies-utils/service-worker";

await subscribe({
  name: "session",
  url: "/",
});
```

or another explicit service-worker entry point.

Requirements:

- no Window-only assumptions
- no fake fallback
- no polling
- separate types where the browser semantics genuinely differ
- no substantial cost to the normal browser bundle

This is **not** required for the next release.

---

# 3.0.0: No planned rewrite

There should not be a 3.0 merely to add features.

A major release is justified only by a necessary breaking change.

Examples:

- correcting a public behavior that cannot be fixed compatibly
- dropping a previously supported environment
- restructuring exports
- changing encoding semantics
- changing error semantics incompatibly

## Universal/server API is deferred

The previous idea of turning `cookies-utils` into:

```text
cookies-utils/browser
cookies-utils/server
```

should not be pursued by default.

Server-side cookie parsing and `Set-Cookie` serialization are already mature problem spaces with established libraries.

Adding them would:

- dilute the project's differentiation
- increase maintenance surface
- introduce HTTP/server concerns unrelated to Cookie Store compatibility
- make zero-dependency/browser-size goals harder to preserve

Reconsider server support only if repeated real-world usage demonstrates that users need one API on both sides.

If it is ever implemented, it should live behind a separate entry point and not affect the browser bundle.

---

# Explicit non-goals

The following are intentionally outside the project.

## No `HttpOnly` access

Browser JavaScript cannot access `HttpOnly` cookies.

The library will not pretend otherwise.

## No authentication framework

No:

- sessions
- JWT management
- token rotation
- authentication middleware

## No cookie signing or encryption

Those belong server-side.

## No consent management

No:

- CMP
- consent banner
- GDPR preference framework
- tracker blocking

## No third-party-cookie bypass

Do not attempt to circumvent browser privacy restrictions.

## No storage abstraction

No wrapper over:

- `localStorage`
- `sessionStorage`
- IndexedDB

## No polling-based cookie observer

Change events require native support.

## No automatic JSON serialization

Keep values strings.

Applications can explicitly:

```ts
JSON.stringify(...)
JSON.parse(...)
```

if needed.

## No synchronous API

The public API stays asynchronous because Cookie Store is asynchronous.

## No framework-specific wrappers

Avoid dedicated packages or APIs for:

- React
- Vue
- Angular
- Svelte
- Next.js

The core API is already trivial to consume from frameworks.

## No `deleteAllCookies()`

JavaScript cannot reliably enumerate and delete every cookie because cookies with invisible paths/domains and `HttpOnly` cookies may exist.

Do not reintroduce an API whose name promises more than the platform can provide.

---

# Design rules

Every new feature should answer these questions before implementation.

## 1. Can both backends implement it correctly?

If yes, expose one normalized API.

If no:

- expose it as native-only with an explicit `UNSUPPORTED` path, or
- do not add it.

Do not silently approximate behavior.

## 2. Does it belong to cookie storage?

If it belongs to:

- authentication
- HTTP middleware
- consent
- persistence generally
- application state

it probably does not belong in `cookies-utils`.

## 3. Can the browser already do it trivially?

A wrapper needs to provide at least one of:

- compatibility
- normalization
- validation
- safety
- useful typing
- meaningful ergonomics

Do not add aliases for the sake of increasing API surface.

## 4. Does it preserve the package's size and dependency profile?

Preferred:

```text
zero runtime dependencies
~2 kB gzip
```

Small increases are acceptable for correctness.

Large increases require a strong user-facing reason.

---

# Testing strategy

Every public behavior should exist at three levels where applicable.

## Unit tests

Test:

- validation
- serialization
- parsing
- encoding
- normalization
- errors
- backend selection

## Backend contract tests

Run the same behavior suite against:

```text
Cookie Store backend
document.cookie backend
```

This is the main defense against accidental semantic divergence.

## Real-browser tests

Run against:

```text
Chromium
Firefox
WebKit
```

Cover:

- HTTPS
- HTTP fallback
- SameSite
- Secure
- Partitioned
- prefixes
- expiration
- duplicate names
- deletion scope
- native Cookie Store failures
- events once added

Tests should exercise each browser's own Cookie Store implementation rather than mocks whenever the behavior being tested is browser-specific.

---

# Release quality bar

Every release should satisfy:

- unit tests pass
- all browser tests pass
- typecheck passes
- package smoke tests pass
- packed output inspected
- no unexpected runtime dependency
- bundle-size budget checked
- README/API examples compile
- exported types match runtime API
- migration notes exist for behavioral changes
- security-relevant behavior has regression tests

A release should be blocked by backend inconsistencies that could cause application code to behave differently without warning.

---

# Priority order

The intended sequence is:

```text
2.1  correctness and spec hardening
 ↓
2.2  getAll(name) and duplicate-cookie clarity
 ↓
2.3  native change events
 ↓
2.4  documentation, package trust and release hardening
 ↓
2.5  ongoing browser/spec compatibility
 ↓
later: service-worker subscriptions if demand exists
```

No server API is currently planned.

No major release is currently planned.

---

# Long-term positioning

`cookies-utils` should aim to become the package developers choose when they want:

```ts
await cookies.get(...)
await cookies.set(...)
```

without having to care whether the browser is using:

```text
Cookie Store
or
document.cookie
```

and without accepting silent differences between the two.

As Cookie Store support improves, the project's value should gradually shift from:

> Cookie Store fallback

toward:

> a small, safe, typed and compatibility-tested high-level Cookie Store API.

That gives the package a reason to remain useful even after the legacy fallback becomes less important.
