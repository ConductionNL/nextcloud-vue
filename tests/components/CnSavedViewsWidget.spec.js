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
import { reactive, ref } from 'vue'
import CnSavedViewsWidget from '@/components/CnSavedViewsWidget/CnSavedViewsWidget.vue'
import { fetchEndpointSource } from '@/composables/useEndpointSource.js'
import { fetchListTotal } from '@/utils/fetchFilterCounts.js'

jest.mock('@nextcloud/auth', () => ({ getCurrentUser: () => ({ uid: 'pieter' }) }))
jest.mock('@/composables/useEndpointSource.js', () => ({
	...jest.requireActual('@/composables/useEndpointSource.js'),
	fetchEndpointSource: jest.fn(),
}))
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

/**
 * Workspace mode: a dashboard page saves, applies and deletes its own
 * workspace filters as views (workspace-saved-views).
 *
 * @spec openspec/changes/workspace-saved-views/specs/workspace-saved-views/spec.md
 */
describe('CnSavedViewsWidget workspace mode', () => {
	const WS_VIEWS = [
		{ id: 11, name: 'Urgent tickets', owner: 'pieter', query: { scope: 'pipelinq/my-work', filters: { lens: 'tickets', priority: 'urgent' } } },
		{ id: 12, name: 'Mine, resolved', owner: 'pieter', query: { scope: 'pipelinq/my-work', filters: { lens: 'all', showDone: true } } },
		{ id: 13, name: 'Tickets list view', owner: 'pieter', query: { scope: 'pipelinq/ticket', filters: { status: 'new' } } },
		{ id: 14, name: 'From a colleague', owner: 'sanne', isPublic: true, query: { scope: 'pipelinq/my-work', filters: { lens: 'leads' } } },
	]
	const setError = jest.fn()
	const WORKSPACE = {
		keys: ['lens', '@workspace.showDone', 'priority'],
		countSource: { url: '/apps/pipelinq/api/worklist/items?lens=@workspace.lens&done=@workspace.showDone&priority=@workspace.priority', responsePath: 'items' },
	}

	/**
	 * @param {object} content extra content
	 * @param {object} api the views API stub
	 * @param {object} bag the page workspace
	 * @return {object} wrapper
	 */
	function mountWorkspace(content, api, bag) {
		return mount(CnSavedViewsWidget, {
			props: { content: { scope: 'pipelinq/my-work', workspace: WORKSPACE, ...content }, api },
			global: {
				stubs: {
					RouterLink,
					NcLoadingIcon: true,
					CnSaveViewDialog: { name: 'CnSaveViewDialog', template: '<div data-testid="save-dialog" />', methods: { setError(...args) { setError(...args) } } },
					CnConfirmDialog: { name: 'CnConfirmDialog', props: ['message'], template: '<div data-testid="confirm-dialog">{{ message }}</div>', methods: { setResult: jest.fn() } },
				},
				provide: { cnWorkspaceContext: bag },
			},
		})
	}

	beforeEach(() => fetchEndpointSource.mockReset())

	it('lists the reader\'s own views of the page scope, with the count the endpoint answers for each view\'s values', async () => {
		fetchEndpointSource.mockImplementation(async (source, ctx) => (ctx.workspace.lens === 'tickets' ? [1, 2, 3] : { total: 9 }))
		const api = { fetchViews: jest.fn().mockResolvedValue(WS_VIEWS) }
		const w = mountWorkspace({ showCounts: true }, api, reactive({}))
		await flushPromises()
		const rows = w.findAll('[data-testid="cn-saved-views-link"]')
		expect(rows.map((r) => r.text())).toEqual(['Urgent tickets (3)', 'Mine, resolved (9)'])
		expect(rows[0].element.tagName).toBe('BUTTON')
		expect(fetchEndpointSource.mock.calls[0][1]).toEqual({ workspace: { lens: 'tickets', showDone: '', priority: 'urgent' } })
		expect(fetchEndpointSource.mock.calls[1][1]).toEqual({ workspace: { lens: 'all', showDone: true, priority: '' } })
	})

	it('applies a view by writing every stored key into the page workspace and clearing the rest', async () => {
		const api = { fetchViews: jest.fn().mockResolvedValue(WS_VIEWS) }
		const bag = reactive({ lens: 'leads', showDone: true, priority: 'low', sort: 'newest' })
		const w = mountWorkspace({}, api, bag)
		await flushPromises()
		await w.findAll('[data-testid="cn-saved-views-link"]')[0].trigger('click')
		expect(bag).toEqual({ lens: 'tickets', showDone: '', priority: 'urgent', sort: 'newest' })
		expect(w.findAll('[data-testid="cn-saved-views-link"]')[0].attributes('aria-pressed')).toBe('true')
		expect(w.emitted('apply')[0][0].values).toEqual({ lens: 'tickets', showDone: '', priority: 'urgent' })
	})

	it('applies into a raw ref workspace too', async () => {
		const api = { fetchViews: jest.fn().mockResolvedValue(WS_VIEWS) }
		const bag = ref({ sort: 'deadline' })
		const w = mountWorkspace({}, api, bag)
		await flushPromises()
		await w.findAll('[data-testid="cn-saved-views-link"]')[1].trigger('click')
		expect(bag.value).toEqual({ sort: 'deadline', lens: 'all', showDone: true, priority: '' })
	})

	it('saves the current values of the configured keys under the page scope', async () => {
		const created = { id: 20, name: 'Urgent leads', owner: 'pieter', query: { scope: 'pipelinq/my-work', filters: { lens: 'leads', priority: 'urgent' } } }
		const api = { fetchViews: jest.fn().mockResolvedValue([]), createView: jest.fn().mockResolvedValue(created) }
		const w = mountWorkspace({}, api, reactive({ lens: 'leads', priority: 'urgent', showDone: '', sort: 'newest' }))
		await flushPromises()
		expect(w.find('[data-testid="cn-saved-views-empty"]').exists()).toBe(true)
		await w.find('[data-testid="cn-saved-views-control"]').trigger('click')
		expect(w.find('[data-testid="save-dialog"]').exists()).toBe(true)
		await w.findComponent({ name: 'CnSaveViewDialog' }).vm.$emit('confirm', { name: 'Urgent leads', isPublic: false, sharedWith: [] })
		await flushPromises()
		const body = api.createView.mock.calls[0][0]
		expect(body.name).toBe('Urgent leads')
		expect(body.query.scope).toBe('pipelinq/my-work')
		expect(body.query.filters).toEqual({ lens: 'leads', priority: 'urgent' })
		expect(w.findAll('[data-testid="cn-saved-views-link"]').map((r) => r.text())).toEqual(['Urgent leads'])
		expect(w.find('[data-testid="save-dialog"]').exists()).toBe(false)
	})

	it('keeps the save dialog open with the reason when the save is refused', async () => {
		const api = { fetchViews: jest.fn().mockResolvedValue([]), createView: jest.fn().mockRejectedValue({ response: { data: { error: 'Name taken' } } }) }
		const w = mountWorkspace({}, api, reactive({ lens: 'all' }))
		await flushPromises()
		await w.find('[data-testid="cn-saved-views-control"]').trigger('click')
		const dialog = w.findComponent({ name: 'CnSaveViewDialog' })
		await dialog.vm.$emit('confirm', { name: 'X' })
		await flushPromises()
		expect(w.find('[data-testid="save-dialog"]').exists()).toBe(true)
		expect(setError).toHaveBeenCalledWith('Name taken')
	})

	it('deletes an own view after the confirmation, and offers no delete on a colleague\'s view', async () => {
		const api = { fetchViews: jest.fn().mockResolvedValue(WS_VIEWS), deleteView: jest.fn().mockResolvedValue() }
		const w = mountWorkspace({ own: false }, api, reactive({}))
		await flushPromises()
		expect(w.findAll('[data-testid="cn-saved-views-link"]').map((r) => r.text())).toEqual(['Urgent tickets', 'Mine, resolved', 'From a colleague'])
		const deletes = w.findAll('[data-testid="cn-saved-views-delete"]')
		expect(deletes).toHaveLength(2)
		await deletes[0].trigger('click')
		expect(w.find('[data-testid="confirm-dialog"]').text()).toContain('Urgent tickets')
		await w.findComponent({ name: 'CnConfirmDialog' }).vm.$emit('confirm')
		await flushPromises()
		expect(api.deleteView).toHaveBeenCalledWith(11)
		expect(w.findAll('[data-testid="cn-saved-views-link"]').map((r) => r.text())).toEqual(['Mine, resolved', 'From a colleague'])
	})

	it('without keys it stays the index-page link list', async () => {
		const w = await mountWidget({ workspace: { keys: [] } })
		await flushPromises()
		expect(w.find('[data-testid="cn-saved-views-control"]').exists()).toBe(false)
		expect(w.findAll('[data-testid="cn-saved-views-link"]')[0].element.tagName).toBe('A')
	})
})
