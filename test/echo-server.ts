import {WebSocketServer} from 'ws';

let wss: WebSocketServer | undefined;
export function setup({provide}: any) {
    wss = new WebSocketServer({ port: 8080 });

    wss.on('connection', function connection(ws) {
        ws.on('message', function message(data) {
            ws.send(data.toString());
        });
    });

    provide('wss-echo', "ws://localhost:8080");
}


export function teardown() {
    wss?.close();
}

declare module 'vitest' {
    export interface ProvidedContext {
      "wss-echo": string 
    }
  }