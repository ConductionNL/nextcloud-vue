// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * `fetchCollection` keeps the response's `@self.lenses` per type, written
 * with the rows, so the report always describes the page on screen.
 *
 * @spec openspec/changes/lens-says-why-it-is-empty/specs/personal-lens-availability/spec.md#requirement-a-list-response-carries-the-report-of-the-lenses-it-was-asked-for
 */

import { createPinia, setActivePinia } from 'pinia'
import { createObjectStore } from '../../src/store/useObjectStore.js'

/**
 * @param {object} body The response body.
 * @return {object} A 200 response.
 */
function okResponse(body) {
	return { ok: true, json: () => Promise.resolve(body) }
}

describe('useObjectStore lenses', () => {
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		store = createObjectStore('lenses-store')()
		store.registerObjectType('case', '28', '5')
	})

	it('starts empty for a registered type', () => {
		expect(store.lenses.case).toEqual({})
		expect(store.getLenses('case')).toEqual({})
	})

	it('keeps the report of an unavailable recent lens', async () => {
		const recent = { available: false, reason: 'audit-trail-disabled' }
		global.fetch = jest.fn().mockResolvedValue(okResponse({ results: [], total: 0, '@self': { lenses: { recent } } }))

		await store.fetchCollection('case', { _recent: true })

		expect(store.lenses.case).toEqual({ recent })
		expect(store.collections.case).toEqual([])
	})

	it('clears the report when the next response carries none', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce(okResponse({ results: [], '@self': { lenses: { recent: { available: false, reason: 'anonymous' } } } }))
			.mockResolvedValueOnce(okResponse({ results: [{ id: '1' }], total: 1 }))

		await store.fetchCollection('case', { _recent: true })
		await store.fetchCollection('case', {})

		expect(store.lenses.case).toEqual({})
	})

	it('drops the report when the type is unregistered', async () => {
		global.fetch = jest.fn().mockResolvedValue(okResponse({ results: [], '@self': { lenses: { recent: { available: true, reason: null } } } }))
		await store.fetchCollection('case', { _recent: true })

		store.unregisterObjectType('case')

		expect(store.lenses.case).toBeUndefined()
	})
})
