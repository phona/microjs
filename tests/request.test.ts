import mock from 'xhr-mocklet'
import request from '../src/helps/request'
import assure from '../assure'

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

test('request.getNormalUse', done => {
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

test('request.postNormalUse', done => {
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

test('request.getTimeout', done => {
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

test('request.postTimeout', done => {
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

test('request.getError', done => {
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

test('request.postError', done => {
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

test('request.getQueryStringV1', done => {
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

test('request.postPayloadV1', done => {
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

test('request.postPayloadV2', done => {
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

test('request.postPayloadV3', done => {
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

test('request.postPayloadV4', done => {
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

test('request.postPayloadV5', done => {
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
