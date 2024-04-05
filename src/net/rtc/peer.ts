/**
 * This module implements an extension to the native RTCPeerConnection.
 * Our extension gives us two key benefits:
 * 
 * 1. It emits and accepts a unified {@link Signal} type (rather than
 *    descriptions, offers, candidates, etc.)
 * 2. It implements "perfect negotiation" which allows both peers to proactively
 *    renegotiate a connection (say, when a device switches networks) without conflict
 */
import { uuidv4 } from "lib0/random.js";
import { NominalString } from "../../util/typing.ts";
import { WithEvents, waitUntil} from "../../util/events.ts";

export type PeerId = NominalString<"PeerId">;
export const fresh_peer_id = () => uuidv4() as PeerId;
export type SignalHandler = (signal: Signal) => void;

const PEER_CONFIG = {
  iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:standard.relay.metered.ca:80",
      username: "a7fa76b9bd009ac2360b7377",
      credential: "Lp//9ekw/xearO4o",
    },
  ],
};

type EventMap = RTCPeerConnectionEventMap & {
  'signal': CustomEvent<Signal>,
  'close': Event
};

/** An extension of the native RTCPeerConnection that implements perfect signaling */
export class Peer extends WithEvents<EventMap>()(RTCPeerConnection) {
  /** Tracks whether we are actively generating an offer.
   * Protects against cases where a signal is received concurrently) */
  #makingOffer = false;

  /** Whether or not we should ignore incoming offers */
  #ignoreOffer = false;

  /**
   * Every pairing of RTCPeers has a polite and impolite peer.  It's the
   * responsibility of the signaling protocol to ensure this invariant.  This
   * allows us to resolve collisions when both peers make an initial offer to each
   * other. (the polite one starts over) */
  #polite: boolean;

  constructor(
    polite = false,
    conf: RTCConfiguration = PEER_CONFIG,
  ) {
    super(conf);
    this.#polite = polite;

    // Kicks off a sequence of signaling
    this.onnegotiationneeded = async () => {
      try {
        this.#makingOffer = true;
        await this.setLocalDescription();
        this.dispatchEvent(new CustomEvent('signal', {detail: {description: this.localDescription}}))
      } catch (err) {
      } finally {
        this.#makingOffer = false;
      }
    };

    // Never give up, never surrender
    this.oniceconnectionstatechange = () => {
      if (this.iceConnectionState === "failed") {
        this.restartIce();
      }
    };

    // Send ICE candidates to the remote peer as they are generated
    this.onicecandidate = async ({ candidate }) =>
        this.dispatchEvent(new CustomEvent('signal', {detail: {candidate}}));

    // Negotiaion doesn't occur until a channel of some kind is created.
    // By declaring a channel here, we can ensure that negotiation begins
    //
    // We make it negotiated so that there's no network overhead to esstablishing it.
    this.createDataChannel("force", { negotiated: true, id: 1 });
  }

  /** Inform the peer of incoming signal data */
  async signal({ description, candidate }: Signal) {
    if (description) {
      const offerCollision =
        description.type === "offer" &&
        (this.#makingOffer || this.signalingState !== "stable");

      this.#ignoreOffer = !this.#polite && offerCollision;
      if (this.#ignoreOffer) {
        return;
      }
      await this.setRemoteDescription(description);
      if (description.type === "offer") {
        await this.setLocalDescription();
        this.dispatchEvent(new CustomEvent('signal', {detail: {description: this.localDescription}}))
      }
    } else if (candidate) {
      await this.addIceCandidate(candidate).catch((err) => {
        if (!this.#ignoreOffer) throw err;
      });
    }
  }

  async connected() {
    const pred = () => this.connectionState === "connected";
    pred() || (await waitUntil(this, "connectionstatechange", pred));
  }
}

export type Signal = {
  description?: RTCSessionDescription | null;
  /** An Ice candidate (populated after an initial offer and an answer)  */
  candidate?: RTCIceCandidate | null;
  /** Indicates a graceful shutdown */
  shutdown?: true;
};
