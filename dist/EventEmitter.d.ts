type EventCallback = (...args: any[]) => void | Promise<void>;
type AnyEventCallback = (eventName: string, ...args: any[]) => void | Promise<void>;
/**
 * Advanced EventEmitter with priority, context, and call limits.
 */
export default class EventEmitter {
    /**
     * Constructor.
     * @param maxListeners Maximum listeners per event (null = unlimited)
     * @param localConsole Optional custom console for logging
     */
    constructor(maxListeners?: number | null, localConsole?: Console);
    /**
     * Internal: get callbacks array for given event (creates if missing)
     */
    private _getCallbacks;
    /**
     * Internal: check if an event exists
     */
    private _has;
    /**
     * Internal: check if max listener limit is reached
     */
    private _achieveMaxListener;
    /**
     * Internal: check if a specific callback with context is already added
     */
    private _callbackExists;
    /**
     * Internal: add a callback to the event list, ordered by weight
     */
    private _addCallback;
    /**
     * Subscribe to an event.
     * @param eventName Event name
     * @param callback Listener function
     * @param context Context (`this`) binding for callback
     * @param weight Higher value executes earlier (default: 1)
     * @param count How many times to call (0 = infinite, default)
     */
    on(eventName: string, callback: EventCallback, context?: any, weight?: number, count?: number): this;
    /**
     * Subscribe to an event only once.
     * @param eventName Event name
     * @param callback Listener
     * @param context Optional context
     * @param weight Priority weight
     */
    once(eventName: string, callback: EventCallback, context?: any, weight?: number): this;
    /**
     * Remove listeners from an event.
     * @param eventName Event name
     * @param callback Specific callback to remove (or null for all)
     * @param context Must match if callback is provided
     */
    off(eventName: string, callback?: EventCallback | null, context?: any): this;
    /**
     * Emit an event synchronously.
     */
    emit(eventName: string, ...args: any[]): this;
    /**
     * Emit event asynchronously. Waits for all handlers (including any listeners).
     */
    emitAsync(eventName: string, ...args: any[]): Promise<this>;
    /**
     * Register a wildcard listener for any event.
     * @param callback Called with (eventName, ...args)
     */
    onAny(callback: AnyEventCallback): this;
    /**
     * Remove wildcard listener.
     * @param callback The same function passed to `onAny`
     */
    offAny(callback: AnyEventCallback): this;
    /**
     * Remove all events and listeners.
     */
    clear(): this;
    /**
     * Get number of listeners on a given event.
     * @param eventName Event name
     */
    listenersNumber(eventName: string): number;
    /**
     * List all event names with listeners.
     */
    eventNames(): string[];
    /**
     * Get the active callbacks for an event.
     * @param eventName Event name
     */
    listeners(eventName: string): EventCallback[];
}
export {};
