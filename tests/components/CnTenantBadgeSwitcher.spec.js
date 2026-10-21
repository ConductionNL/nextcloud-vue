/**
 * Tests for CnTenantBadge as a switcher: `switchSource`, `switchUrl`,
 * `switchParam` and `reloadAfterSwitch`.
 */

import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnTenantBadge from '../../src/components/CnTenantBadge/CnTenantBadge.vue'
import { stubLocationMethod } from '../support/stubLocation.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((url) => '/index.php' + url) }))

const SOURCE = {
	url: '/apps/books/api/scopes/context',
	itemsPath: 'scopes',
	activePath: 'activeScopeId',
	idField: 'scopeId',
	labelTemplate: ['{code} · {name}', '{name}'],
}

const CONTEXT = {
	activeScopeId: 'b',
	scopes: [
		{ scopeId: 'a', code: 'A-1', name: 'Alpha' },
		{ scopeId: 'b', code: 'B-2', name: 'Beta' },
		{ scopeId: 'c', name: 'Gamma' },
	],
}

const ActionsStub = {
	name: 'NcActions',
	props: ['menuName', 'ariaLabel', 'disabled'],
	template: '<div class="actions-stub" :data-menu-name="menuName" :aria-label="ariaLabel"><slot name="icon" /><slot /></div>',
}

const ActionButtonStub = {
	name: 'NcActionButton',
	props: ['disabled', 'modelValue'],
	emits: ['click'],
	template: '<button class="action-stub" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
}

function mountSwitcher(props = {}) {
	return mount(CnTenantBadge, {
		props: { switchSource: SOURCE, switchUrl: '/apps/books/api/scopes/switch', ...props },
		global: { stubs: { NcActions: ActionsStub, NcActionButton: ActionButtonStub } },
	})
}

describe('CnTenantBadge — switcher', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.post.mockReset()
		axios.get.mockResolvedValue({ data: CONTEXT })
	})

	it('reads the scopes from switchSource and names the active one', async () => {
		const wrapper = mountSwitcher()
		await flushPromises()

		expect(axios.get).toHaveBeenCalledWith('/index.php/apps/books/api/scopes/context')
		expect(wrapper.find('.actions-stub').attributes('data-menu-name')).toBe('B-2 · Beta')
		const labels = wrapper.findAll('.action-stub').map((b) => b.text())
		expect(labels).toEqual(['A-1 · Alpha', 'B-2 · Beta', 'Gamma'])
	})

	it('disables the active scope in the list', async () => {
		const wrapper = mountSwitcher()
		await flushPromises()

		const buttons = wrapper.findAll('.action-stub')
		expect(buttons[1].attributes('disabled')).toBeDefined()
		expect(buttons[0].attributes('disabled')).toBeUndefined()
	})

	it('posts the chosen id under switchParam and marks it active', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const wrapper = mountSwitcher({ switchParam: 'scopeId' })
		await flushPromises()

		await wrapper.findAll('.action-stub')[0].trigger('click')
		await flushPromises()

		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/books/api/scopes/switch', { scopeId: 'a' })
		expect(wrapper.emitted('switched')[0]).toEqual(['a'])
		expect(wrapper.find('.actions-stub').attributes('data-menu-name')).toBe('A-1 · Alpha')
	})

	it('posts `id` when no switchParam is given', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const wrapper = mountSwitcher()
		await flushPromises()

		await wrapper.findAll('.action-stub')[2].trigger('click')
		await flushPromises()

		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/books/api/scopes/switch', { id: 'c' })
	})

	it('reloads the page after a switch when reloadAfterSwitch is set', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const reload = stubLocationMethod('reload')
		try {
			const wrapper = mountSwitcher({ reloadAfterSwitch: true })
			await flushPromises()
			await wrapper.findAll('.action-stub')[0].trigger('click')
			await flushPromises()
			expect(reload).toHaveBeenCalled()
		} finally {
			reload.mockRestore()
		}
	})

	it('shows an alert and keeps the active scope when the switch fails', async () => {
		axios.post.mockRejectedValue({ response: { status: 404 } })
		const wrapper = mountSwitcher()
		await flushPromises()

		await wrapper.findAll('.action-stub')[0].trigger('click')
		await flushPromises()

		expect(wrapper.find('[role="alert"]').exists()).toBe(true)
		expect(wrapper.find('.actions-stub').attributes('data-menu-name')).toBe('B-2 · Beta')
	})

	it('hides with one scope or none', async () => {
		axios.get.mockResolvedValue({ data: { activeScopeId: 'a', scopes: [CONTEXT.scopes[0]] } })
		const wrapper = mountSwitcher()
		await flushPromises()

		expect(wrapper.find('.cn-tenant-badge').exists()).toBe(false)
	})

	it('hides when the source cannot be read', async () => {
		axios.get.mockRejectedValue(new Error('offline'))
		const wrapper = mountSwitcher()
		await flushPromises()

		expect(wrapper.find('.cn-tenant-badge').exists()).toBe(false)
	})
})
