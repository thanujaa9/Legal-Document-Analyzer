const buckets = new Map();

const rateLimit = ({ windowMs, max, scope = 'request', key = (req) => req.user?.id || req.ip }) => (req, res, next) => {
  const now = Date.now();
  const id = `${scope}:${key(req)}`;
  const current = buckets.get(id);
  if (!current || current.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return next();
  }
  if (current.count >= max) {
    res.set('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
    return res.status(429).json({ success: false, code: 'APP_RATE_LIMITED', message: 'Too many requests. Please wait before trying again.' });
  }
  current.count += 1;
  return next();
};

module.exports = { rateLimit };
