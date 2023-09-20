import { stop_ev } from "../util/events.ts";

const AUTO_ZOOM_FILL = 0.95; // Percentage of the viewport to fill on first load

const SPEED = 0.005; // 100 px per second

export class PPZ extends HTMLElement {
  root: ShadowRoot;
  container: HTMLDivElement;

  get max_scale() {
    return Math.max(this.vdimx / this.cdimx, this.vdimy / this.cdimy) * 2;
  }

  get min_scale() {
    return Math.min(this.vdimx / this.cdimx, this.vdimy / this.cdimy) * 0.5;
  }

  z = 1;
  desired_z = 1;

  scrollx = 0;
  scrolly = 0;

  /** The point around which an animated zoom operates */
  originx = 0;
  originy = 0;

  /** Location of the viewport in client space */
  vlocx = 0;
  vlocy = 0;

  /** Dimensions of the viewport */
  vdimx = 0;
  vdimy = 0;

  /** Dimensions of the client */
  cdimx = 0;
  cdimy = 0;

  /** Offset of the client within the interior scrollable space. Used to center content */
  offsetx = 0;
  offsety = 0;

  /** Indicates whether zooming should be animated or immediate */
  smooth: boolean = false;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.root.appendChild(PPZ.template().content.cloneNode(true));
    this.container = this.root.getElementById("container") as HTMLDivElement;
    this.#resize_observer.observe(this);
    this.root.querySelector("slot")!.onslotchange = ({ target }) => {
      let slot = target as HTMLSlotElement;
      let svg = slot.assignedElements()[0] as HTMLElement;
      this.#resize_observer.observe(svg);

      this.smooth = false;
    };
    this.addEventListener("scroll", () => {
      this.scrollx = this.scrollLeft;
      this.scrolly = this.scrollTop;
    }, {passive: true});
    this.addEventListener("gesturestart", this.#gesture.start);
    this.addEventListener("gesturechange", this.#gesture.change);
    document.addEventListener("keydown", this.#keyboard_zoom, { passive: false });
  }

  #zoom_to_fit() {
    let svg = (this.root.querySelector("slot") as HTMLSlotElement).assignedElements()[0] as HTMLDivElement;
    let dim = this.getBoundingClientRect();
    this.vdimx = dim.width;
    this.vdimy = dim.height;
    this.cdimx = svg.offsetWidth;
    this.cdimy = svg.offsetHeight;
    const zoom = Math.max(this.min_scale, Math.min(this.max_scale, (this.vdimx / this.cdimx) * AUTO_ZOOM_FILL, (this.vdimy / this.cdimy) * AUTO_ZOOM_FILL));
    this.zoom(0, 0, zoom - this.z);
  }

  #resize_observer = new ResizeObserver((entries) => {
    for (let e of entries) {
      if (e.target === this) {
        this.vdimx = e.contentRect.width;
        this.vdimy = e.contentRect.height;
        const rect = this.getBoundingClientRect();
        this.vlocx = rect.x;
        this.vlocy = rect.y;
      } else {
        //@ts-ignore;
        this.cdimx = e.target.offsetWidth;
        //@ts-ignore;
        this.cdimy =  e.target.offsetHeight;
        this.#zoom_to_fit();
      }
    }

    this.center();
    this.#animate();
  });

  #prv?: DOMHighResTimeStamp;
  loop = (ts: DOMHighResTimeStamp) => {
    let delta = this.desired_z - this.z;
    if (delta !== 0) {
      let elapsed = this.#prv ? ts - this.#prv : 16;
      this.#prv = ts;

      // If it's smooth, we'll move in increments, otherwise perform all adjustments in one frame
      let delta_scale = this.smooth ? Math.sign(delta) * Math.min(elapsed * SPEED * this.z, Math.abs(delta)) : delta;

      // Record the new z
      this.z += delta_scale;

      // Be sure to prevent negative scroll positions
      this.scrollx = Math.max(0, this.originx * delta_scale + this.scrollx);
      this.scrolly = Math.max(0, this.originy * delta_scale + this.scrolly);

      this.center();

      this.scrollTo({ left: this.scrollx, top: this.scrolly });

      window.requestAnimationFrame(this.loop);
    } else {
      this.#prv = undefined;
    }
  };

  /**
   * Centers the content on the screen if it is smaller than the viewport.
   * This updates the `offset` member accordingly
   */
  center() {
    this.offsetx = Math.max(0, this.vdimx - (this.cdimx * this.z)) * 0.5;
    this.offsety = Math.max(0, this.vdimy - (this.cdimy * this.z)) * 0.5;
    this.container.style.transform = `translate(${this.offsetx}px, ${this.offsety}px) scale(${this.z})`;
  }
  /**
   * Runs when the component is attached to the DOM.
   * Sets up our animation loop and event listenees
   */
  connectedCallback() {
    this.addEventListener("wheel", this.wheel, { passive: true, capture: true });
  }

  /**
   * Performs an incremental zoom on a location (screen coordinate)
   */
  zoom = (x: number, y: number, inc: number) => {
    // Step 1: Bound the proposed delta by the min and max scale
    this.desired_z = Math.min(this.max_scale, Math.max(this.min_scale, this.desired_z + inc));

    // Step 2: Record the current scroll position.
    //          TODO: Determine if we still need this when we record on scroll event
    // this.state.scroll_pos = [this.scrollLeft, this.scrollTop];

    // Step 3: Record the origin the zoom in content-local coordinates.
    //          The goal of zooming is to keep this coordinate in the same client location
    [this.originx, this.originy] = this.coordToLocal(x, y);

    // Step 4: Do the zooming? We have an animation loop running for that
    this.#animate()
  };

  /**
   * Performs an incremental zoom on a location (local coordinate in content)
   */
  wheel = (ev: WheelEvent) => {
    if (!ev.ctrlKey) return;
    // Firefox scrolls by ines, chrome scrolls by pixels, there's no formal
    // definition of what a "line" is, but let's just say it's 10 px
    const multiplier = ev.deltaMode === WheelEvent.DOM_DELTA_LINE ? 10 : 1;

    // Don't let any weird inputs cause a jump of more than 50px / 5 lines
    const delta = Math.min(30, Math.max(-30, -ev.deltaY * multiplier));

    // Turn the scroll delta into a zoom delta. We use a magic scalar,
    //  but note that we zoom *more* the more zoomed in we are.
    const zoom = delta * 0.005 * this.z;

    // Only do smoothing if the delta is large.
    // This should correspond to using a scroll wheel as opposed to a touchpad
    this.smooth = true; //Math.abs(delta) === 30;

    this.zoom(ev.clientX, ev.clientY, zoom);
  };

  #keyboard_zoom = (ev: KeyboardEvent) => {
    console.log("zoom!", ev.ctrlKey, ev.key);
    if (!ev.ctrlKey) return;
    if (ev.key === "-" || ev.key === "-") {
      this.smooth = true;
      this.zoom(
        this.vlocx + (this.vdimx / 2),
        this.vlocy + (this.vdimy / 2),
        -0.4 * this.z
      );
      stop_ev(ev);
    } else if (ev.key === "=" || ev.key === "+") {
      this.smooth = true;
      this.zoom(
        this.vlocx + (this.vdimx / 2),
        this.vlocy + (this.vdimy / 2),
        0.4 * this.z
      );
      stop_ev(ev);
    } else if (ev.key === "0") {
      this.smooth = true;
      this.#zoom_to_fit();
    }
  };

  // Gesture-based scrolling
  // Safari records pinches as gesture events rather than wheel events
  // so we have to listen for these as well
  #gesture = {
    prev_scale: 0,
    originx: 0,
    originy: 0,

    start: (ev: any) => {
      stop_ev(ev);
      this.#gesture.originx = ev.clientX
      this.#gesture.originy = ev.clientY
      this.#gesture.prev_scale = 1;
    },

    change: (ev: any) => {
      stop_ev(ev);
      this.zoom(
        this.#gesture.originx, this.#gesture.originy,
        // I'll be real I'm not entirely sure why this is the magic number
        this.z * (ev.scale - this.#gesture.prev_scale) * 1.5
      );
      this.#gesture.prev_scale = ev.scale;
    },
  };

  /**
   * Converts client coordinates into content coordinates, accounting for
   * the viewport's offset and scale
   */
  coordToLocal(x: number, y: number): [number, number] {
    // v: The coordinate of the event within to the interior scrollable space:
    return [
      (x - this.vlocx + this.scrollx - this.offsetx) / this.z,
      (y - this.vlocy + this.scrolly - this.offsety) / this.z,
    ]
  }

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

  #animate() {
    if (this.#prv == undefined) {
      window.requestAnimationFrame(this.loop);
    }
  }
}

const next_frame = (): Promise<DOMHighResTimeStamp> => new Promise((res) => window.requestAnimationFrame(res));

// We use round to prevent small rendering errors that occur when transforms are highly precise.
// Two decimals seems to be pretty safe
customElements.define("p-p-z", PPZ);
