import assure from '../assure'
import HttpError from '../src/helps/http-error'
import mock from 'xhr-mocklet'

test('assure.normalUseV1', done => {
  const a0 = assure.wrap<number>((resolve) => {
    setTimeout(() => {
      resolve(1)
    }, 500)
  })

  const a1 = a0.then((arg) => {
    expect(arg).toBe(1)
    expect(a0['state']).toBe(assure.STATE.FULFILLED)
    expect(a1['state']).toBe(assure.STATE.PENDING)
    done()
  })
})

test('assure.normalUseV11', done => {
  const err = new Error("Test")

  const a0 = assure.wrap<number>((resolve, reject) => {
    setTimeout(() => {
      reject(err)
    }, 500)
  })

  const a1 = a0.then(() => {
    done.fail()
  })

  const a2 = a1.capture(error => {
    expect(error).toEqual(err)
    expect(a0['state']).toBe(assure.STATE.REJECTED)
    expect(a0['result']).toBe(err)
    expect(a1['state']).toBe(assure.STATE.REJECTED)
    expect(a1['result']).toBe(err)
    expect(a2['state']).toBe(assure.STATE.PENDING)
    expect(a2['result']).toBe(err)
  })

  a2.then(() => {
    expect(a2['state']).toBe(assure.STATE.REJECTED)
    done()
  }).capture(e => {
    console.error(e)
    done.fail(e)
  })
})

test('assure.normalUseV2', done => {
  // 0 1
  const a0 = assure.wrap<number>((resolve) => {
    setTimeout(() => {
      resolve(1)
    }, 500)
  })

  const a1 = a0.then((arg) => {
    expect(arg).toBe(1)
    expect(a0['state']).toBe(assure.STATE.FULFILLED)
    // 6
    return assure.wrap((resolve) => {
      setTimeout(() => {
        resolve(2)
      }, 500)
    })
  })

  const a2 = a1.then(arg => {
    expect(arg).toBe(2)
    expect(a1['state']).toBe(assure.STATE.FULFILLED)
    // 7
    return assure.wrap((resolve) => {
      setTimeout(() => {
        resolve(3)
      }, 500)
    })
  })

  const a3 = a2.then((arg) => {
    expect(a2['state']).toBe(assure.STATE.FULFILLED)
    expect(arg).toBe(3)
    done()
  })

  a3.capture(error => {
    console.error(error)
    expect(error).not.toBeInstanceOf(Error)
    done()
  })
  // 5
})

test('assure.wraps.v1', done => {
  const a0 = assure.wrap<number>(resolve0 => {
    return assure.wrap<number>(resolve1 => {
      setTimeout(() => {
        resolve1(1)
      }, 500)
    }).then((result) => {
      resolve0(result + 1)
    })
  })

  a0.then(data => {
    expect(data).toEqual(2)
    done()
  })
})

test('assure.wraps.v2', done => {
  assure.wrap<number[]>(resolve => {
    resolve([])
  }).then((results: number[]) => {
    const asr = assure.wrap<number>(resolve => {
      setTimeout(() => {
        resolve(1)
      }, 500)
    }).then((data: number) => {
      results.push(data)
      return results
    })
    return asr
  }).then((results: number[]) => {
    expect(results).toEqual([1])
    return assure.wrap<number>(resolve => {
      setTimeout(() => {
        resolve(2)
      }, 50)
    }).then((data: number) => {
      results.push(data)
      return results
    })
  }).then((results: number[]) => {
    expect(results).toEqual([1, 2])
    return assure.wrap<number>(resolve => {
      setTimeout(() => {
        resolve(3)
      }, 70)
    }).then((data: number) => {
      results.push(data)
      return results
    })
  }).then(results => {
    expect(results).toEqual([1, 2, 3])
    done()
  })
})

test('assure.all.v1', done => {
  assure.all(
    [1, 2, 3].map(v => assure.wrap(resolve => resolve(v)))
  ).then((results: number[]) => {
    expect(results).toEqual([1, 2, 3])
    done()
  })
})

test('assure.all.v2', done => {
  const assures = []
  assures.push(
    assure.wrap<number>(resolve => setTimeout(() => resolve(1), 500))
  )
  assures.push(
    assure.wrap<number>(resolve => setTimeout(() => resolve(2), 200))
  )

  assure.all(assures).then((results: number[]) => {
    expect(results).toEqual([1, 2])
    done()
  })
})

