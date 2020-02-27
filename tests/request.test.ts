import mock from 'xhr-mocklet'
import request from '../src/helps/request'
import assure from '../src/assure'

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

mock.post('http://localhost/api/test', (req, res) => {
  expect(req.headers()["content-type"]).toEqual("application/json")

  return res
    .status(201)
    .header('Content-Type', 'application/json')
    .body({
      lastName: 'John',
      firstName: 'Smith'
    });
});

mock.get('http://localhost/api/error', (req, res) => {
  return res.status(500).header('Content-Type', 'application/json')
});
mock.post('http://localhost/api/error', (req, res) => {
  return res.status(500).header('Content-Type', 'application/json')
});

mock.get('http://localhost/api/timeout', (req, res) => res.timeout(true));
mock.post('http://localhost/api/timeout', (req, res) => res.timeout(true));

test('get normal use', done => {
  request({
    url: 'http://localhost/api/test',

    success(content) {
      expect(content).toEqual(JSON.stringify({
        lastName: 'John',
        firstName: 'Smith'
      }))
      done()
    }
  })
})

test('post normal use', done => {
  request({
    url: 'http://localhost/api/test',
    headers: {
      "Content-Type": "application/json"
    },
    method: 'post',
    data: "a=1",

    success(content) {
      expect(content).toEqual(JSON.stringify({
        lastName: 'John',
        firstName: 'Smith'
      }))
      done()
    }
  })
})

test('get timeout', done => {
  request({
    url: 'http://localhost/api/timeout',
    headers: {
      "Content-Type": "application/json"
    },
    timeout: 1000,

    success(content) {
      expect(content).toBeNull()
      done()
    }
  })
})

test('post timeout', done => {
  request({
    url: 'http://localhost/api/timeout',
    headers: {
      "Content-Type": "application/json"
    },
    method: 'post',
    data: "a=1",
    timeout: 1000,

    success(content) {
      expect(content).toBeNull()
      done()
    }
  })
})

test('get error', done => {
  request({
    url: 'http://localhost/api/error',
    headers: {
      "Content-Type": "application/json"
    },

    error(status, content) {
      expect(status).toEqual(500)
      expect(content).toEqual('')
      done()
    }
  })
})

test('post error', done => {
  request({
    url: 'http://localhost/api/error',
    headers: {
      "Content-Type": "application/json"
    },
    method: 'post',
    data: 'a=1',

    error(status, content) {
      expect(status).toEqual(500)
      expect(content).toEqual('')
      done()
    }
  })
})

mock.get('http://localhost/api/v1/querystring?user=admin&password=admin', (req, res) => {
  return res
    .status(201)
    .header('Content-Type', 'application/json')
    .body({
      user: 'admin',
      password: 'admin'
    });
});

test('get querystring v1', done => {
  request({
    url: 'http://localhost/api/v1/querystring',
    data: {
      'user': 'admin',
      'password': 'admin',
    },

    success(content) {
      expect(content).toEqual(JSON.stringify({
        user: 'admin',
        password: 'admin'
      }))
      done()
    }
  })
})

mock.post('http://localhost/api/v1/payload', (req, res) => {
  expect(req.headers()["content-type"]).toEqual("application/json")
  expect(req.body()).toEqual('user=admin&password=admin')

  return res
    .status(201)
    .header('Content-Type', 'application/json')
    .body({
      user: 'admin',
      password: 'admin'
    });
});

test('post payload v1', done => {
  request({
    url: 'http://localhost/api/v1/payload',
    method: 'post',
    headers: {
      "Content-Type": "application/json"
    },
    data: {
      'user': 'admin',
      'password': 'admin',
    },

    success(content) {
      expect(content).toEqual(JSON.stringify({
        user: 'admin',
        password: 'admin'
      }))
      done()
    }
  })
})

test('post payload v2', done => {
  request({
    url: 'http://localhost/api/v1/payload',
    method: 'post',
    headers: {
      "Content-Type": "application/json"
    },
    data: "user=admin&password=admin",

    success(content) {
      expect(content).toEqual(JSON.stringify({
        user: 'admin',
        password: 'admin'
      }))
      done()
    }
  })
})

test('post payload v3', done => {
  assure.post('http://localhost/api/v1/payload', 'user=admin&password=admin', {
    headers: {
      'Content-Type': 'application/json'
    }
  }).then((content) => {
    expect(content).toEqual(JSON.stringify({
      user: 'admin',
      password: 'admin'
    }))
    done()
  })
})

test('post payload v4', done => {
  const err = new Error("haha");

  assure.post('http://localhost/api/v1/payload', 'user=admin&password=admin', {
    headers: {
      'Content-Type': 'application/json'
    }
  }).then((content) => {
    throw err;
  }).catch(error => {
    expect(error).toEqual(err)
    done()
  })
})

test('post payload v5', done => {
  const err = new Error("haha");

  assure.post('http://localhost/api/v1/payload', 'user=admin&password=admin', {
    headers: {
      'Content-Type': 'application/json'
    }
  }).then((content) => {
    throw err;
  }).then((content) => {
    return "1";
  }).catch(error => {
    expect(error).toEqual(err)
    done()
  })
})
