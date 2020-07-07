import request from './helps/request'
import HttpError from './helps/http-error'
import { JSONObject } from './helps/defines'

enum STATE {
  PENDING = 0,
  FULFILLED,
  REJECTED,
}

// Throwable
type Resolver<T, V> = (arg: T | void) => Assure<V> | V | void

type Rejecter<T> = (error: Error) => Assure<T> | T | void

type AsyncFn<T> = (resolve: (arg: T) => void, reject: (error: Error) => void) => void

// const numb = 0;

const noop = (): void => undefined

type AssureResult<T> = Assure<T> | T | Error | void

// T: OutputType
class Assure<T> {
  private children: Assure<unknown>[]
  // private numb: number
  private result: AssureResult<T>
  private state: STATE
  private onResolved: Resolver<T, unknown> | Resolver<unknown, T>
  private onRejected: Rejecter<unknown>

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

  private pipe(next: Assure<T>): void {
    this.then(
      (arg) => {
        next.state = STATE.FULFILLED
        next.result = arg
        next.children.forEach((child) => child.process(arg))
      },
      (e) => {
        next.state = STATE.REJECTED
        next.result = e
        next.children.forEach((child) => child.process(e))
      },
    )
  }

  private process(result: AssureResult<unknown>): void {
    this.result = result as T
    if (result instanceof Assure) {
      result.pipe(this)
    } else if (result instanceof Error) {
      let subResult: AssureResult<T> = result
      if (this.onRejected && typeof this.onRejected === 'function') {
        try {
          subResult = this.onRejected(result) as T
          if (subResult instanceof Assure) {
            subResult.pipe(this)
            return
          }
          this.result = subResult
        } catch (e) {
          this.result = subResult = e as Error
        }
      }
      this.state = STATE.REJECTED
      this.children.forEach((subChild) => subChild.process(subResult))
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
      this.children.forEach((subChild) => subChild.process(subResult))
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

  public then<V>(onResolved: Resolver<T, V>, onRejected?: Rejecter<V>): Assure<V> {
    const assure = new Assure<V>(noop)
    assure.onResolved = onResolved
    assure.onRejected = onRejected
    this.children.push(assure)
    if (this.state !== STATE.PENDING) {
      assure.process(this.result)
    } else {
      this.invokeAsyncFn()
    }
    return assure
  }

  public catch<V>(onError: Rejecter<V>): Assure<V> {
    const assure = new Assure<V>(noop)
    assure.onRejected = onError
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

export default { wrap, get, post, HttpError, STATE }
