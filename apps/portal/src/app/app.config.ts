import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  provideRouter,
  withEnabledBlockingInitialNavigation,
  withHashLocation,
} from '@angular/router';
import { PureAbility } from '@casl/ability';
import { createPrismaAbility } from '@casl/prisma';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { accessToken, authInterceptorFn } from '@zen/auth';
import { Environment } from '@zen/common';
import { CURRENT_LANG_LS_KEY } from '@zen/components';
import { ZenGraphQLModule } from '@zen/graphql';
import { possibleTypes, typePolicies } from '@zen/graphql/client';

import ls from 'localstorage-slim';

import { environment } from '../environments/environment';
import { APP_ROUTES } from './app.routes';

const currentLang = ls.get<string>(CURRENT_LANG_LS_KEY);

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptorFn])),
    provideRouter(APP_ROUTES, withEnabledBlockingInitialNavigation(), withHashLocation()),
    { provide: Environment, useValue: environment },
    provideTranslateService({
      lang: currentLang ?? environment.defaultLanguage,
      fallbackLang: environment.defaultLanguage,
      loader: provideTranslateHttpLoader({ prefix: 'assets/i18n/', suffix: '.json' }),
    }),
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } },
    {
      provide: PureAbility,
      useValue: createPrismaAbility(undefined, {
        detectSubjectType: object => object['__typename'],
      }),
    },
    importProvidersFrom(
      ZenGraphQLModule.forRoot({
        cacheOptions: {
          possibleTypes,
          typePolicies,
        },
        batchOptions: {
          uri: environment.url.graphql,
          batchMax: 250,
        },
        uploadOptions: {
          uri: environment.url.graphql,
          operationNames: ['SampleUpload', 'SampleUploadMany'],
          headers: { 'Apollo-Require-Preflight': 'true' },
          // eslint-disable-next-line  @typescript-eslint/no-explicit-any
          fetch: (input, init: any) => {
            init.headers['Authorization'] = 'Bearer ' + accessToken();
            return fetch(input, init);
          },
        },
        websocketOptions: {
          url: environment.url.graphqlSubscriptions,
          connectionParams: () => ({ token: accessToken() }),
          shouldRetry: () => true,
          retryAttempts: Infinity,
        },
      })
    ),
  ],
};
