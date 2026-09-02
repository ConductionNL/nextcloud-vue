/**
 * Tests for the migrated `tile` dashboard widget (cn-widget-library Wave 1).
 *
 * The migrated tile renderer/form are named CnDashTileWidget /
 * CnDashTileWidgetForm to avoid clobbering the library's pre-existing
 * quick-access CnTileWidget; they register under widget type `tile`.
 *
 * Covers: renderer renders its config from BOTH new inline content and legacy
 * flat placement.tile* fields, the form edits the content shape and validates,
 * and the registry entry is present after importing the renderer index.
 */

import { mount } from '@vue/test-utils'
import CnDashTileWidget from '@/components/CnDashTileWidget/CnDashTileWidget.vue'
import CnDashTileWidgetForm from '@/components/CnDashTileWidgetForm/CnDashTileWidgetForm.vue'

describe('CnDashTileWidget renderer', () => {
	it('renders the title from new inline content', () => {
		const wrapper = mount(CnDashTileWidget, {
			propsData: { content: { title: 'Files', linkType: 'app', linkValue: '/apps/files' } },
		})
		expect(wrapper.find('.cn-dash-tile-widget__title').text()).toBe('Files')
	})

	it('falls back to legacy flat placement.tile* fields', () => {
		const wrapper = mount(CnDashTileWidget, {
			propsData: {
				content: {},
				placement: { tileTitle: 'Legacy', tileLinkType: 'url', tileLinkValue: 'https://example.com' },
			},
		})
		expect(wrapper.find('.cn-dash-tile-widget__title').text()).toBe('Legacy')
		expect(wrapper.vm.resolvedTarget).toBe('_blank')
	})

	describe('route linkType', () => {
		const content = { title: 'New secret', linkType: 'route', linkValue: '/secrets?action=create' }

		/**
		 * Mount with a mocked host router.
		 *
		 * @param {object|null} $router Router mock, or undefined for a router-less host.
		 * @return {object} { wrapper, $router }
		 */
		function mountRouteTile($router) {
			const wrapper = mount(CnDashTileWidget, {
				propsData: { content },
				global: { mocks: { $router } },
			})
			return { wrapper, $router }
		}

		it('resolves the href through the host router', () => {
			const $router = {
				resolve: jest.fn(() => ({ href: '/apps/keepiq/secrets?action=create' })),
				push: jest.fn(),
			}
			const { wrapper } = mountRouteTile($router)
			expect(wrapper.find('a').attributes('href')).toBe('/apps/keepiq/secrets?action=create')
			expect(wrapper.vm.resolvedTarget).toBe('_self')
		})

		it('pushes a plain left click through the router instead of navigating', () => {
			const $router = {
				resolve: jest.fn(() => ({ href: '/apps/keepiq/secrets?action=create' })),
				push: jest.fn(),
			}
			const { wrapper } = mountRouteTile($router)
			const event = { button: 0, preventDefault: jest.fn() }
			wrapper.vm.onClick(event)
			expect(event.preventDefault).toHaveBeenCalled()
			expect($router.push).toHaveBeenCalledWith('/secrets?action=create')
		})

		it('lets a modified click fall through to the href', () => {
			const $router = {
				resolve: jest.fn(() => ({ href: '/apps/keepiq/secrets?action=create' })),
				push: jest.fn(),
			}
			const { wrapper } = mountRouteTile($router)
			const event = { button: 0, ctrlKey: true, preventDefault: jest.fn() }
			wrapper.vm.onClick(event)
			expect($router.push).not.toHaveBeenCalled()
			expect(event.preventDefault).not.toHaveBeenCalled()
		})

		it('still suppresses clicks in edit mode', () => {
			const $router = {
				resolve: jest.fn(() => ({ href: '/apps/keepiq/secrets?action=create' })),
				push: jest.fn(),
			}
			const wrapper = mount(CnDashTileWidget, {
				propsData: { content, isAdmin: true, canEdit: true },
				global: { mocks: { $router } },
			})
			const event = { button: 0, preventDefault: jest.fn() }
			wrapper.vm.onClick(event)
			expect(event.preventDefault).toHaveBeenCalled()
			expect($router.push).not.toHaveBeenCalled()
		})

		it('degrades to a plain link on a host without a router', () => {
			const { wrapper } = mountRouteTile(undefined)
			expect(wrapper.find('a').attributes('href')).toBe('/secrets?action=create')
			const event = { button: 0, preventDefault: jest.fn() }
			wrapper.vm.onClick(event)
			expect(event.preventDefault).not.toHaveBeenCalled()
		})
	})
})

describe('CnDashTileWidgetForm', () => {
	it('emits the assembled tile content shape', () => {
		const wrapper = mount(CnDashTileWidgetForm)
		wrapper.vm.updateField('title', 'My Tile')
		const events = wrapper.emitted('update:content')
		const payload = events[events.length - 1][0]
		expect(payload).toMatchObject({
			title: 'My Tile',
			iconType: 'class',
			backgroundColor: '#3b82f6',
			textColor: '#ffffff',
			linkType: 'app',
			linkValue: '',
		})
	})

	it('onIconChange derives iconType from the value shape', () => {
		const wrapper = mount(CnDashTileWidgetForm)
		wrapper.vm.onIconChange('https://example.com/icon.png')
		expect(wrapper.vm.iconType).toBe('url')
		wrapper.vm.onIconChange('Star')
		expect(wrapper.vm.iconType).toBe('class')
	})

	it('validate requires title and link target', () => {
		const wrapper = mount(CnDashTileWidgetForm)
		expect(wrapper.vm.validate().length).toBe(2)
	})
})

describe('tile registry registration', () => {
	it('registers the tile type after importing the renderer index', () => {
		let mod
		jest.isolateModules(() => {
			require('@/components/CnDashTileWidget/index.js')
			mod = require('@/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		})
		const entry = mod.getWidgetTypeEntry('tile')
		expect(entry).not.toBeNull()
		expect(entry.renderer).toBeTruthy()
		expect(entry.form).toBeTruthy()
		expect(entry.defaultContent).toMatchObject({
			title: '',
			icon: '',
			iconType: 'class',
			backgroundColor: '#3b82f6',
			textColor: '#ffffff',
			linkType: 'app',
			linkValue: '',
		})
		expect(mod.listWidgetTypes()).toContain('tile')
	})
})
