# event-emitter-adv

A powerful and flexible TypeScript EventEmitter implementation with advanced features like priority-based listeners, context binding, and asynchronous event processing.

## Features

- **Priority-based listeners** - Control execution order with weights
- **Context binding** - Bind callbacks to specific contexts
- **One-time listeners** - Automatically remove after first trigger
- **Global listeners** - Listen to all events with `onAny`
- **Async support** - Both synchronous and asynchronous event emission with queue-based processing
- **Private state** - Uses WeakMap for truly private internal state
- **Error handling** - Graceful error handling with custom console
- **Max listeners** - Configurable limit on listeners per event
- **Node.js compatible** - Synchronous `emit()` with snapshot semantics and re-entrant execution

## Installation
```bash
npm install event-emitter-adv
```

## API Summary

| Method                                          | Description                              | Returns          |
|-------------------------------------------------|------------------------------------------|------------------|
| `on(event, callback, context?, weight?, once?)` | Add a listener to an event               | `this`           |
| `once(event, callback, context?, weight?)`      | Add a one-time listener                  | `this`           |
| `off(event, callback?, context?)`               | Remove listener(s) from an event         | `this`           |
| `emit(event, ...args)`                          | Trigger an event synchronously           | `this`           |
| `emitAsync(event, ...args)`                     | Trigger an event asynchronously          | `Promise<this>`  |
| `onAny(callback)`                               | Register a global listener for all events| `this`           |
| `offAny(callback)`                              | Remove a global listener                 | `this`           |
| `clear()`                                       | Remove all listeners                     | `this`           |
| `removeAllListeners(event?)`                    | Remove all listeners for an event        | `this`           |
| `listenersNumber(event)`                        | Get number of listeners for an event     | `number`         |
| `eventNames()`                                  | Get all registered event names           | `string[]`       |
| `listeners(event)`                              | Get all listener functions for an event  | `Function[]`     |
| `setMaxListeners(max)`                          | Set maximum listeners per event          | `this`           |
| `getMaxListeners()`                             | Get current max listeners limit          | `number \| null` |

## Basic Usage
```typescript
import { EventEmitter } from 'event-emitter-adv';

const emitter = new EventEmitter();

// Listen to an event
emitter.on('data', (value) => {
  console.log('Received:', value);
});

// Emit an event
emitter.emit('data', 'Hello World'); // Output: Received: Hello World
```

## API Reference

### Constructor
```typescript
new EventEmitter(maxListeners?: number | null, localConsole?: Console)
```

**Parameters:**
- `maxListeners` - Maximum number of listeners per event (default: `null` - unlimited)
- `localConsole` - Custom console for logging (default: `console`)

**Example:**
```typescript
const emitter = new EventEmitter(10); // Max 10 listeners per event
const customEmitter = new EventEmitter(null, customConsole);
```

---

### `on(event, callback, context?, weight?, once?)`

Add a listener to an event.

**Parameters:**
- `event: string` - Event name (required, non-empty)
- `callback: Function` - Callback function (required)
- `context: any` - Context to bind callback to (default: `null`)
- `weight: number` - Priority weight, higher executes first (default: `1`)
- `once: boolean` - Remove after first execution (default: `false`)

**Returns:** `this` (for chaining)

**Throws:**
- `TypeError` if event is not a non-empty string
- `TypeError` if callback is not a function

**Example:**
```typescript
// Basic listener
emitter.on('click', () => console.log('Clicked!'));

// With context
const obj = { name: 'Button' };
emitter.on('click', function() {
  console.log(this.name); // 'Button'
}, obj);

// With priority (higher weight = earlier execution)
emitter.on('init', () => console.log('Third'), null, 1);
emitter.on('init', () => console.log('First'), null, 10);
emitter.on('init', () => console.log('Second'), null, 5);
emitter.emit('init'); // Output: First, Second, Third
```

---

### `once(event, callback, context?, weight?)`

Add a one-time listener that removes itself after first execution.

**Parameters:**
- `event: string` - Event name
- `callback: Function` - Callback function
- `context: any` - Context to bind callback to (default: `null`)
- `weight: number` - Priority weight (default: `1`)

