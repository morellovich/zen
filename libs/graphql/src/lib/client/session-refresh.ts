/**
 * Hook that lets the Apollo error link recover from an expired access token
 * without `@zen/graphql` depending on `@zen/auth`, which depends on it.
 *
 * `AuthService` registers its refresh here on construction; until then the link
 * simply lets auth errors through.
 */
export type SessionRefreshHandler = () => Promise<unknown>;

let handler: SessionRefreshHandler | null = null;

export function setSessionRefreshHandler(sessionRefreshHandler: SessionRefreshHandler | null) {
  handler = sessionRefreshHandler;
}

export function getSessionRefreshHandler() {
  return handler;
}

/** Operations that must never trigger a refresh, to avoid recursing */
export const NO_REFRESH_OPERATIONS = ['AuthRefreshSession', 'AuthLogin', 'AuthRegister'];
