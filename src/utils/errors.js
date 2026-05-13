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
		details = body.errors || body.error || body.message || null
		fields = body.validationErrors || body.errors || null
	} catch {
		// Response body is not JSON
	}

	switch (true) {
		case status === 400 || status === 422:
			message = details && typeof details === 'string'
				? details
				: `Validation failed for ${type}`
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
