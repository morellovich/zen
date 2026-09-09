import { provideHttpClient } from '@angular/common/http';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { Preview, moduleMetadata } from '@storybook/angular';
import { Environment, EnvironmentDev } from '@zen/common';

const preview: Preview = {
  decorators: [
    moduleMetadata({
      imports: [BrowserAnimationsModule],
      providers: [
        provideHttpClient(),
        provideTranslateService({
          lang: 'en',
          fallbackLang: 'en',
          loader: provideTranslateHttpLoader({ prefix: 'assets/i18n/', suffix: '.json' }),
        }),
        { provide: Environment, useClass: EnvironmentDev },
        { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } },
      ],
    }),
  ],
};

export default preview;
