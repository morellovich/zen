export abstract class Environment {
  abstract readonly production: boolean;
  abstract readonly publicRegistration: boolean;
  abstract readonly auth: {
    /**
     * How long in milliseconds before the access token expires the client
     * refreshes it.  The refresh schedule is derived from the
     * `accessTokenExpiresIn` the server returns, so this is the only timing
     * value the client needs and it never has to be kept in sync with the API.
     * @example 60 * 1000 is 1 minute
     */
    readonly refreshSkew: number;

    /**
     * The delay in milliseconds at which the client will retry a failed session
     * refresh.  For example if the client is disconnected and has their auth
     * session expiring soon, it will retry at the provided interval.
     * @example 5000 is 5 seconds.
     */
    readonly retryRefreshSessionDelay?: number;
  };

  /**
   * Whether or not to enable Google OAuth for the client application.
   * This Will hide the sign in and sign up with Google buttons if set to false.
   */
  abstract readonly enableGoogleOAuth: boolean;

  /**
   * The URLs for the application.
   */
  abstract readonly url: {
    readonly loginRedirect: string;
    readonly api: string;
    readonly portal: string;
    readonly graphql: string;
    readonly graphqlSubscriptions?: string;
    readonly socketio?: string;
  };
}

export class EnvironmentDev implements Environment {
  production = false;
  publicRegistration = true;
  auth = {
    refreshSkew: 60 * 1000, // 1 minute
    retryRefreshSessionDelay: 5000, // 5 seconds
  } as const;
  enableGoogleOAuth = true;
  url = {
    loginRedirect: '/',
    api: 'http://localhost:7080',
    portal: 'http://localhost:4200/#',
    graphql: 'http://localhost:7080/graphql',
    graphqlSubscriptions: 'ws://localhost:7080/graphql',
    socketio: 'http://localhost:7081',
  } as const;
}

export class EnvironmentProd implements Environment {
  production = true;
  publicRegistration = true;
  auth = {
    refreshSkew: 60 * 1000, // 1 minute
    retryRefreshSessionDelay: 5000, // 5 seconds
  } as const;
  enableGoogleOAuth = true;
  url = {
    loginRedirect: '/',
    api: 'https://api.site.com',
    portal: 'https://portal.site.com/#',
    graphql: 'https://api.site.com/graphql',
    graphqlSubscriptions: 'wss://api.site.com/graphql',
    socketio: 'https://api.site.com:7081',
  } as const;
}
