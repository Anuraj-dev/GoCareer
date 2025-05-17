const winston = require('winston');
const config = require('../config');

// Configure winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: `${config.paths.logs}/error.log`, level: 'error' }),
    new winston.transports.File({ filename: `${config.paths.logs}/combined.log` }),
  ],
});

// Add console transport in development
if (config.server.env !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

module.exports = logger;
