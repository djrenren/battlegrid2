import { test, inject } from "vitest";
import { wsstream } from "./ws";


test("ws stream", async ({expect}) => {
    let s = wsstream(inject("wss-echo"));

    const MSG = "Hello world";
    let w = s.writable.getWriter();
    let r = s.readable.getReader();
    await w.write(MSG);
    expect((await r.read()).value).toBe(MSG);
});

test("close with streams", async ({expect}) => {
    let s = wsstream(inject("wss-echo"));

    console.log('gettings ready');
    await s.ready;
    console.log('got ready');
    s.writable.getWriter().close();
    s.readable.getReader().cancel();

    await s.closed;
});


test("close with conn", async ({expect}) => {
    let s = wsstream(inject("wss-echo"));

    await s.ready;

    s.close();
    await s.closed;
    await s.readable.getReader().closed;
    await s.writable.getWriter().closed.catch(() => {});
});

test("ws stream buffer", async ({expect}) => {
    let s = wsstream(inject("wss-echo"));

    let w = s.writable.getWriter();
    let r = s.readable.getReader();
    const vals = Array.from(Array(10).keys())

    for (const v of vals) {
        w.write("" + v);
    }

    for (const v of vals) {
        expect((await r.read()).value).toBe(`${v}`);
    }
});
