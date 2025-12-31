import { vi, describe, it, expect, beforeEach } from "vitest";
import EventEmitter from "../src/eventEmitter";

describe("EventEmitter full behavior", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  // -----------------------------
  // Basic on/off/once behavior
  // -----------------------------
  it("should call listeners synchronously in registration order", () => {
    const calls: string[] = [];

    emitter.on("a", (): void => { calls.push("first"); });
    emitter.on("a", (): void => { calls.push("second"); });

    calls.push("before");
    emitter.emit("a");
    calls.push("after");

    expect(calls).toEqual(["before", "first", "second", "after"]);
  });

  it("should remove once listeners after first call", () => {
    const calls: string[] = [];
    emitter.once("once", (): void => { calls.push("once"); });

    emitter.emit("once");
    emitter.emit("once");

    expect(calls).toEqual(["once"]);
  });

  it("should allow removing specific listeners", () => {
    const calls: string[] = [];
    const fn1 = (): void => { calls.push("fn1"); };
    const fn2 = (): void => { calls.push("fn2"); };

    emitter.on("x", fn1);
    emitter.on("x", fn2);

    emitter.off("x", fn1);
    emitter.emit("x");

    expect(calls).toEqual(["fn2"]);
  });

  it("should support multiple events independently", () => {
    const calls: string[] = [];
    emitter.on("a", (): void => { calls.push("a"); });
    emitter.on("b", (): void => { calls.push("b"); });

    emitter.emit("a");
    emitter.emit("b");

    expect(calls).toEqual(["a", "b"]);
  });

  it("should remove all listeners for an event", () => {
    const calls: string[] = [];
    emitter.on("y", (): void => { calls.push("y1"); });
    emitter.on("y", (): void => { calls.push("y2"); });

    // emitter.off("y");
    emitter.removeAllListeners("y");
    emitter.emit("y");

    expect(calls).toEqual([]);
  });

  it("should provide listener snapshot per emit", () => {
    const calls: string[] = [];

    const fn1 = (): void => {
      calls.push("fn1");
      emitter.on("snap", (): void => { calls.push("fn2"); });
    };

    emitter.on("snap", fn1);
    emitter.emit("snap");
    expect(calls).toEqual(["fn1"]);

    emitter.emit("snap");
    expect(calls).toEqual(["fn1", "fn1", "fn2"]);
  });

  // -----------------------------
  // onAny / offAny
  // -----------------------------
  it("should call onAny listeners after regular listeners", () => {
    const calls: string[] = [];

    emitter.on("a", (): void => { calls.push("listener"); });
    emitter.onAny((event: string, arg?: string): void => {
      calls.push(`any:${event}${arg ? `:${arg}` : ""}`);
    });

    emitter.emit("a", "foo");
    expect(calls).toEqual(["listener", "any:a:foo"]);
  });

  it("should call onAny listeners for multiple events correctly", () => {
    const calls: string[] = [];

    emitter.onAny((event: string, arg?: string): void => {
      calls.push(`any:${event}${arg ? `:${arg}` : ""}`);
    });

    emitter.on("a", (): void => { calls.push("a"); });
    emitter.on("b", (): void => { calls.push("b"); });

    emitter.emit("a", "foo");
    emitter.emit("b", "bar");

    expect(calls).toEqual(["a", "any:a:foo", "b", "any:b:bar"]);
  });

  it("should allow removing onAny listeners", () => {
    const calls: string[] = [];

    const anyFn = (event: string): void => { calls.push(`any:${event}`); };
    emitter.onAny(anyFn);

    emitter.emit("x");
    emitter.offAny(anyFn);
    emitter.emit("y");

    expect(calls).toEqual(["any:x"]);
  });

  // -----------------------------
  // weight
  // -----------------------------
  it("should execute higher weight listeners first", () => {
    const calls: string[] = [];

    emitter.on("event", (): void => { calls.push("low"); }, null, 1);
    emitter.on("event", (): void => { calls.push("medium"); }, null, 5);
    emitter.on("event", (): void => { calls.push("high"); }, null, 10);

    emitter.emit("event");

    expect(calls).toEqual(["high", "medium", "low"]);
  });

  it("should maintain weight order when adding new listener in emit", () => {
    const calls: string[] = [];

    emitter.on("e", (): void => {
      calls.push("first");
      emitter.on("e", (): void => { calls.push("new"); }, null, 7);
    }, null, 5);

    emitter.on("e", (): void => { calls.push("second"); }, null, 3);

    // Первый emit: новый слушатель добавлен, но не выполнен
    emitter.emit("e");
    expect(calls).toEqual(["first", "second"]); // ✓

    calls.length = 0;
    
    // Второй emit: теперь "new" должен выполниться с весом 7 (после first:5, перед second:3)
    emitter.emit("e");
    expect(calls).toEqual(["new", "first", "second"]); // "new" имеет вес 7 - наибольший
  });

  it("should remove weighted listener correctly", () => {
    const calls: string[] = [];
    const fn = (): void => { calls.push("fn"); };

    emitter.on("w", fn, null, 5);
    emitter.emit("w");
    expect(calls).toEqual(["fn"]);

    emitter.off("w", fn);
    calls.length = 0;
    emitter.emit("w");
    expect(calls).toEqual([]);
  });

  it("should warn and ignore duplicate callback with same context", () => {
    const calls: string[] = [];
    const callback = (): void => { calls.push("call"); };
    
    emitter.on("dup", callback, null, 1);
    emitter.on("dup", callback, null, 1); // duplicate - та же ссылка

    emitter.emit("dup");
    expect(calls).toEqual(["call"]);
  });

  // -----------------------------
  // Nested emit + weight
  // -----------------------------
  it("should handle nested emit with weighted listeners correctly", () => {
    const calls: string[] = [];
    let nestedCalled = false;

    emitter.on("n", (): void => {
      calls.push("high");
      if (!nestedCalled) {
        nestedCalled = true;
        emitter.emit("n");
      }
    }, null, 10);

    emitter.on("n", (): void => { calls.push("low"); }, null, 1);

    emitter.emit("n");
    expect(calls).toEqual(["high", "high", "low", "low"]);
  });

  // -----------------------------
  // Async listeners
  // -----------------------------
  it("should handle async listeners without awaiting in emit", async () => {
    const calls: string[] = [];

    emitter.on("async", async (): Promise<void> => {
      calls.push("start");
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      calls.push("end");
    });

    calls.push("before");
    emitter.emit("async");
    calls.push("after");

    // Сразу после emit
    expect(calls).toEqual(["before", "start", "after"]);

    // Ждём завершения async listener
    await new Promise<void>((resolve) =>
      setTimeout(() => {
        expect(calls).toEqual(["before", "start", "after", "end"]);
        resolve();
      }, 20)
    );
  });

// -----------------------------
// Дополнительные тесты
// -----------------------------

  it("should call listener with correct context (this)", () => {
    const context = { name: "test-context" };
    let capturedContext: any;

    emitter.on("check-context", function(this: any) {
      capturedContext = this;
    }, context);

    emitter.emit("check-context");
    expect(capturedContext).toBe(context);
  });

  it("should pass multiple arguments to listeners", () => {
    const params: any[] = [];
    emitter.on("multi-args", (...args: any[]) => {
      params.push(...args);
    });

    emitter.emit("multi-args", 1, "2", { three: 3 });
    expect(params).toEqual([1, "2", { three: 3 }]);
  });

  it("should support chaining for on/off/once/onAny", () => {
    const result = emitter
      .on("a", () => {})
      .once("b", () => {})
      .off("a")
      .onAny(() => {});

    expect(result).toBe(emitter);
  });

  it("should not be affected by removing listeners during emit (snapshot check)", () => {
    const calls: string[] = [];
    const fn2 = () => calls.push("fn2");
    
    const fn1 = () => {
      calls.push("fn1");
      emitter.off("snap-remove", fn2);
    };

    emitter.on("snap-remove", fn1);
    emitter.on("snap-remove", fn2);

    emitter.emit("snap-remove");
    
    // Несмотря на то, что fn2 был удален внутри fn1, 
    // в текущем цикле emit он все равно должен вызваться
    expect(calls).toEqual(["fn1", "fn2"]);

    calls.length = 0;
    emitter.emit("snap-remove");
    expect(calls).toEqual(["fn1"]);
  });

  it("should handle error in one listener without blocking others", () => {
      const calls: string[] = [];
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    emitter.on("error-test", () => { throw new Error("Fail"); });
    emitter.on("error-test", () => { calls.push("recovered"); });

    expect(() => emitter.emit("error-test")).toThrow("Fail");
    expect(calls).toEqual(["recovered"]);
    
    consoleErrorSpy.mockRestore();
  });

  it("should allow adding same function with different contexts", () => {
    const calls: string[] = [];
    const fn = function(this: any) { calls.push(this.id); };
    
    emitter.on("ctx-test", fn, { id: 1 });
    emitter.on("ctx-test", fn, { id: 2 });

    emitter.emit("ctx-test");
    expect(calls).toEqual([1, 2]);
  });
});
