const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanText, splitIntoChunks, mapProviderError, analyzeDocument } = require('../services/aiService');

test('cleans noisy extracted text', () => {
  assert.equal(cleanText(' A   clause\r\n\r\n\r\n  Next\u0000 '), 'A clause\n\nNext');
});

test('small document remains one chunk', () => {
  assert.deepEqual(splitIntoChunks('First clause.\n\nSecond clause.', 100, 5), ['First clause.\n\nSecond clause.']);
});

test('large document is bounded into safe chunks', () => {
  const chunks = splitIntoChunks('word '.repeat(10000), 1000, 4);
  assert.equal(chunks.length, 4);
  assert.ok(chunks.every(chunk => chunk.length <= 1000));
});

test('empty document produces no chunks', () => assert.deepEqual(splitIntoChunks(' \n\n '), []));

test('Gemini quota and context errors are classified clearly', () => {
  assert.equal(mapProviderError({ status: 429, code: 'RESOURCE_EXHAUSTED' }).code, 'RATE_LIMITED');
  assert.equal(mapProviderError({ status: 400, message: 'input token limit exceeded' }).code, 'TOKEN_LIMIT');
});

test('missing API key fails before any provider request', async () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  await assert.rejects(() => analyzeDocument('A sufficiently long fictional contract clause.', 'sample.pdf'), error => error.code === 'MISSING_API_KEY');
  if (previous) process.env.GEMINI_API_KEY = previous;
});
