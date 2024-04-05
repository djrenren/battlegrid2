import { inject, expect, it, describe } from "vitest";
import { peerjs } from "./peerjs";
import { timeout } from "../../../util/promise";
import { spec } from "../signaler.test.ts";

describe("PeerJS Signaler", () => {
    const url = inject("peerjs-url");
    const peerJStimeout = inject("peerjs-timeout");
    const gen = () => peerjs(url, {timeout: peerJStimeout});

    spec(gen);

    it("should send enough heartbeats to stay connected", {timeout: peerJStimeout * 3}, async () => {
        let signaler = gen();
        await expect(timeout(signaler.closed, peerJStimeout * 1.5)).rejects.toBe("Timeout");
        signaler.close("Test complete");
    });

    it("should resist heartbeat timeouts", {timeout: peerJStimeout * 3}, async () => {
        let signaler = gen();
        await expect(timeout(signaler.closed, peerJStimeout * 1.5)).rejects.toBe("Timeout").finally(() => signaler.close());
    });

    it("should heartbeat timeout if configured improperly", {timeout: peerJStimeout * 3}, async () => {
        let signaler = peerjs(url, {timeout: peerJStimeout * 3});
        await expect(timeout(signaler.closed, peerJStimeout * 1.5)).resolves
    });
});