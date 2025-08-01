# event-emitter-plus

> A powerful, typed, and flexible EventEmitter for TypeScript and JavaScript.

`event-emitter-plus` is an advanced event system with:
- Prioritized listeners (via `weight`)
- One-time listeners
- Context binding (`this`)
- Max listener limits
- Global `onAny`/`offAny` wildcard events
- `emitAsync` for async/await-friendly usage

---

## 🚀 Installation

```bash
npm install event-emitter-plus
```

## Usage

### BasicUsage

```js
import { EventEmitter } from 'event-emitter-plus';

const emitter = new EventEmitter();

function greet(name: string) {
  console.log(`Hello, ${name}`);
}

emitter.on('hello', greet);
emitter.emit('hello', 'Alice'); // Hello, Alice
```

## Features

### 🔁 on(event, callback, context?, weight?, count?)
Register a callback for an event.

```js
emitter.on('data', (val) => console.log(val));
```

### ✅ once(event, callback, context?, weight?)
Emit an event synchronously.

```js
emitter.emit('log', 'This is a message');
```

### ⏳ emitAsync(event, ...args)
Emit an event and wait for all async handlers.

```js
await emitter.emitAsync('save', { userId: 1 });
```

### 🌐 onAny(callback)
Listen to all events.

```js
emitter.onAny((eventName, ...args) => {
  console.log(`Event "${eventName}" was emitted`, args);
});
```

### 🔕 offAny(callback)
Remove onAny listener.

```js
emitter.offAny(myCallback);
```

### 🧼 off(event, callback?, context?)
Remove a specific listener or all listeners for an event.

```js
emitter.off('data', myCallback);
emitter.off('data'); // remove all
```

## 📌 Prioritization with weight
Callbacks with higher weight run earlier.

```js
emitter.on('process', () => console.log('Low priority'), null, 1);
emitter.on('process', () => console.log('High priority'), null, 10);
emitter.emit('process');

// Output:
// High priority
// Low priority
```

## 🧠 Context binding
Pass this context to the callback:

```js
const logger = {
  prefix: '[LOG]',
  log(msg: string) {
    console.log(`${this.prefix} ${msg}`);
  }
};

emitter.on('info', logger.log, logger);
emitter.emit('info', 'It works');
// [LOG] It works
```

## 🔢 Limit max listeners

```js
const emitter = new EventEmitter(2); // max 2 listeners per event

emitter.on('e', () => {});
emitter.on('e', () => {});
emitter.on('e', () => {}); // will trigger a console warning
```

## 📚 API Summary

| Method                          | Description                          |
|---------------------------------|--------------------------------------|
| `on(event, fn, ctx?, w?, c?)`   | Add listener                         |
| `once(event, fn, ctx?, w?)`     | Add one-time listener                |
| `off(event, fn?, ctx?)`         | Remove one or all listeners          |
| `emit(event, ...args)`          | Trigger event                        |
| `emitAsync(event, ...args)`     | Async trigger with `await` support   |
| `onAny(fn)`                     | Listen to all events                 |
| `offAny(fn)`                    | Remove global listener               |
| `clear()`                       | Remove all listeners                 |
| `listeners(event)`              | Get listeners for an event           |
| `eventNames()`                  | List all event names                 |
| `listenersNumber(event)`        | Count listeners for an event         |

## ✅ TypeScript Support
All methods are fully typed with strict: true compatibility.

```js
const emitter = new EventEmitter();
emitter.on('data', (val: number) => { /* ... */ });
```

## 🧪 Testing / Local Development

```bash
npm install
npm run build
```

## 📄 License
MIT

## 🙌 Author
Created by Владислав Пищаев/Vlad Pishchaev

