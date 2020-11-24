import request from './helps/request'
import HttpError from './helps/http-error'
import { JSONObject } from './helps/defines'
import { includes, forEach } from './helps/arrays'

const VERSION = 2.1

enum STATE {
  PENDING = 0,
  FULFILLED,
  REJECTED,
}

type AsyncFn<T> = (resolve: (arg: T) => void, reject: (error: Error) => void) => void

// const numb = 0;

const noop = (): void => undefined

/**
* promise like interface back compatible interface but has little different
* which based on more older version javascript interpreter
*/
interface Thenable<T> {
  then<R1 = T, R2 = never>(onfulfilled?: ((value: T) => R1 | Thenable<R1>) | undefined | null, onrejected?: ((reason: any) => R2 | Thenable<R2>) | undefined | null): Thenable<R1 | R2>;
  capture<R = never>(onrejected?: ((reason: any) => R | Thenable<R>) | undefined | null): Thenable<T | R>;
}

type FulfillmentHandler<T, R> = ((value: T) => R | Thenable<R>) | null | undefined;

type RejectionHandler<R> = ((reason: any) => R | Thenable<R>) | null | undefined;

type AssureResult<T> = Thenable<T> | T | undefined | null

// T: OutputType
class Assure<T> implements Thenable<T> {
  private children: Assure<unknown>[]
  // private numb: number
  private result: AssureResult<T>
  private state: STATE
  private onResolved: FulfillmentHandler<T, unknown>
  private onRejected: RejectionHandler<unknown>

  constructor(private asyncfn: AsyncFn<T>) {
    if (typeof asyncfn !== 'function') {
      throw new TypeError('Assure resolver is not a function')
    }

    this.children = []
    // this.numb = numb++
    this.result = null
    this.state = STATE.PENDING
    this.onResolved = null
    this.onRejected = null
  }

  public getResult(): AssureResult<T> {
    return this.result
  }

  private pipe(next: Assure<T>): void {
    next.state = this.state
    this.then(
      (arg) => {
        next.state = STATE.FULFILLED
        next.result = arg
        forEach(next.children, (child) => child.process(arg))
      },
      (e) => {
        next.state = STATE.REJECTED
        next.result = e
        forEach(next.children, (child) => child.process(e))
      },
    )
  }

  private process(result: AssureResult<unknown>): void {
    this.result = result as T
    if (result instanceof Assure) {
      result.pipe(this)
    } else if (result instanceof Error) {
      if (this.onRejected && typeof this.onRejected === 'function') {
        try {
          result = this.onRejected(result)
          if (result instanceof Assure) {
            result.pipe(this)
            return
          }
          this.result = result as T
        } catch (e) {
          this.result = result = e
        }
      }
      this.state = STATE.REJECTED
      forEach(this.children, (subChild) => subChild.process(result))
    } else {
      let subResult: AssureResult<T> = result as T
      if (this.onResolved && typeof this.onResolved === 'function') {
        try {
          subResult = this.onResolved(result as T) as T
          this.state = STATE.FULFILLED
          if (subResult instanceof Assure) {
            subResult.pipe(this)
            return
          } else if (subResult !== undefined) {
            this.result = subResult
          }
        } catch (e) {
          this.result = subResult = e as T
          this.state = STATE.REJECTED
        }
      } else {
        this.state = STATE.FULFILLED
      }
      forEach(this.children, (subChild) => subChild.process(subResult))
    }
  }

  private invokeAsyncFn(): void {
    if (this.asyncfn !== noop) {
      const resolve = (arg: T): void => {
        this.state = STATE.FULFILLED
        this.process(arg)
      }
      const reject = (error: Error): void => {
        this.state = STATE.REJECTED
        this.process(error)
      }

      try {
        this.asyncfn(resolve, reject)
      } catch (e) {
        this.state = STATE.REJECTED
        this.process(e)
      }
    }
  }

  public then<R1 = T, R2 = never>(
    onfulfilled?: ((value: T) => R1 | Thenable<R1>) | undefined | null,
    onrejected?: ((reason: any) => R2 | Thenable<R2>) | undefined | null
  ): Thenable<R1 | R2> {
    const assure = new Assure<R1 | R2>(noop)
    assure.onResolved = onfulfilled as FulfillmentHandler<unknown, unknown>
    assure.onRejected = onrejected
    this.children.push(assure)
    if (this.state !== STATE.PENDING) {
      assure.process(this.result)
    } else {
      this.invokeAsyncFn()
    }
    return assure
  }

  public capture<R = never>(
    onrejected?: ((reason: any) => R | Thenable<R>) | undefined | null
  ): Thenable<T | R> {
    const assure = new Assure<R>(noop)
    assure.onRejected = onrejected
    this.children.push(assure)
    if (this.state !== STATE.PENDING) {
      assure.process(this.result)
    } else {
      this.invokeAsyncFn()
    }
    return assure
  }
}

export function wrap<T>(fn: AsyncFn<T>): Assure<T> {
  return new Assure(fn)
}

export function all(assures: Assure<unknown>[]): Assure<unknown[]> {
  return new Assure<unknown[]>((resolve, reject) => {
    const results: unknown[] = []
    forEach(assures, (assure, index) => {
      void assure
        .then((result) => {
          results[index] = result
          if (results.length === assures.length && !includes(results, undefined)) {
            resolve(results)
          }
        })
        .capture((e) => {
          reject(e)
        })
    })
  })
}

export function get(config: {
  url: string
  headers?: Record<string, string>
  data?: JSONObject | string
  async?: boolean
  timeout?: number
}): Assure<string> {
  return wrap<string>((resolve, reject) => {
    const option = {
      url: config.url,
      method: 'GET',
      data: config.data,
      headers: config.headers,
      timeout: config.timeout,
      async: config.async,
      success: (content: string): void => resolve(content),
      error: (status: number, content: string): void => reject(new HttpError(status, content)),
    }
    request(option)
  })
}

export function post(config: {
  url: string
  headers?: Record<string, string>
  data?: JSONObject | string
  async?: boolean
  timeout?: number
}): Assure<string> {
  return wrap<string>((resolve, reject) => {
    const option = {
      url: config.url,
      method: 'POST',
      data: config.data,
      headers: config.headers,
      timeout: config.timeout,
      async: config.async,
      success: (content: string): void => resolve(content),
      error: (status: number, content: string): void => reject(new HttpError(status, content)),
    }
    request(option)
  })
}

export default { wrap, all, get, post, HttpError, STATE, VERSION, Assure }
