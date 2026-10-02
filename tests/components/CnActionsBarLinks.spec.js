// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * CnActionsBar's link surfaces: the Add button with `addHref` / `addTo`, and
 * header actions carrying `href` / `to`. Each renders as a real link and
 * still emits the event its button form emits.
 */

import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'

/**
 * @return {object} A router stub that resolves a path or `{ name }` to a hash href.
 */
function makeRouter() {
	return {
		push: jest.fn(() => Promise.resolve()),
		resolve: jest.fn((to) => ({ href: '#' + (typeof to === 'string' ? to : '/' + to.name) })),
	}
}

/**
 * @param {object} extra Extra props.
 * @param {object|null} router The router mock.
 * @return {object} The wrapper.
 */
function mountBar(extra = {}, router = makeRouter()) {
	return mount(CnActionsBar, {
		propsData: { selectedIds: [], objectCount: 0, ...extra },
		mocks: { $router: router },
		stubs: {
			NcActions: { template: '<div class="nc-actions-stub"><slot /></div>' },
			NcActionButton: {
				template: '<button class="nc-action-button-stub" @click="$emit(\'click\', $event)"><slot /></button>',
				props: ['disabled'],
				emits: ['click'],
			},
			NcActionLink: {
				template: '<a class="nc-action-link-stub" :href="href" :target="target" @click="$emit(\'click\', $event)"><slot /></a>',
				props: ['href', 'target'],
				emits: ['click'],
			},
			NcButton: {
				template: '<component :is="href ? \'a\' : \'button\'" class="nc-button-stub" :href="href" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></component>',
				props: ['disabled', 'href'],
				emits: ['click'],
			},
			CnIcon: true,
			CnBuildiqEditButton: true,
		},
	})
}

describe('CnActionsBar — Add as a link', () => {
	it('stays a plain button without addHref / addTo', async () => {
		const wrapper = mountBar()
		const add = wrapper.find('[data-testid="cn-cta-primary"]')
		expect(add.element.tagName).toBe('BUTTON')
		await add.trigger('click')
		expect(wrapper.emitted('add')).toHaveLength(1)
	})

	it('links to the router href of addTo, routes a plain click and emits add', async () => {
		const router = makeRouter()
		const wrapper = mountBar({ addTo: '/flows/new' }, router)
		const add = wrapper.find('[data-testid="cn-cta-primary"]')
		expect(add.element.tagName).toBe('A')
		expect(add.attributes('href')).toBe('#/flows/new')
		await add.trigger('click')
		expect(router.push).toHaveBeenCalledWith('/flows/new')
		expect(wrapper.emitted('add')).toHaveLength(1)
	})

	it('leaves a middle/ctrl click on addTo to the browser, without emitting add in this tab', async () => {
		const router = makeRouter()
		const wrapper = mountBar({ addTo: '/flows/new' }, router)
		await wrapper.find('[data-testid="cn-cta-primary"]').trigger('click', { ctrlKey: true })
		expect(router.push).not.toHaveBeenCalled()
		expect(wrapper.emitted('add')).toBeFalsy()
	})

	it('uses addHref as is and never routes it', async () => {
		const router = makeRouter()
		const wrapper = mountBar({ addHref: 'https://a.test/new', addTo: '/ignored' }, router)
		const add = wrapper.find('[data-testid="cn-cta-primary"]')
		expect(add.attributes('href')).toBe('https://a.test/new')
		await add.trigger('click')
		expect(router.push).not.toHaveBeenCalled()
	})

	it('stays a button while addDisabled', () => {
		const wrapper = mountBar({ addTo: '/flows/new', addDisabled: true })
		expect(wrapper.find('[data-testid="cn-cta-primary"]').element.tagName).toBe('BUTTON')
	})
})

describe('CnActionsBar — header actions as links', () => {
	it('renders a `to` entry as NcActionLink, routes a plain click and emits header-action', async () => {
		const router = makeRouter()
		const wrapper = mountBar({
			headerActions: [
				{ id: 'logs', label: 'Logs', to: { name: 'SourceLogs' } },
				{ id: 'sync', label: 'Sync' },
			],
		}, router)
		const links = wrapper.findAll('.nc-action-link-stub').filter((l) => l.text() === 'Logs')
		expect(links).toHaveLength(1)
		expect(links[0].attributes('href')).toBe('#/SourceLogs')
		expect(wrapper.findAll('.nc-action-button-stub').some((b) => b.text() === 'Sync')).toBe(true)

		await links[0].trigger('click')
		expect(router.push).toHaveBeenCalledWith({ name: 'SourceLogs' })
		expect(wrapper.emitted('header-action')).toEqual([[{ action: 'logs', id: 'logs' }]])
	})

	it('emits no header-action for a ctrl-click on a header link', async () => {
		const router = makeRouter()
		const wrapper = mountBar({ headerActions: [{ id: 'logs', label: 'Logs', to: { name: 'SourceLogs' } }] }, router)
		const link = wrapper.findAll('.nc-action-link-stub').filter((l) => l.text() === 'Logs')[0]
		await link.trigger('click', { ctrlKey: true })
		expect(router.push).not.toHaveBeenCalled()
		expect(wrapper.emitted('header-action')).toBeFalsy()
	})

	it('keeps a disabled or unresolvable `to` entry a button', () => {
		const wrapper = mountBar({
			headerActions: [
				{ id: 'a', label: 'A', to: { name: 'X' }, disabled: true },
			],
		})
		expect(wrapper.findAll('.nc-action-link-stub').some((l) => l.text() === 'A')).toBe(false)
		const noRouter = mountBar({ headerActions: [{ id: 'b', label: 'B', to: { name: 'X' } }] }, null)
		expect(noRouter.findAll('.nc-action-link-stub').some((l) => l.text() === 'B')).toBe(false)
	})
})
