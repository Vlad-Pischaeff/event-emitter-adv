import { describe, it, expect, vi, beforeEach } from "vitest";
import EventEmitter from "../src/eventEmitter";

describe("EventEmitter", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  it("should call listener unlimited times with on()", () => {
    const fn = vi.fn();
    emitter.on("many", fn);
    emitter.emit("many");
    emitter.emit("many");
    emitter.emit("many");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should call listener only once with once()", () => {
    const fn = vi.fn();
    emitter.once("once", fn);
    emitter.emit("once");
    emitter.emit("once");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should handle mixed on() and once() listeners", () => {
    const many = vi.fn();
    const once = vi.fn();

    emitter.on("mixed", many);
    emitter.once("mixed", once);

    emitter.emit("mixed");
    emitter.emit("mixed");

    expect(many).toHaveBeenCalledTimes(2);
    expect(once).toHaveBeenCalledTimes(1);
  });

  it("should support async listeners with emitAsync()", async () => {
    const many = vi.fn(async () => {});
    const once = vi.fn(async () => {});

    emitter.on("evt", many);
    emitter.once("evt", once);

    await emitter.emitAsync("evt");
    await emitter.emitAsync("evt");

    expect(many).toHaveBeenCalledTimes(2);
    expect(once).toHaveBeenCalledTimes(1);
  });

  it("should call onAny for events with listeners", () => {
    const mock = vi.fn();

    emitter.onAny(mock);

    emitter.emit("a", 1);
    emitter.emit("b", 2);

    expect(mock).toHaveBeenCalledTimes(2);
    expect(mock).toHaveBeenCalledWith("a", 1);
    expect(mock).toHaveBeenCalledWith("b", 2);
  });

  it("should call onAny event if event has no listeners", () => {
    const mock = vi.fn();

    emitter.onAny(mock);

    emitter.emit("noListenersEvent", 42);

    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith("noListenersEvent", 42);
  });

  it("should call async onAny listener with emitAsync()", async () => {
    const mock = vi.fn(async () => {});

    emitter.onAny(mock);
    await emitter.emitAsync("foo", 123);

    expect(mock).toHaveBeenCalledWith("foo", 123);
  });

  it("should remove onAny listener with offAny()", () => {
    const mock = vi.fn();

    emitter.onAny(mock);
    emitter.offAny(mock);
    emitter.emit("test");

    expect(mock).not.toHaveBeenCalled();
  });

  it("should remove specific listener with off()", () => {
    const fn = vi.fn();

    emitter.on("ev", fn);
    emitter.off("ev", fn);
    emitter.emit("ev");

    expect(fn).not.toHaveBeenCalled();
  });

  it("should clear all listeners", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    emitter.on("a", fn1);
    emitter.on("b", fn2);
    emitter.clear();

    emitter.emit("a");
    emitter.emit("b");

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });

  it("should return correct listenersNumber()", () => {
    emitter.on("x", () => {});
    emitter.on("x", () => {});
    expect(emitter.listenersNumber("x")).toBe(2);
  });

  it("should return all event names", () => {
    emitter.on("e1", () => {});
    emitter.on("e2", () => {});
    expect(emitter.eventNames().sort()).toEqual(["e1", "e2"]);
  });

  it("should return listeners for an event", () => {
    const fn = () => {};
    emitter.on("load", fn);
    expect(emitter.listeners("load")).toContain(fn);
  });

  it("should handle nested emit of the same event correctly", () => {
    const calls: string[] = [];
    let nestedCalled = false;

    emitter.on("nested", () => {
      calls.push("first");

      if (!nestedCalled) {
        nestedCalled = true;
        emitter.emit("nested");
      }
    });

    emitter.on("nested", () => {
      calls.push("second");
    });

    emitter.emit("nested");

    expect(calls).toEqual(["first", "second", "first", "second"]);
  });

  it("should preserve order when emit is called inside emitAsync listener", async () => {
    const calls: string[] = [];

    emitter.on("a", async () => {
      calls.push("a:start");
      emitter.emit("b");
      calls.push("a:end");
    });

    emitter.on("b", () => {
      calls.push("b");
    });

    await emitter.emitAsync("a");

    expect(calls).toEqual(["a:start", "a:end", "b"]);
  });

  it("should preserve order when emitAsync is called inside emit listener", async () => {
    const calls: string[] = [];

    emitter.on("a", () => {
      calls.push("a:start");
      emitter.emitAsync("b");
      calls.push("a:end");
    });

    emitter.on("b", async () => {
      calls.push("b");
    });

    emitter.emit("a");

    // даём очереди полностью отработать
    await Promise.resolve();

    expect(calls).toEqual(["a:start", "a:end", "b"]);
  });
});
