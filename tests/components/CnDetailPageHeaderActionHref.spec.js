/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A manifest header action with `href` on a detail page is a real link, in the
 * header's Actions menu and as a quick action button. An instance path goes
 * through `generateUrl()`, `target` defaults to `_self`, and the action is
 * never dispatched (nextcloud-vue#1314).
 */

import { mount } from '@vue/test-utils'
import CnActionButtons from '../../src/components/CnActionButtons/CnActionButtons.vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc/index.php${p}`),
	getRootUrl: jest.fn(() => '/nc'),
	generateOcsUrl: jest.fn((p) => `/nc/ocs/v2.php${p}`),
	generateRemoteUrl: jest.fn((p) => `/nc/remote.php/${p}`),
	imagePath: jest.fn((app, file) => `/nc/${app}/img/${file}`),
}))

const ACTIONS = [
	{ id: 'connections', label: 'Add integration', href: '/apps/integriq/connections?app=stackiq' },
	{ id: 'docs', label: 'Docs', href: 'https://example.org/docs', target: '_blank' },
	{ id: 'copy-case', type: 'open-modal', label: 'Copy case', target: 'CaseCopyDialog' },
]

/**
 * @return {object} A store stub holding one object.
 */
function makeFakeStore() {
	return {
		objects: { 'r-s': { o1: { id: 'o1', status: 'received' } } },
		schemas: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

/**
 * @param {object} extra Extra props.
 * @return {object} The wrapper.
 */
function mountPage(extra = {}) {
	return mount(CnDetailPage, {
		propsData: {
			register: 'r',
			schema: 's',
			objectId: 'o1',
			objectStore: makeFakeStore(),
			headerActions: ACTIONS,
			...extra,
		},
		global: {
			stubs: {
				NcActionLink: { props: ['href', 'target'], template: '<a class="link" :href="href" :target="target" v-bind="$attrs"><slot /></a>' },
				NcButton: { props: ['href', 'target', 'variant', 'disabled'], emits: ['click'], template: '<component :is="href ? \'a\' : \'button\'" :href="href" :target="target" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></component>' },
			},
		},
	})
}

describe('CnDetailPage: a header action with href', () => {
	it('renders an anchor in the Actions menu with the resolved href', async () => {
		const wrapper = mountPage()
		await wrapper.vm.$nextTick()
		const link = wrapper.find('[data-testid="cn-action-connections"]')
		expect(link.element.tagName).toBe('A')
		expect(link.attributes('href')).toBe('/nc/index.php/apps/integriq/connections?app=stackiq')
		expect(link.attributes('target')).toBe('_self')
		const docs = wrapper.find('[data-testid="cn-action-docs"]')
		expect(docs.attributes('href')).toBe('https://example.org/docs')
		expect(docs.attributes('target')).toBe('_blank')
		// A dispatched action stays a menu button.
		expect(wrapper.find('[data-testid="cn-action-copy-case"]').element.tagName).not.toBe('A')
	})

	it('hands CnActionButtons the link without a handler, and never dispatches it', async () => {
		const wrapper = mountPage({ headerActions: [{ ...ACTIONS[0], handler: 'openConnections' }], quickActions: ['connections'] })
		await wrapper.vm.$nextTick()
		const buttons = wrapper.findComponent(CnActionButtons)
		expect(buttons.props('actions')[0]).toEqual({ id: 'connections', label: 'Add integration', href: '/nc/index.php/apps/integriq/connections?app=stackiq', target: '_self' })
		const dispatch = jest.spyOn(buttons.vm, 'onActionClick').mockImplementation(() => {})

		const quick = wrapper.find('[data-testid="cn-detail-page-quick-connections"]')
		expect(quick.element.tagName).toBe('A')
		expect(quick.attributes('href')).toBe('/nc/index.php/apps/integriq/connections?app=stackiq')
		await quick.trigger('click')
		expect(dispatch).not.toHaveBeenCalled()
	})

	it('makes a JS entry with a function handler and href a link without the handler', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const headerActions = [{ id: 'detail-js', label: 'JS', href: '/index.php/apps/x', handler: () => {} }]
		const wrapper = mountPage({ headerActions })
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent(CnActionButtons).props('actions')[0]).toEqual({ id: 'detail-js', label: 'JS', href: '/nc/index.php/apps/x', target: '_self' })
		warn.mockRestore()
	})

	it('resolves the href of a header action child through generateUrl', async () => {
		const wrapper = mountPage({ headerActions: [{ id: 'more', label: 'More', handler: 'more', children: [{ id: 'sub', label: 'Sub', href: '/apps/x' }] }] })
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent(CnActionButtons).props('actions')[0].children[0]).toEqual({ id: 'sub', label: 'Sub', href: '/nc/index.php/apps/x', target: '_self' })
	})

	it('renders a stage primary link that neither dispatches nor emits primary-action', async () => {
		const wrapper = mountPage({ headerActions: [], primaryActionByStage: { received: ACTIONS[0] } })
		await new Promise((resolve) => setTimeout(resolve, 0))
		await wrapper.vm.$nextTick()
		const dispatch = jest.spyOn(wrapper.findComponent(CnActionButtons).vm, 'onActionClick').mockImplementation(() => {})
		const primary = wrapper.find('[data-testid="cn-detail-page-primary-action"]')
		expect(primary.element.tagName).toBe('A')
		expect(primary.attributes('href')).toBe('/nc/index.php/apps/integriq/connections?app=stackiq')
		await primary.trigger('click')
		await primary.trigger('click', { ctrlKey: true })
		expect(dispatch).not.toHaveBeenCalled()
		expect(wrapper.emitted('primary-action')).toBeFalsy()
	})
})