**Returns:** `this`

**Example:**
```typescript
emitter.once('ready', () => console.log('Ready!'));
emitter.emit('ready'); // Output: Ready!
emitter.emit('ready'); // No output
```

---

### `off(event, callback?, context?)`

Remove listener(s) from an event.

**Parameters:**
- `event: string` - Event name
- `callback: Function | null` - Specific callback to remove, or `null` to remove all (default: `null`)
- `context: any` - Context to match, or `null` to match any context (default: `null`)

**Returns:** `this`

**Behavior:**
- If `callback` is `null`, removes all listeners for the event
- If `context` is `null`, removes listeners matching the callback regardless of context
- If both are provided, removes only exact matches

**Example:**
```typescript
const handler = () => console.log('Event');
emitter.on('test', handler);
emitter.off('test', handler); // Remove specific handler
emitter.off('test'); // Remove all handlers for 'test'
```

---

### `emit(event, ...args)`

Trigger an event synchronously with Node.js-compatible semantics.

**Parameters:**
- `event: string` - Event name
- `...args: any[]` - Arguments to pass to listeners

**Returns:** `this`

**Throws:** The first error thrown by any listener (after all listeners complete)

**Behavior:**
- Listeners are invoked **immediately** in the current call stack
- Listener list is **snapshotted** at the start of the call
- Adding/removing listeners during `emit()` doesn't affect current emission
- **Re-entrant**: Nested `emit()` calls start new independent emissions
- **Error handling**: Errors are logged, execution continues, first error is thrown at the end
- **Async listeners**: Promises are **not awaited** and behave like unhandled rejections

**Example:**
```typescript
emitter.on('data', (msg) => console.log(msg));
emitter.emit('data', 'Hello'); // Output: Hello

// Nested emits work correctly
emitter.on('nested', () => {
  console.log('First');
  emitter.emit('inner'); // Executes immediately with own snapshot
});
emitter.on('inner', () => console.log('Inner'));
emitter.emit('nested'); // Output: First, Inner
```

---

### `emitAsync(event, ...args)`

Trigger an event asynchronously with serialized execution.

**Parameters:**
- `event: string` - Event name
- `...args: any[]` - Arguments to pass to listeners

**Returns:** `Promise<this>` - Resolves after all listeners complete

**Behavior:**
- Listeners execute **sequentially** (one at a time)
- Async listeners are **awaited** before proceeding
- Multiple `emitAsync()` calls are queued and processed in order
- Errors are **logged** but don't stop execution
- Guaranteed non-overlapping execution

**Example:**
```typescript
emitter.on('fetch', async (url) => {
  const data = await fetch(url);
  console.log(data);
});

await emitter.emitAsync('fetch', 'https://api.example.com');
console.log('All async listeners finished');
```

---

### `onAny(callback)`

Register a global listener that receives all events.

**Parameters:**
- `callback: (event: string, ...args: any[]) => void` - Callback receiving event name and arguments

**Returns:** `this`

**Throws:** `TypeError` if callback is not a function

**Behavior:**
- Invoked for **every** event
- Executed **after** event-specific listeners
- Duplicate callbacks are not added (warning is logged)

**Example:**
```typescript
emitter.onAny((event, ...args) => {
  console.log(`Event "${event}" fired with:`, args);
});

emitter.emit('test', 1, 2, 3); // Output: Event "test" fired with: [1, 2, 3]
```

---

### `offAny(callback)`

Remove a global listener.

**Parameters:**
- `callback: Function` - The callback to remove

**Returns:** `this`

**Example:**
```typescript
const logger = (event, ...args) => console.log(event, args);
emitter.onAny(logger);
emitter.offAny(logger);
```

---

### `clear()`

Remove all event listeners and wildcard listeners.

**Returns:** `this`

**Example:**
```typescript
emitter.on('data', handler);
emitter.onAny(logger);
emitter.clear(); // All listeners removed
```

---

### `removeAllListeners(event?)`

Remove all listeners for a specific event or all events.

**Parameters:**
- `event?: string` - Event name. If omitted, removes all listeners for all events.

**Returns:** `this`

