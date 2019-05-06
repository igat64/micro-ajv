const micro = require('micro')
const wrapAjvValidation = require('./index')

jest.spyOn(wrapAjvValidation.defaultOptions, 'createError')
jest.spyOn(micro, 'sendError').mockImplementation(() => {})
jest.spyOn(micro, 'createError')

describe('middleware', () => {
  test('default options', async () => {
    const schema = { type: 'number' }
    const wrap = wrapAjvValidation(schema)
    const handler = jest.fn()
    const wrappedHandler = wrap(handler)

    // success path
    await wrappedHandler({ body: 42 }, {})
    expect(handler).toBeCalledWith({ body: 42 }, {})

    handler.mockClear()

    // error path
    await wrappedHandler({ body: '42' }, {})

    expect(handler).not.toBeCalled()
    expect(wrapAjvValidation.defaultOptions.createError).toBeCalled()

    expect(micro.createError).toBeCalledWith(400, 'Bad request')

    const [sendErrorCallReqArg, sendErrorCallResArg] = micro.sendError.mock.calls[0]
    expect(sendErrorCallReqArg).toEqual({ body: '42' })
    expect(sendErrorCallResArg).toEqual({})
  })

  test('option "target"', async () => {
    const schema = { type: 'number' }
    const options = { target: 'query.apiKey' }
    const wrap = wrapAjvValidation(schema, options)
    const handler = jest.fn()
    const wrappedHandler = wrap(handler)

    await wrappedHandler({ query: { apiKey: 42 }, body: {} }, {})

    expect(handler).toBeCalledWith({ query: { apiKey: 42 }, body: {} }, {})
  })

  test('option "createError"', async () => {
    const schema = { type: 'number' }
    const options = {
      createError: jest.fn(errors => {
        const err = new Error()
        err.message = `Bad request buddy`
        err.status = 403
        return err
      }),
    }
    const wrap = wrapAjvValidation(schema, options)
    const handler = jest.fn()
    const wrappedHandler = wrap(handler)

    await wrappedHandler({ body: '42' }, {})

    expect(handler).not.toBeCalled()
    // check if first argument of the first call is an Array
    expect(options.createError.mock.calls[0][0]).toBeInstanceOf(Array)

    const [
      sendErrorCallReqArg,
      sendErrorCallResArg,
      sendErrorCallErrArg,
    ] = micro.sendError.mock.calls[0]
    expect(sendErrorCallReqArg).toEqual({ body: '42' })
    expect(sendErrorCallResArg).toEqual({})
    expect(sendErrorCallErrArg).toHaveProperty('message', 'Bad request buddy')
    expect(sendErrorCallErrArg).toHaveProperty('status', 403)
  })

  test('option "errorMode" is "throw"', async () => {
    const schema = { type: 'number' }
    const options = { errorMode: 'throw' }
    const wrap = wrapAjvValidation(schema, options)
    const handler = jest.fn()
    const wrappedHandler = wrap(handler)

    await expect(wrappedHandler({ body: '42' }, {})).rejects.toThrowError()

    expect(wrapAjvValidation.defaultOptions.createError).toBeCalled()
    expect(handler).not.toBeCalled()
  })

  test('option "errorMode" is "inject"', async () => {
    const schema = { type: 'number' }
    const options = { errorMode: 'inject' }
    const wrap = wrapAjvValidation(schema, options)
    const handler = jest.fn()
    const wrappedHandler = wrap(handler)

    await wrappedHandler({ body: '42' }, {})

    expect(handler).toBeCalled()
    const [handlerCallReqArg] = handler.mock.calls[0]
    expect(handlerCallReqArg).toHaveProperty('body', '42')
    expect(handlerCallReqArg).toHaveProperty(wrapAjvValidation.defaultOptions.injectKey)
  })

  test('option "errorMode" is unknown', async () => {
    const schema = { type: 'number' }
    const options = { errorMode: 'abc' }
    const wrap = wrapAjvValidation(schema, options)
    const handler = jest.fn()
    const wrappedHandler = wrap(handler)

    await expect(wrappedHandler({ body: '42' }, {})).rejects.toThrowError(
      'Unknown errorMode: "abc"',
    )

    expect(handler).not.toBeCalled()
  })

  test('option "injectKey"', async () => {
    const schema = { type: 'number' }
    const options = { injectKey: 'errors', errorMode: 'inject' }
    const wrap = wrapAjvValidation(schema, options)
    const handler = jest.fn()
    const wrappedHandler = wrap(handler)

    await wrappedHandler({ body: '42' }, {})

    const [handlerCallReqArg] = handler.mock.calls[0]
    expect(handlerCallReqArg).toHaveProperty('errors')
  })

  test('option "ajv"', async () => {
    const schema = { type: 'object', properties: { param: { type: 'string', default: 'token' } } }
    const options = { ajv: { useDefaults: true }, target: 'query' }
    const wrap = wrapAjvValidation(schema, options)
    const handler = jest.fn()
    const wrappedHandler = wrap(handler)

    await wrappedHandler({ body: {}, query: {} }, {})

    expect(handler).toBeCalledWith({ body: {}, query: { param: 'token' } }, {})
  })
})
