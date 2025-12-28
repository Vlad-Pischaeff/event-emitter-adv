type Callback = (...args: any[]) => void | Promise<void>;

interface CallbackData {
  callback: Callback;
  originalCallback: Callback;
  weight: number;
  once: boolean;
  context: any;
}

interface InternalState {
  _events: Map<string, CallbackData[]>;
  _anyCallbacks: Callback[];
  _console: Console;
  _maxListeners: number | null;
  _emitQueue: Array<() => void | Promise<void>>;
  _emitting: boolean;
}

const privateMap = new WeakMap<object, InternalState>();

function internal(obj: object): InternalState {
  if (!privateMap.has(obj)) {
    privateMap.set(obj, {
      _events: new Map(),
      _anyCallbacks: [],
      _console: console,
      _maxListeners: null,
      _emitQueue: [],
      _emitting: false,
    });
  }
  return privateMap.get(obj)!;
}

/**
 * EventEmitter class for event-driven programming.
 */
export default class EventEmitter {
  constructor(
    maxListeners: number | null = null,
    localConsole: Console = console
  ) {
    const self = internal(this);
    self._console = localConsole;

    if (Number.isInteger(maxListeners) && (maxListeners as number) >= 0) {
      self._maxListeners = maxListeners;
    } else {
      self._maxListeners = null;
    }
  }

  on(
    event: string,
    callback: Callback,
    context: any = null,
    weight = 1,
    once = false
  ): this {
    const self = internal(this);

    if (typeof event !== "string" || !event.trim()) {
      throw new TypeError("Event name must be a non-empty string");
    }

    if (typeof callback !== "function") {
      throw new TypeError(`${callback} is not a function`);
    }

    if (
      self._maxListeners !== null &&
      this.listenersNumber(event) >= self._maxListeners
    ) {
      self._console.warn(
        `Max listeners (${self._maxListeners}) for event "${event}" is reached!`
      );
      return this;
    }

    if (this._callbackExists(event, callback, context)) {
      self._console.warn(
        `Event "${event}" already has the specified callback.`
      );
      return this;
    }

    const boundCallback = context ? callback.bind(context) : callback;
    const callbackData: CallbackData = {
      callback: boundCallback,
      originalCallback: callback,
      weight,
      once,
      context,
    };

    const callbacks = this._getCallbacks(event);
    const insertIndex = callbacks.findIndex((cb) => cb.weight < weight);
    if (insertIndex === -1) {
      callbacks.push(callbackData);
    } else {
      callbacks.splice(insertIndex, 0, callbackData);
    }

    return this;
  }

  once(
    event: string,
    callback: Callback,
    context: any = null,
    weight = 1
  ): this {
    return this.on(event, callback, context, weight, true);
  }

  off(
    event: string,
    callback: Callback | null = null,
    context: any = null
  ): this {
    if (!this._has(event)) return this;

    const self = internal(this);

    if (callback === null) {
      self._events.delete(event);
    } else {
      const callbacks = this._getCallbacks(event);
      const indicesToRemove: number[] = [];

      callbacks.forEach((cb, index) => {
        const callbackMatches = cb.originalCallback === callback;
        const contextMatches = context === null || cb.context === context;

        if (callbackMatches && contextMatches) {
          indicesToRemove.push(index);
        }
      });

      indicesToRemove.reverse().forEach((i) => callbacks.splice(i, 1));

      if (callbacks.length === 0) {
        self._events.delete(event);
      }
    }

    return this;
  }

  emit(event: string, ...args: any[]): this {
    const self = internal(this);

    self._emitQueue.push(() => {
      const callbacks = self._events.get(event);

      if (callbacks && callbacks.length > 0) {
        const snapshot = callbacks.slice();
        const toRemove: CallbackData[] = [];

        for (const cb of snapshot) {
          try {
            cb.callback(...args);
          } catch (err) {
            self._console.error(`Error in event "${event}" callback:`, err);
          }

          if (cb.once) {
            toRemove.push(cb);
          }
        }

        if (toRemove.length > 0) {
          for (const cb of toRemove) {
            const idx = callbacks.indexOf(cb);
            if (idx !== -1) callbacks.splice(idx, 1);
          }
          if (callbacks.length === 0) {
            self._events.delete(event);
          }
        }
      }

      if (self._anyCallbacks.length > 0) {
        const anySnapshot = self._anyCallbacks.slice();
        for (const fn of anySnapshot) {
          try {
            fn(event, ...args);
          } catch (err) {
            self._console.error(`Error in onAny listener:`, err);
          }
        }
      }
    });

    if (self._emitting) return this;

    self._emitting = true;
    try {
      while (self._emitQueue.length > 0) {
        const task = self._emitQueue.shift()!;
        task();
      }
    } finally {
      self._emitting = false;
    }

    return this;
  }

