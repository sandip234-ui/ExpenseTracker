import { ValidationError } from '../errors/domainErrors.js'

/**
 * Validation middleware using Zod schemas.
 * Validates req.body, req.query, or req.params.
 *
 * @param {object} schema - { body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      if (schema.params) {
        req.params = schema.params.parse(req.params)
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query)
      }
      if (schema.body) {
        req.body = schema.body.parse(req.body)
      }
      next()
    } catch (err) {
      if (err.name === 'ZodError') {
        const issues = err.issues || err.errors || []
        const details = issues.map((e) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
          message: e.message,
        }))
        const message = details.map((d) => (d.field ? `${d.field}: ${d.message}` : d.message)).join(', ')
        return next(new ValidationError(message || 'Validation failed.', details))
      }
      next(err)
    }
  }
}
