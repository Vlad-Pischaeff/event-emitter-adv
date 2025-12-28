# event-emitter-adv

A powerful and flexible TypeScript EventEmitter implementation with advanced features like priority-based listeners, context binding, and nested emit support.

## Features

- **Priority-based listeners** - Control execution order with weights
- **Context binding** - Bind callbacks to specific contexts
- **One-time listeners** - Automatically remove after first trigger
- **Global listeners** - Listen to all events with `onAny`
- **Async support** - Both synchronous and asynchronous event emission
- **Private state** - Uses WeakMap for truly private internal state
- **Error handling** - Graceful error handling with custom console
- **Max listeners** - Configurable limit on listeners per event
- **Nested emit support** - Queue-based approach handles nested emits correctly

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
| `clear()`                                       | Remove all listeners and clear queue     | `this`           |
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
- `context: any` - Context to match (default: `null`)

**Returns:** `this`

**Example:**
```typescript
const handler = () => console.log('Event');
emitter.on('test', handler);
emitter.off('test', handler); // Remove specific handler
emitter.off('test'); // Remove all handlers for 'test'
```

---

### `emit(event, ...args)`

Trigger an event synchronously. Supports nested emits through queue-based processing.

**Parameters:**
- `event: string` - Event name
- `...args: any[]` - Arguments to pass to listeners

**Returns:** `this`

**Example:**
```typescript
emitter.emit('message', 'Hello', 123, { data: true });

// Nested emits work correctly
emitter.on('nested', () => {
  console.log('First');
  emitter.emit('nested'); // Queued, not executed immediately
});
emitter.on('nested', () => console.log('Second'));
emitter.emit('nested'); // Output: First, Second, First, Second
```

---

### `emitAsync(event, ...args)`

Trigger an event asynchronously, awaiting each listener sequentially.

**Parameters:**
- `event: string` - Event name
- `...args: any[]` - Arguments to pass to listeners

**Returns:** `Promise<this>`

**Example:**
```typescript
emitter.on('fetch', async (url) => {
  const data = await fetch(url);
  console.log(data);
});

await emitter.emitAsync('fetch', 'https://api.example.com');
```

---

### `onAny(callback)`

Register a global listener that receives all events.

**Parameters:**
- `callback: (event: string, ...args: any[]) => void` - Callback receiving event name and arguments

**Returns:** `this`

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

Remove all listeners and clear the event queue.

**Returns:** `this`

**Example:**
```typescript
emitter.clear(); // All listeners removed
```

---

### `listenersNumber(event)`

Get the number of listeners for a specific event.

**Parameters:**
- `event: string` - Event name

**Returns:** `number`

**Example:**
```typescript
emitter.on('test', () => {});
emitter.on('test', () => {});
console.log(emitter.listenersNumber('test')); // Output: 2
```

---

### `eventNames()`

Get all registered event names.

**Returns:** `string[]`

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

**Returns:** `Function[]` - Array of original callback functions

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

**Example:**
```typescript
emitter.setMaxListeners(5); // Max 5 listeners per event
emitter.setMaxListeners(null); // Unlimited
```

---

### `getMaxListeners()`

Get the current maximum listeners limit.

**Returns:** `number | null`

**Example:**
```typescript
console.log(emitter.getMaxListeners()); // Output: null or number
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

emitter.emit('risky');
// Error is logged to console, but execution continues
// Output: This still executes
```

### Nested Emits

Queue-based system handles nested emits correctly:

```typescript
const emitter = new EventEmitter();

let count = 0;
emitter.on('recursive', () => {
  console.log(`Call ${++count}`);
  if (count < 3) {
    emitter.emit('recursive'); // Safely queued
  }
});

emitter.emit('recursive');
// Output:
// Call 1
// Call 2
// Call 3
```

### Async Event Processing

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

await emitter.emitAsync('save', { id: 1, name: 'Test' });
// Listeners execute sequentially
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

type Callback = (...args: any[]) => void | Promise<void>;

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
  _emitQueue: Array<() => void>;
  _emitting: boolean;
}
```

This ensures:
- No property name collisions
- Memory is automatically cleaned when emitter is garbage collected
- State is completely inaccessible from outside the class

### Queue-based Emit Processing

Nested emits are handled through a queue system to prevent recursion issues:

1. **Each emit adds a task to the queue** - Instead of executing immediately
2. **Check if already processing** - If `_emitting` flag is true, just queue and return
3. **Process queue sequentially** - Main loop processes all queued tasks one by one
4. **Cleanup** - Reset flag after all tasks are complete

This ensures correct execution order even with complex nested emits:

```typescript
emit(event: string, ...args: any[]): this {
  self._emitQueue.push(() => { /* execute callbacks */ });
  
  if (self._emitting) return this; // Already processing, just queue
  
  self._emitting = true;
  try {
    while (self._emitQueue.length > 0) {
      self._emitQueue.shift()!(); // Execute each queued task
    }
  } finally {
    self._emitting = false;
  }
  
  return this;
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
   // ✅ Good
   emitter.on('click', this.handleClick, this);
   
   // ❌ Avoid
   emitter.on('click', this.handleClick.bind(this));
   ```

4. **Set max listeners**: 
   ```typescript
   const emitter = new EventEmitter(10); // Prevent memory leaks
   ```

5. **Handle errors**: 
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

7. **Avoid memory leaks**:
   ```typescript
   // Always remove listeners when done
   const handler = () => console.log('Event');
   emitter.on('temp', handler);
   // ... later
   emitter.off('temp', handler);
   ```

## Performance Considerations

- **WeakMap overhead**: Minimal, provides automatic garbage collection
- **Queue system**: Adds slight overhead but prevents stack overflow
- **Weight sorting**: O(n) insertion, but n is typically small
- **Snapshot creation**: Each emit creates a shallow copy for safety
- **Memory**: Listeners are stored efficiently in arrays

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
  
  execute(data: any) {
    this.emitter.emit('request', data);
  }
}
```

## Troubleshooting

### Listener not executing

- Check event name spelling
- Verify listener was added before emit
- Check if max listeners reached

### Context is undefined

- Use context parameter: `emitter.on('event', callback, context)`
- Or use arrow functions: `emitter.on('event', () => this.method())`

### Memory leak warnings

- Call `off()` to remove listeners
- Use `once()` for one-time events
- Set appropriate `maxListeners`

## Migration Guide

### From Node.js EventEmitter

```typescript
// Node.js
emitter.on('data', callback);
emitter.emit('data', value);

// This library (same API, plus extras)
emitter.on('data', callback);
emitter.on('data', callback, context, weight); // With priority
emitter.emit('data', value);
```

### From Custom Implementation

```typescript
// Before
listeners['event'].push(callback);

// After
emitter.on('event', callback);
```

## License

MIT

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## Support

- GitHub Issues: [https://github.com/Vlad-Pischaeff/event-emitter-adv/issues]

---

Created by Владислав Пищаев/Vlad Pishchaev