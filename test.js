'use strict'

const t = require('tap')
const test = t.test
const brotli = require('iltorb')
const zlib = require('zlib')
const fs = require('fs')
const createReadStream = fs.createReadStream
const readFileSync = fs.readFileSync
const Fastify = require('fastify')
const compressPlugin = require('./index')

test('should send a deflated data', t => {
  t.plan(2)
  const fastify = Fastify()
  fastify.register(compressPlugin)

  fastify.get('/', (req, reply) => {
    reply.compress(createReadStream('./package.json'))
  })

  fastify.inject({
    url: '/',
    method: 'GET',
    headers: {
      'accept-encoding': 'deflate'
    }
  }, res => {
    t.strictEqual(res.headers['content-encoding'], 'deflate')
    const file = readFileSync('./package.json', 'utf8')
    const payload = zlib.inflateSync(res.rawPayload)
    t.strictEqual(payload.toString('utf-8'), file)
  })
})

test('should send a gzipped data', t => {
  t.plan(2)
  const fastify = Fastify()
  fastify.register(compressPlugin)

  fastify.get('/', (req, reply) => {
    reply.compress(createReadStream('./package.json'))
  })

  fastify.inject({
    url: '/',
    method: 'GET',
    headers: {
      'accept-encoding': 'gzip'
    }
  }, res => {
    t.strictEqual(res.headers['content-encoding'], 'gzip')
    const file = readFileSync('./package.json', 'utf8')
    const payload = zlib.gunzipSync(res.rawPayload)
    t.strictEqual(payload.toString('utf-8'), file)
  })
})

test('should send a brotli data', t => {
  t.plan(2)
  const fastify = Fastify()
  fastify.register(compressPlugin)

  fastify.get('/', (req, reply) => {
    reply.compress(createReadStream('./package.json'))
  })

  fastify.inject({
    url: '/',
    method: 'GET',
    headers: {
      'accept-encoding': 'br'
    }
  }, res => {
    t.strictEqual(res.headers['content-encoding'], 'br')
    const file = readFileSync('./package.json', 'utf8')
    const payload = brotli.decompressSync(res.rawPayload)
    t.strictEqual(payload.toString('utf-8'), file)
  })
})

test('should follow the encoding order', t => {
  t.plan(2)
  const fastify = Fastify()
  fastify.register(compressPlugin)

  fastify.get('/', (req, reply) => {
    reply.compress(createReadStream('./package.json'))
  })

  fastify.inject({
    url: '/',
    method: 'GET',
    headers: {
      'accept-encoding': 'hello,br'
    }
  }, res => {
    t.strictEqual(res.headers['content-encoding'], 'br')
    const file = readFileSync('./package.json', 'utf8')
    const payload = brotli.decompressSync(res.rawPayload)
    t.strictEqual(payload.toString('utf-8'), file)
  })
})

test('Unsupported encoding', t => {
  t.plan(2)
  const fastify = Fastify()
  fastify.register(compressPlugin)

  fastify.get('/', (req, reply) => {
    reply.compress(createReadStream('./package.json'))
  })

  fastify.inject({
    url: '/',
    method: 'GET',
    headers: {
      'accept-encoding': 'hello'
    }
  }, res => {
    const payload = JSON.parse(res.payload)
    t.strictEqual(res.statusCode, 406)
    t.deepEqual({
      error: 'Not Acceptable',
      message: 'Unsupported encoding',
      statusCode: 406
    }, payload)
  })
})

