type Callback = (...args: any[]) => void;
/**
 * EventEmitter class for event-driven programming.
 */
export default class EventEmitter {
    constructor(maxListeners?: number | null, localConsole?: Console);
    /** Add a listener to an event */
    on(event: string, callback: Callback, context?: any, weight?: number, count?: number): this;
    /** Add a one-time listener to an event */
    once(event: string, callback: Callback, context?: any, weight?: number): this;
    /** Remove one or all listeners for an event */
    off(event: string, callback?: Callback | null, context?: any): this;
    /** Trigger an event synchronously */
    emit(event: string, ...args: any[]): this;
    /** Trigger an event asynchronously (supports await) */
    /** Trigger an event asynchronously (supports await) */
    emitAsync(event: string, ...args: any[]): Promise<this>;
    /** Register a listener for all events */
    onAny(callback: Callback): this;
    /** Remove a global listener */
    offAny(callback: Callback): this;
    /** Remove all listeners */
    clear(): this;
    /** Get the number of listeners for an event */
    listenersNumber(event: string): number;
    /** Get all event names */
    eventNames(): string[];
    /** Get all listeners for a specific event */
    listeners(event: string): Callback[];
    /** Check if an event exists */
    private _has;
    /** Get or initialize callback list for event */
    private _getCallbacks;
    /** Check max listener limit */
    private _achieveMaxListener;
    /** Check if callback already exists */
    private _callbackExists;
}
export {};
