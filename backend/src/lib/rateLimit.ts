import rateLimit from "express-rate-limit";

const message = (action: string) => ({
  error: `Too many requests. Please wait before trying to ${action} again.`,
});

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: message("make requests"),
  skip: (req) => req.method === "GET" && req.path.startsWith("/api/health"),
});

export const claimLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: message("claim a subdomain"),
});

export const walletLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: message("look up a wallet"),
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: message("use the AI analyzer"),
});
