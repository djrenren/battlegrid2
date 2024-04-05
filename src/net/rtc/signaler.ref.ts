/**
 * This module describes a reference implementation for a signaler
 */
import { uuidv4 } from "lib0/random.js";
import { WithEvents, dispatch_custom } from "../../util/events";
import type { AddressableSignal } from "./protocol";
import type { PeerId } from "./peer";
import type { NetworkStream } from "../network-stream";
import type { Signaler } from "./signaler";

/**
 * @returns A function that creates signalers
 */
export const reference = () => {
    const broadcast = new (WithEvents<{'signal': CustomEvent<AddressableSignal>}>()(EventTarget));

    return (): Signaler => {
        const {promise: closed, resolve: close } = Promise.withResolvers<void>();
        const id = uuidv4() as PeerId;
        return {
            id,
            closed,
            close,
            ready: Promise.resolve(),
            readable: new ReadableStream<AddressableSignal>({
                start(controller) {
                    broadcast.addEventListener('signal', ({detail}) => {
                        if(detail.to === id) {
                            controller.enqueue(detail);
                        }
                    });
                },
            }),
            writable: new WritableStream<AddressableSignal>({
                write(chunk) {
                    dispatch_custom(broadcast, 'signal', chunk)
                }
            })
        } as const
    }
}