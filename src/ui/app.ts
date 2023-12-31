import { CSSResultGroup, LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { common_dividers, gcd } from "../util/math";
import { Doc } from "yjs";
import "./canvas";
import { Scene, default_scene } from "../game/scene";
import { Game, add_scene, new_game } from "../game/game";
import { dispatch_custom } from "../util/events";
import "./toolbar";

console.log(Doc);
@customElement("bg-app")
class BGApp extends LitElement {
  constructor() {
    super();

    const urlParams = new URLSearchParams(window.location.search);
    const game = urlParams.get("game")!;
  }

  #host_button = () =>
    html`<button @click=${this.#go_online}>Go Online</button>`;

  #go_online() {
    this.requestUpdate();
  }

  render() {
    return html`
      <bg-canvas></bg-canvas>
      <tool-bar tool="select"></tool-bar>
    `;
  }

  static styles = css`
    :host,
    bg-canvas {
      overflow: none;
      width: 100vw;
      height: 100vh;
    }
    tool-bar {
      position: absolute;
      inset: 2px auto auto 2px;
    }
  `;
}
