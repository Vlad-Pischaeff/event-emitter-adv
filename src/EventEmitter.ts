const MANY = 0;
const ONCE = 1;
const DONE = 2;

type EventCallback = (...args: any[]) => void | Promise<void>;
type AnyEventCallback = (eventName: string, ...args: any[]) => void | Promise<void>;

interface CallbackData {
  callback: EventCallback;
  originalCallback: EventCallback;
  context: any;
  weight: number;
  count: number;
}

interface InternalData {
  _events: Map<string, CallbackData[]>;
  _console: Console;
  _maxListeners: number | null;
  _anyListeners: Set<AnyEventCallback>;
}

const privateMap = new WeakMap<object, InternalData>();

function internal(obj: object): InternalData {
  if (!privateMap.has(obj)) {
    privateMap.set(obj, {
      _events: new Map(),
      _console: console,
      _maxListeners: null,
      _anyListeners: new Set(),
    });
  }
  return privateMap.get(obj)!;
}

/**
 * Advanced EventEmitter with priority, context, and call limits.
 */
export default class EventEmitter {
  /**
   * Constructor.
   * @param maxListeners Maximum listeners per event (null = unlimited)
   * @param localConsole Optional custom console for logging
   */
  constructor(maxListeners: number | null = null, localConsole: Console = console) {
    const self = internal(this);
    self._console = localConsole;
    self._maxListeners = maxListeners !== null ? parseInt(maxListeners.toString(), 10) : null;
  }

  /**
   * Internal: get callbacks array for given event (creates if missing)
   */
  private _getCallbacks(eventName: string): CallbackData[] {
    const self = internal(this);
    if (!self._events.has(eventName)) {
      self._events.set(eventName, []);
    }
    return self._events.get(eventName)!;
  }

  /**
   * Internal: check if an event exists
   */
  private _has(eventName: string): boolean {
    return internal(this)._events.has(eventName);
  }

  /**
   * Internal: check if max listener limit is reached
   */
  private _achieveMaxListener(eventName: string): boolean {
    const self = internal(this);
    return self._maxListeners !== null && self._maxListeners <= this.listenersNumber(eventName);
  }

  /**
   * Internal: check if a specific callback with context is already added
   */
  private _callbackExists(eventName: string, callback: EventCallback, context: any): boolean {
    if (!this._has(eventName)) return false;
    const callbacks = this._getCallbacks(eventName);
    return callbacks.some(cb => cb.originalCallback === callback && cb.context === context);
  }

  /**
   * Internal: add a callback to the event list, ordered by weight
   */
  private _addCallback(
    eventName: string,
    callback: EventCallback,
    context: any,
    weight: number,
    count: number
  ): this {
    const boundCallback = context ? callback.bind(context) : callback;
    const callbackData: CallbackData = {
      callback: boundCallback,
      originalCallback: callback,
      context,
      weight,
      count
    };

    const callbacks = this._getCallbacks(eventName);
    const insertIndex = callbacks.findIndex(cb => cb.weight < weight);

    if (insertIndex === -1) {
      callbacks.push(callbackData);
    } else {
      callbacks.splice(insertIndex, 0, callbackData);
    }

    return this;
  }

  /**
   * Subscribe to an event.
   * @param eventName Event name
   * @param callback Listener function
   * @param context Context (`this`) binding for callback
   * @param weight Higher value executes earlier (default: 1)
   * @param count How many times to call (0 = infinite, default)
   */
  on(
    eventName: string,
    callback: EventCallback,
    context: any = null,
    weight = 1,
    count = MANY
  ): this {
    const self = internal(this);

    if (typeof eventName !== 'string' || !eventName.trim()) {
      throw new TypeError('Event name must be a non-empty string');
    }

    if (typeof callback !== 'function') {
      throw new TypeError(`${callback} is not a function`);
    }

    if (this._has(eventName) && this._achieveMaxListener(eventName)) {
      self._console.warn(`Max listeners (${self._maxListeners}) for event "${eventName}" is reached!`);
      return this;
    }

    if (this._callbackExists(eventName, callback, context)) {
      self._console.warn(`Event "${eventName}" already has the specified callback.`);
      return this;
    }

    return this._addCallback(eventName, callback, context, weight, count);
  }

  /**
   * Subscribe to an event only once.
   * @param eventName Event name
   * @param callback Listener
   * @param context Optional context
   * @param weight Priority weight
   */
  once(eventName: string, callback: EventCallback, context: any = null, weight = 1): this {
    return this.on(eventName, callback, context, weight, ONCE);
  }

