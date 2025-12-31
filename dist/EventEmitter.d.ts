type Callback = (...args: any[]) => void | Promise<void>;
/**
 * EventEmitter with synchronous, Node.js-compatible semantics.
 *
 * ## Design goals
 * - Fully synchronous `emit()`
 * - Re-entrant (nested) `emit()` calls are allowed
 * - Listener list is snapshotted per `emit()` call
 * - Compatible with Node.js `EventEmitter` execution model
 *
 * ## Important notes
 * - `emit()` does NOT return a Promise
 * - Async listeners are NOT awaited
 * - No internal event queue or serialization is used
 *
 * If you need deterministic async sequencing, use {@link emitAsync}
 * or an external dispatcher/queue.
 */
export default class EventEmitter {
    /**
     * Creates a new EventEmitter instance.
     *
     * @param maxListeners - Maximum number of listeners per event. `null` means unlimited.
     * @param localConsole - Console instance for logging warnings and errors.
     *
     * @example
     * ```typescript
     * const emitter = new EventEmitter(10, console);
     * ```
     */
    constructor(maxListeners?: number | null, localConsole?: Console);
    /**
     * Registers an event listener with optional weight and context.
     *
     * ### Weight-based ordering
     * - Listeners are executed in **descending weight order** (higher weights first).
     * - Default weight is `1`.
     *
     * ### Duplicate prevention
     * - If the same `callback` + `context` pair already exists for this event, it won't be added again.
     *
     * @param event - Event name. Must be a non-empty string.
     * @param callback - Function to invoke when the event is emitted.
     * @param context - Execution context (`this` binding). Defaults to `null`.
     * @param weight - Execution priority. Higher values execute first. Defaults to `1`.
     * @param once - If `true`, listener is removed after first invocation. Defaults to `false`.
     * @returns `this` for chaining.
     *
     * @throws {TypeError} If `event` is not a non-empty string or `callback` is not a function.
     *
     * @example
     * ```typescript
     * emitter.on('data', (msg) => console.log(msg), null, 10);
     * ```
     */
    on(event: string, callback: Callback, context?: any, weight?: number, once?: boolean): this;
    /**
     * Registers a one-time listener that is automatically removed after first invocation.
     *
     * @param event - Event name.
     * @param callback - Function to invoke once.
     * @param context - Execution context (`this` binding). Defaults to `null`.
     * @param weight - Execution priority. Defaults to `1`.
     * @returns `this` for chaining.
     *
     * @example
     * ```typescript
     * emitter.once('start', () => console.log('Started!'));
     * emitter.emit('start'); // Logs "Started!"
     * emitter.emit('start'); // No output
     * ```
     */
    once(event: string, callback: Callback, context?: any, weight?: number): this;
    /**
     * Removes all listeners for a specific event or all events.
     *
     * @param event - Event name. If omitted, removes **all** listeners for **all** events.
     * @returns `this` for chaining.
     *
     * @example
     * ```typescript
     * emitter.removeAllListeners('data'); // Remove only 'data' listeners
     * emitter.removeAllListeners();       // Remove all listeners
     * ```
     */
    removeAllListeners(event?: string): this;
    /**
     * Removes specific listeners matching the callback and/or context.
     *
     * ### Matching rules
     * - If `callback` is `null`, removes **all** listeners for the event (same as `removeAllListeners(event)`).
     * - If `context` is `null`, removes listeners matching the callback **regardless** of context.
     * - If both are provided, removes only exact matches.
     *
     * @param event - Event name.
     * @param callback - Listener function to remove. If `null`, removes all listeners.
     * @param context - Execution context. If `null`, matches any context.
     * @returns `this` for chaining.
     *
     * @example
     * ```typescript
     * const handler = () => console.log('hi');
     * emitter.on('greet', handler);
     * emitter.off('greet', handler); // Removes handler
     * ```
     */
    off(event: string, callback?: Callback | null, context?: any): this;
    /**
     * Synchronously emits an event to all registered listeners.
     *
     * ### Execution semantics
     * - Listeners are invoked **immediately**, in the current call stack.
     * - The list of listeners is **snapshotted** at the start of the call.
     * - Adding or removing listeners during `emit()` does **not** affect the current emission.
     *
     * ### Re-entrancy
     * - Calling `emit()` from inside a listener is **allowed**.
     * - A nested `emit()` starts a **new, independent emission** with its own listener snapshot.
     * - Nested emissions are executed immediately (no queuing or deferral).
     *
     * ### Error handling
     * - If a listener throws, the error is logged via `console.error`.
     * - Other listeners **continue** to execute.
     * - The **first** error is re-thrown **after** all listeners complete.
     *
     * ### Async listeners
     * - If a listener returns a Promise, it is **ignored**.
     * - Promises are **not awaited**.
     * - Rejected Promises behave like unhandled rejections (Node.js-like).
     *
     * @param event - Event name to emit. Must be a non-empty string.
     * @param args - Arguments passed to each listener.
     * @returns `this` for chaining.
     * @throws The first error thrown by any listener, after all listeners complete.
     *
     * @example
     * ```typescript
     * emitter.on('data', (msg) => console.log(msg));
     * emitter.emit('data', 'Hello'); // Logs "Hello"
     * ```
     */
    emit(event: string, ...args: any[]): this;
    /**
     * Asynchronously emits an event with serialized execution of listeners.
     *
     * ### Execution model
     * - Listeners are executed **sequentially** (one at a time) in an internal queue.
     * - Async listeners are **awaited** before proceeding to the next.
     * - Multiple `emitAsync()` calls are queued and processed in order.
     *
     * ### Error handling
     * - Errors are logged via `console.error`.
     * - Execution **continues** to the next listener (errors don't stop the queue).
     *
     * ### Guarantees
     * - The returned Promise resolves **after** all listeners for this event complete.
     * - Events emitted via `emitAsync()` never overlap — they are strictly serialized.
     *
     * @param event - Event name to emit.
     * @param args - Arguments passed to each listener.
     * @returns Promise that resolves to `this` after all listeners complete.
     *
     * @example
     * ```typescript
     * emitter.on('fetch', async (url) => {
     *   const res = await fetch(url);
     *   console.log(await res.text());
     * });
     *
     * await emitter.emitAsync('fetch', 'https://example.com');
     * console.log('All async listeners finished');
     * ```
     */
    emitAsync(event: string, ...args: any[]): Promise<this>;
    /**
     * Registers a wildcard listener that is invoked for **all** events.
     *
     * ### Behavior
     * - The callback receives `(eventName, ...args)` for every emitted event.
     * - Wildcard listeners are executed **after** event-specific listeners.
     * - Duplicate callbacks are not added (warning is logged).
     *
     * @param callback - Function invoked with `(event, ...args)` for all events.
     * @returns `this` for chaining.
     * @throws {TypeError} If `callback` is not a function.
     *
     * @example
     * ```typescript
     * emitter.onAny((event, ...args) => {
     *   console.log(`Event: ${event}`, args);
     * });
     *
     * emitter.emit('data', 42); // Logs: Event: data [42]
     * ```
     */
    onAny(callback: Callback): this;
    /**
     * Removes a wildcard listener registered via `onAny()`.
     *
     * @param callback - The function to remove.
     * @returns `this` for chaining.
     *
     * @example
     * ```typescript
     * const logger = (event, ...args) => console.log(event, args);
     * emitter.onAny(logger);
     * emitter.offAny(logger); // Removes logger
     * ```
     */
    offAny(callback: Callback): this;
    /**
     * Removes **all** event listeners and wildcard listeners.
     *
     * @returns `this` for chaining.
     *
     * @example
     * ```typescript
     * emitter.on('data', handler);
     * emitter.onAny(logger);
     * emitter.clear(); // All listeners removed
     * ```
     */
    clear(): this;
    /**
     * Returns the number of listeners registered for a specific event.
     *
     * @param event - Event name.
     * @returns Number of listeners (0 if event has no listeners).
     *
     * @example
     * ```typescript
     * emitter.on('data', handler1);
     * emitter.on('data', handler2);
     * console.log(emitter.listenersNumber('data')); // 2
     * ```
     */
    listenersNumber(event: string): number;
    /**
     * Returns an array of all registered event names.
     *
     * @returns Array of event names (empty if no events are registered).
     *
     * @example
     * ```typescript
     * emitter.on('data', handler);
     * emitter.on('error', handler);
     * console.log(emitter.eventNames()); // ['data', 'error']
     * ```
     */
    eventNames(): string[];
    /**
     * Returns an array of listener functions for a specific event.
     *
     * @param event - Event name.
     * @returns Array of original callback functions (empty if event has no listeners).
     *
     * @example
     * ```typescript
     * const handler = () => console.log('hi');
     * emitter.on('greet', handler);
     * console.log(emitter.listeners('greet')); // [handler]
     * ```
     */
    listeners(event: string): Callback[];
    /**
     * Sets the maximum number of listeners allowed per event.
     *
     * ### Behavior
     * - If `maxListeners` is `null`, no limit is enforced (unlimited).
     * - If a non-integer is provided, it's parsed and clamped to >= 0.
     * - When the limit is reached, a warning is logged but listeners can still be added.
     *
     * @param maxListeners - Maximum listeners per event, or `null` for unlimited.
     * @returns `this` for chaining.
     *
     * @example
     * ```typescript
     * emitter.setMaxListeners(5); // Warn after 5 listeners
     * emitter.setMaxListeners(null); // Unlimited
     * ```
     */
    setMaxListeners(maxListeners: number | null): this;
    /**
     * Returns the current maximum listener limit.
     *
     * @returns Maximum listeners per event, or `null` if unlimited.
     *
     * @example
     * ```typescript
     * emitter.setMaxListeners(10);
     * console.log(emitter.getMaxListeners()); // 10
     * ```
     */
    getMaxListeners(): number | null;
    /**
     * Checks if an event has any registered listeners.
     *
     * @param event - Event name.
     * @returns `true` if listeners exist, `false` otherwise.
     * @private
     */
    private _has;
    /**
     * Retrieves or initializes the callback array for an event.
     *
     * @param event - Event name.
     * @returns Array of callback data for the event.
     * @private
     */
    private _getCallbacks;
    /**
     * Checks if a callback with a specific context already exists for an event.
     *
     * @param event - Event name.
     * @param callback - Callback function.
     * @param context - Execution context.
     * @returns `true` if an exact match exists, `false` otherwise.
     * @private
     */
    private _callbackExists;
}
export {};
