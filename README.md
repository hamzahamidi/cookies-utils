# cookies-utils

<p align="center">
    <a href="https://www.npmjs.com/package/cookies-utils">
        <img src="https://img.shields.io/npm/v/cookies-utils.svg?style=flat-square&colorB=51C838" alt="NPM Version">
    </a>
    <a href="https://codecov.io/gh/hamzahamidi/cookies-utils">
        <img src="https://codecov.io/gh/hamzahamidi/cookies-utils/branch/main/graph/badge.svg?token=KST9RPYZYI"/>
    </a>
    <a href="https://github.com/hamzahamidi/cookies-utils/actions?query=workflow%3ABuild">
        <img src="https://github.com/hamzahamidi/cookies-utils/workflows/Build/badge.svg" alt="Build Status">
    </a>
</p>

A tiny, typed cookie API that uses the Cookie Store API when available and falls
back safely to `document.cookie`.

- One async API over both backends, chosen per call with nothing to configure
- SSR-safe imports: importing never reads `document` or `cookieStore`
- Normalized behaviour across backends: the same defaults and the same
  validation either way, and the one divergence that cannot be removed is
  documented rather than hidden
- Validation for `SameSite`, `Secure`, `Partitioned` (CHIPS), the `__Secure-` and
  `__Host-` prefixes, `Path`, `Domain`, `Expires` and `Max-Age`, including
  combinations that are unsafe rather than merely wrong
- Zero runtime dependencies, 1,987 bytes gzipped
- ESM, CommonJS and TypeScript declarations, with tree-shakable named exports

## Why cookies-utils?

The Cookie Store API is the modern way to work with cookies: promise based,
reachable from a service worker, and able to report a cookie's attributes rather
than one flat string. What it is not is uniformly available or uniformly
implemented.