test('assure.chainV1', done => {
  assure.wrap<number>(resolve => {
    resolve(1)
  })
    .then(v => v)
    .capture(e => console.error(e))
    .then(v => {
      expect(v).toEqual(1)
      done()
    })
})

test('assure.errorV1', done => {
  const err = new Error("Test")
  const a1 = assure.wrap<number>((resolve) => {
    resolve(1)
  })

  const a2 = a1.then((arg) => {
    expect(arg).toBe(1)

    return assure.wrap((resolve, reject) => {
      try {
        throw err
      } catch (e) {
        reject(e)
      }
    })
  })

  const a3 = a2.then((arg) => {
    // Invoking this function is not allowd
    expect(arg).not.toBeNull()
  }, (error) => {
    // Invoking this function is not allowd
    expect(error).toBeInstanceOf(Error)
    throw error
  })

  const a4 = a3.capture((arg) => {
    expect(a1['state']).toBe(assure.STATE.FULFILLED)
    expect(a2['state']).toBe(assure.STATE.REJECTED)
    expect(a3['state']).toBe(assure.STATE.REJECTED)
    expect(arg).toBe(err)
  }).capture(e => expect(e).toBe(err))
  expect(a4['result']).toBe(undefined)
  expect(a4['state']).toBe(assure.STATE.FULFILLED)
  done()
})

test('assure.errorV2', done => {
  const err = new Error("Test")

  const a1 = assure.wrap<number>((resolve, reject) => {
    resolve(1)
  })

  const a2 = a1.then((arg) => {
    expect(arg).toBe(1)

    return assure.wrap((resolve, reject) => {
      try {
        throw err
      } catch (e) {
        reject(e)
      }
    })
  })

  const a3 = a2.then((arg) => {
    // Invoking this function is not allowd
    expect(arg).not.toBeNull()
  })

  const a4 = a3.capture((arg) => {
    expect(a1['state']).toBe(assure.STATE.FULFILLED)
    expect(a2['state']).toBe(assure.STATE.REJECTED)
    expect(a3['state']).toBe(assure.STATE.REJECTED)
    expect(arg).toBeInstanceOf(Error)
  }).capture(e => done(e))

  expect(a4['state']).toBe(assure.STATE.FULFILLED)
  done()
})

test('assure.errorV3', done => {
  const err = new Error("Test")

  const a1 = assure.wrap<number>((resolve, reject) => {
    setTimeout(() => {
      reject(err)
    }, 500)
  })

  const a2 = a1.then(() => {
    done.fail()
  })

  const a3 = a2.then(() => {
    done.fail()
  })

  const a4 = a3.capture((arg) => {
    expect(a1['state']).toBe(assure.STATE.REJECTED)
    expect(a2['state']).toBe(assure.STATE.REJECTED)
    expect(a3['state']).toBe(assure.STATE.REJECTED)
    expect(a4['state']).toBe(assure.STATE.PENDING)
    expect(arg).toBe(err)
  }).capture(e => done(e))
  done()
})

test('assure.errorV4', done => {
  const err = new Error("Test")

  const a1 = assure.wrap<number>((resolve) => {
    setTimeout(() => {
      resolve(1)
    }, 500)
  })

  const a2 = a1.then((arg) => {
    expect(arg).toBe(1)
    return assure.wrap((resolve, reject) => {
      setTimeout(() => {
        reject(err)
      }, 500)
    })
  })

  const a3 = a2.then(() => {
    done.fail();
  }, (e) => {
    expect(a1['state']).toBe(assure.STATE.FULFILLED)
    expect(a2['state']).toBe(assure.STATE.REJECTED)
    expect(a3['state']).toBe(assure.STATE.PENDING)
    expect(e).toBe(err);
  }).capture(e => done(e))
  done();
})

test('assure.errorV5', done => {
  const err = new Error("Test")

  const a1 = assure.wrap<number>((resolve, reject) => {
    reject(err)
  })

  const a2 = a1.capture(error => {
    expect(error).toBe(err)
    expect(a1['state']).toBe(assure.STATE.REJECTED)
  }).capture(e => done(e))
  expect(a2['state']).toBe(assure.STATE.FULFILLED)
  done()
})

