import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApolloError } from '@apollo/client/errors';
import { PureAbility } from '@casl/ability';
import { ApiError, Environment } from '@zen/common';
import {
  AuthLoginGQL,
  AuthLoginInput,
  AuthRefreshSessionGQL,
  AuthSession,
  GetAccountInfoGQL,
} from '@zen/graphql';
import { setSessionRefreshHandler } from '@zen/graphql/client';
import { Apollo } from 'apollo-angular';
import ls from 'localstorage-slim';
import {
  BehaviorSubject,
  Observable,
  Subscription,
  finalize,
  firstValueFrom,
  map,
  share,
  shareReplay,
  throwError,
  timer,
} from 'rxjs';
import { retry, tap } from 'rxjs/operators';

import { accessToken, exchangeToken } from './token';

// eslint-disable-next-line  @typescript-eslint/no-shadow -- members intentionally mirror the token signal names
export enum LocalStorageKey {
  userId = 'userId',
  accessToken = 'accessToken',
  accessTokenExpiresOn = 'accessTokenExpiresOn',
  exchangeToken = 'exchangeToken',
  exchangeTokenExpiresOn = 'exchangeTokenExpiresOn',
  roles = 'roles',
  rememberMe = 'rememberMe',
  rules = 'rules',
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  #refreshSubscription?: Subscription;
  #inFlightRefresh?: Observable<AuthSession>;

  #userId: AuthSession['userId'] | null = null;
  get userId(): AuthSession['userId'] | null {
    return this.#userId;
  }

  #accountInfo$;
  get accountInfo$() {
    return this.#accountInfo$;
  }

  #loggedIn = !!exchangeToken();
  get loggedIn() {
    return this.#loggedIn;
  }

  #loggedIn$ = new BehaviorSubject(!!exchangeToken());
  get loggedIn$() {
    return this.#loggedIn$.asObservable();
  }

  #userRoles: string[] = [];
  get userRoles() {
    return this.#userRoles;
  }

  #userRoles$ = new BehaviorSubject<string[]>([]);
  get userRoles$() {
    return this.#userRoles$.asObservable();
  }

  #getAccountInfoGQL = inject(GetAccountInfoGQL);
  #router = inject(Router);
  #apollo = inject(Apollo);
  #ability = inject(PureAbility);
  #authLoginGQL = inject(AuthLoginGQL);
  #authRefreshSessionGQL = inject(AuthRefreshSessionGQL);
  #env = inject(Environment);

  constructor() {
    // Lets the Apollo error link recover from an expired access token without
    // `@zen/graphql` having to depend on this library
    setSessionRefreshHandler(() => firstValueFrom(this.refreshSession()));

    this.#accountInfo$ = this.#getAccountInfoGQL.watch().valueChanges.pipe(
      map(({ data }) => data.accountInfo),
      share()
    );

