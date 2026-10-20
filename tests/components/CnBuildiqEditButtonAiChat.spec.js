/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Under the board look the AI chat launcher moves into the buildiq square's
 * menu: the square lists "Open AI chat" when a companion is on the page, and
 * the floating hex is hidden while the square is there. Without the look, or
 * without the square, the hex stays the launcher.
 */
import { mount } from '@vue/test-utils'
import CnBuildiqEditButton from '../../src/components/CnBuildiqEditButton/CnBuildiqEditButton.vue'

const NcActionsStub = {
	name: 'NcActions',
	template: '<div class="nc-actions"><slot name="icon" /><slot /></div>',
}
const NcActionButtonStub = {
	name: 'NcActionButton',
	props: ['disabled'],
	template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
}

function mountButton({ look = 'board', available = true } = {}) {
	return mount(CnBuildiqEditButton, {
		propsData: { available },
		global: { provide: { cnLook: look } },
		provide: { cnLook: look },
		stubs: { NcActions: NcActionsStub, NcActionButton: NcActionButtonStub },
	})
}

function aiItem(wrapper) {
	return wrapper.findAllComponents(NcActionButtonStub).find((b) => b.text().includes('Open AI chat'))
}

describe('CnBuildiqEditButton: the AI chat in the square', () => {
	let companion

	beforeEach(() => {
		companion = { openPanel: jest.fn() }
		window.__cnAiCompanionPrimary = companion
		delete document.documentElement.dataset.cnAiLauncher
	})

	afterEach(() => {
		window.__cnAiCompanionPrimary = null
		delete document.documentElement.dataset.cnAiLauncher
	})

	it('lists Open AI chat under the board look and opens the companion', async () => {
		const wrapper = mountButton()
		const item = aiItem(wrapper)
		expect(item).toBeDefined()
		await item.trigger('click')
		expect(companion.openPanel).toHaveBeenCalled()
		wrapper.unmount()
	})

	it('hides the floating hex while the square is on the page', () => {
		const wrapper = mountButton()
		expect(document.documentElement.dataset.cnAiLauncher).toBe('menu')
		wrapper.unmount()
		expect(document.documentElement.dataset.cnAiLauncher).toBeUndefined()
	})

	it('keeps the hex while a second square is still mounted', () => {
		const first = mountButton()
		const second = mountButton()
		first.unmount()
		expect(document.documentElement.dataset.cnAiLauncher).toBe('menu')
		second.unmount()
		expect(document.documentElement.dataset.cnAiLauncher).toBeUndefined()
	})

	it('leaves the hex alone without the board look', () => {
		const wrapper = mountButton({ look: 'nextcloud' })
		expect(aiItem(wrapper)).toBeUndefined()
		expect(document.documentElement.dataset.cnAiLauncher).toBeUndefined()
		wrapper.unmount()
	})

	it('leaves the hex alone when the square is not available', () => {
		const wrapper = mountButton({ available: false })
		expect(document.documentElement.dataset.cnAiLauncher).toBeUndefined()
		wrapper.unmount()
	})

	it('lists no AI chat when no companion is on the page', () => {
		window.__cnAiCompanionPrimary = null
		const wrapper = mountButton()
		expect(aiItem(wrapper)).toBeUndefined()
		wrapper.unmount()
	})
})
