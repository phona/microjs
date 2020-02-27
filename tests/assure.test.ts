import assure from "../src/assure"
import HttpError from '../src/helps/http-error'
import mock from 'xhr-mocklet'

test('normal use', done => {
  assure.wrap<number>(
    function () {
      setTimeout(() => {
        this.resolve(1)
        expect(this.state).toEqual(1)
      }, 500)
    }
  )
    .then(
      function (arg): void {
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

test('with error v1', done => {
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

test('with error v2', done => {
  assure.wrap<number>(
    function () {
      setTimeout(() => {
        this.resolve(1)
      }, 500)
    }
  )
    .then(
      function(arg) {
        expect(arg).toBe(1)
        setTimeout(() => {
          this.reject(new Error("haha"))
        }, 500)
      }
    )
    .then(
      function(arg) {
        expect(arg).not.toBe(2);
        done();
      },
      function(e) {
        expect(e.message).toBe("haha");
        done();
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

test('reuse', done => {
  assure.wrap<number>(
    function () {
      console.log("running main")
      for (let i = 0; i < 2; i++) {
        this.resolve(i)
      }
    }
  ).then(
    function (arg) {
      console.log(arg)
      switch (arg) {
        case 0:
          break;
        case 1:
          break;
        case 2:
          done()
          break
      }
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
    .catch((err: HttpError) => {
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

test('new assure v1', done => {
  assure.assure<number>((resolve, reject) => {
    resolve(1)
  }).then(value => {
    expect(value).toBe(1)
    done()
  })
})

test('new assure v2', done => {
  assure.assure<number>((resolve, reject) => {
    resolve(1)
  }).then(value => {
    expect(value).toBe(1)
    return assure.assure<number>((resolve) => {
      resolve(2)
    })
  }).then(value => {
    expect(value).toBe(2)
    done()
  })
})

test('new assure v2', done => {
  assure.assure<number>((resolve, reject) => {
    reject(new Error("haha"))
  }).then(v => {
    expect(v).not.toBe("haha")
    done()
  }, e => {
    expect(e.message).toBe("haha")
    done()
  })
})

/*
assure((resolve, reject) => {
  setTimeout(() => {
    // success
    resolve(1);
    // failed
    reject(new Error("error"));
  })
}).then((value) => {

}, (err) => {

})


assure.wrap((value) => {
  let next = assure();
  setTimeout(() => {
    // success
    next.resolve(1);
    // failed
    next.reject(new Error("error"));
  })
  return next;
}).then((value) => {

}, (err) => {

})
*/
