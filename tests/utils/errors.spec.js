import { parseResponseError, networkError, genericError } from '../../src/utils/errors.js'

describe('parseResponseError', () => {
	it('parses 404 errors', async () => {
		const response = {
			status: 404,
			statusText: 'Not Found',
			json: () => Promise.resolve({ message: 'Not found' }),
		}

		const error = await parseResponseError(response, 'client')

		expect(error.status).toBe(404)
		expect(error.message).toContain('client')
		expect(error.isValidation).toBe(false)
		expect(error.toString()).toBe(error.message)
	})

	it('parses validation errors (400)', async () => {
		const response = {
			status: 400,
			statusText: 'Bad Request',
			json: () => Promise.resolve({
				errors: { name: 'Name is required' },
			}),
		}

		const error = await parseResponseError(response, 'client')

		expect(error.status).toBe(400)
		expect(error.isValidation).toBe(true)
		expect(error.fields).toBeTruthy()
	})

	it('parses validation errors (422)', async () => {
		const response = {
			status: 422,
			statusText: 'Unprocessable Entity',
			json: () => Promise.resolve({
				validationErrors: { email: 'Invalid format' },
			}),
		}

		const error = await parseResponseError(response, 'contact')

		expect(error.status).toBe(422)
		expect(error.isValidation).toBe(true)
	})

	it('handles 401 unauthorized', async () => {
		const response = {
			status: 401,
			statusText: 'Unauthorized',
			json: () => Promise.resolve({}),
		}

		const error = await parseResponseError(response, 'client')

		expect(error.message).toContain('log in')
	})

	it('handles 403 forbidden', async () => {
		const response = {
			status: 403,
			statusText: 'Forbidden',
			json: () => Promise.resolve({}),
		}

		const error = await parseResponseError(response, 'client')

		expect(error.message).toContain('permission')
	})

	it('handles 409 conflict', async () => {
		const response = {
			status: 409,
			statusText: 'Conflict',
			json: () => Promise.resolve({}),
		}

		const error = await parseResponseError(response, 'client')

		expect(error.message).toContain('modified')
	})

	it('handles 500 server error', async () => {
		const response = {
			status: 500,
			statusText: 'Internal Server Error',
			json: () => Promise.resolve({}),
		}

		const error = await parseResponseError(response, 'client')

		expect(error.message).toContain('server error')
	})

	it('handles non-JSON response body', async () => {
		const response = {
			status: 500,
			statusText: 'Internal Server Error',
			json: () => Promise.reject(new Error('not json')),
		}

		const error = await parseResponseError(response, 'client')

		expect(error.status).toBe(500)
		expect(error.details).toBeNull()
	})
})

describe('networkError', () => {
	it('creates a network error with status 0', () => {
		const error = networkError(new TypeError('Failed to fetch'))

		expect(error.status).toBe(0)
		expect(error.message).toContain('Failed to fetch')
		expect(error.isValidation).toBe(false)
	})

	it('uses fallback message when error has no message', () => {
		const error = networkError(new Error(''))

		expect(error.message).toContain('network error')
	})
})

describe('genericError', () => {
	it('creates a generic error from an exception', () => {
		const error = genericError(new Error('Something broke'))

		expect(error.status).toBeNull()
		expect(error.message).toBe('Something broke')
		expect(error.isValidation).toBe(false)
	})
})
