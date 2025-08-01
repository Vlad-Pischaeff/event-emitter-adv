import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../src';

describe('EventEmitter', () => {
  it('should call listener on emit', () => {
    const emitter = new EventEmitter();
    const mock = vi.fn();

    emitter.on('test', mock);
    emitter.emit('test', 'data');

    expect(mock).toHaveBeenCalledWith('data');
  });

  it('should call once listener only once', () => {
    const emitter = new EventEmitter();
    const mock = vi.fn();

    emitter.once('load', mock);
    emitter.emit('load');
    emitter.emit('load');

    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('should support async listeners with emitAsync', async () => {
    const emitter = new EventEmitter();
    const mock = vi.fn();

    emitter.on('async', async (x: number) => {
      await new Promise(res => setTimeout(res, 10));
      mock(x * 2);
    });

    await emitter.emitAsync('async', 2);

    expect(mock).toHaveBeenCalledWith(4);
  });

  it('should call onAny listener for all events', () => {
    const emitter = new EventEmitter();
    const mock = vi.fn();

    emitter.onAny(mock);
    emitter.emit('a', 1);
    emitter.emit('b', 2);

    expect(mock).toHaveBeenCalledTimes(2);
    expect(mock).toHaveBeenCalledWith('a', 1);
    expect(mock).toHaveBeenCalledWith('b', 2);
  });
});
