import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { stop_ev } from "../util/events";

@customElement("grid-lines")
export class GridLines extends LitElement {
  @property({ type: Number })
  dim: number = 30;

  @property({ type: Number })
  offsetx: number = 0;
  offsety: number = 0;

  render = () => html`
    <style>
      ${css`
        :host {
          background-position: ${this.offsetx}px ${this.offsety}px;
          background-size: ${this.dim}px ${this.dim}px;
          background-image: linear-gradient(to right, grey 1px, transparent 1px),
            linear-gradient(to bottom, grey 1px, transparent 1px);
        }`}

        :host:active {
          cursor: pointer;
        }

        :host::before {
          position: absolute;
          width: ${this.dim / 5 + "px"};
          aspect-ratio: 1;
          border-radius: 100%;
          background: white;
          mix-blend-mode: difference;
          content: "";
          top: ${this.offsety - this.dim / 10 + "px"}
          left: ${this.offsetx - this.dim / 10 + "px"};
        }
    </style>
  `;

  #wheel = (ev: WheelEvent) => {
    if (ev.shiftKey && !ev.altKey) {
      stop_ev(ev);
      this.offsetx = this.offsetx + Math.sign(ev.deltaX);
      this.offsety = this.offsety + Math.sign(ev.deltaY);
    }

    if (!ev.shiftKey && ev.altKey) {
      stop_ev(ev);
      this.dim += Math.sign(ev.deltaY);
    }
  };

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("wheel", this.#wheel);
    this.addEventListener("pointerdown", this.#pointerdown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("wheel", this.#wheel);
  }

  #pointerdown(ev: PointerEvent) {
    stop_ev(ev);
  }

  static styles = [];
}
