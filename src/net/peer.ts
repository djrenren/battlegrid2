import { uuidv4 } from "lib0/random.js";
import { NominalString } from "../util/typing.ts";
import { WithEvents } from "../util/events.ts";

export type PeerId = NominalString<"PeerId">;
export const fresh_peer_id = () => uuidv4() as PeerId;
export type SignalHandler = (signal: Signal) => void;

/** An extension of the native RTCPeerConnection that implements perfect signaling */
export class Peer extends WithEvents<RTCPeerConnectionEventMap, RTCPeerConnection>(RTCPeerConnection) {
  /** Runs when any new signaling information needs to be sent */
  #emit_signal: SignalHandler;

  /** Tracks whether we are actively generating an offer.
   * Protects against cases where a signal is received concurrently) */
  #makingOffer = false;

  /** Whether or not we should ignore incoming offers */
  #ignoreOffer = false;

  /**
   * Every paring of RTCPeers has a polite and impolite peer.  It's the
   * responsibility of the signaling protocol to ensure this invariant.  This
   * allows us to resolve collisions when both peers make an initial offer to each
   * other. (the polite one starts over) */
  #polite: boolean;

  constructor(
    remote_id: PeerId,
    emit_signal: SignalHandler,
    polite = false,
    conf: RTCConfiguration,
  ) {
    super(conf);
    this.#emit_signal = emit_signal;

    this.#polite = polite;

    // Kicks off a sequence of signaling
    this.onnegotiationneeded = async () => {
      try {
        this.#makingOffer = true;
        await this.setLocalDescription();
        emit_signal({ description: this.localDescription });
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
    this.onicecandidate = ({ candidate }) => emit_signal({ candidate });

    // Negotiaion doesn't occur until a channel of some kind is created.
    // By declaring a channel here, we can ensure that negotiation begins
    //
    // We make it negotiated so that there's no network overhead to esstablishing it.
    this.createDataChannel("force", { negotiated: true, id: 0 });
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
        this.#emit_signal({ description: this.localDescription });
      }
    } else if (candidate) {
      await this.addIceCandidate(candidate).catch((err) => {
        if (!this.#ignoreOffer) throw err;
      });
    }
  }

  async connected() {

  }
}

export type Signal = {
  description?: RTCSessionDescription | null;
  candidate?: RTCIceCandidate | null;
};
