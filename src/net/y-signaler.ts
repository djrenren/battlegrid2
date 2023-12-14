import { WithEvents } from "../util/events";
import { ConnectionState } from "./connection";
import { PeerId } from "./peer";
import { AddressableSignal, Signaler } from "./signaler";
import { WebSocketClient } from "./ws";

type YSignal = {
    type: "publish",
    name: number
};

class YSignaler extends WithEvents<{"new": MessageEvent}, WebSocketClient>(WebSocketClient) {
    #signaler: Signaler;

    constructor(local_id: PeerId, url: string) {
        super(url);
        this.#signaler = new Signaler(local_id, this.#send_signal);

        // Announce every time we connect (including reconnects)
        this.addEventListener("connectionstatus", () => {
            if (this.state === ConnectionState.CONNECTED) {
                // 1. Join the room
                // this.send(...)

                // 2. Announce our presence
                this.#signaler.announce();
            }
        });
    }

    #send_signal = (signal: AddressableSignal) => {
        this.send(JSON.stringify(signal));
    }
}
