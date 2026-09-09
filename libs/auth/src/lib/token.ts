import { signal } from '@angular/core';
import ls from 'localstorage-slim';

/**
 * Short lived token sent with every authenticated request.
 */
export const accessToken = signal<string | null>(ls.get('accessToken', { decrypt: true }));

/**
 * Long lived token whose only use is obtaining a new session via
 * `authRefreshSession`.  Carries no roles.
 */
export const exchangeToken = signal<string | null>(ls.get('exchangeToken', { decrypt: true }));
