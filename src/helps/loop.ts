import Iterable from './iter/iterable'
import Iter from './iter/iter'
import error from './iter/error'

export default class <T> {
	private array: T[]
	private iter: Iter<T>

	constructor(iter: Iterable<T>) { 
		this.array = iter.collect()
		this.iter = new Iter(this.array)
	}

	next(): T {
		try {
			return this.iter.next()
		} catch(e) {
			if (e === error.StopIterationError) {
				this.iter = new Iter(this.array)	
				return this.iter.next()
			}
			throw e
		}
	}
}