**Example:**
```typescript
emitter.removeAllListeners('data'); // Remove only 'data' listeners
emitter.removeAllListeners();       // Remove all listeners
```

---

### `listenersNumber(event)`

Get the number of listeners for a specific event.

**Parameters:**
- `event: string` - Event name

**Returns:** `number` - Number of listeners (0 if event has no listeners)

**Example:**
```typescript
emitter.on('test', () => {});
emitter.on('test', () => {});
console.log(emitter.listenersNumber('test')); // Output: 2
```

---

### `eventNames()`

Get all registered event names.

**Returns:** `string[]` - Array of event names (empty if no events)

**Example:**
```typescript
emitter.on('click', () => {});
emitter.on('hover', () => {});
console.log(emitter.eventNames()); // Output: ['click', 'hover']
```

---

### `listeners(event)`

Get all listener functions for an event.

**Parameters:**
- `event: string` - Event name

**Returns:** `Function[]` - Array of original callback functions (empty if no listeners)

**Example:**
```typescript
const handler = () => {};
emitter.on('test', handler);
console.log(emitter.listeners('test')); // Output: [handler]
```

---

### `setMaxListeners(maxListeners)`

Set the maximum number of listeners per event.

**Parameters:**
- `maxListeners: number | null` - Max listeners, or `null` for unlimited

**Returns:** `this`

**Behavior:**
- If `null`, no limit is enforced
- Non-integers are parsed and clamped to >= 0
- When limit is reached, warning is logged but listeners can still be added

**Example:**
```typescript
emitter.setMaxListeners(5); // Max 5 listeners per event
emitter.setMaxListeners(null); // Unlimited
```

---

### `getMaxListeners()`

Get the current maximum listeners limit.

**Returns:** `number | null` - Maximum listeners per event, or `null` if unlimited

**Example:**
```typescript
emitter.setMaxListeners(10);
console.log(emitter.getMaxListeners()); // Output: 10
```

---

## Advanced Examples

### Priority-based Execution

Listeners with higher weight execute first:
```typescript
const emitter = new EventEmitter();

emitter.on('process', () => console.log('Low priority'), null, 1);
emitter.on('process', () => console.log('High priority'), null, 10);
emitter.on('process', () => console.log('Medium priority'), null, 5);

emitter.emit('process');
// Output:
// High priority
// Medium priority
// Low priority
```

### Context Binding

Preserve `this` context in callbacks:
```typescript
class Logger {
  prefix = '[LOG]';
  
  log(message: string) {
    console.log(`${this.prefix} ${message}`);
  }
}

const logger = new Logger();
emitter.on('log', logger.log, logger);
emitter.emit('log', 'Hello'); // Output: [LOG] Hello
```

### Error Handling

Errors in listeners don't stop other listeners:
```typescript
const emitter = new EventEmitter();

emitter.on('risky', () => {
  throw new Error('Something went wrong');
});

emitter.on('risky', () => {
  console.log('This still executes');
});

try {
  emitter.emit('risky');
} catch (error) {
  console.error('First error caught:', error.message);
}
// Output:
// Error logged to console
// This still executes
// First error caught: Something went wrong
```

### Re-entrant Emit

Nested `emit()` calls are fully supported:
```typescript
const emitter = new EventEmitter();

emitter.on('outer', () => {
  console.log('Outer start');
  emitter.emit('inner'); // Executes immediately
  console.log('Outer end');
});

emitter.on('inner', () => {
  console.log('Inner');
});

emitter.emit('outer');
// Output:
// Outer start
// Inner
// Outer end
```

### Async Event Processing with Queue

`emitAsync()` ensures sequential, non-overlapping execution:
```typescript
const emitter = new EventEmitter();

emitter.on('save', async (data) => {
  await database.save(data);
  console.log('Saved to database');
});

emitter.on('save', async (data) => {
  await cache.invalidate(data.id);
  console.log('Cache invalidated');
});

// Both emitAsync calls are queued and processed sequentially
emitter.emitAsync('save', { id: 1, name: 'Test' });
emitter.emitAsync('save', { id: 2, name: 'Test2' });

// Output (guaranteed order):
// Saved to database
// Cache invalidated
// Saved to database
// Cache invalidated
```