    if (this.#validSession) {
      try {
        // Initialize Apollo client state
        const roles = ls.get<string[]>(LocalStorageKey.roles, { decrypt: true });
        this.#userRoles = roles ? roles : [];
        this.#userRoles$.next([...this.#userRoles]);
        this.#loggedIn = roles ? true : false;
        this.#loggedIn$.next(this.#loggedIn);
        this.#userId = ls.get(LocalStorageKey.userId, { decrypt: true });

        // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        const rules: Array<any> | null = ls.get(LocalStorageKey.rules, { decrypt: true });
        if (Array.isArray(rules)) this.#ability.update(rules);

        // The stored access token is usually stale by the time the app reloads,
        // so always start from a fresh pair
        this.refreshSession().subscribe({
          error: (error: ApolloError | string) => {
            console.error('Session refresh failed on app load', error);
            this.logout();
          },
        });
      } catch (error) {
        console.error('AuthService failed to initialize', error);
        this.logout();
      }
    } else {
      this.clearSession();
    }
  }

  login(data: AuthLoginInput) {
    return this.#authLoginGQL.fetch({ data }, { fetchPolicy: 'no-cache' }).pipe(
      tap(({ data: { authLogin } }) => {
        this.setSession(authLogin);
      })
    );
  }

  loginWithGoogle() {
    window.location.href = this.#env.url.api + '/auth/google';
  }

  logout() {
    this.clearSession();
    void this.#router.navigateByUrl('/login');
  }

  setSession(authSession: AuthSession) {
    ls.set(LocalStorageKey.userId, authSession.userId, { encrypt: true });
    ls.set(LocalStorageKey.accessToken, authSession.accessToken, { encrypt: true });
    ls.set(LocalStorageKey.accessTokenExpiresOn, Date.now() + authSession.accessTokenExpiresIn * 1000);
    ls.set(LocalStorageKey.exchangeToken, authSession.exchangeToken, { encrypt: true });
    ls.set(
      LocalStorageKey.exchangeTokenExpiresOn,
      Date.now() + authSession.exchangeTokenExpiresIn * 1000
    );
    ls.set(LocalStorageKey.rememberMe, authSession.rememberMe);
    ls.set(LocalStorageKey.roles, authSession.roles, { encrypt: true });
    ls.set(LocalStorageKey.rules, authSession.rules, { encrypt: true });

    this.#userId = authSession.userId;

    this.#ability.update(authSession.rules as any);

    accessToken.set(authSession.accessToken);
    exchangeToken.set(authSession.exchangeToken);

    if (
      !this.rolesEqual(this.#userRoles, authSession.roles) ||
      this.#userRoles === null ||
      this.#userRoles === undefined
    ) {
      this.#userRoles = authSession.roles;
      this.#userRoles$.next([...this.#userRoles]);
    }

    if (!this.#loggedIn) {
      this.#loggedIn = true;
      this.#loggedIn$.next(true);
    }

    this.#scheduleRefresh(authSession.accessTokenExpiresIn);
  }

  rolesEqual(a: string | string[] | null | undefined, b: string | string[] | null | undefined) {
    let compareA: string[];
    let compareB: string[];

    if (Array.isArray(a)) compareA = [...a];
    else if (typeof a === 'string') compareA = [a];
    else if (a === null || a === undefined) compareA = [];
    else throw new Error(`'a' is not a valid type for comparison`);

    if (Array.isArray(b)) compareB = [...b];
    else if (typeof b === 'string') compareB = [b];
    else if (b === null || b === undefined) compareB = [];
    else throw new Error(`'b' is not a valid type for comparison`);

    if (compareA.length !== compareB.length) return false;

    compareA.sort();
    compareB.sort();

    for (let i = 0; i < compareA.length; i++) {
      if (compareA[i] !== compareB[i]) return false;
    }

    return true;
  }

  userHasRole(role: string | string[]) {
    if (role) {
      if (typeof role === 'string') return this.#userRoles.some(r => r === role);
      else return this.#userRoles.some(r => role.includes(r));
    }
    return false;
  }

  userNotInRole(role: string | string[]) {
    if (role) {
      if (typeof role === 'string') return !this.#userRoles.some(r => r === role);
      return this.#userRoles.filter(r => role.includes(r)).length === 0;
    }
    return true;
  }

  /**
   * A session lives as long as its exchange token: the access token expiring is
   * routine and simply triggers a refresh.
   */
  get #validSession(): boolean {
    return this.#sessionTimeRemaining > 0;
  }

  get #sessionTimeRemaining(): number {
    const expiresOn = ls.get<number>(LocalStorageKey.exchangeTokenExpiresOn);
    if (!expiresOn) return 0;

    const timeRemaining = expiresOn - Date.now();

    if (timeRemaining <= 0) return 0;
    else return timeRemaining;
  }

  clearSession() {
    this.#stopRefreshTimer();
    ls.remove(LocalStorageKey.userId);
    ls.remove(LocalStorageKey.accessToken);
    ls.remove(LocalStorageKey.accessTokenExpiresOn);
    ls.remove(LocalStorageKey.exchangeToken);
    ls.remove(LocalStorageKey.exchangeTokenExpiresOn);
    ls.remove(LocalStorageKey.rememberMe);
    ls.remove(LocalStorageKey.roles);
    ls.remove(LocalStorageKey.rules);

    this.#userId = null;
    this.#ability.update([]);
    accessToken.set(null);
    exchangeToken.set(null);
    this.#userRoles = [];
    this.#userRoles$.next([]);
    this.#loggedIn = false;
    this.#loggedIn$.next(false);
    void this.#apollo.client.cache.reset();
  }

  /**
   * Trades the stored exchange token for a fresh session.
   *
   * Concurrent callers share one in-flight request: a burst of requests all
   * failing on the same expired access token must produce a single refresh, not
   * one per request.
   */
  refreshSession(): Observable<AuthSession> {
    if (this.#inFlightRefresh) return this.#inFlightRefresh;

    const storedExchangeToken = exchangeToken();

    if (!storedExchangeToken) {
      return throwError(() => new Error('No exchange token available'));
    }

    this.#inFlightRefresh = this.#authRefreshSessionGQL
      .fetch(
        {
          data: {
            exchangeToken: storedExchangeToken,
            rememberMe: !!ls.get<boolean>(LocalStorageKey.rememberMe),
          },
        },
        { fetchPolicy: 'no-cache' }
      )
      .pipe(
        retry({
          delay: this.#retryStrategy({
            excludeStatusCodes: ['FORBIDDEN', 'UNAUTHENTICATED', 'INTERNAL_SERVER_ERROR'],
            delay: this.#env.auth.retryRefreshSessionDelay,
          }),
        }),
        map(({ data: { authRefreshSession } }) => {
          this.setSession(authRefreshSession);
          if (!this.#env.production) console.log('Refreshed session');
          return authRefreshSession;
        }),
        finalize(() => (this.#inFlightRefresh = undefined)),
        shareReplay({ bufferSize: 1, refCount: false })
      );

    return this.#inFlightRefresh;
  }

  /**
   * Proactively refreshes shortly before the access token expires.  The delay
   * comes from the server's own `accessTokenExpiresIn`, so client and API
   * timings can never drift apart.
   */
  #scheduleRefresh(accessTokenExpiresIn: number) {
    this.#stopRefreshTimer();

    const delay = Math.max(accessTokenExpiresIn * 1000 - this.#env.auth.refreshSkew, 5000);

    this.#refreshSubscription = timer(delay).subscribe(() => {
      if (!this.#validSession) {
        this.logout();
        return;
      }

      this.refreshSession().subscribe({
        error: (error: ApolloError | string) => {
          console.error('Scheduled session refresh failed', error);
          this.logout();
        },
      });
    });
  }

  #stopRefreshTimer() {
    if (this.#refreshSubscription) {
      this.#refreshSubscription.unsubscribe();
      this.#refreshSubscription = undefined;
    }
  }

  #retryStrategy({
    maxAttempts = Infinity,
    delay = 5000,
    excludeStatusCodes = [],
  }: {
    maxAttempts?: number;
    delay?: number;
    excludeStatusCodes?: string[];
  }) {
    return (error: ApolloError, retryCount: number) => {
      const excludedStatusFound = !!excludeStatusCodes.find(exclude => exclude === error.message);

      if (error?.message === ApiError.Codes.USER_NOT_FOUND) {
        return throwError(() => error);
      }

      if (retryCount > maxAttempts || excludedStatusFound) {
        return throwError(() => error);
      }

      console.warn(
        `Session refresh attempt ${retryCount}. Retrying in ${Math.round(delay / 1000)}s`,
        error
      );

      return timer(delay);
    };
  }
}
