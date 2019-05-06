/**
 * @file This middleware enables validate request body, url, query, params and etc. based on JSON Schema specification
 * @link https://json-schema.org
 * @link https://www.npmjs.com/package/ajv
 */

const micro = require('micro')
const Ajv = require('ajv')

// util
const get = (path, obj) => path.split('.').reduce((acc, current) => acc && acc[current], obj)

const ERROR_MODE_REPLY = 'reply'
const ERROR_MODE_THROW = 'throw'
const ERROR_MODE_INJECT = 'inject'

const defaultOptions = {
  ajv: {},
  target: 'body',
  errorMode: ERROR_MODE_REPLY,
  injectKey: 'microAjvErrors',
  createError: _validationErrors => micro.createError(400, 'Bad request'),
}

const middleware = (schema, options = {}) => {
  const settings = Object.assign({}, defaultOptions, options, {
    ajv: { ...defaultOptions.ajv, ...options.ajv },
  })
  const ajv = new Ajv(settings.ajv)
  const validate = ajv.compile(schema)

  return handler => async (req, res) => {
    const isValid = validate(get(settings.target, req))

    if (isValid) return await handler(req, res)

    switch (settings.errorMode) {
      case ERROR_MODE_REPLY:
        return micro.sendError(req, res, settings.createError(validate.errors))
      case ERROR_MODE_THROW:
        throw settings.createError(ajv.errors)
      case ERROR_MODE_INJECT:
        return await handler(Object.assign(req, { [settings.injectKey]: validate.errors }), res)
      default:
        throw new Error(`Unknown errorMode: "${options.errorMode}"`)
    }
  }
}

module.exports = middleware
exports = middleware
exports.default = middleware

exports.defaultOptions = defaultOptions
