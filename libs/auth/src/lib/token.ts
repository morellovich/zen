import ls from 'localstorage-slim';

let _accessToken: string | null = ls.get('accessToken', { decrypt: true });
export const accessToken = () => _accessToken;
accessToken.set = (t: string | null) => (_accessToken = t);

let _exchangeToken: string | null = ls.get('exchangeToken', { decrypt: true });
export const exchangeToken = () => _exchangeToken;
exchangeToken.set = (t: string | null) => (_exchangeToken = t);
