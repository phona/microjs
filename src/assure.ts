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
  private children: {
    assure: Assure<T>;
    onResolved: Resolver<T>;
    onRejected: Rejecter<T>;
  }[]
  private numb: number
  private result: AssureResult<T>
  private state: STATE

  constructor(private asyncfn: AsyncFn<T>) {
    this.children = []
    this.numb = numb++
    this.result = null
    this.state = STATE.PENDING
  }

  private pipe(onResolved: Resolver<T>, onRejected: Rejecter<T>): void {
    this.then(
      arg => onResolved(arg),
      error => onRejected(error)
    )
  }

  private process(result: AssureResult<T>): void {
    if (result instanceof Assure) {
      this.children.forEach(child => {
        child.assure.asyncfn = result.asyncfn
        result.pipe(child.onResolved, child.onRejected)
        child.assure.invokeAsyncFn()
      })
      return
    }

    this.children.forEach(child => {
      try {
        if (result instanceof Error) {
          if (child.onRejected && typeof child.onRejected === "function") {
            let subResult: AssureResult<T>
            try {
              subResult = child.onRejected(result)
            } catch (e) {
              subResult = e
            }
            child.assure.process(subResult);
          } else {
            child.assure.children.forEach(subChild => {
              subChild.assure.process(result)
            })
          }
        } else {
          if (child.onResolved && typeof child.onResolved === "function") {
            let subResult: AssureResult<T>
            try {
              subResult = child.onResolved(result)
            } catch (e) {
              subResult = e
            }
            child.assure.process(subResult);
          } else {
            child.assure.children.forEach(subChild => {
              subChild.assure.process(result)
            })
          }
        }
      } catch (e) {
        const subResult = child.onRejected(e)
        child.assure.process(subResult);
      }
    })
  }

  private invokeAsyncFn(): void {
    if (this.result !== null) {
      this.process(this.result)
      return
    }

    const resolve = (arg: T): void => {
      this.result = arg
      this.state = STATE.FULFILLED
      this.process(arg)
    }
    const reject = (error: Error): void => {
      this.result = error
      this.state = STATE.REJECTED
      this.process(error)
    }
    this.asyncfn(resolve, reject)
  }

  public then(onResolved: Resolver<T>, onRejected?: Rejecter<T>): Assure<T> {
    const assure = new Assure<T>(noop)
    this.children.push({ assure, onResolved, onRejected })
    this.invokeAsyncFn()
    return assure
  }

  public catch(onError: Rejecter<T>): Assure<T> {
    const assure = new Assure<T>(noop)
    this.children.push({ assure, onResolved: undefined, onRejected: onError })
    this.invokeAsyncFn()
    return assure
  }
}

export function wrap<T>(fn: AsyncFn<T>): Assure<T> {
  return new Assure(fn)
}

export function get(url: string, params?: string | Record<string, string | number | object>, config?: object): Assure<string> {
  return wrap<string>(function () {
    const option = {
      url,
      data: params,
      success: (content: string): void => this.resolve(content),
      error: (status: number, content: string): void => this.reject(new HttpError(status, content))
    }
    for (const k in config) {
      option[k] = config[k]
    }
    request(option)
  })
}

export function post(url: string, data?: string | Record<string, string | number | object>, config?: object): Assure<string> {
  return wrap<string>(function () {
    const option = {
      url,
      data: data,
      method: 'POST',
      success: (content: string): void => this.resolve(content),
      error: (status: number, content: string): void => this.reject(new HttpError(status, content))
    }
    for (const k in config) {
      option[k] = config[k]
    }
    request(option)
  })
}

export default { wrap, get, post, HttpError }
