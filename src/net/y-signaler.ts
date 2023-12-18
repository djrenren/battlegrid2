import { ConnectionState } from "./connection";
import { PeerId } from "./peer";
import { AddressableSignal, Signaler } from "./signaler";
import { WebSocketClient } from "./ws";

type OutgoingYSignal = Publish | {
    type: "subscribe",
    topics: string[],
} | {
    type: "unsubscribe",
} | {
    type: "ping"
};

type Publish = {
    type: "publish"
    topic: string
    signal?: AddressableSignal, // We smuggle our extra data through yjs here. It's optional so that we remember to check for garbage traffic
}

type IncomingYSignal = Publish | {
    type: "pong"
}

export class YSignaler extends WebSocketClient {
    signaler: Signaler;

    constructor(local_id: PeerId, url: string, topic: string) {
        super(url);
        this.signaler = new Signaler(local_id, (signal) => {
            this.#send_yjs_signal({ type: "publish", topic, signal });
        });

        // Announce every time we connect (including reconnects)
        this.addEventListener("connectionstatus", () => {
            if (this.state === ConnectionState.CONNECTED) {
                this.#keepalive();

                // 1. Join the room
                this.#send_yjs_signal({type: "subscribe", topics: [topic]});

                // 2. Announce our presence
                this.signaler.announce();
            }
        });
        this.addEventListener("connectionstatus", this.#keepalive)
        this.addEventListener("message", this.#onmessage);
    }

    static #PING_TIMEOUT = 30000;
    #pong_received = true;
    #keepalive() {
        const pingInterval = setInterval(() => {
            if (!this.#pong_received) {
                this.close();
                clearInterval(pingInterval);
            }
            this.#pong_received = false;
            this.send(JSON.stringify({ type: "ping" }));
        }, YSignaler.#PING_TIMEOUT)
    }

    #onmessage = (event: MessageEvent) => {
        const signal = JSON.parse(event.data) as IncomingYSignal;
        switch (signal.type) {
            case "publish":
                if (!signal.signal) break;
                if (signal.signal.from === this.signaler.peer_id || (signal.signal.to  ?? this.signaler.peer_id) !== this.signaler.peer_id) break;
                this.signaler.signal(signal.signal);
                break;
            case "pong":
                this.#pong_received = true;
                break;
        }
    }

    #send_yjs_signal(signal: OutgoingYSignal) {
        console.log("SENDING", signal);
        this.send(JSON.stringify(signal));
    }
}
