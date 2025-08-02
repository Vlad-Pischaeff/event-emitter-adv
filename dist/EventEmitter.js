const MANY = 0;
const ONCE = 1;
const DONE = 2;
const privateMap = new WeakMap();
function internal(obj) {
    if (!privateMap.has(obj)) {
        privateMap.set(obj, {
            _events: new Map(),
            _anyCallbacks: [],
            _console: console,
            _maxListeners: null,
        });
    }
    return privateMap.get(obj);
}
/**
 * EventEmitter class for event-driven programming.
 */
export default class EventEmitter {
    constructor(maxListeners = null, localConsole = console) {
        const self = internal(this);
        self._console = localConsole;
        self._maxListeners =
            maxListeners === null ? null : parseInt(maxListeners, 10);
    }
    /** Add a listener to an event */
    on(event, callback, context = null, weight = 1, mode = MANY) {
        const self = internal(this);
        if (typeof event !== "string" || !event.trim()) {
            throw new TypeError("Event name must be a non-empty string");
        }
        if (typeof callback !== "function") {
            throw new TypeError(`${callback} is not a function`);
        }
        if (this._has(event) && this._achieveMaxListener(event)) {
            self._console.warn(`Max listeners (${self._maxListeners}) for event "${event}" is reached!`);
            return this;
        }
        if (this._callbackExists(event, callback, context)) {
            self._console.warn(`Event "${event}" already has the specified callback.`);
            return this;
        }
        const boundCallback = context ? callback.bind(context) : callback;
        const callbackData = {
            callback: boundCallback,
            originalCallback: callback,
            weight,
            mode,
            context,
        };
        const callbacks = this._getCallbacks(event);
        const insertIndex = callbacks.findIndex((cb) => cb.weight < weight);
        if (insertIndex === -1) {
            callbacks.push(callbackData);
        }
        else {
            callbacks.splice(insertIndex, 0, callbackData);
        }
        return this;
    }
    /** Add a one-time listener to an event */
    once(event, callback, context = null, weight = 1) {
        return this.on(event, callback, context, weight, ONCE);
    }
    /** Remove one or all listeners for an event */
    off(event, callback = null, context = null) {
        if (!this._has(event))
            return this;
        const self = internal(this);
        if (callback === null) {
            self._events.delete(event);
        }
        else {
            const callbacks = this._getCallbacks(event);
            const indicesToRemove = [];
            callbacks.forEach((cb, index) => {
                const callbackMatches = cb.originalCallback === callback || cb.callback === callback;
                const contextMatches = context === null || cb.context === context;
                if (callbackMatches && contextMatches) {
                    indicesToRemove.push(index);
                }
            });
            // Удаляем в обратном порядке чтобы не сбить индексы
            indicesToRemove.reverse().forEach((i) => callbacks.splice(i, 1));
            if (callbacks.length === 0) {
                self._events.delete(event);
            }
        }
        return this;
    }
    /** Trigger an event synchronously */
    emit(event, ...args) {
        const self = internal(this);
        // обычные обработчики
        if (this._has(event)) {
            const callbacks = this._getCallbacks(event).slice();
            const callbacksToRemove = [];
            callbacks.forEach((cb, i) => {
                if (cb.mode !== DONE) {
                    try {
                        cb.callback(...args);
                    }
                    catch (err) {
                        self._console.error(`Error in event "${event}" callback:`, err);
                    }
                    if (cb.mode === ONCE) {
                        cb.mode = DONE;
                        callbacksToRemove.push(i);
                    }
                }
            });
            if (callbacksToRemove.length > 0) {
                const actual = this._getCallbacks(event);
                callbacksToRemove.reverse().forEach((i) => actual.splice(i, 1));
                if (actual.length === 0)
                    self._events.delete(event);
            }
        }
        // onAny обработчики
        if (self._anyCallbacks && self._anyCallbacks.length > 0) {
            self._anyCallbacks.forEach((fn) => {
                try {
                    fn(event, ...args);
                }
                catch (err) {
                    self._console.error(`Error in onAny listener:`, err);
                }
            });
        }
        return this;
    }
    /** Trigger an event asynchronously (supports await) */
    async emitAsync(event, ...args) {
        const self = internal(this);
        const hasRegular = this._has(event);
        if (hasRegular) {
            const callbacks = this._getCallbacks(event).slice();
            const callbacksToRemove = [];
            for (let i = 0; i < callbacks.length; i++) {
                const cb = callbacks[i];
                if (cb.mode !== DONE) {
                    try {
                        await cb.callback(...args);
                    }
                    catch (err) {
                        self._console.error(`Error in async event "${event}" callback:`, err);
                    }
                    if (cb.mode === ONCE) {
                        cb.mode = DONE;
                        callbacksToRemove.push(i);
                    }
                }
            }
            if (callbacksToRemove.length > 0) {
                const actual = this._getCallbacks(event);
                callbacksToRemove.reverse().forEach((i) => actual.splice(i, 1));
                if (actual.length === 0)
                    self._events.delete(event);
            }
        }
        // Call onAny even if there are no normal listeners
        const anyCallbacks = self._anyCallbacks || [];
        for (const fn of anyCallbacks) {
            try {
                await fn(event, ...args);
            }
            catch (err) {
                self._console.error(`Error in async onAny listener:`, err);
            }
        }
        return this;
    }
    /** Register a listener for all events */
    onAny(callback) {
        const self = internal(this);
        if (typeof callback !== "function") {
            throw new TypeError("Callback must be a function");
        }
        // Проверяем, не добавлен ли уже этот колбэк
        if (self._anyCallbacks.includes(callback)) {
            self._console.warn("onAny callback already exists");
            return this;
        }
        self._anyCallbacks.push(callback);
        return this;
    }
    /** Remove a global listener */
    offAny(callback) {
        const self = internal(this);
        if (!self._anyCallbacks)
            return this;
        self._anyCallbacks = self._anyCallbacks.filter((cb) => cb !== callback);
        return this;
    }
    /** Remove all listeners */
    clear() {
        const self = internal(this);
        self._events.clear();
        self._anyCallbacks = [];
        return this;
    }
    /** Get the number of listeners for an event */
    listenersNumber(event) {
        return this._has(event) ? this._getCallbacks(event).length : 0;
    }
    /** Get all event names */
    eventNames() {
        return Array.from(internal(this)._events.keys());
    }
    /** Get all listeners for a specific event */
    listeners(event) {
        return this._has(event)
            ? this._getCallbacks(event).map((cb) => cb.callback)
            : [];
    }
    /** Check if an event exists */
    _has(event) {
        return internal(this)._events.has(event);
    }
    /** Get or initialize callback list for event */
    _getCallbacks(event) {
        const self = internal(this);
        if (!self._events.has(event)) {
            self._events.set(event, []);
        }
        return self._events.get(event);
    }
    /** Check max listener limit */
    _achieveMaxListener(event) {
        const self = internal(this);
        return (self._maxListeners !== null &&
            self._maxListeners <= this.listenersNumber(event));
    }
    /** Check if callback already exists */
    _callbackExists(event, callback, context) {
        if (!this._has(event))
            return false;
        const callbacks = this._getCallbacks(event);
        return callbacks.some((cb) => {
            if (cb.callback === callback)
                return true;
            if (context && cb.context === context) {
                return cb.callback.toString() === callback.toString();
            }
            return false;
        });
    }
}
