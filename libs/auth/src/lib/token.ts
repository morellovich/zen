import { signal } from '@angular/core';
import ls from 'localstorage-slim';

let localStorageToken: string | null = ls.get('token', { decrypt: true });
// export const token = signal(localStorageToken);
export const token = () => localStorageToken;
token.set = (t: string | null) => (localStorageToken = t);
