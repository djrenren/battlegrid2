import { sink } from "../util/streams";
import { networkStream, type Connection, type NetworkStream } from "./network-stream";

/**
 * This module implements a half-hearted version of the abandoned WebSocketStream spec
 * 
 * Modeling websockets as a stream makes them easier to abstract over, and allows them to seamlessly
 * work with transport-agnostic infrastructure
 */
type WebSocketMessage = string | ArrayBufferLike | Blob | ArrayBufferView;

/**
 * WebSocketStream is a network stream that exits with protocol-specific close information
 */
type WebSocketStream = NetworkStream<WebSocketMessage>;

type CloseData = Pick<CloseEvent, 'code' | 'reason'>;

const ABORT_CODE = 1000 as const;

/**
 * Construct a websocket stream
 * 
 * @param url The url to connect to
 * @param abort An optional abort signal for shutting down the connection
 * @returns WebSocketStream
 */
export const wsstream = (url: string): WebSocketStream => {
  const ws = new WebSocket(url);

  // 1. Describe how a Websocket constitutes a `Connection`
  const conn = wsConnection(ws);

  // 2. Construct our streams
  const streams = {
    // a. The read stream just forwards the messages
    readable: new ReadableStream<WebSocketMessage>({
      // Forward all reads from the socket to the stream
      start(controller) {
        ws.onmessage = ({ data }) => controller.enqueue(data);
      },
    }),

    // b. The write steam just invokes send
    // Note: We do not handle backpressure here
    writable: new WritableStream<WebSocketMessage>({
      async write(msg) {
        ws.send(msg)
      },
    })
  }

  return networkStream(conn, streams);
}


const wsConnection = (ws: WebSocket) => ({
    // a. A websocket is ready when the `onopen` event fires
    ready: new Promise<void>(resolve => ws.onopen = () => resolve()),

    // b. A websocket can be closed by calling the `close` function
    close: (r?: any) => ws.close(r?.code || 1000, r?.reason ?? "Manually closed"),

    // c. A websocket is closed when onclose event is fired
    closed: new Promise<void>((resolve, reject) =>
      ws.onclose = ({ code, reason, wasClean }) =>
        (ws.onclose = ws.onopen = ws.onmessage = null) ||  // Clean up our handlers
        resolve())
})