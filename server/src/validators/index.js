/**
 * Validation Helper / Middleware Factory
 * Separates validation logic from controllers and route handlers.
 */

/**
 * Validates request body, params, or query against a validation function.
 * If validation fails, passes an error with 400 Bad Request to the centralized errorHandler.
 *
 * @param {Function} validatorFn - Function accepting data and returning { valid: boolean, errors?: object }
 * @param {'body' | 'params' | 'query'} [target='body']
 */
export function validateRequest(validatorFn, target = 'body') {
  return (req, res, next) => {
    try {
      const result = validatorFn(req[target])
      if (!result.valid) {
        const error = new Error('Validation failed')
        error.statusCode = 400
        error.details = result.errors
        return next(error)
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}
