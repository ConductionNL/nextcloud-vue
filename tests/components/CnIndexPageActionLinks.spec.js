// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * CnIndexPage's link wiring into CnActionsBar: Add links to a named source's
 * `addRoute`, and a `handler: "navigate"` header action links to its route.
 * Whenever the bar renders a link, the page must not navigate a second time.
 */

import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

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
 * A `this` for the Add computed / method, without mounting a named-source page.
 *
 * @param {object} overrides Fields to override.
 * @return {object} The fake component instance.
 */
function addContext(overrides = {}) {
	const ctx = {
		$: { vnode: { props: {} } },
		$router: makeRouter(),
		$emit: jest.fn(),
		isNamedSource: true,
		namedSource: { addRoute: '/flows/new' },
		openCreateModal: () => false,
		showFormDialog: true,
		...overrides,
	}
	ctx.addLinkTo = CnIndexPage.computed.addLinkTo.call(ctx)
	return ctx
}

describe('CnIndexPage — Add links to a named source addRoute', () => {
	it('passes addRoute as addTo when there is no @add listener', () => {
		expect(addContext().addLinkTo).toBe('/flows/new')
	})

	it('passes nothing when a host listens to @add, or there is no addRoute or router', () => {
		expect(addContext({ $: { vnode: { props: { onAdd: jest.fn() } } } }).addLinkTo).toBeNull()
		expect(addContext({ namedSource: {} }).addLinkTo).toBeNull()
		expect(addContext({ isNamedSource: false }).addLinkTo).toBeNull()
		expect(addContext({ $router: { push: jest.fn() } }).addLinkTo).toBeNull()
	})

	it('does not push again on add when the bar rendered the link', () => {
		const ctx = addContext()
		CnIndexPage.methods.onAddClick.call(ctx)
		expect(ctx.$router.push).not.toHaveBeenCalled()
		expect(ctx.$emit).not.toHaveBeenCalled()
	})

	it('still pushes addRoute when the router cannot resolve it', () => {
		const router = { push: jest.fn(() => Promise.resolve()) }
		const ctx = addContext({ $router: router })
		CnIndexPage.methods.onAddClick.call(ctx)
		expect(router.push).toHaveBeenCalledWith('/flows/new')
	})

	it('binds addTo on CnActionsBar only in the addRoute case', () => {
		const wrapper = mount(CnIndexPage, {
			propsData: { title: 'Sources', schema: { title: 'Source', properties: {} }, objects: [] },
			mocks: { $router: makeRouter() },
			stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnActionsBar: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true },
		})
		expect(wrapper.findComponent({ name: 'CnActionsBar' }).props('addTo')).toBeNull()
	})
})

describe('CnIndexPage — navigate header actions become links', () => {
	/**
	 * @param {Array} headerActions The header actions.
	 * @param {object} router The router mock.
	 * @return {object} The wrapper.
	 */
	function mountPage(headerActions, router) {
		return mount(CnIndexPage, {
			propsData: { title: 'Sources', schema: { title: 'Source', properties: {} }, objects: [], headerActions },
			mocks: { $router: router },
			stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnActionsBar: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true },
		})
	}

	it('gives a resolvable navigate entry a `to` and no handler', () => {
		const router = makeRouter()
		const wrapper = mountPage([{ id: 'new', label: 'New', handler: 'navigate', route: 'ResourceDetail', params: { id: 'new' } }], router)
		const [entry] = wrapper.vm.mergedHeaderActions
		expect(entry.to).toEqual({ name: 'ResourceDetail', params: { id: 'new' } })
		expect(entry.handler).toBeUndefined()
		expect(wrapper.findComponent({ name: 'CnActionsBar' }).props('headerActions')[0].to).toEqual({ name: 'ResourceDetail', params: { id: 'new' } })
	})

	it('only emits header-action on click, leaving the navigation to the link', () => {
		const router = makeRouter()
		const wrapper = mountPage([{ id: 'logs', label: 'Logs', handler: 'navigate', route: 'SourceLogs' }], router)
		wrapper.vm.onHeaderAction({ action: 'logs', id: 'logs' })
		expect(router.push).not.toHaveBeenCalled()
		expect(wrapper.emitted('header-action')).toEqual([[{ action: 'logs', id: 'logs' }]])
	})

	it('keeps the push thunk when the router cannot resolve the route', () => {
		const router = { push: jest.fn() }
		const wrapper = mountPage([{ id: 'logs', label: 'Logs', handler: 'navigate', route: 'SourceLogs' }], router)
		const [entry] = wrapper.vm.mergedHeaderActions
		expect(entry.to).toBeUndefined()
		entry.handler()
		expect(router.push).toHaveBeenCalledWith({ name: 'SourceLogs' })
	})
})
