/**
 * Network stream abstracts over any kind of network transport (Websocket, RTC datachannel, WebTransport, etc.)
 */
export interface NetworkStream<T> extends ReadableWritablePair<T, T>, Connection { }

/**
 * Connection provides a uniform interface for managing network connections.
 * 
 * It purposefully does not include information about *how* the connection was closed.
 */
export interface Connection {
    /**
     * Resolves when the connections closes
     */
    closed: Promise<void>

    /**
     * Resolves when the connection successfully opens. Rejects if it closes first
     */
    ready: Promise<void> 

    /**
     * Initiates a closing of the connection
     */
    close(): void
}

/**
 * Entwines a {@link `Connection`} and a `ReadableWritablePair`
 * @param conn The connection object
 * @param streams The streams to entwine
 * @returns A network stream
 */
export const networkStream = <T>(conn: Connection, streams: ReadableWritablePair<T>): NetworkStream<T> => {
    // A small wrapper around the provided close function to make it idempotent
    let closed = false;
    const close = () => !closed && (closed = true) && conn.close();

    // Use a transform stream to detect when the stream closes
    const {writable: piper1, readable} = new TransformStream({
        async start(controller) {
            conn.closed.finally(() => controller.terminate());
            await conn.ready;
        },
    });


    // Use a transform stream to detect when the stream closes, and guard against early writes
    const {writable, readable: piper} = new TransformStream({
        async start(controller) {
            conn.closed.finally(() => controller.terminate());
            await conn.ready;
        }
    });
    const writableClosed = piper.pipeTo(streams.writable).catch(() => {});
    const readableClosed = streams.readable.pipeTo(piper1).catch(() => {});

    // When both streams are closed, we close the connection
    Promise.all([readableClosed, writableClosed]).finally(() => {
        console.log('closed');
        close()
    });


    return {...conn, readable, writable}
}

export const mockConn = (): Connection => {
    const {promise: closed, resolve: close} = Promise.withResolvers<void>();
    return {
        ready: new Promise<void>(resolve => setTimeout(resolve, 50)),
        closed,
        close
    }
}


// /**
//  * Entwines a {@link `Connection`} and a `ReadableWritablePair`
//  * 
//  * The cancelation logic is a little tricky so it's useful to isolate this from
//  * the specific concerns of a single transport.
//  * 
//  * @param conn The connection description
//  * @param streams The streams which share a lifecycle with the connection
//  * @param abort An optional abort signal
//  * @returns A `NetworkStream`
//  */
// export const networkStream2 = <T, Reason = any>(conn: Connection<Reason>, streams: ReadableWritablePair<T>, abort?: AbortSignal): NetworkStream<T, Reason> => {
//     // Rig up the abort handler
//     abort?.addEventListener('abort', () => conn.close(abort!.reason), {once: true});

//     // We'll use `reason` to track whether or not the connection has been closed
//     // (and of course the reason it was closed). It's difficult to know what order
//     // anything will run in, so by tracking it here, we can ensure that at least
//     // within our local logic, we never double-close the connection
//     let reason: Reason | undefined | null = null;
    
//     // Wrap the provided close function with one that tracks `reason`.
//     // We will now exclusively use this `close` throughout the rest of the function
//     const close = (r?: Reason) => {
//         if (reason === null) {
//             reason = r;
//         }
//         // We could prevent double-closing here, but it's better the consumer
//         // know that they're doing it
//         conn.close(reason)
//     }

//     // If the close occurs due to some external factor (as opposed to a stream cancel/error/abort),
//     // then we still record the reason
//     conn.closed.then(r => reason = r).catch(r => reason = r);

//     return {
//         // Conn is fine as is
//         ...conn,

//         // Now we wrap the streams to enforce our closing behaviors
//         readable: streams.readable.pipeThrough(new TransformStream({
//             start(controller) {
//                 // If the connection closes gracefully, we shut down gracefully
//                 conn.closed.then(() => controller.terminate()).catch(() => { });

//                 // If the connection closes uncleanly, we shut down uncleanly 
//                 conn.closed.catch((...args) => controller.error(...args)).catch(() => { });
//             },
//             // When the transform stream shutsdown
//             flush() {
//                 if (reason !== null) {
//                     close() // This could result in dropped messages, 
//                 }
//             }
//         })),
//         writable: pipeFrom<T, T>(streams.writable, new TransformStream<T, T>({
//             async start() {
//                 await conn.ready
//             },
//             async transform(msg, controller) {
//                 if (reason !== null) {
//                     throw reason
//                 }
//                 controller.enqueue(msg);
//             },
//             flush() {
//                 if (reason !== null) {
//                     close()
//                 }
//             }
//         }))
//     }
// }