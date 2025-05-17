const NodeCache = require('node-cache');
const crypto = require('crypto');
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

const cacheMiddleware = (req, res, next) => {
  let key = req.originalUrl;

  // For POST requests, include a hash of the body in the cache key
  if (req.method === 'POST') {
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyString = JSON.stringify(req.body);
      const bodyHash = crypto.createHash('md5').update(bodyString).digest('hex');
      key += '::' + bodyHash;
    } else {
      // If POST request has no body or empty body, might not be cacheable or use a generic key part
      // For now, we'll just use the URL, but this scenario might need specific handling if it occurs
      key += '::emptybody'; 
    }
  } else if (req.method !== 'GET') {
    // Only cache GET and configured POST requests. Skip for other methods.
    return next();
  }

  const cachedResponse = cache.get(key);

  if (cachedResponse) {
    return res.json(cachedResponse);
  }

  // Store the original json function
  const originalJson = res.json;
  
  // Override json function to cache the response
  res.json = function(body) {
    // Ensure we only cache successful responses (e.g., 2xx status codes)
    // This check is basic; more sophisticated checks might be needed based on status codes
    if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body);
    }
    originalJson.call(this, body);
  };

  next();
};

module.exports = cacheMiddleware;
