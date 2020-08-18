export function includes<T>(array: T[], item: T): boolean {
  return array.indexOf(item) >= 0
}

export function forEach<T>(array: T[], fn: (item: T, index?: number) => void): void {
  for (let i = 0; i < array.length; i++) {
    fn(array[i], i)
  }
}
