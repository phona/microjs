import assure from "../src/assure"
import mock from 'xhr-mocklet'

test('normal use', done => {
  assure.wrap(
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
  assure.wrap(
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
  const main = assure.wrap(
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

mock.setup()

mock.get('http://localhost/api/test', (req, res) => {
  return res
    .status(200)
    .header('Content-Type', 'application/json')
    .body({
      lastName: 'John',
      firstName: 'Smith'
    });
});

test('get api normal use', done => {
  assure.get('http://localhost/api/test')
    .then(content => {
      expect(content).toEqual(JSON.stringify({
        lastName: 'John',
        firstName: 'Smith'
      }))
      done()
    })
})

mock.get('http://localhost/api/error', (req, res) => {
  return res
    .status(500)
});

test('get api with error', done => {
  assure.get('http://localhost/api/error')
    .then(content => {
      expect(content).toEqual(JSON.stringify({
        lastName: 'John',
        firstName: 'Smith'
      }))
    })
    .catch(err => {
      expect(err.status).toEqual(500)
      expect(err.describe).toEqual('INTERNAL SERVER ERROR')
      done()
    })
})

test('get api chain', done => {
  assure.get('http://localhost/api/test')
    .then(function(content) {
      expect(content).toEqual(JSON.stringify({
        lastName: 'John',
        firstName: 'Smith'
      }))
      return assure.get('http://localhost/api/test')
    })
    .then(function(content) {
      expect(content).toEqual(JSON.stringify({
        lastName: 'John',
        firstName: 'Smith'
      }))
      done()
    })
})
