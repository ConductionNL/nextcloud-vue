/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/index-copy-with-relations/tasks.md#task-3
 */
import { mount } from '@vue/test-utils'
import CnMassCopyDialog from '../../src/components/CnMassCopyDialog/CnMassCopyDialog.vue'

jest.mock('../../src/composables/useObjectCopy.js', () => {
	const actual = jest.requireActual('../../src/composables/useObjectCopy.js')
	return { ...actual, useObjectCopy: () => global.__copier }
})

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
	NcNoteCard: { template: '<div><slot /></div>' },
	NcLoadingIcon: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: {
		template: '<label><input type="checkbox" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked)"><slot /></label>',
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
	},
}
const items = [{ id: 'A1', title: 'One', '@self': { register: 'stack', schema: 'application' } }, { id: 'A2', title: 'Two' }]
const mountDialog = (props = {}) => mount(CnMassCopyDialog, { props: { items, ...props }, global: { stubs } })

beforeEach(() => {
	global.__copier = { available: jest.fn().mockResolvedValue(true) }
})

describe('CnMassCopyDialog link kinds', () => {
	it('without include it is the dialog it was', async () => {
		const w = mountDialog()
		await flush()
		expect(w.find('[data-testid="cn-mass-copy-links"]').exists()).toBe(false)
		w.vm.executeCopy()
		expect(Object.keys(w.emitted('confirm')[0][0]).sort()).toEqual(['getName', 'ids'])
	})

	it('offers the included kinds ticked and confirms with them', async () => {
		const w = mountDialog({ include: ['incoming', 'files'] })
		await flush()
		expect(w.get('[data-testid="cn-mass-copy-kind-incoming"] input').element.checked).toBe(true)
		await w.get('[data-testid="cn-mass-copy-kind-files"] input').setValue(false)
		w.vm.executeCopy()
		expect(w.emitted('confirm')[0][0].include).toEqual(['incoming'])
	})

	it('read-only with a note, and fields only, when the server cannot copy links', async () => {
		global.__copier.available.mockResolvedValue(false)
		const w = mountDialog({ include: ['incoming'] })
		await flush()
		expect(w.find('[data-testid="cn-mass-copy-links-unavailable"]').exists()).toBe(true)
		expect(w.get('[data-testid="cn-mass-copy-kind-incoming"] input').element.disabled).toBe(true)
		w.vm.executeCopy()
		expect(w.emitted('confirm')[0][0].include).toBeUndefined()
	})

	it('lists the links the server refused, with the reason', async () => {
		const w = mountDialog({ include: ['incoming'] })
		await flush()
		w.vm.setResult({ success: true, links: [{ kind: 'incoming', title: 'Gemeente Y', ok: false, reason: 'no write access' }] })
		await w.vm.$nextTick()
		expect(w.get('[data-testid="cn-mass-copy-refused"]').text()).toContain('Gemeente Y was not linked: no write access')
	})
})
