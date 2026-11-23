/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/index-copy-with-relations/tasks.md#task-2
 * @spec openspec/changes/index-copy-with-relations/tasks.md#task-4
 */
import { mount } from '@vue/test-utils'
import CnCopyDialog from '../../src/components/CnCopyDialog/CnCopyDialog.vue'

jest.mock('../../src/composables/useObjectCopy.js', () => {
	const actual = jest.requireActual('../../src/composables/useObjectCopy.js')
	return { ...actual, useObjectCopy: () => global.__copier }
})

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
	NcNoteCard: { template: '<div class="note"><slot /></div>' },
	NcLoadingIcon: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: {
		template: '<label><input type="checkbox" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked)"><slot /></label>',
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
	},
}
const item = { id: 'A1', title: 'Zaaksysteem X', '@self': { register: 'stack', schema: 'application' } }
const mountDialog = (props = {}) => mount(CnCopyDialog, { props: { item, ...props }, global: { stubs } })

beforeEach(() => {
	global.__copier = {
		available: jest.fn().mockResolvedValue(true),
		links: jest.fn().mockResolvedValue({
			incoming: { titles: Array.from({ length: 10 }, (_, i) => `Org ${i}`), total: 12 },
			relationRows: { titles: ['DigiD', 'Mail', 'Archief'], total: 3 },
		}),
	}
})

describe('CnCopyDialog without copy.include', () => {
	it('asks for the name pattern only, and reads no links', async () => {
		const w = mountDialog()
		await flush()
		expect(w.find('[data-testid="cn-copy-links"]').exists()).toBe(false)
		expect(global.__copier.links).not.toHaveBeenCalled()
		w.vm.executeCopy()
		expect(w.emitted('confirm')[0][0]).toEqual({ id: 'A1', newName: 'Copy of Zaaksysteem X' })
	})
})

describe('CnCopyDialog with copy.include', () => {
	it('lists the included kinds ticked, with counts and titles; a kind not included is absent', async () => {
		const w = mountDialog({ include: ['incoming', 'relationRows'] })
		await flush()
		expect(global.__copier.links).toHaveBeenCalledWith({ register: 'stack', schema: 'application', id: 'A1' }, ['incoming', 'relationRows'])
		const incoming = w.get('[data-testid="cn-copy-kind-incoming"]')
		expect(incoming.text()).toContain('Used by 12')
		expect(incoming.get('input').element.checked).toBe(true)
		expect(w.get('[data-testid="cn-copy-kind-relationRows"]').text()).toContain('Connections 3')
		expect(w.find('[data-testid="cn-copy-kind-files"]').exists()).toBe(false)
		expect(w.text()).toContain('Org 0')
		expect(w.text()).toContain('and 2 more')
	})

	it('confirms with the ticked kinds, and an unticked kind stays at home', async () => {
		const w = mountDialog({ include: ['incoming', 'relationRows'] })
		await flush()
		await w.get('[data-testid="cn-copy-kind-relationRows"] input').setValue(false)
		w.vm.executeCopy()
		expect(w.emitted('confirm')[0][0]).toEqual({ id: 'A1', newName: 'Copy of Zaaksysteem X', include: ['incoming'] })
	})

	it('names the links the server refused, with the reason, and links to the new object', async () => {
		const w = mountDialog({ include: ['incoming'] })
		await flush()
		w.vm.setResult({ success: true, url: '/apps/stack/applications/A2', links: [{ kind: 'incoming', title: 'Gemeente Y', ok: false, reason: 'you may not change it' }, { kind: 'incoming', title: 'Gemeente Z', ok: true }] })
		await w.vm.$nextTick()
		expect(w.get('[data-testid="cn-copy-refused"]').text()).toContain('Gemeente Y was not linked: you may not change it')
		expect(w.get('[data-testid="cn-copy-refused"]').text()).not.toContain('Gemeente Z')
		expect(w.get('[data-testid="cn-copy-new-object"]').attributes('href')).toBe('/apps/stack/applications/A2')
	})
})

describe('CnCopyDialog when the server cannot copy links', () => {
	it('shows the list read-only with the note, and copies the fields only', async () => {
		global.__copier.available.mockResolvedValue(false)
		const w = mountDialog({ include: ['incoming'] })
		await flush()
		expect(w.get('[data-testid="cn-copy-links-unavailable"]').text()).toContain('Links are not copied yet')
		expect(w.get('[data-testid="cn-copy-kind-incoming"] input').element.disabled).toBe(true)
		expect(w.text()).toContain('Org 0')
		w.vm.executeCopy()
		expect(w.emitted('confirm')[0][0]).toEqual({ id: 'A1', newName: 'Copy of Zaaksysteem X' })
	})

	it('treats an item with no register and schema the same way', async () => {
		const w = mountDialog({ include: ['files'], item: { id: 'X', title: 'No address' } })
		await flush()
		expect(w.find('[data-testid="cn-copy-links-unavailable"]').exists()).toBe(true)
		expect(global.__copier.links).not.toHaveBeenCalled()
	})
})
