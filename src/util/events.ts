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

type CustomEventType<T extends Event> = T extends CustomEvent<infer U>
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

export type SupportsEvent<T, E> = {
  addEventListener(t: T, e: (ev: E) => any): void;
  removeEventListener(t: T, e: (ev: E) => any): void;
  dispatchEvent(ev: E): void;
};

export function dispatch<
  K extends string,
  E extends Event,
  T extends SupportsEvent<K, E>,
  D,
>(target: T, k: K, c: { new (name: string, other?: D): E }, d?: D) {
  target.dispatchEvent(new c(k, d));
}

export function dispatch_custom<
  K extends string,
  D,
  T extends SupportsEvent<K, CustomEvent<D>>,
>(target: T, k: K, detail: D, options?: EventInit) {
  target.dispatchEvent(new CustomEvent(k, { ...options, detail }));
}

export function waitUntil<T extends SupportsEvent<K, E>, K extends string, E>(
  target: T,
  type: K,
  f: (e: E) => boolean,
): Promise<E> {
  return new Promise<E>((resolve) => {
    let cb = (e: E): void => {
      if (f(e)) target.removeEventListener(type, cb), resolve(e);
    };

    target.addEventListener(type, cb);
  });
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

export interface TypedEventTarget<M extends ValueIsEvent<M>> {
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

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  /** Removes the event listener in target's event listener list with the same
   * type, callback, and options. */
  removeEventListener<T extends keyof M & string>(
    type: T,
    callback: TypedEventListenerOrEventListenerObject<M, T> | null,
    options?: EventListenerOptions | boolean,
  ): void;

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  /**
   * Dispatches a synthetic event event to target and returns true if either
   * event's cancelable attribute value is false or its preventDefault() method
   * was not invoked, and false otherwise.
   *
   * @deprecated To ensure type safety use the top-evel `dispatch` instead.
   */
  dispatchEvent: (event: Event) => boolean;
}

/** A compile-time wrapper for types to enforce precise typing */
// export const Typed = <EM extends ValueIsEvent<EM>>(target: {new(...args: any): TypedEventTarget<EM>}): typeof target & {new(...args: any): Omit<InstanceType<typeof target>, "addEventListener" | "removeEventListener" | "dispatchEvent"> & TypedEventTarget<EM>} => target;

export const WithEvents = <EM extends ValueIsEvent<EM>, T>(target: {
  new (...args: any): T;
}): typeof target & { new (...args: any): T & TypedEventTarget<EM> } =>
  target as any;
export type WithEvents<
  EM extends ValueIsEvent<EM>,
  T extends { new (...args: any): EventTarget },
> = T & { new (...args: any): InstanceType<T> & TypedEventTarget<EM> };
export const SafeTarget: {
  new (...args: any): Omit<EventTarget, keyof TypedEventTarget<{}>>;
} = EventTarget;
