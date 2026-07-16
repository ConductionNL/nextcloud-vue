import { translateValidationMessage } from './validationMessages.js'

/**
 * Unified error shape returned by all store actions.
 *
 * @typedef {object} ApiError
 * @property {number} status HTTP status code (0 for network errors)
 * @property {string} message Human-readable error message
 * @property {object|null} details Validation errors or additional details
 * @property {boolean} isValidation Whether this is a validation error (400/422)
 * @property {object|null} fields Per-field validation errors
 */

/**
 * Extract a human-readable message from a validation-error payload.
 *
 * The backend may express validation errors as a plain string, an array of
 * strings, an array of `{ property, message }` objects (OpenRegister), or an
 * object map of `field → message`. Pull every available message out so the
 * actual problem is shown instead of a generic fallback.
 *
 * @param {string|Array|object|null} errors The raw error payload
 * @return {string|null} Joined message string, or null when nothing usable
 */
function extractValidationMessage(errors) {
	if (typeof errors === 'string') {
		return translateValidationMessage(errors)
	}

	const pick = (entry) => {
		if (typeof entry === 'string') {
			return entry
		}
		if (entry && typeof entry === 'object') {
			return entry.message || entry.error || null
		}
		return null
	}

	let messages = []
	if (Array.isArray(errors)) {
		messages = errors.map(pick)
	} else if (errors && typeof errors === 'object') {
		messages = Object.values(errors).map(pick)
	}

	messages = messages.filter(Boolean).map(translateValidationMessage)
	return messages.length ? messages.join('\n') : null
}

/**
 * Parse an HTTP error response into a unified ApiError shape.
 *
 * Merges the best of Pipelinq's _parseResponseError (field extraction)
 * and Procest's _parseError (status-specific messages, isValidation flag).
 *
 * @param {Response} response The fetch Response object
 * @param {string} type The object type slug (used in error messages)
 * @return {Promise<ApiError>} Parsed error object
 */
export async function parseResponseError(response, type) {
	const status = response.status
	let details = null
	let fields = null
	let message

	try {
		const body = await response.json()
		if (typeof body === 'string') {
			// Some endpoints return the error as a bare JSON string rather than
			// an object (e.g. OpenRegister object-save returns the validation
			// message directly: `new JSONResponse(data: $e->getMessage())`).
			details = body
		} else if (body && typeof body === 'object') {
			details = body.errors || body.error || body.message || null
			fields = body.validationErrors || body.errors || null
		}
	} catch {
		// Response body is not JSON
	}

	switch (true) {
	case status === 400 || status === 422:
		message = extractValidationMessage(details) || `Validation failed for ${type}`
		return {
			status,
			message,
			details,
			isValidation: true,
			fields,
			toString() {
				return this.message
			},
		}
	case status === 401:
		message = 'Session expired, please log in again'
		break
	case status === 403:
		message = 'You do not have permission to perform this action'
		break
	case status === 404:
		message = `The requested ${type} could not be found`
		break
	case status === 409:
		message = `This ${type} was modified by another user. Please reload.`
		break
	case status >= 500:
		message = 'An unexpected server error occurred. Please try again.'
		break
	default:
		message = response.statusText || 'An unexpected error occurred'
	}

	return {
		status,
		message,
		details,
		isValidation: false,
		fields,
		toString() {
			return this.message
		},
	}
}

/**
 * Unpack an AXIOS error into the parts a caller needs to explain itself.
 *
 * `parseResponseError` above takes a fetch `Response` (and awaits `.json()`).
 * Axios has already parsed the body onto `error.response.data`, and its
 * `error.message` is only ever the useless generic "Request failed with status
 * code 409" — so a `catch (e) { this.error = e.message }` throws away whatever
 * the server actually said. This pulls that back out.
 *
 * OpenRegister returns machine-readable refusals such as
 * `{ error: 'schema-has-objects', objectCount: 3 }`; `code` carries that slug so
 * a caller can render a specific, actionable message (and offer a way forward)
 * instead of echoing an HTTP status at the user.
 *
 * @param {object} error The caught axios error.
 * @return {{status: number, code: string|null, message: string|null, data: object|null}}
 *   `code` is the server's error slug when it sent one; `message` is the best
 *   human-readable string available from the body, or null when it sent none.
 */
export function parseAxiosError(error) {
	const response = (error && error.response) || null
	const status = (response && response.status) || 0
	const data = (response && response.data) || null

	// The body may be a bare string, or an object carrying `error` / `message`.
	let code = null
	let message = null
	if (typeof data === 'string' && data !== '') {
		message = data
	} else if (data && typeof data === 'object') {
		if (typeof data.error === 'string') code = data.error
		message = (typeof data.message === 'string' && data.message)
			|| (typeof data.error === 'string' && data.error)
			|| null
	}

	return { status, code, message, data }
}

/**
 * Create a network error object for fetch failures (no response).
 *
 * @param {Error} error The caught error
 * @return {ApiError} Network error object
 */
export function networkError(error) {
	return {
		status: 0,
		message: error.message || 'A network error occurred. Check your connection and try again.',
		details: null,
		isValidation: false,
		fields: null,
		toString() { return this.message },
	}
}

/**
 * Create a generic error object from a caught exception.
 *
 * @param {Error} error The caught error
 * @return {ApiError} Generic error object
 */
export function genericError(error) {
	return {
		status: null,
		message: error.message,
		details: null,
		isValidation: false,
		fields: null,
		toString() { return this.message },
	}
}
