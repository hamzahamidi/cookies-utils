export function cookieHasValue(name: string, value:string): boolean {
    return document.cookie.split(';')
        .some(item => item.trim().indexOf(name + '=' + value.trim()) == 0
    );
}

export function cookieExists(name: string): boolean {
    return document.cookie.split(';')
        .some(item => item.trim().indexOf(name + '=') == 0
        );
}

export function deleteCookie(name: string, path?: string, domain?: string): void {
    if (cookieExists(name)) {
        document.cookie = name + "=" +
            ((path) ? ";path=" + path : "") +
            ((domain) ? ";domain=" + domain : "") +
            ";expires=Thu, 01 Jan 1970 00:00:01 GMT";
    }
}
