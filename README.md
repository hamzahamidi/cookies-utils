# cookies-utils

<p align="center">
    <a href="https://www.npmjs.com/package/cookies-utils">
        <img src="https://img.shields.io/npm/v/cookies-utils.svg?style=flat-square&colorB=51C838" alt="NPM Version">
    </a>
    <a href="https://codecov.io/gh/hamzahamidi/cookies-utils">
        <img src="https://codecov.io/gh/hamzahamidi/cookies-utils/branch/main/graph/badge.svg?token=KST9RPYZYI" alt="Coverage">
    </a>
    <a href="https://github.com/hamzahamidi/cookies-utils/actions?query=workflow%3ABuild">
        <img src="https://github.com/hamzahamidi/cookies-utils/workflows/Build/badge.svg" alt="Build Status">
    </a>
    <a href="https://scorecard.dev/viewer/?uri=github.com/hamzahamidi/cookies-utils">
        <img src="https://api.scorecard.dev/projects/github.com/hamzahamidi/cookies-utils/badge" alt="OpenSSF Scorecard">
    </a>
    <a href="https://github.com/hamzahamidi/cookies-utils/blob/main/LICENSE">
        <img src="https://img.shields.io/npm/l/cookies-utils.svg?style=flat-square" alt="MIT License">
    </a>
</p>

Use the native Cookie Store API on HTTPS pages when it is available, without writing your own <code>document.cookie</code> fallback. <code>cookies-utils</code> provides one typed, promise-based API across both backends, with shared defaults, runtime validation, and documented browser differences.

* Selects a backend per call and uses <code>document.cookie</code> on non-HTTPS pages with cookie access.
* Provides asynchronous <code>get</code>, <code>getAll</code>, <code>has</code>, <code>set</code>, and <code>delete</code> methods.
* Defaults writes to the root path and <code>SameSite=Lax</code>.
* Validates runtime inputs and reports validation and detectable backend errors as <code>CookieError</code>.
* Ships ESM, CommonJS, and TypeScript declarations with zero runtime dependencies.

## Why cookies-utils?

| Choose | When it fits |
| --- | --- |
| <code>cookies-utils</code> | You want one async API, native Cookie Store where available, a <code>document.cookie</code> fallback, and runtime option validation. |
| <a href="https://github.com/js-cookie/js-cookie"><code>js-cookie</code></a> | You want a mature synchronous helper around <code>document.cookie</code>. |
| Native <a href="https://cookiestore.spec.whatwg.org/"><code>cookieStore</code></a> | Your supported browsers provide it and you want to use the browser API directly. |
| <code>document.cookie</code> | A synchronous browser interface is sufficient and manual parsing is acceptable. |

The detailed comparison below covers the API and behavior each option provides.

## Installation

~~~sh
npm install cookies-utils
~~~

For a browser script tag, the browser build is available from jsDelivr and unpkg. It exposes a <code>cookiesUtils</code> global.

~~~html
<script src="https://cdn.jsdelivr.net/npm/cookies-utils/dist/cookies-utils.min.js"></script>
<script>
  cookiesUtils.delete("name").then(() => console.log("gone"));
</script>
~~~

Use <code>https://unpkg.com/cookies-utils/dist/cookies-utils.min.js</code> as the script source to load it from unpkg.

## Quick start

~~~ts
import { cookies } from "cookies-utils";

await cookies.set("theme", "dark", {
  secure: true,
  sameSite: "lax",
});

const theme = await cookies.get("theme");
await cookies.delete("theme");
~~~

The API can also be imported by name:

~~~ts
import { get, set } from "cookies-utils";

await set("theme", "dark");
const theme = await get("theme");
~~~

## Comparison

| Capability | <code>cookies-utils</code> | <code>js-cookie</code> | Native <code>cookieStore</code> | <code>document.cookie</code> |
| --- | --- | --- | --- | --- |
| API model | Promise-based | Synchronous | Promise-based | Synchronous string |
| Native Cookie Store | Uses it when available | No | Yes | No |
| Legacy fallback | Automatic <code>document.cookie</code> fallback | Uses <code>document.cookie</code> | None | N/A |
| Read same-name cookies | <code>getAll(name)</code> returns readable matches | No dedicated same-name list method | <code>getAll()</code> supports filtering | Caller parses the cookie string |
| Change events | Window events when the native API supports them | No built-in change event | Native Window change events | None |
| Runtime option validation | Yes | No shared validation contract | Browser validates options | Browser parses the cookie string |
| Error contract | <code>CookieError</code> for validation and detectable failures | No shared <code>CookieError</code> contract | Browser errors | Writes can fail silently |
| TypeScript | Included declarations | Community types through <code>@types/js-cookie</code> | DOM types | DOM types |
| Runtime dependencies | None | None | N/A | N/A |

