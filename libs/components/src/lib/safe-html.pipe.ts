import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'safeHtml',
  standalone: true,
})
export class SafeHtmlPipe implements PipeTransform {
  sanitized = inject(DomSanitizer);

  transform(value: string) {
    return value ? this.sanitized.bypassSecurityTrustHtml(value) : '';
  }
}
