/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/screens-dialog-parity/tasks.md#task-1
 */
import { mount } from '@vue/test-utils'
import { computed, h } from 'vue'
import { useLook } from '../../src/composables/useLook.js'

const Consumer = {
	props: { look: { type: String, default: '' } },
	setup(props) {
		const { look, isBoard, lookClass } = useLook(props)
		return () => h('div', { class: ['probe', lookClass.value], 'data-look': look.value, 'data-board': String(isBoard.value) })
	},
}

function render(props = {}, provide) {
	return mount(Consumer, { props, global: provide === undefined ? {} : { provide: { cnLook: provide } } })
}

describe('useLook', () => {
	it('is nextcloud and adds no class when nothing is set or provided', () => {
		const w = render()
		expect(w.attributes('data-look')).toBe('nextcloud')
		expect(w.classes()).not.toContain('cn-look-board')
	})

	it('reads the look CnAppRoot provides', () => {
		const w = render({}, 'board')
		expect(w.attributes('data-look')).toBe('board')
		expect(w.attributes('data-board')).toBe('true')
		expect(w.classes()).toContain('cn-look-board')
	})

	it('reads a provided ref (a page override) and unwraps it', () => {
		const w = render({}, computed(() => 'board'))
		expect(w.attributes('data-look')).toBe('board')
	})

	it('lets the look prop win over the provided value', () => {
		expect(render({ look: 'nextcloud' }, 'board').attributes('data-look')).toBe('nextcloud')
		expect(render({ look: 'board' }, 'nextcloud').classes()).toContain('cn-look-board')
	})

	it('falls back to nextcloud for an unknown value', () => {
		expect(render({ look: 'compact' }, 'board').attributes('data-look')).toBe('nextcloud')
	})

	it('puts the class on a container teleported to document.body', () => {
		const Teleporting = {
			props: { look: { type: String, default: '' } },
			setup(props) {
				const { lookClass } = useLook(props)
				return () => h('div', [h('div', { class: ['tp-container', lookClass.value] })])
			},
		}
		const w = mount(Teleporting, { props: { look: 'board' }, attachTo: document.body })
		expect(document.body.querySelector('.tp-container').classList.contains('cn-look-board')).toBe(true)
		w.unmount()
	})
})
