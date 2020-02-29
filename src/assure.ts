import request from './helps/request'
import HttpError from './helps/http-error'

enum STATE {
  PENDING = 0,
  FULFILLED,
  REJECTED,
}

// Throwable
interface Resolver<T> {
  (arg: T | void): Assure<T> | T | void;
}

interface Rejecter<T> {
  (error: Error): Assure<T> | T | void;
}

interface AsyncFn<T> {
  (resolve: (arg: T) => void, reject: (error: Error) => void): void;
}

let numb = 0;

const noop = (): void => undefined

type AssureResult<T> = Assure<T> | T | Error | void

class Assure<T> {
  private children: Assure<T>[]
  private numb: number
  private _result: AssureResult<T>
  private _state: STATE
  private onResolved: Resolver<T>
  private onRejected: Rejecter<T>

  constructor(private asyncfn: AsyncFn<T>) {
    if (typeof asyncfn !== "function") {
      throw new TypeError(`Assure resolver ${asyncfn} is not a function`)
    }

    this.children = []
    this.numb = numb++
    this._result = null
    this._state = STATE.PENDING
    this.onResolved = null
    this.onRejected = null
  }

  public get state(): STATE {
    return this._state
  }

  public get result(): AssureResult<T> {
    return this._result
  }

  private pipe(next: Assure<T>): void {
    this.then(
      arg => {
        next._state = STATE.FULFILLED
        next._result = arg
        next.children.forEach(child => child.process(arg))
      },
      e => {
        next._state = STATE.REJECTED
        next._result = e
        next.children.forEach(child => child.process(e))
      }
    )
  }

  private process(result: AssureResult<T>): void {
    this._result = result
    if (result instanceof Assure) {
      result.pipe(this)
    } else if (result instanceof Error) {
      let subResult: AssureResult<T> = result
      if (this.onRejected && typeof this.onRejected === "function") {
        try {
          subResult = this.onRejected(result)
          if (subResult instanceof Assure) {
            subResult.pipe(this)
            return
          }
          this._result = subResult
        } catch (e) {
          this._result = subResult = e
        }
      }
      this._state = STATE.REJECTED
      this.children.forEach(subChild => subChild.process(subResult))
    } else {
      let subResult: AssureResult<T> = result
      if (this.onResolved && typeof this.onResolved === "function") {
        try {
          subResult = this.onResolved(result)
          this._state = STATE.FULFILLED
          if (subResult instanceof Assure) {
            subResult.pipe(this)
            return
          } else if (subResult !== undefined) {
            this._result = subResult
          }
        } catch (e) {
          this._result = subResult = e
          this._state = STATE.REJECTED
        }
      } else {
        this._state = STATE.FULFILLED
      }
      this.children.forEach(subChild => subChild.process(subResult))
    }
  }

  private invokeAsyncFn(): void {
    if (this.asyncfn !== noop) {
      const resolve = (arg: T): void => {
        this._state = STATE.FULFILLED
        this.process(arg)
      }
      const reject = (error: Error): void => {
        this._state = STATE.REJECTED
        this.process(error)
      }

      try {
        this.asyncfn(resolve, reject)
      } catch (e) {
        this._state = STATE.REJECTED
        this.process(e)
      }
    }
  }

  public then(onResolved: Resolver<T>, onRejected?: Rejecter<T>): Assure<T> {
    const assure = new Assure<T>(noop)
    assure.onResolved = onResolved
    assure.onRejected = onRejected
    this.children.push(assure)
    if (this._state !== STATE.PENDING) {
      assure.process(this._result)
    } else {
      this.invokeAsyncFn()
    }
    return assure
  }

  public catch(onError: Rejecter<T>): Assure<T> {
    const assure = new Assure<T>(noop)
    assure.onRejected = onError
    this.children.push(assure)
    if (this._state !== STATE.PENDING) {
      assure.process(this._result)
    } else {
      this.invokeAsyncFn()
    }
    return assure
  }
}

export function wrap<T>(fn: AsyncFn<T>): Assure<T> {
  return new Assure(fn)
}

export function get(url: string, params?: string | Record<string, string | number | object>, config?: object): Assure<string> {
  return wrap<string>((resolve, reject) => {
    const option = {
      url,
      data: params,
      success: (content: string): void => resolve(content),
      error: (status: number, content: string): void => reject(new HttpError(status, content))
    }
    for (const k in config) {
      option[k] = config[k]
    }
    request(option)
  })
}

export function post(url: string, data?: string | Record<string, string | number | object>, config?: object): Assure<string> {
  return wrap<string>((resolve, reject) => {
    const option = {
      url,
      data: data,
      method: 'POST',
      success: (content: string): void => resolve(content),
      error: (status: number, content: string): void => reject(new HttpError(status, content))
    }
    for (const k in config) {
      option[k] = config[k]
    }
    request(option)
  })
}

export default { wrap, get, post, HttpError, STATE }
