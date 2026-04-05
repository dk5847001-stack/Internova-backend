const rateLimitStore = new Map();

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return (
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown"
  );
};

const buildDefaultKey = (req) => `${getClientIp(req)}:${req.originalUrl}`;

const pruneExpiredEntries = (now) => {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (!entry || entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
};

const createRateLimiter = ({
  windowMs = 60 * 1000,
  max = 10,
  keyGenerator,
  message = "Too many requests. Please try again later.",
} = {}) => {
  const safeWindowMs = Math.max(1000, Number(windowMs) || 60 * 1000);
  const safeMax = Math.max(1, Number(max) || 10);

  return (req, res, next) => {
    const now = Date.now();
    const generatedKey = keyGenerator ? keyGenerator(req) : buildDefaultKey(req);
    const key = String(generatedKey || buildDefaultKey(req));

    pruneExpiredEntries(now);

    const currentEntry = rateLimitStore.get(key);

    if (!currentEntry || currentEntry.resetAt <= now) {
      const nextEntry = {
        count: 1,
        resetAt: now + safeWindowMs,
      };

      rateLimitStore.set(key, nextEntry);
      res.setHeader("X-RateLimit-Limit", String(safeMax));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, safeMax - 1)));
      res.setHeader(
        "X-RateLimit-Reset",
        String(Math.ceil(nextEntry.resetAt / 1000))
      );
      return next();
    }

    currentEntry.count += 1;
    res.setHeader("X-RateLimit-Limit", String(safeMax));
    res.setHeader(
      "X-RateLimit-Remaining",
      String(Math.max(0, safeMax - currentEntry.count))
    );
    res.setHeader(
      "X-RateLimit-Reset",
      String(Math.ceil(currentEntry.resetAt / 1000))
    );

    if (currentEntry.count > safeMax) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((currentEntry.resetAt - now) / 1000)
      );

      res.setHeader("Retry-After", String(retryAfterSeconds));

      return res.status(429).json({
        success: false,
        message,
      });
    }

    return next();
  };
};

module.exports = {
  createRateLimiter,
  getClientIp,
};
