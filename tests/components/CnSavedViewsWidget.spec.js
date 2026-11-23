/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSavedViewsWidget: the reader's own saved views as links into the index page
 * (screens-own-saved-views).
 *
 * @spec openspec/changes/screens-own-saved-views/specs/own-saved-views/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnSavedViewsWidget from '@/components/CnSavedViewsWidget/CnSavedViewsWidget.vue'
import { fetchListTotal } from '@/utils/fetchFilterCounts.js'

jest.mock('@nextcloud/auth', () => ({ getCurrentUser: () => ({ uid: 'pieter' }) }))
jest.mock('@/utils/fetchFilterCounts.js', () => ({
	...jest.requireActual('@/utils/fetchFilterCounts.js'),
	fetchListTotal: jest.fn(),
}))

const VIEWS = [
	{ id: 1, name: 'Van mij, alle statussen', owner: 'pieter', query: { schemas: ['ticket'], registers: ['pipelinq'], filters: { assignee: 'pieter' } } },
	{ id: 2, name: 'Van mij, opgelost', owner: 'pieter', query: { scope: 'pipelinq/ticket', filters: { status: 'resolved' }, sort: [{ key: 'resolvedAt', order: 'desc' }] } },
	{ id: 3, name: 'Van een collega', owner: 'sanne', query: { schemas: ['ticket'], filters: { assignee: 'sanne' } } },
	{ id: 4, name: 'Mijn leads', owner: 'pieter', query: { schemas: ['lead'], filters: {} } },
]

const RouterLink = { name: 'RouterLink', props: ['to'], template: '<a class="router-link" :data-to="JSON.stringify(to)"><slot /></a>' }

/**
 * @param {object} content widget content
 * @param {Array} views what the API answers
 * @return {object} wrapper
 */
function mountWidget(content, views = VIEWS) {
	return mount(CnSavedViewsWidget, {
		props: { content: { register: 'pipelinq', schema: 'ticket', route: 'Tickets', ...content }, api: { fetchViews: jest.fn().mockResolvedValue(views) } },
		global: { stubs: { RouterLink, NcLoadingIcon: true }, mocks: { $router: { resolve: () => ({ href: '#' }) } } },
	})
}

beforeEach(() => fetchListTotal.mockReset())

describe('CnSavedViewsWidget', () => {
	it('lists the reader\'s own views of the source, as links that apply them on the index page', async () => {
		const w = await mountWidget({})
		await flushPromises()
		const links = w.findAll('[data-testid="cn-saved-views-link"]')
		expect(links.map((l) => l.text())).toEqual(['Van mij, alle statussen', 'Van mij, opgelost'])
		expect(JSON.parse(links[0].attributes('data-to'))).toEqual({ name: 'Tickets', query: { assignee: 'pieter' } })
		expect(JSON.parse(links[1].attributes('data-to'))).toEqual({ name: 'Tickets', query: { status: 'resolved', _order: JSON.stringify([{ key: 'resolvedAt', order: 'desc' }]) } })
	})

	it('own: false adds the views shared with the reader', async () => {
		const w = await mountWidget({ own: false })
		await flushPromises()
		expect(w.findAll('[data-testid="cn-saved-views-link"]').map((l) => l.text())).toContain('Van een collega')
	})

	it('adds how many records each view matches when asked, and shows none for a failed count', async () => {
		fetchListTotal.mockImplementation(async (register, schema, filter) => {
			if (filter.status) {
				throw new Error('x')
			}
			return 9
		})
		const w = await mountWidget({ showCounts: true })
		await flushPromises()
		expect(w.findAll('[data-testid="cn-saved-views-link"]').map((l) => l.text())).toEqual(['Van mij, alle statussen (9)', 'Van mij, opgelost'])
		expect(fetchListTotal.mock.calls[0].slice(0, 3)).toEqual(['pipelinq', 'ticket', { assignee: 'pieter' }])
	})

	it('says so when there are none, and when the views could not be read', async () => {
		const none = await mountWidget({}, [])
		await flushPromises()
		expect(none.find('[data-testid="cn-saved-views-empty"]').text()).toBe('You have no saved views yet.')
		const failed = mount(CnSavedViewsWidget, {
			props: { content: { register: 'r', schema: 's', route: 'X' }, api: { fetchViews: jest.fn().mockRejectedValue(new Error('down')) } },
			global: { stubs: { RouterLink, NcLoadingIcon: true } },
		})
		await flushPromises()
		expect(failed.find('[data-testid="cn-saved-views-error"]').exists()).toBe(true)
	})

	it('caps the list at limit and draws plain text without a route', async () => {
		const w = await mountWidget({ limit: 1, route: undefined })
		await flushPromises()
		const rows = w.findAll('[data-testid="cn-saved-views-link"]')
		expect(rows).toHaveLength(1)
		expect(rows[0].element.tagName).toBe('SPAN')
	})
})
