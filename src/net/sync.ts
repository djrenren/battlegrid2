import { applyUpdate, encodeStateAsUpdate, type Doc } from 'yjs';
import type { PeerId } from './rtc/peer';
import type { NetworkStream } from './network-stream';


/** A `SyncTransport` conveys Yjs syncing information back and forth */
export interface SyncTransport extends NetworkStream<Uint8Array> {
    /** The id for the local end of the transport */
    peerId: PeerId
}

/**
 * Keeps a doc in sync with another peer over a transport
 * @param st The sync transport
 * @param d The doc to keep in sync
 * @returns A promise that resolves when the connection is closed
 */
export const sync = (st: SyncTransport, d: Doc): Promise<any> => {
    const reader = st.readable.getReader();
    const writer = st.writable.getWriter();

    writer.write(encodeStateAsUpdate(d));
    const updateSerializer = writer.write.bind(writer);

    d.on('update', updateSerializer);
    st.closed.catch(() => {}).finally(() => d.off('update', updateSerializer));

    reader.releaseLock();
    st.readable.pipeTo(new WritableStream({
        write(msg) {
            applyUpdate(d, msg, st.peerId);
        }
    })).catch(() => {});

    return st.closed
}
