import { StopIterationError } from './error'
import Iterable from './iterable'

export default class <T> implements Iterable<T> {
  private index: number;

  public constructor(private iterable: T[]) {
    this.index = 0;
  }

  next(): T {
    if (this.index >= this.iterable.length) {
      throw StopIterationError
    }
    return this.iterable[this.index++]
  }

  forEach(fn: (item: T) => void): void {
    while (true) {
      try {
        fn(this.next())
      } catch (e) {
        if (e === StopIterationError) {
          break
        } else {
          throw e
        }
      }
    }
  }

  map<V>(fn: (item: T) => V): Iterable<V> {
    const results = []
    this.forEach(item => results.push(fn(item)))
    return new (<any>this.constructor)(results)
  }

  filter(fn: (item: T) => boolean): Iterable<T> {
    const results = []
    this.forEach(item => fn(item) && results.push(item))
    return new (<any>this.constructor)(results)
  }

  collect(): T[] {
    const results = []
    this.forEach(item => results.push(item))
    return results
  }

  static fromRange(start: number, end: number, step: number = 1): Iterable<number> {
    const results = []
    for (;start < end; start += step) {
      results.push(start)
    }
    return new this(results)
  }
}
