import { expect, test } from "vitest";
import { FileRequest, serve_files, type FileChunk, type FileClient, type FileName, type FileUpload } from "./files"
import { accumulate, oneshot } from "../util/streams";
import { uuidv4 } from "lib0/random.js";
import { timeout } from "../util/promise";

test("file serving", async () => {
    let fs = createServer();
    serve_files(fs, persistence());

    // Upload the first file
    let c1 = createClient();
    fs.connectClient(c1);
    let writer = c1.upload("test.txt" as FileName).getWriter();
    const contents = "Hello World";
    await writer.write(new TextEncoder().encode(contents));
    await writer.close();

    let c2 = createClient();
    fs.connectClient(c2);
    let file = await accumulate("", (acc, val) => acc + new TextDecoder().decode(val), c2.request("test.txt" as FileName));
    expect(file).toBe(contents);
});

test("contentious reads", async () => {
    let fs = createServer();
    serve_files(fs, persistence());

    // Begin uploading
    let c1 = createClient();
    fs.connectClient(c1);
    let writer = c1.upload("test.txt" as FileName).getWriter();

    let c2 = createClient();
    fs.connectClient(c2);
    let response = c2.request("test.txt" as FileName).getReader();
    let read = response.read();
    await expect(timeout(read,1000)).rejects.toBe("Timeout");

    const contents = "Hello World";
    await writer.write(new TextEncoder().encode(contents));
    await writer.close();
    await expect(read).resolves.toEqual({value: new TextEncoder().encode(contents), done: false});
});

const persistence = () => {
    let data = new Map<FileName, string>();
    let lockprefix = uuidv4();
    return {
        data,
        load(name: FileName) {
            console.log("begin loading");
            return navigator.locks.request(`${lockprefix}${name}`, {mode: 'shared'}, async () => {
                let contents = data.get(name)
                if (contents === undefined) {
                    return Promise.reject(new Error("File not found"));
                }

                console.log("loading");
                return oneshot(new TextEncoder().encode(contents));
            });
        },
        store(name: FileName) {
            let {writable, readable} = new TransformStream<FileChunk>();
            let {promise, resolve} = Promise.withResolvers<WritableStream<FileChunk>>();
            navigator.locks.request(`${lockprefix}${name}`, {mode: 'exclusive'}, async () => {
                resolve(writable)
                let decode = new TextDecoder();
                console.log("accumulating");
                await accumulate("", (acc, val) => acc + decode.decode(val), readable).then(contents => data.set(name, contents));
                console.log("done accumulating");
            });
            return promise
        },

        delete(name: FileName) {
            return navigator.locks.request(`${lockprefix}${name}`, {mode: 'exclusive'}, async () => {
                if (!data.delete(name)) {
                    return Promise.reject(new Error("File not found"));
                }
            });
        }
    }
}

const createClient = () => {
    let { readable: requests, writable: requestsWritable } = new TransformStream<FileRequest>();
    let { readable: uploads, writable: uploadsWritable } = new TransformStream<FileUpload>();
    let rw = requestsWritable.getWriter();
    let uw = uploadsWritable.getWriter();

    return {
        requests, uploads,
        request(name: FileName): ReadableStream<FileChunk> {
            let {readable, writable: response} = new TransformStream<FileChunk>();
            rw.write({name, response});
            return readable;
        },
        upload(name: FileName): WritableStream<FileChunk> {
            let {readable: data, writable} = new TransformStream<FileChunk>();
            uw.write({name, data});
            return writable;
        }
    }
}


const createServer = () => {
    let { readable: clients, writable } = new TransformStream<FileClient>();
    let { promise: closed, resolve, reject } = Promise.withResolvers<unknown>();
    let cw = writable.getWriter();

    closed.then(() => cw.close()).catch(e => cw.abort(e));

    return {
        closed,
        clients,
        resolve,
        reject,
        connectClient(c: FileClient) {
            cw.write(c);
        }
    }
}

const upload = (name: string, data: string): FileUpload => ({
    name,
    data: new ReadableStream({
        start(controller) {
            controller.enqueue(new TextEncoder().encode(data))
        }
    })
});
