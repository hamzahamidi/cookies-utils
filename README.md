# cookies-utils

<p align="center">
    <a href="https://github.com/hamzahamidi/cookies-utils/actions?query=workflow%3ABuild"><img
            src="https://github.com/hamzahamidi/cookies-utils/workflows/Build/badge.svg" alt="Build Status"></a>

</p>

This project contains functions to help manage cookies. Install the library with `npm install cookies-utils`.

1- Check existence of cookie `function cookieExists(name: string): boolean`

2- Delete a cookie `deleteCookie(name: string, path?: string, domain?: string): void`

3- Check if cookie has specific value `function cookieHasValue(name: string, value: string): boolean`
