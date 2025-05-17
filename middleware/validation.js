const { validationResult, check } = require('express-validator');

const validateRecommendationRequest = [
  check('qualification').notEmpty().trim().escape(),
  check('age').isInt({ min: 14, max: 25 }),
  check('location').notEmpty().trim().escape(),
  check('stream').optional().trim().escape(),
  check('subjects').optional().trim().escape(),
  check('higherStudies').optional().isBoolean(),
  check('incomeLevel').optional().isIn(['low', 'medium', 'high']),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

module.exports = {
  validateRecommendationRequest,
  validate,
};
