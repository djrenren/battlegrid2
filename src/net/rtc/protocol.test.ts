import { uuidv4 } from "lib0/random.js";
import { it, test } from "vitest";
import { client, server } from "./protocol";
import type { PeerId } from "./peer";
import { reference } from "./signaler.ref.ts";

/**
 * Test the RTC Client-server signaling in the absence of a signaler
 */
it("Should facilitate a connection", async () => {
    const gen = reference();

    const s1 = gen();
    const s2 = gen();

    const s = server(s1);
    const clientToServer = client(s1.id, s2);
    // Ensure the client connects
    await clientToServer.connected();

    // Ensure the server generates a peer that connects
    let serverToClient = (await s.getReader().read()).value!;
    await serverToClient.connected();

    // Cleanup
    clientToServer.close();
    serverToClient.close();
})