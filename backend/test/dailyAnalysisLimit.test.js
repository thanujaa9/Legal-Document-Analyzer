const test = require('node:test');
const assert = require('node:assert/strict');
const { claimDailyAnalysisSlot, secondsUntilNextUtcDay } = require('../services/dailyAnalysisLimit');

test('allows only one live analysis per UTC day without Redis', async () => {
  const day = new Date('2040-01-02T10:00:00Z');
  assert.equal((await claimDailyAnalysisSlot(day)).allowed, true);
  assert.equal((await claimDailyAnalysisSlot(day)).allowed, false);
  assert.equal((await claimDailyAnalysisSlot(new Date('2040-01-03T00:00:01Z'))).allowed, true);
});

test('daily slot expiry reaches the next UTC day', () => {
  assert.equal(secondsUntilNextUtcDay(new Date('2040-01-02T23:59:00Z')), 60);
});
