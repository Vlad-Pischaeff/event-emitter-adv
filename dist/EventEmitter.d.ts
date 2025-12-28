type Callback = (...args: any[]) => void | Promise<void>;
/**
 * EventEmitter class for event-driven programming.
 */
export default class EventEmitter {
    constructor(maxListeners?: number | null, localConsole?: Console);
    on(event: string, callback: Callback, context?: any, weight?: number, once?: boolean): this;
    once(event: string, callback: Callback, context?: any, weight?: number): this;
    off(event: string, callback?: Callback | null, context?: any): this;
    emit(event: string, ...args: any[]): this;
    emitAsync(event: string, ...args: any[]): Promise<this>;
    onAny(callback: Callback): this;
    offAny(callback: Callback): this;
    clear(): this;
    listenersNumber(event: string): number;
    eventNames(): string[];
    listeners(event: string): Callback[];
    setMaxListeners(maxListeners: number | null): this;
    getMaxListeners(): number | null;
    private _has;
    private _getCallbacks;
    private _callbackExists;
}
export {};
