const test = require('node:test');
const assert = require('node:assert/strict');
const { rateLimit } = require('../middleware/rateLimit');

test('repeated requests are rejected after the configured limit', () => {
  const middleware = rateLimit({ windowMs: 60000, max: 1, key: () => 'test-user' });
  const req = { path: '/analyze', ip: '127.0.0.1' };
  const response = { statusCode: 200, headers: {}, payload: null, set(k,v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(body) { this.payload = body; return this; } };
  let nextCalls = 0;
  middleware(req, response, () => { nextCalls += 1; });
  middleware(req, response, () => { nextCalls += 1; });
  assert.equal(nextCalls, 1);
  assert.equal(response.statusCode, 429);
  assert.equal(response.payload.code, 'APP_RATE_LIMITED');
});
