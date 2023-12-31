import { stop_ev } from "../util/events.ts";

const AUTO_ZOOM_FILL = 0.95; // Percentage of the viewport to fill on first load

const SPEED = 0.005; // 100 px per second

export class PPZ extends HTMLElement {
  #root: ShadowRoot;
  #container: HTMLDivElement;

  get #max_scale() {
    return (
      Math.max(1, this.#vdimx / this.#cdimx, this.#vdimy / this.#cdimy) * 2
    );
  }

  get #min_scale() {
    return Math.min(
      1,
      this.#vdimx / (this.#cdimx + 200),
      this.#vdimy / (this.#cdimy + 200),
    );
  }

  get #scrollx_max() {
    return Math.max(
      0,
      this.#cdimx * this.#scale - this.#vdimx + Math.max(0, this.#offsetx),
    );
  }

  get #scrolly_max() {
    return Math.max(
      0,
      this.#cdimy * this.#scale - this.#vdimy + Math.max(0, this.#offsety),
    );
  }

  /** Location of the viewport in client space */
  #vlocx = 0;
  #vlocy = 0;

  /** Dimensions of the viewport */
  #vdimx = 0;
  #vdimy = 0;

  /** Dimensions of the client (before scaling) */
  #cdimx = 0;
  #cdimy = 0;

  /** The current display parameters */
  #scale: number = 1;
  #offsetx: number = 0;
  #offsety: number = 0;
  #scrollx: number = 0;
  #scrolly: number = 0;

  /** The current gesture state */
  #gesturex: number = 0;
  #gesturey: number = 0;

  #pending_zoom: number = 0;
  #gesture_active: boolean = false;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    this.#root.appendChild(PPZ.template().content.cloneNode(true));
    this.#container = this.#root.getElementById("container") as HTMLDivElement;
  }

  #resize_observer = new ResizeObserver((entries) => {
    for (let e of entries) {
      if (e.target === this) {
        this.#vdimx = e.contentRect.width;
        this.#vdimy = e.contentRect.height;

        const rect = this.getBoundingClientRect();
        this.#vlocx = rect.x;
        this.#vlocy = rect.y;
      } else {
        //@ts-ignore;
        this.#cdimx = e.target.offsetWidth;
        //@ts-ignore;
        this.#cdimy = e.target.offsetHeight;
      }
    }

    this.#render();
  });

  /**
   * Runs when the component is attached to the DOM.
   * Sets up our animation loop and event listeners
   */
  connectedCallback() {
    this.#resize_observer.observe(this);

    // Observe the content in the slot. We can't use the dimensions of the container div,
    // because as far as the DOM is concerned it's 0x0.
    this.#root.querySelector("slot")!.onslotchange = ({ target }) => {
      let slot = target as HTMLSlotElement;
      let svg = slot.assignedElements()[0] as HTMLElement;
      this.#resize_observer.observe(svg);
    };

    this.addEventListener("wheel", this.#wheel, {
      passive: true,
      capture: true,
    });

    this.addEventListener(
      "scroll",
      () => {
        this.#scrollx = this.scrollLeft;
        this.#scrolly = this.scrollTop;
      },
      { passive: true },
    );
  }

  /** The core zooming logic. Invoked by the animation loop in response to the gesture state */
  #zoom(z_inc: number, clientx: number, clienty: number) {
    // Ensure we're bound by the scale limits
    z_inc = delta_clamp(this.#scale, z_inc, this.#min_scale, this.#max_scale);

    let innerx =
      (this.#scrollx + clientx - this.#vlocx - this.#offsetx) / this.#scale;
    let innery =
      (this.#scrolly + clienty - this.#vlocy - this.#offsety) / this.#scale;
    let deltax = innerx * z_inc;
    let deltay = innery * z_inc;

    this.#scale += z_inc;

    // Try scrolling
    let sdx = delta_clamp(this.#scrollx, deltax, 0, this.#scrollx_max);
    let sdy = delta_clamp(this.#scrolly, deltay, 0, this.#scrolly_max);

    this.#scrollx += sdx;
    this.#scrolly += sdy;

    deltax -= sdx;
    deltay -= sdy;

    // Note: deltax and delta y contain the unresolved movement (we don't handle this now)
  }

  //#region Ctrl+Scroll / Touchpad pinch
  #gesture_timeout?: number;
  #wheel_gesture_timeout() {
    if (this.#gesture_timeout) {
      clearTimeout(this.#gesture_timeout);
    }

    this.#gesture_timeout = setTimeout(this.#stopGesture, 50);
  }

  /**
   * Performs an incremental zoom on a location (local coordinate in content)
   */
  #wheel = (ev: WheelEvent) => {
    if (!ev.ctrlKey) return;

    this.#gesture_active || this.#startGesture(ev.clientX, ev.clientY);
    this.#wheel_gesture_timeout();

    // Firefox scrolls by ines, chrome scrolls by pixels, there's no formal
    // definition of what a "line" is, but let's just say it's 10 px
    const multiplier = ev.deltaMode === WheelEvent.DOM_DELTA_LINE ? 10 : 1;

    // Don't let any weird inputs cause a jump of more than 50px / 5 lines
    const delta = Math.min(30, Math.max(-30, -ev.deltaY * multiplier));

    // Turn the scroll delta into a zoom delta. We use a magic scalar,
    //  but note that we zoom *more* the more zoomed in we are.
    const zoom =
      delta *
      0.005 *
      Math.min(this.#cdimx / this.#vdimx, this.#cdimy / this.#vdimy) *
      this.#scale;

    // Only do smoothing if the delta is large.
    // This should correspond to using a scroll wheel as opposed to a touchpad

    this.#pending_zoom += zoom;

    this.#render();
    return false;
  };
  //#endregion

  //#region Generic Gestures

  #startGesture(clientx: number, clienty: number) {
    this.#gesture_active = true;
    this.#gesturex = clientx;
    this.#gesturey = clienty;
    this.#render();
  }

  #stopGesture = () => (this.#gesture_active = false);
  //#endregion

  //#region Animation loop
  #anim_frame?: number;
  #ts_prev?: DOMHighResTimeStamp;

  #render() {
    this.#ts_prev ||= performance.now();
    this.#anim_frame ||= requestAnimationFrame(this.#frame);
  }

  #frame = (ts: DOMHighResTimeStamp) => {
    /** BEGIN timekeeping */
    this.#anim_frame = undefined;
    if (!this.#ts_prev) {
      this.#ts_prev = ts;
      this.#anim_frame = requestAnimationFrame(this.#frame);
    }

    const delta = ts - this.#ts_prev;
    this.#ts_prev = ts;
    /** END timmekeeping  */

    // Calculate the desired state
    let g = this.#process_gesture(delta);

    // Render the state
    this.#container.style.transform = `translate(${this.#offsetx}px, ${
      this.#offsety
    }px) scale(${this.#scale})`;
    this.scrollTo(this.#scrollx, this.#scrolly);

    // Decide whether to keep running animation loop
    if (g) {
      this.#anim_frame = requestAnimationFrame(this.#frame);
    } else {
      this.#ts_prev = undefined;
    }
  };

  #process_gesture(delta: DOMHighResTimeStamp): boolean {
    if (!this.#gesture_active) return false;
    this.#zoom(this.#pending_zoom, this.#gesturex, this.#gesturey);
    this.#pending_zoom = 0;

    this.#center();

    return true;
  }

  #center() {
    this.#offsetx = Math.max(
      0,
      (this.#vdimx - this.#cdimx * this.#scale) * 0.5,
    );
    this.#offsety = Math.max(
      0,
      (this.#vdimy - this.#cdimy * this.#scale) * 0.5,
    );
  }

  //#endregion

  static template(): HTMLTemplateElement {
    let t = document.createElement("template");
    t.innerHTML = `
            <style>
                :host {
                    position: relative;
                    display: block;
                    overflow: scroll; 
                }
                #container {
                    transform-origin: 0 0;
                    overflow: visible;
                    position: absolute;
                }
            </style>
                <div id="container">
                    <slot id="content"></slot>
                </div>
            </div>
        `;
    return t;
  }
}

customElements.define("p-p-z", PPZ);

const clamp = (val: number, min: number, max: number) =>
  Math.min(Math.max(val, min), max);

const delta_clamp = (
  base: number,
  delta: number,
  min: number,
  max: number,
): number => clamp(base + delta, min, max) - base;
