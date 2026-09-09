import { Component, inject } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService, IfLoggedInDirective, RolesDirective, ZenLoginLinkComponent } from '@zen/auth';
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
    TranslatePipe,
    ZenLanguagePickerComponent,
    ZenLayoutComponent,
    ZenLoginLinkComponent,
  ],
})
export class AppComponent {
  auth = inject(AuthService);
}
