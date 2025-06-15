import { Component, inject } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService, IfLoggedInDirective, RolesDirective, ZenLoginLinkComponent } from '@zen/auth';
import { Environment } from '@zen/common';
import { ZenLanguagePickerComponent, ZenLayoutComponent } from '@zen/components';

@Component({
  selector: 'zen-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [
    IfLoggedInDirective,
    MatListModule,
    RolesDirective,
    RouterModule,
    TranslateModule,
    ZenLanguagePickerComponent,
    ZenLayoutComponent,
    ZenLoginLinkComponent,
  ],
})
export class AppComponent {
  auth = inject(AuthService);
  private translate = inject(TranslateService);
  private env = inject(Environment);

  constructor() {
    this.translate.currentLang = this.env.defaultLanguage;
  }
}
