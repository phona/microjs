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

interface Resolve<T> {
  (arg: T | null): NewAssure<T> | T | void;
}

interface Reject<T> {
  (arg: Error | null): NewAssure<T> | T | void;
}

class NewAssure<T> {
  private value: T;
  private error: Error;
  private children: NewAssure<T>[]
  private onResolved: Resolve<T>;
  private onRejected: Reject<T>;

  public constructor(
    private routine: (
      resolve: (value: T | void) => void,
      reject: (error: Error) => void
    ) => void
  ) {
    this.onResolved = null;
    this.onRejected = null;
    this.children = [];
    this.value = null;
    this.error = null;
  }

  private process() {
    try {
      if (this.value instanceof Error) {
        const result = onRejected(this.value)
        if (result instanceof NewAssure) {
          return result
        } else if (result instanceof Error) {
          throw result
        } else {
          return new NewAssure<T>(resolve => resolve(result))
        }
      } else {
        const result = onResolved(this.value)
        if (result instanceof NewAssure) {
          return result
        } else {
          return new NewAssure<T>(resolve => resolve(result))
        }
      }
    } catch (e) {
      return new NewAssure<T>((resolve, reject) => reject(e))
    }
  }

  private resolve(arg: T) {
    this.children.forEach(child => {
      try {
        const result = child.onResolved(this.value)
      } catch (e) {
        child.children.forEach(subchild => {
          const subresult = subchild.onRejected(e)
        })
      }
    });
  }

  public then(
    onResolved: Resolve<T>,
    onRejected?: Reject<T>
  ): NewAssure<T> {
    this.onResolved = onResolved
    this.onRejected = onRejected

    if (this.value === null) {
      try {
        this.routine((arg: T) => {
          this.value = arg
          this.children.forEach(child => {
            try {
              child.onResolved(this.value)
            } catch (e) {

            }
          })
        }, (e: Error) => {
          this.error = e
        })
      } catch (e) {
        this.error = e
      }
    }
    return this
  }

  public catch(onError: ((arg: Error | null) => NewAssure<T> | T | void)): NewAssure<T> {
    try {
      if (this.value instanceof Error) {
        const result = onError(this.value)
        if (result instanceof NewAssure) {
          return result
        }
        return new NewAssure(resolve => resolve(result))
      }
    } catch (e) {
      return new NewAssure<T>((resolve, reject) => reject(e))
    }
    return this
  }
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

export function assure<T>(func: (
  resolve: (value: T | void) => void,
  reject: (error: Error) => void
) => void): NewAssure<T> {
  return new NewAssure<T>(func)
}

export default { wrap, get, post, HttpError, assure }
