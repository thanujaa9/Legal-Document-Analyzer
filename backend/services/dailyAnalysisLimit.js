const { getRedisClient } = require('../config/redis');

let fallbackDay = '';
let fallbackClaimed = false;

const utcDay = (now = new Date()) => now.toISOString().slice(0, 10);
const secondsUntilNextUtcDay = (now = new Date()) => {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60, Math.ceil((next - now.getTime()) / 1000));
};

const claimDailyAnalysisSlot = async (now = new Date()) => {
  if (process.env.DAILY_LIVE_ANALYSIS_LIMIT === '0') return { allowed: true, remaining: null };
  const day = utcDay(now);
  const redis = getRedisClient();
  if (redis?.status === 'ready') {
    const claimed = await redis.set(`live-analysis:daily:${day}`, '1', 'EX', secondsUntilNextUtcDay(now), 'NX');
    return { allowed: claimed === 'OK', remaining: claimed === 'OK' ? 0 : 0 };
  }
  if (fallbackDay !== day) { fallbackDay = day; fallbackClaimed = false; }
  if (fallbackClaimed) return { allowed: false, remaining: 0 };
  fallbackClaimed = true;
  return { allowed: true, remaining: 0 };
};

module.exports = { claimDailyAnalysisSlot, utcDay, secondsUntilNextUtcDay };