test('Missing header', t => {
  t.plan(2)
  const fastify = Fastify()
  fastify.register(compressPlugin)

  fastify.get('/', (req, reply) => {
    reply.compress(createReadStream('./package.json'))
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, res => {
    const payload = JSON.parse(res.payload)
    t.strictEqual(res.statusCode, 400)
    t.deepEqual({
      error: 'Bad Request',
      message: 'Missing `accept encoding` header',
      statusCode: 400
    }, payload)
  })
})

test('Should close the stream', t => {
  t.plan(3)
  const fastify = Fastify()
  fastify.register(compressPlugin)

  fastify.get('/', (req, reply) => {
    const stream = createReadStream('./package.json')
    stream.on('close', () => t.ok('stream closed'))
    reply.compress(stream)
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, res => {
    const payload = JSON.parse(res.payload)
    t.strictEqual(res.statusCode, 400)
    t.deepEqual({
      error: 'Bad Request',
      message: 'Missing `accept encoding` header',
      statusCode: 400
    }, payload)
  })
})

test('No compression header', t => {
  t.plan(2)
  const fastify = Fastify()
  fastify.register(compressPlugin)

  fastify.get('/', (req, reply) => {
    reply.compress({ hello: 'world' })
  })

  fastify.inject({
    url: '/',
    method: 'GET',
    headers: {
      'x-no-compression': true
    }
  }, res => {
    const payload = JSON.parse(res.payload)
    t.notOk(res.headers['content-encoding'])
    t.deepEqual({ hello: 'world' }, payload)
  })
})

test('Should compress json data (gzip)', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.register(compressPlugin)
  const json = { hello: 'world' }

  fastify.get('/', (req, reply) => {
    reply.compress(json)
  })

  fastify.inject({
    url: '/',
    method: 'GET',
    headers: {
      'accept-encoding': 'gzip'
    }
  }, res => {
    const payload = zlib.gunzipSync(res.rawPayload)
    t.strictEqual(payload.toString('utf-8'), JSON.stringify(json))
  })
})

test('Should compress json data (deflate)', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.register(compressPlugin)
  const json = { hello: 'world' }

  fastify.get('/', (req, reply) => {
    reply.compress(json)
  })

  fastify.inject({
    url: '/',
    method: 'GET',
    headers: {
      'accept-encoding': 'deflate'
    }
  }, res => {
    const payload = zlib.inflateSync(res.rawPayload)
    t.strictEqual(payload.toString('utf-8'), JSON.stringify(json))
  })
})

test('Should compress json data (brotli)', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.register(compressPlugin)
  const json = { hello: 'world' }

  fastify.get('/', (req, reply) => {
    reply.compress(json)
  })

  fastify.inject({
    url: '/',
    method: 'GET',
    headers: {
      'accept-encoding': 'br'
    }
  }, res => {
    const payload = brotli.decompressSync(res.rawPayload)
    t.strictEqual(payload.toString('utf-8'), JSON.stringify(json))
  })
})

test('Should compress string data (gzip)', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.register(compressPlugin)

  fastify.get('/', (req, reply) => {
    reply.compress('hello')
  })

  fastify.inject({
    url: '/',
    method: 'GET',
    headers: {
      'accept-encoding': 'gzip'
    }
  }, res => {
    const payload = zlib.gunzipSync(res.rawPayload)
    t.strictEqual(payload.toString('utf-8'), 'hello')
  })
})

test('Should compress string data (deflate)', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.register(compressPlugin)

  fastify.get('/', (req, reply) => {
    reply.compress('hello')
  })

  fastify.inject({
    url: '/',
    method: 'GET',
    headers: {
      'accept-encoding': 'deflate'
    }
  }, res => {
    const payload = zlib.inflateSync(res.rawPayload)
    t.strictEqual(payload.toString('utf-8'), 'hello')
  })
})

test('Should compress string data (brotli)', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.register(compressPlugin)

  fastify.get('/', (req, reply) => {
    reply.compress('hello')
  })

  fastify.inject({
    url: '/',
    method: 'GET',
    headers: {
      'accept-encoding': 'br'
    }
  }, res => {
    const payload = brotli.decompressSync(res.rawPayload)
    t.strictEqual(payload.toString('utf-8'), 'hello')
  })
})

test('Missing payload', t => {
  t.plan(2)
  const fastify = Fastify()
  fastify.register(compressPlugin)

  fastify.get('/', (req, reply) => {
    reply.compress()
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, res => {
    const payload = JSON.parse(res.payload)
    t.strictEqual(res.statusCode, 500)
    t.deepEqual({
      error: 'Internal Server Error',
      message: 'Internal server error',
      statusCode: 500
    }, payload)
  })
})
