import "./ui/canvas.ts";

document.body.addEventListener(
  "wheel",
  (ev) => {
    if (ev.ctrlKey) ev.preventDefault();
  },
  { passive: false }
);