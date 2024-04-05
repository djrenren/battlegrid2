import { uuidv4 } from "lib0/random.js";
import { client, server, type AddressableSignal } from "./protocol";
import type { Signaler } from "./signaler";
import { WithEvents, dispatch_custom } from "../../util/events";
import type { PeerId } from "./peer";
import { describe, it } from "vitest";
import { reference } from "./signaler.ref";

/**
 * A test suite for all implementations of signaler
 * @param gen A function which produces signalers
 */
export const spec = (gen: () => Signaler) => {
    it("should reliably communicate messages", async () => {
        const s1 = gen();
        const s2 = gen();

        await Promise.all([
            s1.ready,
            s2.ready
        ]);

        s1.writable.getWriter().write({to: s2.id, from: s1.id});
    });
}



describe('Reference Signaler', () => {
    spec(reference())
})