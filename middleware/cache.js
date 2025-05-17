const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

const cacheMiddleware = (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  const key = req.originalUrl;
  const cachedResponse = cache.get(key);

  if (cachedResponse) {
    return res.json(cachedResponse);
  }

  // Store the original json function
  const originalJson = res.json;
  
  // Override json function to cache the response
  res.json = function(body) {
    cache.set(key, body);
    originalJson.call(this, body);
  };

  next();
};

module.exports = cacheMiddleware;
