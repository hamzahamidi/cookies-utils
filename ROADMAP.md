# cookies-utils roadmap

## 2.0.0: Modern foundation

npm `latest` was already `1.0.0` before this rewrite began, so this milestone
ships as `2.0.0`, not `v1.0` as earlier drafts of this roadmap called it. The
Cookie Store milestone that used to follow it, and the Modern cookie features
milestone that used to follow that, are folded in here too, since all three
ship together.

Goal: turn `cookies-utils` into a small, modern, typed cookie API that uses the
Cookie Store API when available and falls back to `document.cookie`.

* Replace the current implementation with a clean TypeScript API.
* Fix cookie serialization and parsing.
* Correct `SameSite` handling.
* Properly encode/decode cookie names and values.
* Support `maxAge: 0`.
* Escape cookie names safely when parsing.
* Improve deletion semantics around `path` and `domain`.
* Remove or redefine `deleteAllCookies()` so its limitations are explicit.
* Add strict validation for cookie attributes.
* `Partitioned` / CHIPS support.
* Complete `SameSite` support.
* `Secure`.
* `Domain`.
* `Path`.
* `Expires`.
* `Max-Age`.
* Cookie prefixes:
  * `__Secure-`
  * `__Host-`
* Validate incompatible or unsafe combinations.
* Modernize package exports:
  * ESM
  * CommonJS if needed
  * TypeScript declarations
  * tree-shakable named exports
* Drop Webpack unless a browser bundle is actually required.
* Upgrade tests and tooling.
* Full JSDoc.
* Better README with browser compatibility table.
* Migration guide from the old `cookies-utils` API.
* Zero runtime dependencies.
* SSR-safe imports:

```ts
import { cookies } from 'cookies-utils';
```

should not crash just because `document` does not exist.

* Clear errors for unsupported operations.
* Use the Cookie Store API when available:
  * `cookieStore.get()`
  * `cookieStore.getAll()`
  * `cookieStore.set()`
  * `cookieStore.delete()`
* Fall back to `document.cookie` transparently, with return types normalized
  between both implementations. The public API should not force users to care
  which backend is being used.

```ts
if ('cookieStore' in globalThis) {
  // Cookie Store implementation
} else {
  // document.cookie fallback
}
```

Proposed API:

```ts
get(name)
getAll()
has(name)
set(name, value, options?)
delete(name, options?)
```

Example:

```ts
await cookies.set('session', 'abc', {
  secure: true,
  sameSite: 'lax',
  path: '/',
});
```

## 2.1.0: Cookie change events

Expose Cookie Store's change events where supported:

```ts
const unsubscribe = cookies.subscribe(event => {
  console.log(event.changed);
  console.log(event.deleted);
});
```

Possible API:

```ts
cookies.onChange(callback)
```

Fallback behavior should be explicit. Do not silently poll `document.cookie` unless there is a strong reason.

## 2.2.0: Better developer experience

* Strong TypeScript types.
* Small bundle size.

## 3.0.0: Universal cookie abstraction

Evaluate whether `cookies-utils` should support both browser and server environments.

Potential adapters:

```text
cookies-utils
├── browser
│   ├── Cookie Store API
│   └── document.cookie fallback
│
└── server
    ├── Request Cookie header parsing
    └── Set-Cookie serialization
```

Possible imports:

```ts
import { cookies } from 'cookies-utils/browser';
import { parseCookies } from 'cookies-utils/server';
```

Only do this if there is real demand. Avoid turning a tiny browser library into a full HTTP-cookie framework.

## Non-goals

Keep the project intentionally small.

* No localStorage abstraction.
* No session/auth framework.
* No consent-management platform.
* No attempt to access `HttpOnly` cookies from browser JavaScript.
* No bypassing browser privacy/third-party-cookie restrictions.
* No large dependency tree.

## Positioning

The package should become:

A tiny, typed cookie API that uses the Cookie Store API when available and falls back safely to `document.cookie`.

That is a much stronger proposition than just being another `document.cookie` wrapper.