### Mixing Sync and Async Emits
```typescript
emitter.on('event', async () => {
  console.log('Start async');
  await delay(100);
  console.log('End async');
});

emitter.emit('event'); // Returns immediately, doesn't wait
console.log('After emit');

// Output:
// After emit
// Start async
// End async (after 100ms)

await emitter.emitAsync('event'); // Waits for completion
console.log('After emitAsync');

// Output:
// Start async
// End async (after 100ms)
// After emitAsync
```

### Global Event Monitoring
```typescript
const emitter = new EventEmitter();

// Monitor all events
emitter.onAny((eventName, ...args) => {
  console.log(`[Monitor] ${eventName}:`, args);
});

emitter.emit('login', { userId: 123 });
// Output: [Monitor] login: [{ userId: 123 }]

emitter.emit('logout');
// Output: [Monitor] logout: []
```

## TypeScript Support

Full TypeScript support with proper type definitions:
```typescript
import { EventEmitter } from 'event-emitter-adv';

const emitter = new EventEmitter();

// Type-safe event handling
interface UserData {
  id: number;
  name: string;
}

emitter.on('user:update', (data: UserData) => {
  console.log(data.id, data.name);
});

emitter.emit('user:update', { id: 1, name: 'Alice' });
```

## Internal Architecture

### Private State Management

Uses WeakMap for truly private state that cannot be accessed from outside:
```typescript
const privateMap = new WeakMap<object, InternalState>();

interface InternalState {
  _events: Map<string, CallbackData[]>;
  _anyCallbacks: Callback[];
  _console: Console;
  _maxListeners: number | null;
  _emitQueue: Array<() => void | Promise<void>>;
  _emitting: boolean;
}
```

This ensures:
- No property name collisions
- Memory is automatically cleaned when emitter is garbage collected
- State is completely inaccessible from outside the class

### Synchronous Emit with Snapshot Semantics

`emit()` uses Node.js-compatible execution model:

1. **Snapshot the listener list** - Creates a shallow copy at the start
2. **Execute synchronously** - All listeners run in the current call stack
3. **Handle re-entrancy** - Nested `emit()` calls create their own snapshots
4. **Error handling** - Log errors, continue execution, throw first error at end
```typescript
emit(event: string, ...args: any[]): this {
  const callbacks = self._events.get(event);
  if (callbacks && callbacks.length > 0) {
    const snapshot = callbacks.slice(); // Independent snapshot
    
    for (const cb of snapshot) {
      try {
        cb.callback(...args); // Synchronous execution
      } catch (err) {
        // Log and continue
      }
    }
  }
  return this;
}
```

### Async Queue Processing

`emitAsync()` uses a queue system for serialized async execution:

1. **Add task to queue** - Each `emitAsync()` adds a task
2. **Check processing flag** - If already processing, just queue and return
3. **Process queue asynchronously** - Uses `Promise.resolve().then()` for next tick
4. **Sequential execution** - Each task awaits before moving to next
5. **Cleanup** - Reset flag after queue is empty
```typescript
async emitAsync(event: string, ...args: any[]): Promise<this> {
  const taskPromise = new Promise<this>((resolve) => {
    self._emitQueue.push(async () => {
      // Execute callbacks sequentially
      for (const cb of snapshot) {
        await cb.callback(...args);
      }
      resolve(this);
    });
  });

  if (!self._emitting) {
    self._emitting = true;
    void Promise.resolve().then(async () => {
      while (self._emitQueue.length > 0) {
        const task = self._emitQueue.shift()!;
        await task();
      }
      self._emitting = false;
    });
  }

  return taskPromise;
}
```

### Weight-based Sorting

Listeners are sorted by weight at insertion time:
- Higher weight = earlier execution
- Same weight = insertion order preserved
- Efficient insertion using `findIndex` and `splice`
```typescript
const insertIndex = callbacks.findIndex((cb) => cb.weight < weight);
if (insertIndex === -1) {
  callbacks.push(callbackData); // Lowest weight, add to end
} else {
  callbacks.splice(insertIndex, 0, callbackData); // Insert at correct position
}
```

## Best Practices

