import { provideHttpClient } from '@angular/common/http';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PureAbility } from '@casl/ability';
import { createPrismaAbility } from '@casl/prisma';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { Preview, moduleMetadata } from '@storybook/angular';
import { Environment, EnvironmentDev } from '@zen/common';
import { AuthLoginGQL, AuthRefreshSessionGQL, GetAccountInfoGQL } from '@zen/graphql';
import { ApolloTestingModule } from 'apollo-angular/testing';

import { AuthService } from '../src/lib/auth.service';

const preview: Preview = {
  decorators: [
    moduleMetadata({
      imports: [BrowserAnimationsModule, ApolloTestingModule],
      providers: [
        provideHttpClient(),
        // `staticDirs` in main.ts serves the portal's assets, so the real
        // translation files load here too
        provideTranslateService({
          lang: 'en',
          fallbackLang: 'en',
          loader: provideTranslateHttpLoader({ prefix: 'assets/i18n/', suffix: '.json' }),
        }),
        { provide: Environment, useClass: EnvironmentDev },
        { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } },
        {
          provide: PureAbility,
          useValue: createPrismaAbility(undefined, {
            detectSubjectType: object => object['__typename'],
          }),
        },
        AuthService,
        AuthLoginGQL,
        AuthRefreshSessionGQL,
        GetAccountInfoGQL,
      ],
    }),
  ],
};

export default preview;
