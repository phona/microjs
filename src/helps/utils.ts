export function mergeObjects(obj1: Record<string, unknown>, obj2: Record<string, unknown>): void {
  for (const k in obj2) {
    if (k in obj1) {
      obj1[k] = obj2[k]
    }
  }
}
