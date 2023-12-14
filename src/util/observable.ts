import { ObservableV2 } from "./test";

type EventTable = { [event: string]: (...args: any) => void };
export const waitUntil = <V extends EventTable, E extends string & keyof V>(
  o: ObservableV2<V>,
  e: E,
  t: (...args: Parameters<V[E]>) => boolean,
): Promise<V[E]> =>
  new Promise((resolve) => {
    let cb: (...args: Parameters<V[E]>) => void;
    cb = (...args) => {
      if (t(...args)) {
        o.off(e, cb);
        resolve(args);
      }
    };
    o.on(e, cb);
  });
