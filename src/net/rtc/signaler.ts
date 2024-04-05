import type { NetworkStream } from "../network-stream";
import type { PeerId } from "./peer";
import type { AddressableSignal } from "./protocol";

export interface Signaler extends NetworkStream<AddressableSignal>{
    id: PeerId,
};

