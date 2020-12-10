import iter from "../src/helps/iter";
import error from '../src/helps/iter/error'

test('iter.testFromRange', done => {
	const it = iter.Iter.fromRange(0, 5)
	const arr = it.collect()
	expect(arr).toEqual([0, 1, 2, 3, 4])
	done()
})

test('iter.testMap', done => {
	const it = iter.Iter.fromRange(0, 5)
	const arr = it.map(item => item * 2).collect()
	expect(arr).toEqual([0, 2, 4, 6, 8])
	done()
})

test('iter.testFilter', done => {
	const it = iter.Iter.fromRange(0, 5)
	const arr = it.filter(item => item % 2 === 0).collect()
	expect(arr).toEqual([0, 2, 4])
	done()
})

test('iter.testNext', done => {
	const it = iter.Iter.fromRange(0, 5)
	expect(it.next()).toBe(0)
	expect(it.next()).toBe(1)
	expect(it.next()).toBe(2)
	expect(it.next()).toBe(3)
	expect(it.next()).toBe(4)

	try {
		it.next()
	} catch (e) {
		expect(e).toBe(error.StopIterationError)
	}

	done()
})