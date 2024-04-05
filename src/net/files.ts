import type { TypedEventTarget } from "../util/events";
import { sink } from "../util/streams";
import type { NominalString } from "../util/typing";

export type FileChunk = ArrayBuffer;
export type FileName = NominalString<"FileName">;

export interface FileClient {
    requests: ReadableStream<FileRequest>,
    uploads: ReadableStream<FileUpload>,
}

export interface FileRequest {
    name: FileName,
    response: WritableStream<FileChunk>
}

export interface FileUpload {
    name: string,
    data: ReadableStream<FileChunk>
}

export interface FileServer {
    closed: Promise<unknown>;
    clients: ReadableStream<FileClient>;
}

export interface Persistence {
    load(name: FileName): Promise<ReadableStream<FileChunk>>;
    store(name: string): Promise<WritableStream<FileChunk>>;
    delete(name: string): Promise<void>;
}

export const serve_files = (fs: FileServer, p: Persistence): Promise<unknown> => {
    const pending = new Map<string, Promise<unknown>>();

    // Create a sink that handles requests one-by-one
    // By returning `pipeTo` as our promise, we ensure that the FileServer only
    // ever handles one request from the client at a time.
    const reqHandler = () => sink((msg: FileRequest) => 
        // Attempt to load the file from storage
        p.load(msg.name)
        // If that succeeds, we can pass it along to the client
        // We return the `pipeTo` promise to ensure we handle one request from the client at a time
        .then(s => s.pipeTo(msg.response))
        // If an error occurs either in the fetching or during the response we'll attempt to abort the stream
        .catch(e => msg.response.abort(e))
        // Even the aborting can fail. (If the stream is already aborted)
        // so we just log in that case
        .catch(console.error.bind(console)));

    // Create a sink that handles uploads one-by-one
    // By returing the `pipeTo` as our promise, we can ensure that only one upload is processed at a time.
    const uploadHandler = () => sink((msg: FileUpload) => 
        // Attempt to create a writable file of the given name
        p.store(msg.name)
        // If that succeeds, pump the client's data into it.
        // Returning the pipeTo promise ensures the sink only handles one upload
        // at time.
        .then(ws => msg.data.pipeTo(ws).catch(e => {
            // If the upload fails while in progress, we should delete the created file
            p.delete(msg.name)
                // If the delete fails, there's not much we can do, so we log it
                .catch(e => console.log('Error deleting file', e));
        }))
        // We have to catch the errors caused by loading. If we don't,
        // subsequent uploads would fail unnecessarily
        .catch(e => msg.data.cancel(e))
        .catch(console.error.bind(console)));

    // Configure incoming clients
    fs.clients.pipeTo(sink(client => {
        client.requests.pipeTo(reqHandler())
        client.uploads.pipeTo(uploadHandler())
    }));

    return fs.closed;
}
