import { expect, test } from 'vitest'
import { WithEvents, dispatch, dispatch_custom, waitUntil } from "./events";
import { timeout } from './promise';

type EM = {
    "foo": CustomEvent<number>
}

class Foo extends WithEvents<EM>()(EventTarget) {}

test("event mixin works", async() => {
    const x = new Foo();
    const prom = new Promise<number>(resolve => x.addEventListener('foo', ({detail}) => resolve(detail)));
    dispatch_custom(x, 'foo', 2);
    expect(await prom).toBe(2);

    const prom2 = new Promise<number>(resolve => x.addEventListener('foo', ({detail}) => resolve(detail)));
    dispatch(x, 'foo', CustomEvent, {detail: 2});
})

test('waitUntil', async() => {
    const x = new Foo();
    const p = waitUntil(x, 'foo', ({detail}) => detail > 4);
    dispatch_custom(x, 'foo', 1);
    try {
        await timeout(p, 100);
        throw "should not succeed"
    } catch {}

    dispatch_custom(x, 'foo', 5);
    await p
})