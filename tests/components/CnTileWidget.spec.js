/**
 * Tests for the quick-access CnTileWidget (rendered by CnDashboardPage for
 * manifest widgets with `type: 'tile'`).
 *
 * Covers the `route` linkType: a plain left click must go through the host
 * app's vue-router (`router.push`) instead of the anchor's full page load —
 * a full load tears down the SPA and any in-memory state (e.g. an unlocked
 * vault). Modified clicks and hosts without a router must keep plain-link
 * behaviour so open-in-new-tab and non-SPA pages still work.
 */

import { mount } from '@vue/test-utils'
import CnTileWidget from '@/components/CnTileWidget/CnTileWidget.vue'

const routeTile = {
	title: 'New secret',
	icon: '🔑',
	iconType: 'emoji',
	backgroundColor: '#21468B',
	textColor: '#ffffff',
	linkType: 'route',
	linkValue: '/secrets?action=create',
}

/**
 * Mount the tile with a mocked host router.
 *
 * @param {object} tile Tile config to render.
 * @param {object|null} $router Router mock, or null for a router-less host.
 * @return {object} { wrapper, $router }
 */
function mountTile(tile, $router) {
	const wrapper = mount(CnTileWidget, {
		propsData: { tile },
		global: { mocks: { $router } },
	})
	return { wrapper, $router }
}

describe('CnTileWidget route links', () => {
	it('resolves the href through the host router so modified clicks open a real URL', () => {
		const $router = {
			resolve: jest.fn(() => ({ href: '/apps/keepiq/secrets?action=create' })),
			push: jest.fn(),
		}
		const { wrapper } = mountTile(routeTile, $router)
		expect($router.resolve).toHaveBeenCalledWith('/secrets?action=create')
		expect(wrapper.find('a').attributes('href')).toBe('/apps/keepiq/secrets?action=create')
		expect(wrapper.find('a').attributes('target')).toBe('_self')
	})

	it('pushes a plain left click through the router instead of navigating', async () => {
		const $router = {
			resolve: jest.fn(() => ({ href: '/apps/keepiq/secrets?action=create' })),
			push: jest.fn(),
		}
		const { wrapper } = mountTile(routeTile, $router)
		await wrapper.find('a').trigger('click', { button: 0 })
		expect($router.push).toHaveBeenCalledWith('/secrets?action=create')
	})

	it.each([
		['ctrl', { ctrlKey: true }],
		['meta', { metaKey: true }],
		['shift', { shiftKey: true }],
		['alt', { altKey: true }],
		['middle button', { button: 1 }],
	])('lets a %s click fall through to the href', (_label, eventProps) => {
		const $router = {
			resolve: jest.fn(() => ({ href: '/apps/keepiq/secrets' })),
			push: jest.fn(),
		}
		const { wrapper } = mountTile(routeTile, $router)
		const event = { button: 0, preventDefault: jest.fn(), ...eventProps }
		wrapper.vm.onLinkClick(event)
		expect($router.push).not.toHaveBeenCalled()
		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	it('degrades to a plain link on a host without a router', () => {
		const { wrapper } = mountTile(routeTile, undefined)
		expect(wrapper.find('a').attributes('href')).toBe('/secrets?action=create')
		const event = { button: 0, preventDefault: jest.fn() }
		wrapper.vm.onLinkClick(event)
		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	it('leaves app and url tiles on plain anchor navigation', () => {
		const $router = {
			resolve: jest.fn(() => ({ href: '/resolved' })),
			push: jest.fn(),
		}
		const { wrapper } = mountTile({ ...routeTile, linkType: 'app', linkValue: 'files' }, $router)
		const event = { button: 0, preventDefault: jest.fn() }
		wrapper.vm.onLinkClick(event)
		expect($router.push).not.toHaveBeenCalled()
		expect(event.preventDefault).not.toHaveBeenCalled()
		expect($router.resolve).not.toHaveBeenCalled()
		expect(wrapper.find('a').attributes('target')).toBe('_self')
	})
})
