/**
 * This module implements a reconnecting websocket.
 * 
 * Native WebSockets cannot recover from a disconnect. This means you have to
 * reattach event handlers and re-construct the socket. Our implementation hides this pain from consumers.
*/

import { ObservableV2 } from "lib0/observable.js";
import {
  Connection,
  ConnectionEvents,
  ConnectionState,
  connected,
  set_status,
} from "./connection";
import { math, time } from "lib0";
import { WithEvents} from "../util/events";
import { TypedEventTarget } from "../util/typed_event";

export interface SocketEvents {
  "message": MessageEvent;
}

/** A websocket client that handles reconnects and manages status updates */
export class WebSocketClient
  extends WithEvents<ConnectionEvents & SocketEvents, EventTarget>(EventTarget)
  implements Connection
{
  ws: WebSocket | null = null;
  shouldConnect = true;
  wsUnsuccessfulReconnects = 0;
  wsLastMessageReceived = 0;
  state: ConnectionState = ConnectionState.DISCONNECTED;
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
    setupWS(this);
  }

  async send(msg: Parameters<typeof WebSocket.prototype.send>[0]) {
    await connected(this);
    this.ws?.send(msg);
  }

  close() {
    this.shouldConnect = false;
    this.ws?.close();
  }
}

const MAX_BACKOFF_MILLIS = 5000;

const setupWS = (client: WebSocketClient) => {
  if (!client.shouldConnect || client.ws !== null) return;
  const websocket = new WebSocket(client.url);
  websocket.binaryType = "arraybuffer";
  client.ws = websocket;
  set_status(client, ConnectionState.CONNECTING);

  websocket.onmessage = (event: MessageEvent) => {
    client.wsLastMessageReceived = time.getUnixTime();
    client.dispatchEvent(event);
  };

  websocket.onerror = (event: Event) => {
    set_status(client, ConnectionState.CONNECTING);
  };

  websocket.onclose = (event: Event) => {
    client.ws = null;
    if (client.state != ConnectionState.CONNECTED) {
      client.wsUnsuccessfulReconnects++;
    }

    set_status(client, ConnectionState.CONNECTING);

    // Start with no reconnect timeout and increase timeout by
    // using exponential backoff starting with 100ms
    setTimeout(
      setupWS,
      math.min(
        math.pow(2, client.wsUnsuccessfulReconnects) * 100,
        MAX_BACKOFF_MILLIS,
      ),
      client,
    );
  };
  websocket.onopen = () => {
    client.wsLastMessageReceived = time.getUnixTime();
    client.wsUnsuccessfulReconnects = 0;
    set_status(client, ConnectionState.CONNECTED)
  };
};
