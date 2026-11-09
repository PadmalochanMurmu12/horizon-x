/**
 * noCache
 * Instructs clients and proxies never to store API responses.
 * Applied globally to prevent stale flight/fare data from being served.
 */
module.exports = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
};
