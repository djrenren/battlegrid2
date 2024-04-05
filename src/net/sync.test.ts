import {expect, test} from 'vitest';
import { bridge } from '../util/streams';
import { Doc } from 'yjs';
import { sync, type SyncTransport } from './sync';
import type { PeerId } from './rtc/peer';
import { mockConn, networkStream } from './network-stream';

test("yjs doc sync", async () => {
    let [a, b] = fakeTransport();
    let aDoc = new Doc();
    let bDoc = new Doc();

    const a_closed = sync(a, aDoc);
    const b_closed = sync(b, bDoc);

    aDoc.getText('test').insert(0, "hi");

    await new Promise(resolve => bDoc.on('update', resolve));
    expect(bDoc.getText('test').toString()).toBe("hi");

    a.close();
    await a_closed;
    await b_closed;
})


const fakeTransport = (): SyncTransport[] => {
    let ts1 = new TransformStream<Uint8Array>();
    let ts2 = new TransformStream<Uint8Array>();

    return [
        {
            peerId: '1' as PeerId,
            ...networkStream(mockConn(), {
                readable: ts1.readable,
                writable: ts2.writable
            })
        },
        {
            peerId: '2' as PeerId,
            ...networkStream(mockConn(), {
                readable: ts2.readable,
                writable: ts1.writable
            })
        },

    ]
}