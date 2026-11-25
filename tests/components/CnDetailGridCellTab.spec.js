/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A held-back detail grid cell mounts on the first Tab key press.
 *
 * @spec openspec/changes/properties-table-by-keyboard/specs/properties-table-by-keyboard/spec.md#requirement-a-detail-page-s-widgets-are-in-the-tab-order
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDetailGridCell, { revealOnTab } from '../../src/components/CnDetailPage/CnDetailGridCell.vue'

describe('revealOnTab', () => {
	it('reveals on Tab', () => {
		const reveal = jest.fn()
		expect(revealOnTab({ key: 'Tab' }, reveal)).toBe(true)
		expect(reveal).toHaveBeenCalled()
	})

	it('ignores other keys', () => {
		const reveal = jest.fn()
		expect(revealOnTab({ key: 'Enter' }, reveal)).toBe(false)
		expect(reveal).not.toHaveBeenCalled()
	})
})

describe('CnDetailGridCell and the keyboard', () => {
	const original = global.IntersectionObserver

	beforeEach(() => {
		global.IntersectionObserver = class {
			observe() {}
			disconnect() {}
		}
	})

	afterEach(() => {
		global.IntersectionObserver = original
	})

	it('mounts its content on the first Tab and stops listening', async () => {
		const wrapper = mount(CnDetailGridCell, { slots: { default: '<button>Withdraw</button>' }, attachTo: document.body })
		expect(wrapper.find('button').exists()).toBe(false)
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
		await nextTick()
		expect(wrapper.find('button').exists()).toBe(true)
		expect(wrapper.vm.onKeydown).toBeNull()
		wrapper.unmount()
	})

	it('stays held back on other keys', async () => {
		const wrapper = mount(CnDetailGridCell, { slots: { default: '<button>Withdraw</button>' }, attachTo: document.body })
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
		await nextTick()
		expect(wrapper.find('button').exists()).toBe(false)
		wrapper.unmount()
	})
})
