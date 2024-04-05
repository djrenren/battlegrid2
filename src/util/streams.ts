export const json_decode = <T>() => new TransformStream<string, T>({
    transform: (msg, controller) => controller.enqueue(JSON.parse(msg))
});

export const json_encode = <T>() => new TransformStream<T, string>({
    transform: (data, controller) => controller.enqueue(JSON.stringify(data))
});

/**
 * Allows prepending a transform function to a writable stream
 * @param w The writable stream
 * @param t The transform stream
 * @returns A writable stream
 */
export const premap = <I, O>(w: WritableStream<O>, t: (i: I) => O): WritableStream<I> =>
    pipeFrom(w, new TransformStream<I, O>({
        transform: (i, controller) => controller.enqueue(t(i))
    }))

/**
 * Prepends a transform stream to a writable stream
 * @param w The writable stream
 * @param t The transform stream
 * @returns A writable stream
 */
export const pipeFrom = <I, O>(w: WritableStream<O>, t: TransformStream<I, O>): WritableStream<I> => {
    t.readable.pipeTo(w).catch(() => {});
    return t.writable;
};

export const sink = <T>(write: (msg: T) => Promise<any> | any) => new WritableStream<T>({write});


export const bridge = <T>(): [ReadableWritablePair<T>, ReadableWritablePair<T>] => {
    let ts1 = new TransformStream();
    let ts2 = new TransformStream();
    return [{
        readable: ts1.readable,
        writable: ts2.writable
    }, {
        readable: ts2.readable,
        writable: ts1.writable
    }]
}

/**
 * Reduces a stream into a single value
 * @param base The initial value
 * @param acc An accumulator function
 * @param r The stream to reduce
 * @returns The accumulated value
 */
export const accumulate = <T, S>(base: T, acc: (acc: T, val: S) => T, r: ReadableStream<S>): Promise<T> =>
    r.pipeTo(sink(s => base = acc(base, s))).then(() => base);


/**
 * Creates a stream that emits a single value and then closes
 * @param value - The value to emit
 * @returns A readable stream
 */
export const oneshot = <T>(value: T): ReadableStream<T> => new ReadableStream({
    start(controller) {
        controller.enqueue(value);
        controller.close();
    }
});