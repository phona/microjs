import assure from "../src/assure"

test('normal use', done => {
  assure(function () {
    setTimeout(() => {
      this.resolve(1)
    }, 500)
  }).then(function (arg) {
    expect(arg).toBe(1)
    setTimeout(() => {
      this.resolve(2)
    }, 500)
  }).then(function (arg) {
    expect(arg).toBe(2)
    done()
  })
})

test('with error', done => {
  assure(function () {
    setTimeout(() => {
      this.resolve(1)
    }, 500)
  }).then(function (arg) {
    expect(arg).toBe(1)
    setTimeout(() => {
      try {
        throw new Error("Test")
      } catch(e) {
        this.reject(e)
      }
    }, 500)
  }).then(function (arg) {
    // Invoking this function is not allowd
    expect(arg).not.toBeNull()
  }).then(function (arg) {
    // Invoking this function is not allowd
    expect(arg).not.toBeNull()
  }).catch(function (arg) {
    expect(arg).toBeInstanceOf(Error)
    done()
  })
})

test("state", done => {
  assure(function() {
    setTimeout(() => {
      this.resolve(1)
      expect(this.state).toBe(1)
    }, 500)
  }).then(function(arg) {
    expect(arg).toBe(1)
    this.resolve(2)
    expect(this.state).toBe(1)
  }).then(function(arg) {
    expect(arg).toBe(2)
    expect(this.state).toBe(0)
    console.log("haha")
    done()
  })
})
