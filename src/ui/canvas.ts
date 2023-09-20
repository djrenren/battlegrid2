import { LitElement, css, html } from "lit";
import { customElement, query } from "lit/decorators.js";
import { common_dividers, gcd } from "../util/math";

import "./ppz.ts";
import "./grid.ts";
import { GridLines } from "./grid.ts";

@customElement("bg-canvas")
export class Canvas extends LitElement {
    @query("grid-lines")
    gl!: GridLines;
  render() {
    return html`
      <p-p-z>
        <div id="board">
            <div id="padder">
                <img alt="chill" src="img/map3.webp" @load=${this.img_loaded}/>
                <grid-lines></grid-lines>
            </div>
        </div>
      </p-p-z>
    `;
  }

  img_loaded = (ev: Event) => {
    let img = ev.target as HTMLImageElement;

    console.log("Dimensions", img.naturalWidth, img.naturalHeight)
    console.log("Dividers", common_dividers(img.naturalWidth, img.naturalHeight))
    let min = Infinity;
    for (let d of common_dividers(img.naturalWidth, img.naturalHeight)) {
        if (Math.abs(70- d) < Math.abs(min)) {
            min = d
        }
    }

    this.gl.dim = min;
  }

  static styles = css`
    :host {
        overflow: none;
        display: block;
      width: 100vw;
      height: 100vh;
    }
    p-p-z {
        width: 100%;
        height: 100%;
        background: #e0e0e0;
    }

    #board, #padder {
        width: fit-content;
        height: fit-content;
    }

    div {
        position: relative;
    }

    #board {
        padding: 5%;
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
      border-radius: 24px;
    }
  `;
}
