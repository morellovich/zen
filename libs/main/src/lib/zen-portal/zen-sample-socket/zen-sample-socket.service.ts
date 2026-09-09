import { ApplicationRef, Injectable, inject } from '@angular/core';
import { accessToken } from '@zen/auth';
import { Environment } from '@zen/common';
import { Socket, SocketIoConfig } from 'ngx-socket-io';

@Injectable({ providedIn: 'root' })
export class ZenSampleSocketService extends Socket {
  constructor() {
    super(
      {
        // The trailing path segment selects the `sample` namespace on the gateway
        url: `${inject(Environment).url.socketio}/sample`,
        options: {
          // `auth` is forwarded verbatim to socket.io-client and survives the
          // websocket transport upgrade, unlike `extraHeaders`
          auth: { token: accessToken() },
        },
      } as SocketIoConfig,
      inject(ApplicationRef)
    );
  }
}
