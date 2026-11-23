/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Tests for serverErrorMessage().
 *
 * Measured on a live instance: submitting a generated app's form with its
 * required field empty showed "Request failed with status code 400", while
 * OpenRegister had answered, in the body, "The required property (status) is
 * missing." One of those two tells a user what to do.
 */
import { serverErrorMessage } from '../../src/utils/serverErrorMessage.js'

const axiosError = (data) => ({ message: 'Request failed with status code 400', response: { data } })

describe('serverErrorMessage', () => {
	it('prefers a bare string body, which is what OpenRegister validation returns', () => {
		const err = axiosError('The required property (status) is missing.')

		expect(serverErrorMessage(err)).toBe('The required property (status) is missing.')
	})

	it('reads the Nextcloud controller envelope', () => {
		expect(serverErrorMessage(axiosError({ error: 'forbidden' }))).toBe('forbidden')
		expect(serverErrorMessage(axiosError({ message: 'Slug already taken' }))).toBe('Slug already taken')
		expect(serverErrorMessage(axiosError({ detail: 'Application not found' }))).toBe('Application not found')
	})

	it('prefers error over message when a body carries both', () => {
		expect(serverErrorMessage(axiosError({ error: 'slug_collision', message: 'x' }))).toBe('slug_collision')
	})

	it('falls back to the transport message when there is no body', () => {
		expect(serverErrorMessage({ message: 'Network Error' })).toBe('Network Error')
	})

	/*
	 * An HTML error page is the shape most likely to arrive unexpectedly, from
	 * a proxy or a 500 page. Putting markup on screen helps nobody, and
	 * truncating it is worse, so it falls through to the transport message.
	 */
	it('refuses an HTML body', () => {
		const err = axiosError('<!doctype html><html><body>Internal Server Error</body></html>')

		expect(serverErrorMessage(err)).toBe('Request failed with status code 400')
	})

	it('refuses an over-long body', () => {
		expect(serverErrorMessage(axiosError('x'.repeat(401)))).toBe('Request failed with status code 400')
	})

	it('ignores an empty or whitespace body', () => {
		expect(serverErrorMessage(axiosError('   '))).toBe('Request failed with status code 400')
		expect(serverErrorMessage(axiosError({ error: '' }))).toBe('Request failed with status code 400')
	})

	it('survives a non-error rejection', () => {
		expect(serverErrorMessage('plain string')).toBe('plain string')
		expect(serverErrorMessage(null)).toBe('null')
	})
})
