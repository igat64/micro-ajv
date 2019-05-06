# micro-ajv

An [Ajv](https://github.com/epoberezkin/ajv) (Another [JSON Schema](https://json-schema.org/) Validator) middleware for [Micro](https://github.com/zeit/micro) to validate request body, url, query parameters and etc.

[![CircleCI](https://circleci.com/gh/igat64/micro-ajv.svg?style=svg)](https://circleci.com/gh/igat64/micro-ajv)

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
| `createError` | Use this option if you need to change the default error object. As a first argument, it expects Ajv validation [errors](https://www.npmjs.com/package/ajv#validation-errors)                                                                          | `errors => micro.createError(400, 'Bad request')` |

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
  createError: errors =>
    Object.assign(Error(errors.map(error => error.message)), { statusCode: 400 }),
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
  createError: errors =>
    Object.assign(Error('Payload validation failed'), { type: 'ApiError', statusCode: 400 }),
}
const validate = microAjvValidation(schema, options)

const handler = (req, res) => send(res, 200, 'Ok')

module.exports = validate(handler)
```

```js
// middleware.js
module.exports.logApiErrors = handler => (req, res) =>
  handler(req, res).catch(err => {
    if (err.type === 'ApiError') {
      console.log(`ApiError: ${err.message}`)
    }
    throw err
  })
```

```js
// routes.js
const { router, post } = require('microrouter')
const { logApiErrors } = require('./middleware')
const handler = require('./handler')

module.exports = logApiErrors(router(post('/foo', handler)))
```