  async emitAsync(event: string, ...args: any[]): Promise<this> {
    const self = internal(this);

    return new Promise<this>((resolve) => {
      self._emitQueue.push(async () => {
        const callbacks = self._events.get(event);

        if (callbacks && callbacks.length > 0) {
          const snapshot = callbacks.slice();
          const toRemove: CallbackData[] = [];

          for (const cb of snapshot) {
            try {
              await cb.callback(...args);
            } catch (err) {
              self._console.error(
                `Error in async event "${event}" callback:`,
                err
              );
            }

            if (cb.once) {
              toRemove.push(cb);
            }
          }

          if (toRemove.length > 0) {
            for (const cb of toRemove) {
              const idx = callbacks.indexOf(cb);
              if (idx !== -1) callbacks.splice(idx, 1);
            }
            if (callbacks.length === 0) {
              self._events.delete(event);
            }
          }
        }

        if (self._anyCallbacks.length > 0) {
          const anySnapshot = self._anyCallbacks.slice();
          for (const fn of anySnapshot) {
            try {
              await fn(event, ...args);
            } catch (err) {
              self._console.error(`Error in async onAny listener:`, err);
            }
          }
        }

        resolve(this);
      });

      if (self._emitting) return;

      self._emitting = true;

      (async () => {
        try {
          while (self._emitQueue.length > 0) {
            const task = self._emitQueue.shift()!;
            await task();
          }
        } finally {
          self._emitting = false;
        }
      })();
    });
  }

  onAny(callback: Callback): this {
    const self = internal(this);
    if (typeof callback !== "function") {
      throw new TypeError("Callback must be a function");
    }

    if (self._anyCallbacks.includes(callback)) {
      self._console.warn("onAny callback already exists");
      return this;
    }

    self._anyCallbacks.push(callback);
    return this;
  }

  offAny(callback: Callback): this {
    const self = internal(this);

    const index = self._anyCallbacks.indexOf(callback);
    if (index !== -1) {
      self._anyCallbacks.splice(index, 1);
    }

    return this;
  }

  clear(): this {
    const self = internal(this);
    self._events.clear();
    self._anyCallbacks.length = 0;
    return this;
  }

  listenersNumber(event: string): number {
    const self = internal(this);
    const callbacks = self._events.get(event);
    return callbacks ? callbacks.length : 0;
  }

  eventNames(): string[] {
    const self = internal(this);
    return Array.from(self._events.keys());
  }

  listeners(event: string): Callback[] {
    return this._has(event)
      ? this._getCallbacks(event).map((cb) => cb.originalCallback)
      : [];
  }

  setMaxListeners(maxListeners: number | null): this {
    const self = internal(this);
    if (maxListeners !== null) {
      const parsed = parseInt(maxListeners as any, 10);
      self._maxListeners = isNaN(parsed) ? null : Math.max(0, parsed);
    } else {
      self._maxListeners = null;
    }
    return this;
  }

  getMaxListeners(): number | null {
    return internal(this)._maxListeners;
  }

  private _has(event: string): boolean {
    return internal(this)._events.has(event);
  }

  private _getCallbacks(event: string): CallbackData[] {
    const self = internal(this);
    if (!self._events.has(event)) {
      self._events.set(event, []);
    }
    return self._events.get(event)!;
  }

  private _callbackExists(
    event: string,
    callback: Callback,
    context: any
  ): boolean {
    if (!this._has(event)) return false;
    const callbacks = this._getCallbacks(event);
    return callbacks.some((cb) => {
      return cb.originalCallback === callback && cb.context === context;
    });
  }
}
