import { ObservableV2 } from "lib0/observable";
import { Peer, PeerId, Signal } from "./peer.ts";

const PEER_CONFIG = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};

/** Extends the individual peer's signaling data with routing information */
export interface AddressableSignal extends Signal {
  /**
   * The peer who originated the message. We trust the client to be honest with this value
   * so that the signaling protocol can be used without smart routing on the server.
   */
  from: PeerId;

  /** Broadcast messages do not have a `to` value */
  to?: PeerId;
}

export type AddressableSignalHandler = (signal: AddressableSignal) => void;

/** A multi-peer signaling protocol (independent of transport) */
export class Signaler extends ObservableV2<{ peer(peer: Peer): void }> {
  /** All remote connections organized by the remote peer's ID */
  peers: Map<PeerId, Peer> = new Map();

  /** The PeerId for this client */
  peer_id: PeerId;

  /** Called whenever a peer has a signal to send */
  #handler: AddressableSignalHandler;

  constructor(peer_id: PeerId, handler: AddressableSignalHandler) {
    super();
    this.peer_id = peer_id;
    this.#handler = handler;
  }

  /** Announce your availability to receive connections */
  announce() {
    this.#handler({ from: this.peer_id });
  }

  /** Called when new signaling information is available */
  signal(signal: AddressableSignal) {
    let peer = this.peers.get(signal.from);
    if (signal.shutdown) {
      console.log(signal);
      if (!peer) {
        console.debug("Received shutdown for non-existant peer");
        return;
      }

      console.log("attempting to close peer");
      peer.close();
      this.peers.delete(signal.from);
    }

    // If we don't have a peer, let's make one
    if (!peer) {
      const to = signal.from;
      peer = new Peer(
        to,
        async (emitting) => {
          await this.#handler({ ...emitting, from: this.peer_id, to });
        },
        // If to is undefined, then the signal is an announcement.
        // The announcer is polite and the responder is not polite
        signal.to !== undefined,
        PEER_CONFIG,
      );
      this.peers.set(to, peer);
      this.emit("peer", [peer]);
    }

    peer.signal(signal);
  }

  async close() {
    for (const [to, peer] of this.peers) {
      peer.close();
      await this.#handler({ from: this.peer_id, to, shutdown: true });
    }
    this.peers.clear();
  }
}
