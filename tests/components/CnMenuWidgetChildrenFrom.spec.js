/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A menu item can take its children from the values of a facetable field
 * (`childrenFrom`): DqCatalogus lists the case type folders under "Case
 * types", one row per category the case types use, each opening the case
 * types index on that folder.
 *
 * @spec openspec/changes/menu-children-from-facet/specs/menu-widget/spec.md#requirement-a-menu-item-can-take-its-children-from-a-facet
 */
import { flushPromises, mount } from '@vue/test-utils'

const mockFetchJson = jest.fn()
jest.mock('../../src/utils/cnFetch.js', () => {
	const actual = jest.requireActual('../../src/utils/cnFetch.js')
	return { ...actual, cnFetchJson: (...a) => mockFetchJson(...a) }
})

import CnMenuWidget from '../../src/components/CnMenuWidget/CnMenuWidget.vue'

const FACETS = {
	facets: {
		category: { type: 'terms', buckets: [{ key: 'Vergunningen', results: 7, label: 'Vergunningen' }, { key: 'Bezwaar en beroep', results: 2, label: 'Bezwaar en beroep' }] },
	},
}

const CASE_TYPES = {
	label: 'Case types',
	url: '/case-types',
	childrenFrom: { register: 'dossiq', schema: 'caseType', field: 'category', url: '/case-types?category={value}' },
}

/**
 * @param {Array<object>} items The menu items.
 * @return {Promise<object>} The mounted widget.
 */
async function mountMenu(items) {
	const w = mount(CnMenuWidget, { propsData: { content: { style: 'tree', expandedByDefault: true, items } } })
	await flushPromises()
	return w
}

describe('CnMenuWidget childrenFrom', () => {
	beforeEach(() => {
		mockFetchJson.mockReset()
	})

	it('asks the schema for the field\'s facet once, without rows', async () => {
		mockFetchJson.mockResolvedValue(FACETS)
		await mountMenu([CASE_TYPES])
		expect(mockFetchJson).toHaveBeenCalledTimes(1)
		const [url, options] = mockFetchJson.mock.calls[0]
		expect(url).toBe('/apps/openregister/api/objects/dossiq/caseType')
		expect(options.query).toEqual(expect.objectContaining({ _limit: 1, _facets: 'extend' }))
	})

	it('draws one child per value, linking to the url with the value filled in', async () => {
		mockFetchJson.mockResolvedValue(FACETS)
		const w = await mountMenu([CASE_TYPES])
		const children = w.vm.items[0].children
		expect(children.map((child) => child.label)).toEqual(['Vergunningen', 'Bezwaar en beroep'])
		expect(children[1].url).toBe('/case-types?category=Bezwaar%20en%20beroep')
		expect(w.findAll('.cn-menu-tree-node--depth-2 .cn-menu-tree-node__label').map((n) => n.text())).toEqual(['Vergunningen', 'Bezwaar en beroep'])
	})

	it('keeps the declared children first', async () => {
		mockFetchJson.mockResolvedValue(FACETS)
		const w = await mountMenu([{ ...CASE_TYPES, children: [{ label: 'All', url: '/case-types' }] }])
		expect(w.vm.items[0].children.map((child) => child.label)).toEqual(['All', 'Vergunningen', 'Bezwaar en beroep'])
	})

	it('leaves the item without children when the request fails', async () => {
		mockFetchJson.mockRejectedValue(new Error('403'))
		const w = await mountMenu([CASE_TYPES])
		expect(w.vm.items[0].children || []).toEqual([])
		expect(w.findAll('.cn-menu-tree-node--depth-2')).toHaveLength(0)
	})

	it('fetches nothing for items without childrenFrom', async () => {
		await mountMenu([{ label: 'Attributes', url: '/attributes' }])
		expect(mockFetchJson).not.toHaveBeenCalled()
	})

	it('marks a tree that opens fully, so the board look can drop its carets', async () => {
		mockFetchJson.mockResolvedValue(FACETS)
		const w = await mountMenu([CASE_TYPES])
		expect(w.classes()).toContain('cn-menu-widget--expanded')
	})
})
