import request from './helps/request'
import HTTPStatusCodes from './helps/http-status-codes'
import { EnumValues } from 'enum-values'

enum STATE {
  PENDING = 0,
  FULFILLED,
  REJECTED,
}

interface CallbackFunc {
  (arg: any): void;
}

class Assure {
  private state: STATE;
  private value: any;
  private children: Assure[];
  private onResolved: CallbackFunc;
  private onRejected: CallbackFunc;

  public constructor(routine: CallbackFunc, except?: CallbackFunc) {
    this.state = STATE.PENDING
    this.value = null
    this.children = []
    this.onResolved = routine
    this.onRejected = except
  }

  public static makeAssureChain(routine: CallbackFunc): Assure {
    const assure = new Assure(routine)
    assure.process()
    return assure
  }

  public reset(): Assure {
    this.state = STATE.PENDING
    this.value = null
    this.children = []
    return this
  }

  public resolve(arg: any): void {
    this.value = arg
    this.state = STATE.FULFILLED
    this.process()
  }

  public reject(arg: any): void {
    this.value = arg
    this.state = STATE.REJECTED
    this.process()
  }

  public then(onResolved: CallbackFunc, onRejected?: CallbackFunc): Assure {
    const child = new Assure(onResolved, onRejected)
    this.children.push(child)

    if (this.state !== STATE.PENDING) {
      child.value = this.value;
      child.process()
    }

    return child
  }

  public catch(onError: CallbackFunc): Assure {
    const child = new Assure(null, onError)
    this.children.push(child)
    return child
  }

  private process(): void {
    if (this.state < STATE.FULFILLED) {
      try {
        if (!(this.value instanceof Error)) {
          const ret = this.onResolved.call(this, this.value)
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

class HttpError extends Error {
  status: number;
  describe: string;

  constructor(status: number, describe: string) {
    if (!describe) {
      describe = EnumValues.getNameFromValue(HTTPStatusCodes, status).split('_').join(' ')
    }
    super(describe)
    this.status = status
    this.describe = describe
  }
}

export function wrap(routine: CallbackFunc): Assure {
  return Assure.makeAssureChain(routine)
}

export function get(url: string, params?: string | Record<string, string | number | object>, config?: object): Assure {
  return wrap(function () {
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

export function post(url: string, data?: string | Record<string, string | number | object>, config?: object): Assure {
  return wrap(function () {
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

export default { wrap, get, post }
