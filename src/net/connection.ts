import { ObservableV2 } from "lib0/observable.js";
import { TypedEventTarget, WithEvents, dispatch, waitUntil } from "../util/events";

export interface Connection extends TypedEventTarget<{"connectionstatus": Event}> {
    state: ConnectionState;
}

export const enum ConnectionState {
    CONNECTED,
    DISCONNECTED,
    CONNECTING
}


export type ConnectionEvents = {
    "connectionstatus": Event
}

export const set_status = (c: Connection, state: ConnectionState): void => {
    if (c.state != state) {
        c.state = state;
        dispatch(c, "connectionstatus", Event);
    }
}

export const connected = (c: Connection) => c.state === ConnectionState.CONNECTED || waitUntil(c, "connectionstatus", () =>
    c.state === ConnectionState.CONNECTED
);
