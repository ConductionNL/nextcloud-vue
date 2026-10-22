/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqCatalogus draws a count beside each folder: Zaaktypen 14, Attributen 62,
 * Sjablonen 23, Objecttypen 7. A menu item's `countFrom` reads it: the total
 * of a register schema (`{ register, schema, filter? }`), or the rows of an
 * endpoint (`{ url, responsePath? }`). A failed read draws no count.
 *
 * @spec openspec/changes/menu-item-counts/specs/menu-widget/spec.md#requirement-a-menu-item-can-show-a-count
 */
import { flushPromises, mount } from '@vue/test-utils'

const mockFetchJson = jest.fn()
jest.mock('../../src/utils/cnFetch.js', () => {
	const actual = jest.requireActual('../../src/utils/cnFetch.js')
	return { ...actual, cnFetchJson: (...a) => mockFetchJson(...a) }
})

import CnMenuWidget from '../../src/components/CnMenuWidget/CnMenuWidget.vue'

/**
 * @param {Array<object>} items The menu items.
 * @return {Promise<object>} The mounted widget.
 */
async function mountMenu(items) {
	const w = mount(CnMenuWidget, { propsData: { content: { style: 'tree', expandedByDefault: true, items } } })
	await flushPromises()
	return w
}

const counts = (w) => w.findAll('.cn-menu-tree-node__count').map((node) => node.text())

describe('CnMenuWidget countFrom', () => {
	beforeEach(() => {
		mockFetchJson.mockReset()
	})

	it('counts a register schema with one row asked', async () => {
		mockFetchJson.mockResolvedValue({ results: [{}], total: 14 })
		const w = await mountMenu([{ label: 'Case types', url: '/case-types', countFrom: { register: 'dossiq', schema: 'caseType', filter: { isDraft: false } } }])
		const [url, options] = mockFetchJson.mock.calls[0]
		expect(url).toBe('/apps/openregister/api/objects/dossiq/caseType')
		expect(options.query).toEqual(expect.objectContaining({ _limit: 1, isDraft: false }))
		expect(counts(w)).toEqual(['14'])
	})

	it('counts the rows of an endpoint', async () => {
		mockFetchJson.mockResolvedValue({ results: [{}, {}, {}] })
		const w = await mountMenu([{ label: 'Object types', url: '/catalogue', countFrom: { url: '/apps/dossiq/api/catalogue/object-types', responsePath: 'results' } }])
		expect(mockFetchJson.mock.calls[0][0]).toBe('/apps/dossiq/api/catalogue/object-types')
		expect(counts(w)).toEqual(['3'])
	})

	it('takes an endpoint\'s total over its page of rows', async () => {
		mockFetchJson.mockResolvedValue({ results: [{}, {}], total: 7 })
		const w = await mountMenu([{ label: 'Object types', url: '/catalogue', countFrom: { url: '/x', responsePath: 'results' } }])
		expect(counts(w)).toEqual(['7'])
	})

	it('draws no count when the read fails or none is asked', async () => {
		mockFetchJson.mockRejectedValue(new Error('403'))
		const w = await mountMenu([{ label: 'Templates', url: '/t', countFrom: { register: 'dossiq', schema: 'template' } }, { label: 'Plain', url: '/p' }])
		expect(counts(w)).toEqual([])
	})
})
