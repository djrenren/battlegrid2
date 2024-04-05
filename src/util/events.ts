export const is_primary_touch = (ev: PointerEvent): boolean =>
  ev.isPrimary && ev.pointerType === "touch";

export const is_primary_down = (ev: PointerEvent): boolean =>
  ev.isPrimary && (ev.pointerType === "touch" || ev.pressure > 0);
export const is_mouse_down = (ev: PointerEvent): boolean =>
  ev.pointerType === "mouse" && ev.buttons === 1 && ev.pressure > 0;
export const is_non_touch_drag = (ev: PointerEvent): boolean =>
  ev.pointerType !== "touch" && ev.isPrimary && ev.pressure > 0;

export const stop_ev = (ev: Event) => {
  ev.preventDefault();
  ev.stopPropagation();
};


type CustomEventType<T> = T extends CustomEvent<infer U>
  ? U
  : never;

export const window_ev = <N extends keyof WindowEventMap>(
  name: N,
  detail: CustomEventType<WindowEventMap[N]>,
): WindowEventMap[N] =>
  new CustomEvent(name, {
    detail,
    cancelable: true,
    bubbles: true,
    composed: true,
  }) as any;



type SupportsEvent<K extends string = string> = TypedEventTarget<{ [G in NoInfer<K>]: any }>;
type EventName<T extends SupportsEvent> = keyof T[typeof EMFake] & string;
type EventPayload<T extends SupportsEvent, K extends EventName<T>> = T[typeof EMFake][K];


export function waitUntil<T extends SupportsEvent, K extends EventName<T>>(
  target: T,
  type: K,
  f: (e: EventPayload<T, K>) => boolean,
): Promise<EventPayload<T, K>> {
  return new Promise<EventPayload<T, K>>((resolve) => {
    let cb = (e: EventPayload<T, K>): void => {
      if (f(e)) target.removeEventListener(type, cb), resolve(e);
    };

    target.addEventListener(type, cb);
  });
}

export function dispatch_custom<T extends SupportsEvent, K extends EventName<T>>(
  target: T,
  event: K,
  detail: CustomEventType<EventPayload<T, K>>
) {
  target.dispatchEvent(new CustomEvent(event, { detail }))
}

export function dispatch<T extends SupportsEvent, K extends EventName<T>, D>(
  target: T,
  event: K,
  construct: { new(name: string, other?: D): EventPayload<T, K> },
  d?: D
) {
  target.dispatchEvent(new construct(event, d));
}

export type TypedEventListener<M, T extends keyof M> = (
  evt: M[T],
) => void | Promise<void>;

export interface TypedEventListenerObject<M, T extends keyof M> {
  handleEvent: (evt: M[T]) => void | Promise<void>;
}

export type TypedEventListenerOrEventListenerObject<M, T extends keyof M> =
  | TypedEventListener<M, T>
  | TypedEventListenerObject<M, T>;

type ValueIsEvent<T> = {
  [key in keyof T]: Event;
};


declare const EMFake: unique symbol;

export interface TypedEventTarget<M extends ValueIsEvent<M>> {
  // @internal
  [EMFake]: M
  /** Appends an event listener for events whose type attribute value is type.
   * The callback argument sets the callback that will be invoked when the event
   * is dispatched.
   *
   * The options argument sets listener-specific options. For compatibility this
   * can be a boolean, in which case the method behaves exactly as if the value
   * was specified as options's capture.
   *
   * When set to true, options's capture prevents callback from being invoked
   * when the event's eventPhase attribute value is BUBBLING_PHASE. When false
   * (or not present), callback will not be invoked when event's eventPhase
   * attribute value is CAPTURING_PHASE. Either way, callback will be invoked if
   * event's eventPhase attribute value is AT_TARGET.
   *
   * When set to true, options's passive indicates that the callback will not
   * cancel the event by invoking preventDefault(). This is used to enable
   * performance optimizations described in § 2.8 Observing event listeners.
   *
   * When set to true, options's once indicates that the callback will only be
   * invoked once after which the event listener will be removed.
   *
   * The event listener is appended to target's event listener list and is not
   * appended if it has the same type, callback, and capture. */
  addEventListener<T extends keyof M & string>(
    type: T,
    listener: TypedEventListenerOrEventListenerObject<M, T> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  /** Removes the event listener in target's event listener list with the same
   * type, callback, and options. */
  removeEventListener<T extends keyof M & string>(
    type: T,
    callback: TypedEventListenerOrEventListenerObject<M, T> | null,
    options?: EventListenerOptions | boolean,
  ): void;

  /**
   * Dispatches a synthetic event event to target and returns true if either
   * event's cancelable attribute value is false or its preventDefault() method
   * was not invoked, and false otherwise.
   *
   * @deprecated To ensure type safety use the top-level `dispatch` instead.
   */
  dispatchEvent: (event: Event) => boolean;
}

type Constructor<T = {}> = new (...args: any[]) => T;
export const WithEvents = <EM extends ValueIsEvent<EM>>() => 
  <TBase extends Constructor<EventTarget>>(Base: TBase): (Omit<TBase, keyof TypedEventTarget<EM>> & { new(...args: any): Omit<InstanceType<TBase>, keyof TypedEventTarget<EM>> & TypedEventTarget<EM>}) => Base as any;