  /**
   * Remove listeners from an event.
   * @param eventName Event name
   * @param callback Specific callback to remove (or null for all)
   * @param context Must match if callback is provided
   */
  off(eventName: string, callback: EventCallback | null = null, context: any = null): this {
    const self = internal(this);
    if (!this._has(eventName)) return this;

    if (callback === null) {
      self._events.delete(eventName);
    } else {
      const callbacks = this._getCallbacks(eventName);
      const filtered = callbacks.filter(cb =>
        !(cb.originalCallback === callback && cb.context === context)
      );
      if (filtered.length > 0) {
        self._events.set(eventName, filtered);
      } else {
        self._events.delete(eventName);
      }
    }

    return this;
  }

  /**
   * Emit an event synchronously.
   */
  emit(eventName: string, ...args: any[]): this {
    if (!this._has(eventName)) return this;

    const callbacks = this._getCallbacks(eventName).slice();
    const actualCallbacks = this._getCallbacks(eventName);
    let changed = false;

    for (let i = callbacks.length - 1; i >= 0; i--) {
      const cb = callbacks[i];
      if (cb.count === DONE) continue;

      try {
        cb.callback(...args);
      } catch (err) {
        internal(this)._console.error(`Error in event "${eventName}" callback:`, err);
      }

      if (cb.count === ONCE) {
        const idx = actualCallbacks.findIndex(x => x === cb);
        if (idx !== -1) {
          actualCallbacks.splice(idx, 1);
          changed = true;
        }
      }
    }

    // 🔔 Any listeners
    for (const listener of internal(this)._anyListeners) {
      try {
        listener(eventName, ...args);
      } catch (err) {
        internal(this)._console.error(`Error in any-listener for "${eventName}":`, err);
      }
    }

    if (changed && actualCallbacks.length === 0) {
      internal(this)._events.delete(eventName);
    }

    return this;
  }

  /**
   * Emit event asynchronously. Waits for all handlers (including any listeners).
   */
  async emitAsync(eventName: string, ...args: any[]): Promise<this> {
    if (this._has(eventName)) {
      const callbacks = this._getCallbacks(eventName).slice();
      const actualCallbacks = this._getCallbacks(eventName);
      const toRemove: CallbackData[] = [];

      for (const cb of callbacks) {
        if (cb.count === DONE) continue;

        try {
          await cb.callback(...args);
        } catch (err) {
          internal(this)._console.error(`Error in async event "${eventName}" callback:`, err);
        }

        if (cb.count === ONCE) {
          toRemove.push(cb);
        }
      }

      toRemove.forEach(cb => {
        const idx = actualCallbacks.indexOf(cb);
        if (idx !== -1) actualCallbacks.splice(idx, 1);
      });

      if (actualCallbacks.length === 0) {
        internal(this)._events.delete(eventName);
      }
    }

    // 🔔 Async any listeners
    const anyListeners = [...internal(this)._anyListeners];
    for (const listener of anyListeners) {
      try {
        await listener(eventName, ...args);
      } catch (err) {
        internal(this)._console.error(`Error in async any-listener for "${eventName}":`, err);
      }
    }

    return this;
  }

  /**
   * Register a wildcard listener for any event.
   * @param callback Called with (eventName, ...args)
   */
  onAny(callback: AnyEventCallback): this {
    internal(this)._anyListeners.add(callback);
    return this;
  }

  /**
   * Remove wildcard listener.
   * @param callback The same function passed to `onAny`
   */
  offAny(callback: AnyEventCallback): this {
    internal(this)._anyListeners.delete(callback);
    return this;
  }

  /**
   * Remove all events and listeners.
   */
  clear(): this {
    internal(this)._events.clear();
    return this;
  }

  /**
   * Get number of listeners on a given event.
   * @param eventName Event name
   */
  listenersNumber(eventName: string): number {
    return this._has(eventName) ? this._getCallbacks(eventName).length : 0;
  }

  /**
   * List all event names with listeners.
   */
  eventNames(): string[] {
    return Array.from(internal(this)._events.keys());
  }

  /**
   * Get the active callbacks for an event.
   * @param eventName Event name
   */
  listeners(eventName: string): EventCallback[] {
    return this._has(eventName)
      ? this._getCallbacks(eventName).map(cb => cb.callback)
      : [];
  }
}
