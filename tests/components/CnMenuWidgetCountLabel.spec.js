/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PqCampagne's "In deze campagne" card: each link names its count in its
 * label ("2 nieuwsbrieven", "1 artikel"), counted per campaign. A menu item's
 * `countLabel` ({ one, other } or a string, with `{count}`) carries the count
 * into the label, and a `countFrom` filter may name the record with `@objectId`.
 *
 * @spec openspec/changes/menu-item-count-labels/specs/menu-widget/spec.md#requirement-a-menu-item-can-name-its-count-in-its-label
 */
import { flushPromises, mount } from '@vue/test-utils'

const mockFetchJson = jest.fn()
jest.mock('../../src/utils/cnFetch.js', () => {
	const actual = jest.requireActual('../../src/utils/cnFetch.js')
	return { ...actual, cnFetchJson: (...a) => mockFetchJson(...a) }
})

import CnMenuWidget from '../../src/components/CnMenuWidget/CnMenuWidget.vue'

const items = [
	{ label: 'Newsletters', url: '/blasts', countFrom: { register: 'pipelinq', schema: 'blast', filter: { campaign: '@objectId' } }, countLabel: { one: '{count} newsletter', other: '{count} newsletters' } },
	{ label: 'Articles', url: '/articles', countFrom: { register: 'pipelinq', schema: 'article', filter: { campaign: '@objectId' } }, countLabel: { one: '{count} article', other: '{count} articles' } },
	{ label: 'Leads', url: '/leads', countFrom: { register: 'pipelinq', schema: 'lead', filter: { campaign: '@objectId' } }, countLabel: '{count} leads' },
]

/**
 * @param {object} context The injected object context.
 * @return {Promise<object>} The mounted widget.
 */
async function mountMenu(context) {
	const w = mount(CnMenuWidget, {
		props: { content: { style: 'tree', expandedByDefault: true, items } },
		global: { provide: { cnObjectContext: context, cnTranslate: (key) => ({ '{count} newsletters': '{count} nieuwsbrieven', '{count} article': '{count} artikel' })[key] || key } },
	})
	await flushPromises()
	return w
}

describe('CnMenuWidget countLabel', () => {
	beforeEach(() => {
		mockFetchJson.mockReset()
		mockFetchJson.mockImplementation((url) => Promise.resolve({ results: [], total: url.endsWith('/blast') ? 2 : (url.endsWith('/article') ? 1 : 208) }))
	})

	it('names the count in the label, translated and picked by the count, with no badge', async () => {
		const w = await mountMenu({ objectId: 'camp-1' })
		expect(w.findAll('.cn-menu-tree-node__label, .cn-menu-tree-node a').map((node) => node.text()).join('|')).toContain('2 nieuwsbrieven')
		expect(w.text()).toContain('1 artikel')
		expect(w.text()).toContain('208 leads')
		expect(w.findAll('.cn-menu-tree-node__count')).toHaveLength(0)
	})

	it('scopes the count to the record through @objectId', async () => {
		await mountMenu({ objectId: 'camp-1' })
		expect(mockFetchJson.mock.calls[0][1].query).toEqual({ campaign: 'camp-1', _limit: 1 })
	})

	it('keeps the plain label while the record is not known', async () => {
		const w = await mountMenu(null)
		expect(mockFetchJson).not.toHaveBeenCalled()
		expect(w.text()).toContain('Newsletters')
	})
})
