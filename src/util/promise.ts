export function wait (ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}

/** Add a timeout to a promise, returning a promise that throws on timeout*/
export function timeout<T>(p: Promise<T>, ms: number): Promise<T> { 
    return Promise.race([p, wait(ms).then(() => { throw "Timeout" })]);
}