import { uuidv4 } from "lib0/random.js";
import { wsstream } from "../../ws";
import type { PeerId, Signal } from "../peer";
import { json_decode, json_encode, pipeFrom, premap } from "../../../util/streams";
import type { AddressableSignal } from "../protocol";
import type { Signaler } from "../signaler";

/** Any message we expect to receive from the signaling server */
type IncomingMessage = {
  type: "OPEN" | "EXPIRE" | "ID-TAKEN"
} | {
  type: "ERROR",
  payload: Errors | string 
} | SignalMessage;

/** Errors the peerjs server could report to us */
enum Errors {
	INVALID_KEY = "Invalid key provided",
	INVALID_TOKEN = "Invalid token provided",
	INVALID_WS_PARAMETERS = "No id, token, or key supplied to websocket server",
	CONNECTION_LIMIT_EXCEED = "Server has reached its concurrent user limit",
}

/** A message from the server containing a signal */
type SignalMessage = {
  /**
   * Technically peerjs has multiple types of signal messages, but we encode
   * that difference in our signal object. The server doesn't care about this value
   * as long as it's one of the valid types so we just pick one.
   */
  type: "CANDIDATE" 
  src: PeerId;
  dst: PeerId,
  payload: Signal, // Note peerjs says payload must be a string but they don't check
}

type OutGoingMessage = {type: "HEARTBEAT"} | {
  type: "CANDIDATE",
  dst: PeerId,
  payload: Signal, // Note peerjs says payload must be a string but they don't check
};

type Opts = {
    timeout?: number,
}

export const peerjs = (url: string, opts?: Opts): Signaler => {
    let id = uuidv4() as PeerId;
    let socket = wsstream(url + "?" + new URLSearchParams({
        id,
        token: '1',
        key: 'peerjs'
    }).toString());

    let {promise: open, resolve, reject} = Promise.withResolvers<void>();

    // string -> IncomingMessage -> AddressableSignal
    let readable: ReadableStream<AddressableSignal> = socket.readable
        .pipeThrough(json_decode<IncomingMessage>()) 
        .pipeThrough(new TransformStream({
            transform(msg, controller) {
                switch (msg.type) {
                    case "OPEN":
                        return resolve();
                    case "CANDIDATE":
                        return controller.enqueue({
                            from: msg.src,
                            to: msg.dst,
                            ...msg.payload
                        })
                    default:
                        console.error(msg);
                        // TODO
                }

            }
        }));

    let writable = pipeFrom(pipeFrom(
        socket.writable, 
        json_encode()), 
        new TransformStream<AddressableSignal, OutGoingMessage> ({
            start(controller) {
                let i = setInterval(async () => {
                    try {
                        controller.enqueue({type: "HEARTBEAT"})
                    } catch (e) {
                        clearInterval(i);
                    }
                }, opts?.timeout ?? 30000);
            },
            transform(msg, controller) {
                controller.enqueue({
                    type: "CANDIDATE",
                    dst: msg.to,
                    payload: msg
                })
            }
        })
    );

    return {
        ...socket,
        id,
        readable,
        writable
    }
}