test('assure.errorV6', done => {
  const err = new Error("Test")

  const a1 = assure.wrap<number>((resolve, reject) => {
    throw err
  })

  a1.capture(error => {
    expect(error).toBe(err)
    expect(a1['state']).toBe(assure.STATE.REJECTED)
    done()
  })
})


test('assure.withChildren', done => {
  const main = assure.wrap((resolve) => {
    resolve(1)
  })

  expect(main['state']).toEqual(assure.STATE.PENDING)

  const sub00 = main.then((arg) => {
    expect(arg).toBe(1)

    return assure.wrap((resolve) => {
      resolve(2)
    })
  })

  expect(main['state']).toEqual(assure.STATE.FULFILLED)
  expect(main['result']).toEqual(1)

  expect(sub00['result']).toEqual(2)
  expect(sub00['state']).toEqual(assure.STATE.FULFILLED)

  const sub01 = sub00.then((arg) => {
    expect(arg).toBe(2)
    expect(main['state']).toBe(assure.STATE.FULFILLED)
    expect(sub00['state']).toBe(assure.STATE.FULFILLED)
  }).capture(e => {
    done(e)
  })

  expect(sub01['state']).toBe(assure.STATE.FULFILLED)

  const sub10 = main.then(arg => {
    expect(arg).toBe(1)

    return assure.wrap((resolve) => {
      resolve(3)
    })
  })

  expect(main['state']).toEqual(assure.STATE.FULFILLED)
  expect(main['result']).toEqual(1)

  expect(sub10['result']).toEqual(3)
  expect(sub10['state']).toEqual(assure.STATE.FULFILLED)

  const sub11 = sub10.then(arg => {
    expect(arg).toBe(3)
    expect(main['state']).toBe(assure.STATE.FULFILLED)
    expect(sub10['state']).toBe(assure.STATE.FULFILLED)
  }).capture(e => {
    done(e)
  })

  expect(sub11['state']).toBe(assure.STATE.FULFILLED)
  done()
})

test('assure.returnAssure', done => {
  const main = assure.wrap<number>((resolve) => {
    resolve(1)
  })

  const sub00 = main.then((arg) => {
    expect(arg).toBe(1)

    return assure.wrap((resolve) => {
      resolve(2)
    })
  }).capture(e => done(e))

  expect(sub00['result']).toEqual(2)
  expect(sub00['state']).toEqual(assure.STATE.FULFILLED)
  done()
})

test('assure.ReuseV1', done => {
  assure.wrap<number>((resolve) => {
    for (let i = 0; i < 2; i++) {
      resolve(i)
    }
  }).then((arg) => {
    switch (arg) {
      case 0:
        break;
      case 1:
        done()
        break
    }
  })
})

test('assure.chainV1', done => {
  const err = new Error()

  const a0 = assure.wrap<number>((resolve) => {
    throw err
  }).capture(e => {
    return assure.wrap((resolve) => {
      resolve(1)
    })
  }).then((arg) => {
    expect(arg).toBe(1)
    done()
  }).capture(e => expect(e).not.toBe(err))

  expect(a0['state']).toBe(assure.STATE.FULFILLED)
  expect(a0['result']).toBe(1)
  done()
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

test('assure.getAPINormalUse', done => {
  assure.get({ url: 'http://localhost/api/test' })
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

test('assure.getAPIWithError', done => {
  assure.get({ url: 'http://localhost/api/error' })
    .then(content => {
      expect(content).toEqual(JSON.stringify({
        lastName: 'John',
        firstName: 'Smith'
      }))
    })
    .capture((err: HttpError) => {
      expect(err.status).toEqual(500)
      expect(err.describe).not.toEqual("")
      done()
    })
})

test('assure.getAPIChain', done => {
  assure.get({ url: 'http://localhost/api/test' })
    .then(function (content) {
      expect(content).toEqual(JSON.stringify({
        lastName: 'John',
        firstName: 'Smith'
      }))
      return assure.get({ url: 'http://localhost/api/test' })
    })
    .then(function (content) {
      expect(content).toEqual(JSON.stringify({
        lastName: 'John',
        firstName: 'Smith'
      }))
      done()
    })

    new Promise<number>(() => {}).then(() => {return ""}).then()
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
