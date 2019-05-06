#micro-ajv

An [Ajv](https://github.com/epoberezkin/ajv) (Another JSON Schema Validator) middleware for [Micro](https://github.com/zeit/micro) to validate request body, query parameters and etc.

## Installation

```bash
npm install --save micro-ajv
```

## Usage

By default, it validates request body and replies with 400 status code if validation fails.

```js
const { send } = require('micro')
const microAjvValidation = require('micro-ajv')

const schema = { type: 'string', maxLength: 1024 }
const validate = microAjvValidation(schema)

const handler = (req, res) => send(res, 200, 'Ok')

module.exports = validate(handler)
```

#### Middleware Options

It's possible to configure the middleware behavior by passing `options` object

| Option        | Description                                                                                                                                                                                                                                           | Default                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `ajv`         | Ajv [options](https://github.com/epoberezkin/ajv#options)                                                                                                                                                                                             | `{}`                                              |
| `target`      | Path to data for validations (e.g. `query.accountId`). It validates request body by default                                                                                                                                                           | `"body"`                                          |
| `errorMode`   | Enables change middleware behavior strategy when request validation fails. There are three possible modes: `reply` — respond with an error; `throw` — throw an exception; `inject` – call handler with injected validation errors to the `req` object | `"reply"`                                         |
| `injectKey`   | Enables pass validation errors to the `req` object when error mode is `inject`                                                                                                                                                                        | `"microAjvErrors"`                                |
| `createError` | Use this option if you need to change the default error object. As a first argument, it expects Ajv validation `errors`                                                                                                                               | `errors => micro.createError(400, 'Bad request')` |

#### Examples

Validate `req.url` and handle validation errors inside the handler:

```js
const { send } = require('micro')
const microAjvValidation = require('micro-ajv')

const schema = { type: 'string', maxLength: 1024 }
const options = { target: 'url', errorMode: 'inject', injectKey: 'errors' }
const validate = microAjvValidation(schema, options)

module.exports = validate((req, res) => {
  console.error(req.errors)
  send(res, 414, 'Request url is too long')
})
```

Validate `req.body` and reply with a custom error if it fails

```js
const { send } = require('micro')
const microAjvValidation = require('micro-ajv')

const schema = { type: 'string', maxLength: 1024 }
const options = {
  createError(errors) {
    const error = Error(errors.map(error => error.message))
    error.statusCode = 400
    return error
  },
}
const validate = microAjvValidation(schema, options)

const handler = (req, res) => send(res, 200, 'Ok')

module.exports = validate(handler)
```

Sometime you may need to throw an exception and probably catch it somewhere else in the project instead of replying with an error immediately.

```js
// handler.js
const { send } = require('micro')
const microAjvValidation = require('micro-ajv')

const schema = { type: 'string', maxLength: 1024 }
const options = {
  errorMode: 'throw',
  createError() {
    const error = Error('Payload validation failed')
    error.type = 'ApiError'
    error.statusCode = 400
    return error
  },
}
const validate = microAjvValidation(schema, options)

const handler = (req, res) => send(res, 200, 'Ok')

module.exports = validate(handler)

// routes.js
const { router, post } = require('microrouter')
const handler = require('./handler')

const logApiErrors = handler => (req, res) =>
  handler(req, res).catch(err => {
    if (err.type === 'ApiError') {
      console.log(`ApiError: ${err.message}`)
    }
    throw err
  })

module.exports = router(post('/foo', logApiErrors(handler)))
```
