/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSavedViewsWidget `workspace` mode: a dashboard page's own saved views,
 * stored and applied as page workspace values (PqMijnWerk).
 *
 * @spec openspec/changes/dashboard-page-saved-views/specs/dashboard-page-saved-views/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnSavedViewsWidget from '@/components/CnSavedViewsWidget/CnSavedViewsWidget.vue'
import { fetchEndpointSource } from '@/composables/useEndpointSource.js'

jest.mock('@nextcloud/auth', () => ({ getCurrentUser: () => ({ uid: 'pieter' }) }))
jest.mock('@/composables/useEndpointSource.js', () => ({
	...jest.requireActual('@/composables/useEndpointSource.js'),
	fetchEndpointSource: jest.fn(),
}))

const KEYS = ['lens', 'showDone', 'priority']
const VIEWS = [
	{ id: 1, name: 'Urgent tickets', owner: 'pieter', query: { scope: 'pipelinq/my-work', workspace: { lens: 'tickets', priority: 'urgent', showDone: '' } } },
	{ id: 2, name: 'Resolved', owner: 'pieter', query: { scope: 'pipelinq/my-work', workspace: { lens: 'all', showDone: '1' } } },
	{ id: 3, name: 'Ticket index view', owner: 'pieter', query: { scope: 'pipelinq/my-work', filters: { status: 'new' } } },
	{ id: 4, name: 'Another page', owner: 'pieter', query: { scope: 'pipelinq/other', workspace: { lens: 'leads' } } },
	{ id: 5, name: 'Shared by Sanne', owner: 'sanne', query: { scope: 'pipelinq/my-work', workspace: { lens: 'leads' } } },
]

/**
 * @param {object} options mount options
 * @param {object} [options.content] extra content
 * @param {object} [options.api] api overrides
 * @param {object} [options.workspace] the workspace ref
 * @param {object} [options.route] the current route
 * @return {{wrapper: object, api: object, router: object}} the mounted widget
 */
function mountWidget({ content = {}, api = {}, workspace = ref({ lens: 'tickets', priority: 'urgent,high', showDone: false, other: 'x' }), route = { query: { lens: 'all', unrelated: '1' } } } = {}) {
	const fullApi = {
		fetchViews: jest.fn().mockResolvedValue(VIEWS),
		createView: jest.fn().mockResolvedValue({ id: 9 }),
		deleteView: jest.fn().mockResolvedValue(undefined),
		...api,
	}
	const router = { replace: jest.fn().mockResolvedValue(undefined) }
	const wrapper = mount(CnSavedViewsWidget, {
		props: { content: { scope: 'pipelinq/my-work', own: false, workspace: { keys: KEYS }, ...content }, api: fullApi },
		global: {
			provide: { cnWorkspaceContext: workspace },
			stubs: { NcLoadingIcon: true },
			mocks: { $router: router, $route: route },
		},
	})
	return { wrapper, api: fullApi, router, workspace }
}

beforeEach(() => fetchEndpointSource.mockReset())

