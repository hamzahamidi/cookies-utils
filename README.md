# cookies-utils

<p align="center">
    <a href="https://www.npmjs.com/package/cookies-utils">
        <img src="https://img.shields.io/npm/v/cookies-utils.svg?style=flat-square&colorB=51C838" alt="NPM Version">
    </a>
    <a href="https://github.com/hamzahamidi/cookies-utils/actions?query=workflow%3ABuild">
        <img src="https://github.com/hamzahamidi/cookies-utils/workflows/Build/badge.svg" alt="Build Status">
    </a>
</p>

This project contains functions to help manage cookies.

## Installation

### NPM

Install the library with `npm install cookies-utils`.

### CDN

Or use it directly in your browser via jsDelivr or unpkg:

```html
<script src="https://cdn.jsdelivr.net/npm/cookies-utils/cookies-utils.min.js"></script>
...

cookiesUtils.deleteCookie('name')
```

or

```html
<script src="https://unpkg.com/cookies-utils/cookies-utils.min.js"></script>

...

cookiesUtils.deleteCookie('name')
```

## Usage

Check existence of cookie

```javascript
import { cookieExists } from "cookies-utils";

const isExist = cookieExists('name');
```

Delete a cookie

```javascript
import { deleteCookie } from "cookies-utils";

deleteCookie('name');
```

Check if cookie has specific value

```javascript
import { cookieHasValue } from "cookies-utils";

const hasValue = cookieHasValue('name','value');
```
