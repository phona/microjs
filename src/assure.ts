import request from './helps/request'
import HttpError from './helps/http-error'

enum STATE {
  PENDING = 0,
  FULFILLED,
  REJECTED,
}

// Throwable
interface Handler<T> {
  (arg: T): Assure<T> | T | void;
}

class Assure<T> {
  private state: STATE;
  private value: T | Error;
  private children: Assure<T>[];
  private onResolved: Handler<T>;
  private onRejected: Handler<Error>;

  public constructor(routine: Handler<T> | undefined, except?: Handler<Error> | undefined) {
    this.state = STATE.PENDING
    this.value = null
    this.children = []
    this.onResolved = routine
    this.onRejected = except
  }

  public static makeAssureChain<T>(routine: Handler<T>): Assure<T> {
    const assure = new Assure<T>(routine)
    assure.process()
    return assure
  }

  public reset(): Assure<T> {
    this.state = STATE.PENDING
    this.value = null
    this.children = []
    return this
  }

  public resolve(arg: T): void {
    this.value = arg
    this.state = STATE.FULFILLED
    this.process()
  }

  public reject(arg: Error): void {
    this.value = arg
    this.state = STATE.REJECTED
    this.process()
  }

  public then(onResolved: Handler<T> | undefined, onRejected?: Handler<Error> | undefined): Assure<T> {
    const child = new Assure(onResolved, onRejected)
    this.children.push(child)

    if (this.state !== STATE.PENDING) {
      child.value = this.value;
      child.process()
    }

    return child
  }

  public catch(onError: Handler<Error>): Assure<T> {
    const child = new Assure<T>(function (arg: T) {
      this.resolve(arg);
    }, onError)
    this.children.push(child)
    return child
  }

  private process(): void {
    if (this.state < STATE.FULFILLED) {
      try {
        if (!(this.value instanceof Error) && this.onResolved) {
          const ret = this.onResolved.call(this, this.value)

          if (ret === this) {
            throw new TypeError("Return value can't be this assure object.")
          }

          if (ret instanceof Assure) {
            ret.then(
              arg => this.resolve(arg),
              err => this.reject(err)
            )
          }
        } else if (this.onRejected) {
          this.onRejected.call(this, this.value)
        } else {
          this.children.forEach(child => {
            child.value = this.value
            child.process()
          })
        }
      } catch (e) {
        this.value = e
        this.state = STATE.REJECTED
        this.children.forEach(child => {
          child.value = this.value
          child.process()
        })
      }
      return
    }

    this.children.forEach(child => {
      child.value = this.value
      child.process()
    })
  }
}

export function wrap<T>(routine: Handler<T>): Assure<T> {
  return Assure.makeAssureChain(routine)
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
