/// <reference lib="WebWorker" />

import { ASSET_DIR, Path, read } from "./src/fs/fs";

declare var self: ServiceWorkerGlobalScope;

const scope = self.registration.scope;
const ASSET_BASE = scope + ASSET_DIR + "/";

// This code executes in its own worker or thread
self.addEventListener("install", (event) => {
  console.log("Service worker installed");
  console.log("Scope: ", scope);
});
self.addEventListener("activate", (event) => {
  console.log("Service worker activated");
});

self.addEventListener("fetch", (event) => {
  // Get the relative path of the asset
  const path = asset_path(event.request);
  if (path === undefined) return;

  event.respondWith(handleFetch(path));
});

function asset_path(r: Request): Path | undefined {
  if (r.url.startsWith(ASSET_BASE)) {
    return r.url.substring(ASSET_BASE.length).split("/") as Path;
  }
}

async function handleFetch(path: Path): Promise<Response> {
  // Lookup the asset in the filesystem
  const file = await read(path);
  console.log("FOUND FILE: ", file);
  if (file === undefined) return Response.error();
  return new Response(file, {
    headers: {
      "Content-Type": "image/webp",
    },
  });
}