1. **Use meaningful event names**: 
   - ✅ `'user:login'`, `'data:received'`
   - ❌ `'event1'`, `'callback'`

2. **Clean up listeners**: 
```typescript
   componentWillUnmount() {
     emitter.off('data', this.handleData);
   }
```

3. **Use context binding**: 
```typescript
   // ✅ Good - context parameter
   emitter.on('click', this.handleClick, this);
   
   // ❌ Avoid - creates new function each time
   emitter.on('click', this.handleClick.bind(this));
```

4. **Set max listeners**: 
```typescript
   const emitter = new EventEmitter(10); // Prevent memory leaks
```

5. **Handle errors in listeners**: 
```typescript
   emitter.on('risky', () => {
     try {
       riskyOperation();
     } catch (error) {
       console.error('Operation failed:', error);
     }
   });
```

6. **Use `once()` for one-time events**: 
```typescript
   emitter.once('ready', () => initialize());
```

7. **Choose the right emit method**:
```typescript
   // Use emit() for fire-and-forget
   emitter.emit('log', message);
   
   // Use emitAsync() when you need to wait
   await emitter.emitAsync('save', data);
```

8. **Avoid memory leaks**:
```typescript
   // Always remove listeners when done
   const handler = () => console.log('Event');
   emitter.on('temp', handler);
   // ... later
   emitter.off('temp', handler);
```

## Performance Considerations

- **WeakMap overhead**: Minimal, provides automatic garbage collection
- **Async queue**: Adds serialization overhead but prevents race conditions
- **Weight sorting**: O(n) insertion, but n is typically small
- **Snapshot creation**: Each `emit()` creates a shallow copy for safety
- **Memory**: Listeners stored efficiently in arrays

## Common Patterns

### Event Namespacing
```typescript
// Use colons to namespace events
emitter.on('user:login', handleLogin);
emitter.on('user:logout', handleLogout);
emitter.on('data:load', handleDataLoad);
emitter.on('data:save', handleDataSave);
```

### Event Chaining
```typescript
emitter
  .on('start', onStart)
  .on('progress', onProgress)
  .on('complete', onComplete)
  .emit('start');
```

### Middleware Pattern
```typescript
class Middleware {
  constructor(private emitter: EventEmitter) {}
  
  use(handler: Callback, weight = 1) {
    this.emitter.on('request', handler, null, weight);
    return this;
  }
  
  async execute(data: any) {
    await this.emitter.emitAsync('request', data);
  }
}
```

## Troubleshooting

### Listener not executing

- Check event name spelling
- Verify listener was added before emit
- Check if max listeners reached
- Verify listener wasn't removed by `once` or `off`

### Context is undefined

- Use context parameter: `emitter.on('event', callback, context)`
- Or use arrow functions: `emitter.on('event', () => this.method())`

### Async listeners not awaited

- Use `emitAsync()` instead of `emit()`
- Remember: `emit()` doesn't wait for async functions

### Memory leak warnings

- Call `off()` to remove listeners
- Use `once()` for one-time events
- Set appropriate `maxListeners`
- Clean up in component unmount/destroy methods

## Migration Guide

### From Node.js EventEmitter
```typescript
// Node.js EventEmitter
const { EventEmitter } = require('events');
const emitter = new EventEmitter();
emitter.on('data', callback);
emitter.emit('data', value);

// event-emitter-adv (compatible + extras)
import { EventEmitter } from 'event-emitter-adv';
const emitter = new EventEmitter();
emitter.on('data', callback); // Same API
emitter.on('data', callback, context, weight); // Plus priority
await emitter.emitAsync('data', value); // Plus async support
```

### Key Differences from Node.js

1. **Priority/weight support** - Control execution order
2. **`emitAsync()` method** - Serialized async execution
3. **`onAny()` wildcard** - Listen to all events
4. **Context binding** - Built-in `this` binding
5. **WeakMap state** - Truly private internals

## License

MIT

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## Repository

GitHub: [https://github.com/Vlad-Pischaeff/event-emitter-adv](https://github.com/Vlad-Pischaeff/event-emitter-adv)

---

Created by Владислав Пищаев / Vlad Pishchaev