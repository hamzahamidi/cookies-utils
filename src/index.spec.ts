import { deleteCookie, cookieHasValue } from './index';

describe('Cookie utils', () => {

    describe('deleteCookie', () => {
        it('should not delete cookie if it doesnt exist', () => {
            const cookie = 'username=John Doe';
            document.cookie = cookie;
            deleteCookie('name');
            expect(document.cookie).toEqual(cookie);
        });
        it('should delete cookie if it exists', () => {
            const cookie = 'username=John Doe';
            document.cookie = cookie;
            deleteCookie('username');
            expect(document.cookie).toEqual('');
        });
        it('should delete cookie if it exists with expired date', () => {
            const cookie = 'username=John Doe; expires=Fri, 31 Dec 9999 23:59:59 GMT';
            document.cookie = cookie;
            deleteCookie('username');
            expect(document.cookie).toEqual('');
        });
        it('should delete cookie if it exists with a maxage', () => {
            const cookie = 'username=John Doe;max-age=31536000';
            document.cookie = cookie;
            deleteCookie('username');
            expect(document.cookie).toEqual('');
        });
        it('should delete cookie if it exists with a path', () => {
            const cookie = 'username=John Doe;path=/mydir';
            document.cookie = cookie;
            deleteCookie('username');
            expect(document.cookie).toEqual('');
        });
        it('should delete cookie if it exists with a domain', () => {
            const cookie = 'username=John Doe;domain=domain.example.com';
            document.cookie = cookie;
            deleteCookie('username');
            expect(document.cookie).toEqual('');
        });
    });

    describe('cookieHasValue', () => {
        it('should return true if cookie has expected value', () => {
            const cookie = 'username=John Doe';
            document.cookie = cookie;
            expect(cookieHasValue('username', 'John Doe')).toBeTruthy();
        });
        it('should return false if cookie doesnt have expected value', () => {
            const cookie = 'username=John Doe';
            document.cookie = cookie;
            expect(cookieHasValue('username', 'Johny')).toBeFalsy();
        });
        it('should return false if cookie doesnt exist', () => {
            const cookie = 'username=John Doe';
            document.cookie = cookie;
            expect(cookieHasValue('notfound', 'Johny')).toBeFalsy();
        });
    });
});
