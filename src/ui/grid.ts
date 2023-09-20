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
        :host {
            background-position: ${this.offsetx}px ${this.offsety}px;
        background-size: ${this.dim}px ${this.dim}px;
        background-image:
        linear-gradient(to right, grey 1px, transparent 1px),
    linear-gradient(to bottom, grey 1px, transparent 1px);
        }
    </style>
  `;

  #wheel = (ev: WheelEvent) => {

    if (ev.shiftKey && !ev.altKey) {
        stop_ev(ev);
        this.offsetx = (this.offsetx + Math.sign(ev.deltaX)) % this.dim;
        this.offsety = (this.offsety + Math.sign(ev.deltaY)) % this.dim;
    }

    if (!ev.shiftKey && ev.altKey) {
        stop_ev(ev);
        this.dim += Math.sign(ev.deltaY);
    }

  }

  connectedCallback(): void {
    super.connectedCallback();
      this.addEventListener("wheel", this.#wheel);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
      this.removeEventListener("wheel", this.#wheel);
  }

  static styles = css`
  `;
}