This package lets you write against those semantics once. It selects a backend
per call, applies the same defaults to both, and where the two genuinely differ
it raises a typed error instead of quietly doing something else. Every difference
it accounts for is listed under [Browser support](#browser-support), including
the ones it cannot remove.

See [ROADMAP.md](ROADMAP.md) for where the library is heading.

## Two backends, one API

`get`, `getAll`, `has`, `set` and `delete` all return promises: the Cookie Store
API offers no synchronous form, so neither does this. Defaults are applied once
before either backend sees them, so both receive identical input: `path` defaults
to `"/"` and `sameSite` to `"lax"`, which is why a bare `delete(name)` targets the
same cookie a bare `set(name, value)` wrote. Where neither backend exists, such as
during a server render, the import still succeeds and a call rejects with
`CookieError` code `NO_COOKIE_ACCESS`.

## Installation

Install from npm with `npm install cookies-utils`, or load the browser build from
jsDelivr or unpkg for a `cookiesUtils` global:

```html
<script src="https://cdn.jsdelivr.net/npm/cookies-utils/dist/cookies-utils.min.js"></script>
<script>
  cookiesUtils.delete("name").then(() => console.log("gone"));
</script>
```

Replace the host with `https://unpkg.com/cookies-utils/dist/cookies-utils.min.js`
to serve the same file from unpkg.

## Usage

```javascript
import { cookies } from "cookies-utils";

await cookies.set("session", "abc", { secure: true, sameSite: "lax" });

const value = await cookies.get("session"); // "abc" or undefined
const exists = await cookies.has("session"); // boolean
const all = await cookies.getAll(); // Cookie[]

await cookies.delete("session");
```

Named imports behave the same way and tree shake:

```javascript
import { get, set } from "cookies-utils";
```

## Browser support

| Backend | Used when | Attributes readable |
| --- | --- | --- |
| Cookie Store API | `cookieStore` exists, unless the origin is non-https and there is a `document` that can carry cookies (see WebKit note below) | Chromium: the full record (`path`, `domain`, `expires`, `secure`, `sameSite`, `partitioned`). Firefox and WebKit: name and value only, see below |
| `document.cookie` | any non-https origin with a `document` that can carry cookies, or wherever `cookieStore` is unavailable | no, name and value only |

The Cookie Store API reached Baseline in June 2025; caniuse reports it as
supported from Safari 18.4 and Firefox 140. The library picks a backend per
call, so no configuration is needed.

`getAll()`'s attribute reporting is Chromium-only today, even though all
three engines expose a native `CookieStore`. Firefox's and WebKit's own
implementations report only `{ name, value }` from `get()` and `getAll()`,
with no `path`, `domain`, `expires`, `secure` or `sameSite`. This was
established by driving each backend directly in the real browser suite,
against the Cookie Store objects Chromium, Firefox and WebKit each provide
themselves, not by reading their documentation.

One divergence cannot be removed. `CookieStore.set()` has no `secure` option
because it only runs in secure contexts, so a cookie written through it is always
Secure, while the same call through `document.cookie` produces a non-Secure
cookie unless you pass `secure: true`. Passing `secure: false` on the Cookie Store
backend rejects with `CookieError` code `UNSUPPORTED` rather than silently
ignoring you.

### WebKit on plain http origins

Playwright's WebKit build does not persist a write made through
`cookieStore.set()` on a plain http origin, even though `isSecureContext`
reports true there; the same write works correctly over https. That build is
not the shipping Safari browser, so Safari is very likely affected the same
way, though not certainly so. The library therefore
prefers `document.cookie` on any non-https origin regardless of which backend
would otherwise be picked, so this is handled rather than merely disclosed,
and production sites on https are unaffected either way. The real browser
suite is served over https and runs on Chromium, Firefox and WebKit: all
three ship a `CookieStore` today, all three exercise it in CI, and all three
pass.

## Migrating from 1.0.0

Every function is now async and takes positional arguments.

| 1.0.0 | 2.0.0 |
| --- | --- |
| `getCookieValue(name)` | `await get(name)` |
| `setCookie({ name, value, ...opts })` | `await set(name, value, opts)` |
| `cookieExists(name)` | `await has(name)` |
| `cookieHasValue(name, value)` | closest equivalent: `(await get(name)) === value` |
| `deleteCookie(name, path, domain)` | `await cookies.delete(name, { path, domain })` |
| `deleteAllCookies()` | removed |

`cookieHasValue` is the one row that is not an exact swap, only the closest
equivalent. It compared the raw header text after trimming, so it matched percent
encoded values and ignored surrounding whitespace. `await get(name)` returns the
decoded value and compares exactly. That is a deliberate correction, not a
like for like replacement.

The rest of this section covers what the table above does not: a decoding
trap almost every 1.0.0 call site hits, two default attributes that change
what a caller sends without changing the call site, a list of inputs 1.0.0
tolerated that 2.0.0 now rejects, and a reference for the options and error
codes.

### The default path can shadow a 1.0.0 cookie

1.0.0's `setCookie` wrote no `path` when the caller omitted one, so those
cookies live at the writing page's directory, for example `/app`; 2.0.0
defaults `path` to `"/"`. After upgrading, `set(name, value)` writes a new
cookie at `/` while the 1.0.0 cookie stays at `/app`, and since
`document.cookie` lists the more specific path first, `get()` returns the
first match it finds there and keeps reporting the stale `/app` value with no
error, while `delete(name)` now targets `/` and never clears the old one.
Delete the old cookie at its original path before or during the upgrade:
`await cookies.delete("session", { path: "/app" })`.

### The default SameSite changes cross-site behavior

1.0.0 serialized `sameSite` as `'; samesite' + value` with no `=`, so
browsers discarded the attribute and no cookie 1.0.0 ever wrote carried a
SameSite value, whatever the caller passed. 2.0.0 writes an explicit
`SameSite=Lax` by default, which is never looser than an implicit default, so
the only realistic breakage is a cookie that used to be sent on a cross-site
request and now is not: a cross-site subresource or credentialed
cross-origin fetch, or a top-level cross-site POST returning to the site
(SAML or a payment provider return), which loses Chromium's
Lax-allowing-unsafe grace period. There is no way to write a cookie with no
SameSite attribute at all, since the default always applies; for cross-site
use, pass `sameSite: "none"` with `secure: true`.

### Delete your own decodeURIComponent call

1.0.0's `setCookie` percent-encoded a value on write, and `getCookieValue`
never decoded on read. Working 1.0.0 code very often reads:

```javascript
const value = decodeURIComponent(getCookieValue("session"));
```

`get()` in 2.0.0 already decodes the value it reads, leniently: a foreign
cookie holding a lone `%` comes back unchanged rather than throwing. Carrying
the same wrapper over now decodes twice:

```javascript
// Wrong after migrating: get() already decoded this once.
const value = decodeURIComponent(await get("session"));
```

A value containing a literal percent sequence is mangled by the second
decode, and a value ending in a lone `%` throws `URIError: URI malformed`,
from your own wrapper rather than from this library. Delete the wrapper:

```javascript
const value = await get("session");
```

### Inputs 1.0.0 tolerated that 2.0.0 rejects

`set()` throws `CookieError` instead of writing a cookie 1.0.0 would have
written, for:

- a value that is not a string, for example `set("a", 123)`
- `maxAge` and `expires` supplied together
- `sameSite: "none"` without `secure: true`
- a `sameSite` value that is not exactly `"strict"`, `"lax"` or `"none"`,
  for example the capitalized `"Lax"`
- a `maxAge` that is not an integer
- a `__Secure-` prefixed name without `secure: true`
- a `__Host-` prefixed name without `secure: true`, with a `domain`, or
  (only if you pass an explicit `path` other than `"/"`) with any other path;
  `path` defaults to `"/"`, so `set("__Host-a", "b", { secure: true })`
  already satisfies the path rule on its own
- `partitioned: true` without `secure: true`
- a `path` or `domain` containing a semicolon or a control character

Anything your 1.0.0 code relied on being silently tolerated in this list now
gets a rejection, before anything is written. See the error reference below
for which `CookieErrorCode` each case throws.

`get("")` and `has("")` changed too, on the read side, and so did a
non-string name: `get(123)` was silently coerced to text before the match in
1.0.0. 1.0.0-equivalent code that looked up an empty name got back
`undefined` or `false`. Both now reject with `INVALID_NAME`, along with every
other empty, non-string or control-character name.

### Options and error reference

| Option | Type | Used by | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | `set`, `delete` | Cookie path scope. Defaults to `"/"` when omitted, so a bare `set(name, value)` and a bare `delete(name)` target the same cookie. |
| `domain` | `string` | `set`, `delete` | Cookie domain scope. No default. |
| `expires` | `Date \| number` | `set` | Absolute expiry, as a `Date` or Unix time in milliseconds. Cannot be combined with `maxAge`. |
| `maxAge` | `number` | `set` | Relative expiry in seconds. Zero or negative expires the cookie immediately. Must be an integer. Cannot be combined with `expires`. |
| `secure` | `boolean` | `set` | Sends the cookie only over https. No default: the Cookie Store backend always writes a Secure cookie and rejects `secure: false` with `UNSUPPORTED`. |
| `sameSite` | `"strict" \| "lax" \| "none"` | `set` | Cross-site sending policy, lowercase only. Defaults to `"lax"` when omitted. `"none"` requires `secure: true`. |
| `partitioned` | `boolean` | `set`, `delete` | CHIPS partitioned storage. On `set()`, requires `secure: true`. `delete(name, { partitioned: true })` is unreliable on the `document.cookie` backend: `delete()` has no `secure` option, so the write carries `Partitioned` without `Secure`, and a CHIPS enforcing browser rejects that combination, so nothing is deleted. Reachable only on an https origin with no `CookieStore`. |

`delete()` defaulting `path` to `"/"` means a bare `delete(name)` matches a
bare `set(name, value)` without either call naming a path. A `path` or
`domain` that does not match the cookie's own is still a silent no-op:
deletion works by writing an already-expired cookie, and the browser only
overwrites a cookie whose path and domain match. That still applies whenever
`set()` used a non-default `path` or any `domain`, so a `delete()` for that
cookie has to name the same ones.

| `CookieErrorCode` | Thrown when |
| --- | --- |
| `INVALID_NAME` | the name is empty, not a string, or contains a control character |
| `INVALID_VALUE` | the value passed to `set()` is not a string |
| `INVALID_OPTIONS` | attributes conflict: see "Inputs 1.0.0 tolerated" above for the `set()` cases, plus a non-finite `expires` (an invalid `Date`, or `Infinity`), and, on `delete()`, a `path` or `domain` with a semicolon or control character |
| `UNSUPPORTED` | the selected backend cannot perform the request, for example `secure: false` on the Cookie Store backend |
| `NO_COOKIE_ACCESS` | neither `cookieStore` nor `document` exists in this environment |

`deleteAllCookies()` was removed rather than fixed. It could not read the path or
domain of anything it found and could not see `HttpOnly` cookies, so it under
deleted silently in exactly the logout flows that used it. There is no direct
replacement: delete your own known cookie names, which an application has by
definition, rather than routing them back through `getAll()`:

```javascript
for (const name of ["session", "csrf-token"]) {
  await cookies.delete(name, { path: "/" });
}
```

There is no general purge, for two independent reasons. First, the
`document.cookie` backend cannot read the path of a cookie it finds, so a name
read from `getAll()` carries no path to delete it with. Second, `getAll()`
returns decoded names, and encoding a decoded name does not always reproduce the
wire name it came from: `decode("100%")` returns `"100%"` (the lone `%` is not a
valid escape, so decoding leaves it alone) while `encode("100%")` returns
`"100%25"`. A name read back from `getAll()` and passed to `delete` can
therefore target a different wire name than the one you read. Keep your own list
of names instead of deriving one from `getAll()`.
