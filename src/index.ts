import { ASSET_DIR, GameFile, write } from "./fs/fs.ts";
import "./ui/app.ts";
document.body.addEventListener(
  "wheel",
  (ev) => {
    if (ev.ctrlKey) ev.preventDefault();
  },
  { passive: false },
);

(async () => {
  console.log("registering");
  let reg = await navigator.serviceWorker.register("/sw.js", {
    type: "module",
  });
  await reg.update();

  let path = "my_image.webp" as GameFile;

  await (await fetch("/img/map2.webp")).body?.pipeTo(await write([path]));

  console.log(await fetch(`/${ASSET_DIR}/${path}`));
})();
localStorage.log = "^y.*";
