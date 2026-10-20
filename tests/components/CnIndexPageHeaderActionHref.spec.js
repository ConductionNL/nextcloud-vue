/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A manifest header action with `href` is a real link on every index page
 * surface: the actions bar's overflow menu, the board header's Actions menu
 * and a header button naming it. An absolute URL is kept, an instance path
 * goes through `generateUrl()`, and a click runs no handler and emits no
 * `header-action` (nextcloud-vue#1314).
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc/index.php${p}`),
	getRootUrl: jest.fn(() => '/nc'),
	generateOcsUrl: jest.fn((p) => `/nc/ocs/v2.php${p}`),
	imagePath: jest.fn((app, file) => `/nc/${app}/img/${file}`),
}))

const HEADER_ACTIONS = [
	{ id: 'connections', label: 'Add integration', href: '/apps/integriq/connections?app=stackiq' },
	{ id: 'docs', label: 'Docs', href: 'https://example.org/docs', target: '_blank' },
	{ id: 'sync', label: 'Sync', handler: 'syncAll' },
]

/**
 * @param {object} extra Extra props.
 * @param {object} [provide] Extra provides.
 * @return {object} The wrapper.
 */
function mountPage(extra = {}, provide = {}) {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Integrations',
			schema: { title: 'Integration', titlePlural: 'Integrations', properties: { title: { title: 'Title' } } },
			objects: [{ id: 1 }],
			pagination: { page: 1, pages: 1, total: 1, limit: 20 },
			showTitle: true,
			headerActions: HEADER_ACTIONS,
			...extra,
		},
		global: {
			provide,
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Integrations' } },
			stubs: {
				CnSavedViewsControl: true,
				CnBuildiqEditButton: true,
				NcActions: { template: '<div class="actions-menu"><slot /></div>' },
				NcActionButton: { props: ['disabled'], emits: ['click'], template: '<button class="entry" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>' },
				NcActionLink: { props: ['href', 'target'], emits: ['click'], template: '<a class="entry" :href="href" :target="target" @click="$emit(\'click\', $event)"><slot /></a>' },
				NcButton: { props: ['href', 'target', 'variant'], emits: ['click'], template: '<component :is="href ? \'a\' : \'button\'" class="button" :href="href" :target="target" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></component>' },
				CnDataTable: true,
				CnCardGrid: true,
				CnPagination: true,
				CnContextMenu: true,
				CnRowActions: true,
				CnIndexSidebar: true,
				CnIcon: true,
			},
		},
	})
}

const byText = (wrapper, selector, text) => wrapper.findAll(selector).filter((el) => el.text() === text)[0]

describe('CnIndexPage: a header action with href', () => {
	it('hands the bar the resolved link without a handler', () => {
		const wrapper = mountPage()
		const actions = wrapper.vm.mergedHeaderActions
		expect(actions[0]).toEqual({ id: 'connections', label: 'Add integration', href: '/nc/index.php/apps/integriq/connections?app=stackiq', target: '_self', linkTarget: '_self', _dispatchSuppress: true })
		expect(actions[1]).toMatchObject({ href: 'https://example.org/docs', linkTarget: '_blank' })
		expect(actions[2]).not.toHaveProperty('href')
	})

	it('renders an anchor in the actions bar that emits nothing, while a handler entry still dispatches', async () => {
		const syncAll = jest.fn()
		const wrapper = mountPage({}, { cnRegistry: { syncAll: { kind: 'handler', handler: syncAll } } })
		const link = byText(wrapper, 'a.entry', 'Add integration')
		expect(link.attributes('href')).toBe('/nc/index.php/apps/integriq/connections?app=stackiq')
		expect(link.attributes('target')).toBe('_self')
		expect(byText(wrapper, 'a.entry', 'Docs').attributes('target')).toBe('_blank')

		await link.trigger('click')
		expect(wrapper.emitted('header-action')).toBeFalsy()

		await byText(wrapper, 'button.entry', 'Sync').trigger('click')
		expect(syncAll).toHaveBeenCalledWith({ actionId: 'sync' })
		expect(wrapper.emitted('header-action')).toEqual([[{ action: 'sync', id: 'sync' }]])
	})

	it('renders an anchor in the board header Actions menu and as a header button', async () => {
		const wrapper = mountPage({
			headerButtons: [{ action: 'actions-menu' }, { action: 'connections', label: 'Add integration', variant: 'primary' }],
		}, { cnLook: 'board' })
		const entry = wrapper.find('[data-testid="cn-index-header-menu-connections"]')
		expect(entry.element.tagName).toBe('A')
		expect(entry.attributes('href')).toBe('/nc/index.php/apps/integriq/connections?app=stackiq')
		expect(entry.attributes('target')).toBe('_self')
		expect(wrapper.find('[data-testid="cn-index-header-menu-docs"]').attributes('target')).toBe('_blank')

		const button = wrapper.find('[data-testid="cn-index-header-button-connections"]')
		expect(button.element.tagName).toBe('A')
		expect(button.attributes('href')).toBe('/nc/index.php/apps/integriq/connections?app=stackiq')
		await button.trigger('click')
		await entry.trigger('click')
		expect(wrapper.emitted('header-action')).toBeFalsy()
	})

	it('makes a JS entry with a function handler the same link on the bar, the board menu and a header button', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const run = jest.fn()
		const headerActions = [{ id: 'js', label: 'JS link', href: '/apps/x', handler: run }]
		// The bar's Actions menu gives way to the header buttons, so the bar needs its own mount.
		const plain = mountPage({ headerActions })
		const board = mountPage({ headerActions, headerButtons: [{ action: 'actions-menu' }, { action: 'js', label: 'JS link' }] }, { cnLook: 'board' })
		const links = [
			byText(plain.findComponent(CnActionsBar), 'a.entry', 'JS link'),
			board.find('[data-testid="cn-index-header-menu-js"]'),
			board.find('[data-testid="cn-index-header-button-js"]'),
		]
		for (const link of links) {
			expect(link.element.tagName).toBe('A')
			expect(link.attributes('href')).toBe('/nc/index.php/apps/x')
			expect(link.attributes('target')).toBe('_self')
			await link.trigger('click')
		}
		expect(run).not.toHaveBeenCalled()
		expect(plain.emitted('header-action')).toBeFalsy()
		expect(board.emitted('header-action')).toBeFalsy()
		warn.mockRestore()
	})
})

describe('CnIndexPage: a type "navigate" header action', () => {
	it('links an external target in a new tab, and keeps an in-app target as it was', () => {
		const wrapper = mountPage({
			headerActions: [
				{ id: 'ext', label: 'External', type: 'navigate', target: 'https://example.org/x' },
				{ id: 'app', label: 'In app', type: 'navigate', target: '/flows' },
			],
		})
		const [ext, app] = wrapper.vm.mergedHeaderActions
		expect(ext).toMatchObject({ href: 'https://example.org/x', linkTarget: '_blank' })
		expect(app).toMatchObject({ href: '/flows' })
		expect(app).not.toHaveProperty('linkTarget')
		expect(byText(wrapper, 'a.entry', 'External').attributes('target')).toBe('_blank')
		expect(byText(wrapper, 'a.entry', 'In app').attributes('target')).toBeUndefined()
	})

	it('keeps a header button naming it a button that emits header-action', async () => {
		const wrapper = mountPage({
			headerActions: [
				{ id: 'app', label: 'In app', type: 'navigate', target: '/flows' },
				{ id: 'ext', label: 'External', type: 'navigate', target: 'https://example.org/x' },
			],
			headerButtons: [{ action: 'app', label: 'In app' }, { action: 'ext', label: 'External' }],
		}, { cnLook: 'board' })
		for (const id of ['app', 'ext']) {
			const button = wrapper.find(`[data-testid="cn-index-header-button-${id}"]`)
			expect(button.element.tagName).toBe('BUTTON')
			await button.trigger('click')
		}
		expect(wrapper.emitted('header-action')).toEqual([[{ action: 'app', id: 'app' }], [{ action: 'ext', id: 'ext' }]])
	})
})
