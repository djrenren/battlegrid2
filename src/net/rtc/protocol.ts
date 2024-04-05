/**
 * This module implements the client-server protocol for WebRTC
 * abstractly over any possible signaler. This allows us to:
 * 
 * 1. Test the negotiation protocol independently of a signaling server
 * 2. Support multiple different signaling servers (even if the have a different
 *    wire protocol)
 */
import { sink } from "../../util/streams";
import { Peer, type PeerId, type Signal } from "./peer";
import type { Signaler } from "./signaler";

/**
 * An extension of signal that is routeable. It's up to the signaling protocol to
 * handle this information
 */
export interface AddressableSignal extends Signal {
  /**
   * The peer who originated the message. We trust the client to be honest with this value
   * so that the signaling protocol can be used without smart routing on the server.
   */
    from: PeerId,

    /** The peer the message is going to */
    to: PeerId,
}



/**
 * Create a client using a signaler
 * 
 * @param server The id of the server you wish to connect to
 * @param s The signaler you wish to use to connec
 * @return A 
 */
export const client = (server: PeerId, s: Signaler): Peer => {
  const peer = new Peer(true);
  const writer = s.writable.getWriter();
  peer.addEventListener('signal', ({detail}) => {
    writer.write({
        to: server,
        from: s.id,
        ...detail
    })
  });


  s.readable.pipeTo(new WritableStream({
    async write(msg) {
        await peer.signal(msg);
    }
  }));

  return peer
}

/**
 * Create a server using a signaler
 * @param s The underlying signaler
 * @returns A server
 */
export function server(s: Signaler): ReadableStream<Peer>{
    const writer = s.writable.getWriter();
    const peers = new Map<PeerId, Peer>();

    function setupPeer(to: PeerId): Peer {
        const peer = new Peer(false);
        const forwardSignal = ({detail}: CustomEvent<Signal>) => writer.write({
            to,
            from: s.id,
            ...detail
        });

        peer.addEventListener('signal', forwardSignal);
        peer.addEventListener('close', () => {
            peer.removeEventListener('signal', forwardSignal);
            peers.delete(to);
        }, {once: true});

        peers.set(to, peer);
        return peer;
    }

    return new ReadableStream({
        start(controller) {
            s.readable.pipeTo(sink(async msg => {
                let peer = peers.get(msg.from);
                if (!peer) {
                    peer = setupPeer(msg.from);
                    controller.enqueue(peer);
                }
                await peer.signal(msg);
            }));
        }
    })
}
