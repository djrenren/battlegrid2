import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { WithEvents, dispatch, dispatch_custom } from "../util/events";

type Tool = "select" | "map";

@customElement("tool-bar")
export class Toolbar extends WithEvents<
  { tool: CustomEvent<Tool> },
  LitElement
>(LitElement) {
  @property({ type: String })
  tool: Tool = "select";

  render() {
    return html`
      <nav>
        <button>Host Game</button>
      </nav>
      <nav class="toolbox">
        <input
          type="radio"
          name="tool"
          value="select"
          id="select"
          @input=${this.#toolSelector}
          checked
        />

        <label for="select" title="Select">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            viewBox="0 0 100 125"
          >
            <g transform="translate(0,-952.36218)">
              <path
                d="m 33.63425,963.36216 c -2.87599,23.4228 -6.11008,47.88354 -8.63425,68.29574 5.69694,-3.1114 11.37303,-6.2607 17.05584,-9.3978 1.70017,6.3674 3.40023,12.7348 5.10045,19.1021 4.60314,-1.2376 9.4672,-2.5456 13.45071,-3.6168 -1.69745,-6.3573 -3.39493,-12.7146 -5.0924,-19.0719 6.49517,-0.098 12.99043,-0.1891 19.4854,-0.2989 C 60.68845,999.33176 45.95874,979.72976 33.63425,963.36216 z"
              />
            </g>
          </svg>
        </label>

        <input
          type="radio"
          name="tool"
          value="map"
          id="map"
          @input=${this.#toolSelector}
        />
        <label for="map" title="Map">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100">
            <path
              d="M67,20.68,50,14.21l-.14,0-.19,0h-.36l-.18,0-.15,0-18.49,6.3L14,14.21a1.5,1.5,0,0,0-2,1.4V59.19a1.5,1.5,0,0,0,1,1.4l17,6.47h0a1.41,1.41,0,0,0,1,0h0l18.49-6.3L66,67.07a1.5,1.5,0,0,0,2-1.4V22.08A1.5,1.5,0,0,0,67,20.68Zm-52-2.9,14,5.33V63.49L15,58.16Zm17,5.37,16-5.45V58.12L32,63.57ZM65,63.49,51,58.16V17.79l14,5.33Z"
            />
          </svg>
        </label>
      </nav>
    `;
  }

  static styles = css`
    nav {
      display: flex;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(10px);
      flex-direction: column;
      color: white;
      padding: 2px;
      border-radius: 8px;
      gap: 2px;
      color: white;
    }

    nav.toolbox {
      margin-top: 2px;
      width: 30px;
    }

    input[type="radio"] {
      display: none;
      &:checked + label {
        background: purple;
      }
    }

    button {
      padding: 0 0.5em;
    }

    label {
      padding: 2px;
    }

    label,
    button {
      background: transparent;
      border: none;
      border-radius: 6px;
      color: white;
      fill: white;
      display: block;
      height: 26px;
      & > svg {
        aspect-ratio: 1;
        margin: auto;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        cursor: pointer;
      }

      &:active {
        background: rgba(255, 255, 255, 0.2);
        cursor: pointer;
      }
    }
  `;

  #toolSelector = (ev: InputEvent) => {
    const target = ev.target as HTMLInputElement;
    dispatch_custom(this, "tool", { detail: target.value as Tool });
  };
}

export const toolbar = (tool?: Tool) => {};