Cookie behavior still depends on browser capabilities. The library shares an API and defaults across backends, but cannot make browser behavior identical.

## API

| Method | Result | Description |
| --- | --- | --- |
| <code>cookies.get(name)</code> | <code>Promise&lt;string &#124; undefined&gt;</code> | Returns one matching value, or <code>undefined</code>. |
| <code>cookies.getAll(name?)</code> | <code>Promise&lt;Cookie[]&gt;</code> | Lists readable cookies, optionally filtered by name. |
| <code>cookies.has(name)</code> | <code>Promise&lt;boolean&gt;</code> | Reports whether a readable cookie with that name exists. |
| <code>cookies.set(name, value, options?)</code> | <code>Promise&lt;void&gt;</code> | Validates and writes a cookie. |
| <code>cookies.delete(name, options?)</code> | <code>Promise&lt;void&gt;</code> | Expires a cookie with the requested scope. |
| <code>cookies.onChange(handler)</code> | Unsubscribe function | Subscribes to native Window change events when supported. |

The named exports behave the same way. The package also exports the <code>Cookie</code>, <code>CookieAttributes</code>, <code>DeleteOptions</code>, <code>CookieChange</code>, and <code>CookieErrorCode</code> types, plus the <code>CookieError</code> class and <code>onChange</code> function.

## Behavior and guarantees

### Defaults and scope

<code>set</code> defaults <code>path</code> to <code>/</code> and <code>sameSite</code> to <code>lax</code>. <code>delete</code> defaults <code>path</code> to <code>/</code>, so a bare delete targets a bare set written by this package.

Cookies with the same name can exist at different paths or domains, and browsers can also partition them. <code>get(name)</code> returns one match. Use <code>getAll(name)</code> when every readable match matters. The API cannot select a particular duplicate by path or domain when reading.

Delete a cookie using the same path and domain used when it was created. A scope mismatch is a silent no-op because deletion writes an expired cookie at that scope.

### Options

| Option | Type | Used by | Default and behavior |
| --- | --- | --- | --- |
| <code>path</code> | <code>string</code> | <code>set</code>, <code>delete</code> | <code>/</code>. An explicit path must be non-empty and start with <code>/</code>. |
| <code>domain</code> | <code>string</code> | <code>set</code>, <code>delete</code> | None. The library checks syntax; the browser decides whether it matches the current origin. |
| <code>expires</code> | <code>Date&#124;number</code> | <code>set</code> | Absolute expiration as a Date or Unix time in milliseconds within the JavaScript Date range. Cannot be combined with <code>maxAge</code>. |
| <code>maxAge</code> | <code>number</code> | <code>set</code> | Relative expiration in seconds. Must be an integer. Positive values must fit within the supported JavaScript Date range; zero or a negative value expires the cookie immediately. Cookie Store writes convert it to an absolute expiry. |
| <code>secure</code> | <code>boolean</code> | <code>set</code> | None. The native Cookie Store backend always writes Secure cookies and rejects <code>secure: false</code> as unsupported. |
| <code>sameSite</code> | <code>"strict" &#124; "lax" &#124; "none"</code> | <code>set</code> | <code>lax</code>. <code>none</code> requires <code>secure: true</code>. |
| <code>partitioned</code> | <code>boolean</code> | <code>set</code>, <code>delete</code> | None. A partitioned cookie requires <code>secure: true</code> when set. Pass <code>partitioned: true</code> when deleting it. |

The encoded name and value pair must fit within 4096 bytes. UTF-8 path and domain values must each fit within 1024 bytes.

The package validates <code>__Secure-</code> and <code>__Host-</code> prefix requirements before writing. It rejects <code>__Http-</code> and <code>__Host-Http-</code> names because browser JavaScript cannot create the required <code>HttpOnly</code> cookies.

### Errors and environment support

Validation failures use <code>CookieError</code> before a browser write. Exceptions thrown by a backend operation are wrapped as <code>CookieError</code> with code <code>OPERATION_FAILED</code> and the original exception in <code>cause</code>. Browsers may silently ignore invalid <code>document.cookie</code> writes without throwing, so those failures cannot be reported.

| Code | Meaning |
| --- | --- |
| <code>INVALID_NAME</code> | The name is empty, not a string, contains control characters or malformed Unicode, or exceeds its encoded size limit. |
| <code>INVALID_VALUE</code> | The value is not a string or contains malformed Unicode. |
| <code>INVALID_OPTIONS</code> | An option has the wrong type, conflicts with another option, or has an invalid value. |
| <code>UNSUPPORTED</code> | The selected backend cannot perform the requested operation. |
| <code>NO_COOKIE_ACCESS</code> | Neither Cookie Store nor a cookie-capable <code>document</code> is available. |
| <code>OPERATION_FAILED</code> | Cookie Store access or a browser backend operation threw an error. |

