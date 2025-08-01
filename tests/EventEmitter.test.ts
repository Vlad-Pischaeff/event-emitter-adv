import { describe, it, expect, vi, beforeEach } from "vitest";
import EventEmitter from "../src/eventEmitter";

describe("EventEmitter", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  it("should call MANY listener unlimited times", () => {
    const fn = vi.fn();
    emitter.on("many", fn, null, 1, 0); // MANY
    emitter.emit("many");
    emitter.emit("many");
    emitter.emit("many");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should call ONCE listener only once", () => {
    const fn = vi.fn();
    emitter.once("once", fn);
    emitter.emit("once");
    emitter.emit("once");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should not call DONE listener", () => {
    const fn = vi.fn();
    emitter.on("done", fn, null, 1, 2); // DONE
    emitter.emit("done");
    expect(fn).not.toHaveBeenCalled();
  });

  it("should handle mixed MANY and ONCE listeners", () => {
    const many = vi.fn();
    const once = vi.fn();
    emitter.on("mixed", many, null, 1, 0);
    emitter.once("mixed", once);
    emitter.emit("mixed");
    emitter.emit("mixed");
    expect(many).toHaveBeenCalledTimes(2);
    expect(once).toHaveBeenCalledTimes(1);
  });

  it("should respect count flags in emitAsync", async () => {
    const many = vi.fn(async () => {});
    const once = vi.fn(async () => {});
    const done = vi.fn(async () => {});
    emitter.on("evt", many, null, 1, 0);
    emitter.once("evt", once);
    emitter.on("evt", done, null, 1, 2);
    await emitter.emitAsync("evt");
    await emitter.emitAsync("evt");
    expect(many).toHaveBeenCalledTimes(2);
    expect(once).toHaveBeenCalledTimes(1);
    expect(done).not.toHaveBeenCalled();
  });

  it("should call onAny listener for all events", () => {
    const mock = vi.fn();
    emitter.onAny(mock);
    emitter.emit("a", 1);
    emitter.emit("b", 2);
    expect(mock).toHaveBeenCalledTimes(2);
    expect(mock).toHaveBeenCalledWith("a", 1);
    expect(mock).toHaveBeenCalledWith("b", 2);
  });

  it("should call async onAny with emitAsync", async () => {
    const mock = vi.fn(async () => {});
    emitter.onAny(mock);
    await emitter.emitAsync("foo", 123);
    expect(mock).toHaveBeenCalledWith("foo", 123);
  });

  it("should remove onAny listener with offAny", () => {
    const mock = vi.fn();
    emitter.onAny(mock);
    emitter.offAny(mock);
    emitter.emit("test");
    expect(mock).not.toHaveBeenCalled();
  });

  it("should remove specific listener with off", () => {
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

  it("should return correct listenersNumber", () => {
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
});
