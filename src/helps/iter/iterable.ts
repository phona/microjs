export default interface Iterable<T> {
  next(): T
  forEach(fn: (item: T) => void): void
  map<V>(fn: (item: T) => V): Iterable<V>
  filter(fn: (item: T) => boolean): Iterable<T>
  collect(): T[]
}
