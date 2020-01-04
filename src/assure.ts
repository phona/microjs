enum STATE {
  PENDING = 0,
  FULFILLED,
  REJECTED,
}

interface CallbackFunc {
  (arg?: any): void;
}

class Assure {
  private state: STATE;
  private value: any;
  private children: Array<Assure>;
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
          this.onResolved.call(this, this.value)
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

export default function (routine: CallbackFunc): Assure {
  return Assure.makeAssureChain(routine)
}
