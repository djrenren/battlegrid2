import { PeerServer } from "peer";

let peer: ReturnType<typeof PeerServer>;
export function setup({provide}: any) {
    peer = PeerServer({
        port: 9000,
        path: "/",
        proxied: false,
        key: 'peerjs',
        alive_timeout: 1000,
    });
    peer.on('error', e => console.error("ERROR", e))
    
    provide('peerjs-url', "ws://localhost:9000/peerjs");
    provide('peerjs-timeout', 800);
}


export function teardown() {
}

declare module 'vitest' {
    export interface ProvidedContext {
      "peerjs-url": string 
      "peerjs-timeout": number 
    }
  }