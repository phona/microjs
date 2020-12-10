import Iter from "./iter"
import Iterable from "./iterable"

type Item<K, V> = [K, V]

export default class<K extends keyof any, V> extends Iter<Item<K, V>> {
	public constructor(obj: Record<K, V>) {
		const results = []
		for (const k in obj) {
			results.push([k, obj[k]])
		}
		super(results)
	}

	public keys(): Iterable<K> {
		return this.map(item => item[0])
	}

	public values(): Iterable<V> {
		return this.map(item => item[1])
	}

	public items<T>(fn: (k: K, v: V) => T): Iterable<T> {
		return this.map(item => fn(item[0], item[1]))
	}
}
