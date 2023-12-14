import { CSSResultGroup, LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { common_dividers, gcd } from "../util/math";
import { Doc } from "yjs";
import "./canvas";
import { Scene, default_scene } from "../game/scene";
import { WebrtcProvider } from "y-webrtc";
import { Game, add_scene, new_game } from "../game/game";
import { LocalSession, RemoteSession, Session } from "../game/session";

@customElement("bg-app")
class BGApp extends LitElement {
  session: Session;

  constructor() {
    super();

    const urlParams = new URLSearchParams(window.location.search);
    const game = urlParams.get("game")!;
    if (game) {
      this.session = new RemoteSession(game, new_game(), {
        signaling: ["ws://localhost:4444"],
        peerOpts: {
          initiator: true,
          config: {
            // iceServers: [
            //   "stun.l.google.com:19302",
            //   "stun1.l.google.com:19302",
            //   "stun2.l.google.com:19302",
            //   "stun3.l.google.com:19302",
            //   "stun4.l.google.com:19302",
            // ].map((urls) => ({ urls })),
          },
        },
      });
      this.session.on("peers", (p: any) => {
        console.log("PEER", p);
        this.requestUpdate();
      });
      this.session.on("synced", () => {
        console.log("SYNCED!"), this.requestUpdate();
      });
      this.session.awareness.setLocalStateField("boo", "bah");
      this.session.awareness.on("update", () => {
        console.log();
        this.requestUpdate();
      });
      this.session.awareness.on("synced", () => {
        console.log("AWARENESS synced");
        this.requestUpdate();
      });
    } else {
      this.session = new LocalSession(new_game());
      let scene = default_scene();
      add_scene(this.session.game, scene);
      this.session.scene_id = scene.guid;
    }
  }

  #host_button = () =>
    this.session.is_local
      ? html`<button @click=${this.#go_online}>Go Online</button>`
      : html`<div>
          ${JSON.stringify(this.session.awareness.states)}
          ${this.session.connected}
        </div>`;

  #go_online() {
    if (!this.session.is_local) return;
    let scene = this.session.scene_id;
    this.session = new RemoteSession(
      this.session.game.guid,
      this.session.game,
      { awareness: this.session.awareness },
    );
    this.session.scene_id = scene;
    history.pushState(null, "", `/?game=${this.session.roomName}`);
    this.session.on("peers", () => this.requestUpdate());
    this.requestUpdate();
  }

  render() {
    return html`
      <bg-canvas .map=${this.session.scene?.getMap("map")}></bg-canvas>
      <div id="toolbar">${this.#host_button()}</div>
    `;
  }

  static styles = css`
    :host,
    bg-canvas {
      overflow: none;
      width: 100vw;
      height: 100vh;
    }
    #toolbar {
      backdrop-filter: blur(10px);
      position: absolute;
      border-radius: 10px;
      top: 2px;
      left: 2px;
      display: inline flex;
      flex-direction: row;
      align-items: center;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      fill: white;
      & svg {
        margin: 10px;
      }
    }
    .bubble {
      background: rgba(0, 0, 0, 1);
      align-self: stretch;
      display: inline-block;
      padding: 0;
      margin: 2px 5px;
      margin-right: 2px;
      color: white;
      border: none;
      border-radius: 0 10px 10px 0;
      padding: 0 0.25em;
      max-width: fit-content;
      width: 5em;
    }
  `;
}
