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

This project contains functions to help manage cookies.

See [ROADMAP.md](ROADMAP.md) for where the library is heading.

## Installation

### NPM

Install the library with `npm install cookies-utils`.

### CDN

Or use it directly in your browser via jsDelivr or unpkg:

```html
<script src="https://cdn.jsdelivr.net/npm/cookies-utils/dist/cookies-utils.min.js"></script>
<script>
  cookiesUtils.delete("name").then(() => console.log("gone"));
</script>
```

or

```html
<script src="https://unpkg.com/cookies-utils/dist/cookies-utils.min.js"></script>
<script>
  cookiesUtils.delete("name").then(() => console.log("gone"));
</script>
```

## Usage

```javascript
import { cookies } from "cookies-utils";

await cookies.set("session", "abc", { secure: true, sameSite: "lax", path: "/" });

const value = await cookies.get("session"); // "abc" or undefined
const exists = await cookies.has("session"); // boolean
const all = await cookies.getAll(); // Cookie[]

await cookies.delete("session", { path: "/" });
```

Named imports work the same way and tree shake:

```javascript
import { get, set } from "cookies-utils";
```

## Browser support

| Backend | Used when | Attributes readable |
| --- | --- | --- |
| Cookie Store API | `cookieStore` exists, secure contexts only | yes, best effort |
| `document.cookie` | everywhere else | no, name and value only |

The Cookie Store API reached Baseline in June 2025. The library picks a backend
per call, so no configuration is needed.

One divergence cannot be removed. `CookieStore.set()` has no `secure` option
because it only runs in secure contexts, so a cookie written through it is always
Secure, while the same call through `document.cookie` produces a non-Secure
cookie unless you pass `secure: true`. Passing `secure: false` on the Cookie Store
backend rejects with `CookieError` code `UNSUPPORTED` rather than silently
ignoring you.

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
