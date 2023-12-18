/**
 * This test ensures the our signaling procedure works independent of
 * the signaling server  (and whatever protocol that server enforces)
 */

import { uuidv4 } from "lib0/random.js";
import { waitUntil } from "../util/events.ts";
import { Peer, PeerId, fresh_peer_id } from "./peer.ts";
import {
  AddressableSignal,
  AddressableSignalHandler,
  Signaler,
} from "./signaler.ts";
import { YSignaler } from "./y-signaler.ts";

describe("Signaler", () => {
  it("should be able to form a stable connection", async () => {
    // BEGIN: A small local impl of a signaling server
    const clients: Map<PeerId, Signaler> = new Map();

    const onsignal = (s: AddressableSignal) => {
      if (s.to) {
        clients.get(s.to)?.signal(s);
      } else {
        clients.forEach((c) => c.signal(s));
      }
    };

    const new_client = () => {
      const id = fresh_peer_id();
      const client = new Signaler(id, onsignal);
      clients.set(id, client);
      return client;
    };
    // END: A small local impl of a signaling server

    // Create two clients. 
    let a = new_client();
    a.announce(); // Should do nothing

    let b = new_client();
    b.announce(); // Should provoke a into connecting

    // Collect the first peer that b connects to
    let peer: Peer = await new Promise((resolve) => {
      b.once("peer", resolve);
    });

    // The peer should be able to connect
    await waitUntil(
      peer,
      "connectionstatechange",
      () => peer.connectionState === "connected",
    );
  });
});

describe("YSignaler", () => {
  it("Should be able to form a stable connection", async () => {
    const topic = uuidv4();
    const server = "ws://localhost:4444"
    let a = new YSignaler(fresh_peer_id(), server, topic);
    let b = new YSignaler(fresh_peer_id(), server, topic);

    let peer: Peer = await new Promise((resolve) => {
      b.signaler.once("peer", resolve);
    });

    // The peer should be able to connect
    await waitUntil(
      peer,
      "connectionstatechange",
      () => peer.connectionState === "connected",
    );
  }).timeout(10000)
});
