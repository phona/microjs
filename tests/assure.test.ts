import assure from "../src/assure"

test('normal use', done => {
  assure(
    function () {
      setTimeout(() => {
        this.resolve(1)
        expect(this.state).toEqual(1)
      }, 500)
    }
  )
    .then(
      function (arg) {
        expect(arg).toBe(1)
        setTimeout(() => {
          this.resolve(2)
          expect(this.state).toEqual(1)
        }, 500)
      }
    )
    .then(
      function (arg) {
        expect(arg).toBe(2)
        expect(this.state).toEqual(0)
        done()
      }
    )
})

test('with error', done => {
  assure(
    function () {
      setTimeout(() => {
        this.resolve(1)
        expect(this.state).toEqual(1)
      }, 500)
    }
  )
    .then(
      function (arg) {
        expect(arg).toBe(1)
        setTimeout(() => {
          try {
            throw new Error("Test")
          } catch (e) {
            this.reject(e)
            expect(this.state).toEqual(2)
          }
        }, 500)
      }
    )
    .then(
      function (arg) {
        // Invoking this function is not allowd
        expect(arg).not.toBeNull()
      }
    )
    .then(
      function (arg) {
        // Invoking this function is not allowd
        expect(arg).not.toBeNull()
      }
    )
    .catch(
      function (arg) {
        expect(arg).toBeInstanceOf(Error)
        expect(this.state).toEqual(0)
        done()
      }
    )
})

test('with children', done => {
  const main = assure(
    function () {
      this.resolve(1)
    }
  )

  main
    .then(
      function (arg) {
        expect(arg).toEqual(1)
        this.resolve(2)
      }
    )
    .then(
      function (arg) {
        expect(arg).toEqual(2)
      }
    )

  main
    .then(
      function (arg) {
        expect(arg).toEqual(1)
        this.resolve(3)
      }
    )
    .then(
      function (arg) {
        expect(arg).toEqual(3)
        done()
      }
    )
})
