;(function(global) {
  var STATE = {
    PENDING: 0,
    FULFILLED: 1,
    REJECTED: 2,
  }

  function Callback(func) {
    this.func = func
    this.result = null
    this.ran = false
  }
  /*
  promise(
    function() {
      var that = this;
      setTimeout(function() {
        that.resolve(1);
      }, 500)
    }
  ).then(
    function(val) {
      console.log(val);

      var that = this;
      setTimeout(function() {
        that.resolve(2);
      }, 500)
    }
  ).then(
    function(val) {
      console.log(val);
    }
  ).catch(
    function(err) {
      console.error(err);
    }
  )

  */
  function Promise(routine) {
    this.state = STATE.PENDING
    this.deferred = false
    this.value = null
    this.handlers = []
    this.routine = routine
  }

  Promise.prototype = {
    resolve: function(arg) {
      if (this.state !== STATE.FULFILLED) {
        return this
      }

      this.value = arg
      this.state = STATE.FULFILLED

      this.process()

      return this
    },

    reject: function(arg) {
      if (this.state !== STATE.PENDING) {
        return this
      }

      this.value = arg
      this.state = STATE.REJECTED

      this.process()

      return this
    },

    then: function(onResolved, onRejected) {
      var child = new Promise(onResolved)
      this.handlers.push({
        onRejected: onRejected,
        promise: child,
      })

      if (this.state === STATE.PENDING) {
        this.process()
      }

      return child
    },

    catch: function(onError) {
      var child = new Promise()
      this.handlers.push({
        onError: new Callback(onError),
        promise: child,
      })

      if (this.state === STATE.PENDING) {
        this.process()
      }

      return child
    },

    process: function() {
      if (!this.deferred) {
        this.deferred = true
        var that = this
        async(function() {
          that.processing()
        })
      }
    },

    processing: function() {
      this.deferred = false

      if (this.state !== STATE.PENDING) {
        var value = this.value

        for (var i in this.handlers) {
          var handler = this.handlers[i],
            callback = this.routine,
            child = handler.child

          if (!callback || typeof callback !== 'function') {
            if (value && typeof value.then === 'function') {
              pipe(value, child)
            } else {
              child.resolve(value)
            }

            return
          }

          var result
          try {
            var that = this
            result = callback.call(
              {
                resolve: function(arg) {
                  that.resolve(arg)
                },
                reject: function(arg) {
                  that.reject(arg)
                },
              },
              value
            )
          } catch (e) {
            child.reject(e)

            return
          }

          if (result && typeof result.then === 'function') {
            pipe(result, child)
          } else if (!(result instanceof Error)) {
            child.resolve(result)
          } else {
            child.reject(result)
          }
        }
      }

      return this
    },
  }

  function dispatch(parent, child) {
    var routine = parent.routine
    var value = parent.value

    if (!routine || typeof routine !== 'function') {
      pipe(parent, child)
      return
    }

    if (parent.state > STATE.PENDING) {
    }

    var func = parent.state < STATE.FULFILLED ? routine : true

    try {
      var that = this
      routine.call(
        {
          resolve: function(arg) {
            that.resolve(arg)
          },
          reject: function(arg) {
            that.reject(arg)
          },
        },
        value
      )
    } catch (e) {
      parent.value = e
      parent.state = STATE.REJECTED
      child.reject(e)
      return
    }

    if (parent.value === value) {
      parent.value = null
    }

    if (!(parent.value instanceof Error)) {
      child.resolve(parent.value)
    } else {
      child.reject(parent.value)
    }
  }

  //-----------------------Utils------------------------
  function async(func) {
    return setTimeout(func, 0)
  }

  function pipe(parent, child) {
    return parent.then(
      function(arg) {
        child.resolve(arg)
      },
      function(e) {
        child.reject(e)
      }
    )
  }

  function promise() {
    return new Promise()
  }

  global.promise = promise
})(this)