describe('CnSavedViewsWidget workspace mode', () => {
	it('lists only the page\'s views that store a workspace', async () => {
		const { wrapper } = mountWidget()
		await flushPromises()
		expect(wrapper.findAll('[data-testid="cn-saved-views-apply"]').map((b) => b.text())).toEqual(['Urgent tickets', 'Resolved', 'Shared by Sanne'])
		// Only the reader's own views can be deleted.
		expect(wrapper.findAll('[data-testid="cn-saved-views-delete"]')).toHaveLength(2)
	})

	it('counts each view through the count endpoint with the view\'s values', async () => {
		fetchEndpointSource.mockImplementation(async (cfg, ctx) => {
			if (ctx.workspace.lens === 'all') {
				throw new Error('down')
			}
			return ctx.workspace.lens === 'tickets' ? [{}, {}, {}] : 4
		})
		const { wrapper } = mountWidget({ content: { workspace: { keys: KEYS, count: { url: '/apps/pipelinq/api/worklist/items?lens=@workspace.lens', responsePath: 'items' } } } })
		await flushPromises()
		expect(wrapper.findAll('[data-testid="cn-saved-views-apply"]').map((b) => b.text())).toEqual(['Urgent tickets (3)', 'Resolved', 'Shared by Sanne (4)'])
		expect(fetchEndpointSource.mock.calls[0][0]).toEqual({ url: '/apps/pipelinq/api/worklist/items?lens=@workspace.lens', responsePath: 'items' })
		expect(fetchEndpointSource.mock.calls[0][1]).toEqual({ workspace: { lens: 'tickets', showDone: '', priority: 'urgent' } })
	})

	it('applies a view: every stored key into the workspace and the address keys it carries', async () => {
		const { wrapper, router, workspace } = mountWidget()
		await flushPromises()
		await wrapper.findAll('[data-testid="cn-saved-views-apply"]')[1].trigger('click')
		expect(workspace.value).toEqual({ lens: 'all', showDone: '1', priority: '', other: 'x' })
		expect(router.replace).toHaveBeenCalledWith({ query: { lens: 'all', unrelated: '1' } })
		expect(wrapper.emitted('apply')[0][0].id).toBe(2)
		expect(wrapper.findAll('[data-testid="cn-saved-views-apply"]')[1].attributes('aria-pressed')).toBe('true')
	})

	it('drops an address key the applied view leaves empty', async () => {
		const { wrapper, router } = mountWidget({ route: { query: { priority: 'high' } } })
		await flushPromises()
		await wrapper.findAll('[data-testid="cn-saved-views-apply"]')[1].trigger('click')
		expect(router.replace).toHaveBeenCalledWith({ query: {} })
	})

	it('saves the current controls under a name and reads the list again', async () => {
		const { wrapper, api } = mountWidget()
		await flushPromises()
		await wrapper.find('[data-testid="cn-saved-views-save"]').trigger('click')
		await wrapper.findComponent({ name: 'NcTextField' }).vm.$emit('update:modelValue', '  My urgent  ')
		await wrapper.find('[data-testid="cn-saved-views-save-form"]').trigger('submit')
		await flushPromises()
		expect(api.createView).toHaveBeenCalledWith({
			name: 'My urgent',
			description: '',
			isPublic: false,
			isDefault: false,
			query: { filters: {}, search: '', sort: null, scope: 'pipelinq/my-work', workspace: { lens: 'tickets', showDone: false, priority: 'urgent,high' } },
		})
		expect(api.fetchViews).toHaveBeenCalledTimes(2)
		expect(wrapper.find('[data-testid="cn-saved-views-save-form"]').exists()).toBe(false)
	})

	it('says so when saving fails and keeps the form', async () => {
		const { wrapper } = mountWidget({ api: { createView: jest.fn().mockRejectedValue(new Error('x')) } })
		await flushPromises()
		await wrapper.find('[data-testid="cn-saved-views-save"]').trigger('click')
		await wrapper.findComponent({ name: 'NcTextField' }).vm.$emit('update:modelValue', 'A')
		await wrapper.find('[data-testid="cn-saved-views-save-form"]').trigger('submit')
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-saved-views-write-error"]').text()).toBe('The view could not be saved.')
		expect(wrapper.find('[data-testid="cn-saved-views-save-form"]').exists()).toBe(true)
	})

	it('deletes a view only after confirmation', async () => {
		const { wrapper, api } = mountWidget()
		await flushPromises()
		await wrapper.findAll('[data-testid="cn-saved-views-delete"]')[0].trigger('click')
		expect(api.deleteView).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-saved-views-confirm"]').text()).toBe('Delete "Urgent tickets"?')
		await wrapper.find('[data-testid="cn-saved-views-cancel-delete"]').trigger('click')
		expect(wrapper.find('[data-testid="cn-saved-views-confirm"]').exists()).toBe(false)
		await wrapper.findAll('[data-testid="cn-saved-views-delete"]')[0].trigger('click')
		await wrapper.find('[data-testid="cn-saved-views-confirm-delete"]').trigger('click')
		await flushPromises()
		expect(api.deleteView).toHaveBeenCalledWith(1)
		expect(api.fetchViews).toHaveBeenCalledTimes(2)
	})

	it('offers Save view on an empty list', async () => {
		const { wrapper } = mountWidget({ api: { fetchViews: jest.fn().mockResolvedValue([]) } })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-saved-views-empty"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-saved-views-save"]').exists()).toBe(true)
	})
})
