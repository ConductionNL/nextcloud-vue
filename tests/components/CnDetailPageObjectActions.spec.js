/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page offers the actions OpenRegister lists for its record
 * (`actionsFrom: "openregister"`, object-actions-declared-and-run 5.2).
 *
 * @spec openspec/changes/object-actions/specs/object-actions/spec.md
 */
const mockFetch = jest.fn()
jest.mock('../../src/composables/useObjectActions.js', () => {
	const actual = jest.requireActual('../../src/composables/useObjectActions.js')
	return { ...actual, fetchObjectActions: (...a) => mockFetch(...a) }
})

const { flushPromises, shallowMount } = require('@vue/test-utils')
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

const ACTIONS = [
	{ key: 'publish', label: { nl: 'Publiceren', en: 'Publish' }, surfaces: ['header'], available: false, reason: 'Only a decided decision can be published.', inputs: { type: 'object', properties: { from: { type: 'string' } } } },
	{ key: 'claim', label: 'Claim', available: true },
	{ key: 'bulk-only', label: 'Archive all', surfaces: ['bulk'], available: true },
]

function makeStore(object) {
	return { objects: { 'decidiq-decision': { d1: object } }, schemas: {}, objectTypeRegistry: {}, registerObjectType: jest.fn(), fetchObject: jest.fn(async () => null), fetchSchema: jest.fn(async () => null) }
}

function mountPage(extra = {}) {
	return shallowMount(CnDetailPage, { props: { title: 'Decision', register: 'decidiq', schema: 'decision', objectId: 'd1', objectStore: makeStore({ id: 'd1' }), ...extra } })
}

describe('CnDetailPage actionsFrom', () => {
	beforeEach(() => {
		mockFetch.mockReset()
		mockFetch.mockResolvedValue(ACTIONS)
	})

	it('lists the header-surface actions as object-action entries', async () => {
		const w = mountPage({ actionsFrom: 'openregister' })
		await flushPromises()
		expect(mockFetch).toHaveBeenCalledWith({ register: 'decidiq', schema: 'decision', id: 'd1' })
		const entries = w.vm.objectActionEntries
		expect(entries.map((e) => e.action)).toEqual(['publish', 'claim'])
		expect(entries[0]).toMatchObject({ id: 'or-action-publish', type: 'object-action', available: false, disabledReason: 'Only a decided decision can be published.', inputsSchema: ACTIONS[0].inputs })
		expect(w.vm.effectiveHeaderActions.map((e) => e.id)).toEqual(expect.arrayContaining(['or-action-publish', 'or-action-claim']))
	})

	it('narrows and orders by actionsInclude, and reads nothing without actionsFrom', async () => {
		const w = mountPage({ actionsFrom: 'openregister', actionsInclude: ['claim', 'publish'] })
		await flushPromises()
		expect(w.vm.objectActionEntries.map((e) => e.action)).toEqual(['claim', 'publish'])
		mockFetch.mockClear()
		const off = mountPage()
		await flushPromises()
		expect(mockFetch).not.toHaveBeenCalled()
		expect(off.vm.objectActionEntries).toEqual([])
	})
})
