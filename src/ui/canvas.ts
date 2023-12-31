import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { common_dividers, gcd } from "../util/math";
import type { Map } from "../game/scene.ts";

import "./ppz.ts";
import "./grid.ts";
import { GridLines } from "./grid.ts";
import { type TypedMap } from "../util/yjs.ts";

@customElement("bg-canvas")
export class Canvas extends LitElement {
  @property({ attribute: false })
  map?: TypedMap<Map>;

  @query("grid-lines")
  gl!: GridLines;

  render() {
    return html`
      <p-p-z>
        <div id="padder">
          <div id="board">
            <img
              alt="chill"
              src=${this.map?.get("background") as string}
              @load=${this.img_loaded}
            />
            <grid-lines></grid-lines>
          </div>
        </div>
      </p-p-z>
    `;
  }

  img_loaded = (ev: Event) => {
    return;
    let img = ev.target as HTMLImageElement;

    console.log("Dimensions", img.naturalWidth, img.naturalHeight);
    console.log(
      "Dividers",
      common_dividers(img.naturalWidth, img.naturalHeight),
    );
    let min = Infinity;
    let min_diff = Infinity;
    for (let d of common_dividers(img.naturalWidth, img.naturalHeight)) {
      let diff = Math.abs(70 - d);
      if (diff < min_diff) {
        min = d;
        min_diff = diff;
      }
    }

    this.gl.dim = min;
  };

  static styles = css`
    p-p-z {
      width: 100%;
      height: 100%;
      background: #e0e0e0;
    }

    #board,
    #padder {
      width: fit-content;
      height: fit-content;
      box-sizing: border-box;
    }

    div {
      position: relative;
    }

    #padder {
      padding: 100px;
    }

    #board {
      box-sizing: border-box;
      border-radius: 24px;
      overflow: hidden;
    }

    grid-lines {
      image-rendering: pixelated;
      position: absolute;
      inset: 0;
    }

    img {
      display: block;
      width: fit-content;
      height: fit-content;
      min-width: 1px;
      min-height: 1px;
    }
  `;
}