Importing the package is safe during server-side rendering. Cookie operations reject with <code>NO_COOKIE_ACCESS</code> when no browser cookie API exists. Change subscriptions are not available during server rendering.

There is no <code>deleteAllCookies()</code> method. The <code>document.cookie</code> fallback cannot report each cookie's path or domain, and those fields are not reliably available across Cookie Store implementations. JavaScript also cannot access <code>HttpOnly</code> cookies. Keep the names and scopes your application creates, then delete those explicitly.

## Common cookie patterns

Cookies used in cross-site embedded or subresource requests require <code>SameSite=None</code> and <code>Secure</code>:

~~~ts
await cookies.set("widget", "enabled", {
  sameSite: "none",
  secure: true,
});
~~~

A <code>__Host-</code> cookie must be Secure, have no Domain attribute, and use the root path:

~~~ts
await cookies.set("__Host-session-hint", "1", {
  secure: true,
  path: "/",
});
~~~

Partitioned cookies also require Secure:

~~~ts
await cookies.set("__Host-widget", "enabled", {
  secure: true,
  sameSite: "none",
  partitioned: true,
  path: "/",
});
~~~

Delete using the same scope that was used to set the cookie:

~~~ts
await cookies.delete("preferences", {
  path: "/account",
});
~~~

See [SECURITY.md](SECURITY.md) for cookie security limits and release verification.

## Cookie change events

In a Window with native Cookie Store change events, <code>cookies.onChange()</code> passes changed cookies with names and values, and deleted cookies with names only. It returns an unsubscribe function. The event data has no path or domain fields. Replacing a cookie can appear as a changed record without a separate deleted record.

~~~ts
const unsubscribe = cookies.onChange(({ changed, deleted }) => {
  for (const cookie of changed) console.log(cookie.name, cookie.value);
  for (const cookie of deleted) console.log(cookie.name, "deleted");
});

unsubscribe();
~~~

The <code>document.cookie</code> fallback, server environments, and service workers do not provide this Window event API. <code>onChange()</code> throws <code>CookieError</code> with code <code>UNSUPPORTED</code> there. The library does not poll <code>document.cookie</code>.

## Browser support

The library selects a backend for each call.

| Backend | Used when | Readable cookie fields |
| --- | --- | --- |
| Cookie Store | <code>cookieStore</code> is available, except on a non-HTTPS page with a cookie-capable <code>document</code> | <code>name</code> and <code>value</code> are guaranteed by the API. Browsers may expose additional attributes. |
| <code>document.cookie</code> | Cookie Store is unavailable, or the page is non-HTTPS and can carry cookies | <code>name</code> and <code>value</code> only. |

The real browser test suite runs against Chromium, Firefox, and WebKit. It exercises core operations through native Cookie Store and the <code>document.cookie</code> fallback. Browser-specific support for additional cookie attributes and partitioning can vary.

Cookie Store standardizes the cookie name and value fields; additional metadata is optional and may differ by browser. Treat fields such as path, domain, expiry, Secure, SameSite, and partitioning as optional when reading a <code>Cookie</code>. The fallback can report only names and values.

On a non-HTTPS page with a cookie-capable <code>document</code>, the library selects <code>document.cookie</code> even if Cookie Store is present. This avoids a persistence issue observed in WebKit on plain HTTP origins. On HTTPS pages, Cookie Store is selected when available. A Cookie Store write is Secure by construction, so <code>secure: false</code> is unsupported on that backend.

## Security and release integrity

This package reads and writes browser cookies. It is not an authentication system and does not make client-readable values safe to trust. Releases from the current publishing workflow include npm provenance and artifacts for independent verification. See [SECURITY.md](SECURITY.md).

## Migrating from 1.x

Version 2 is a breaking redesign. The API is asynchronous, the default path is <code>/</code>, and values returned by <code>get</code> are decoded. Read the [1.0.0 to 2.x migration guide](MIGRATION.md) before upgrading.

## Contributing

Use [GitHub Issues](https://github.com/hamzahamidi/cookies-utils/issues) for bug reports, enhancement requests, and feedback. See [CONTRIBUTING.md](CONTRIBUTING.md) to propose a change and run the project checks. Report suspected security vulnerabilities through [SECURITY.md](SECURITY.md), not a public issue.

See [ROADMAP.md](ROADMAP.md) for the project direction.
