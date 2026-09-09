import { Component, OnDestroy, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Subscription } from 'rxjs';

import { ZenSampleSocketService } from './zen-sample-socket.service';

@Component({
  imports: [MatButtonModule],
  selector: 'zen-sample-socket',
  templateUrl: 'zen-sample-socket.component.html',
})
export class ZenSampleSocketComponent implements OnDestroy {
  readonly messages = signal<string[]>([]);
  readonly connected = signal(false);

  #subs: Subscription[] = [];

  readonly #socket = inject(ZenSampleSocketService);

  constructor() {
    const socket = this.#socket;

    this.#subs.push(
      socket.fromEvent('msgToClient').subscribe(data => {
        this.messages.update(m => [...m, JSON.stringify(data)]);
      }),
      socket.fromEvent('connect').subscribe(() => this.connected.set(true)),
      socket.fromEvent('disconnect').subscribe(() => this.connected.set(false))
    );
  }

  msgToServer() {
    this.#socket.emit('msgToServer', { test: 'hello world', at: new Date().toISOString() });
  }

  ngOnDestroy(): void {
    this.#subs.forEach(sub => sub.unsubscribe());
  }
}
