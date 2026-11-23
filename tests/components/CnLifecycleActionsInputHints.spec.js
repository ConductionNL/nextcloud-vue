/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/transition-input-reference-and-subfields/tasks.md#task-3
 */
import { mount } from '@vue/test-utils'
import CnLifecycleActions from '../../src/components/CnLifecycleActions/CnLifecycleActions.vue'

const serverActions = [{ action: 'recordMunicipalityFeedback', to: 'recorded', label: 'Record', inputs: [{ field: 'municipalityFeedback', required: true }] }]

function mountIt(config) {
	const w = mount(CnLifecycleActions, {
		props: { objectId: 'o1', object: { status: 'reported' }, config, display: 'menu' },
		global: { stubs: { CnTransitionInputDialog: true } },
	})
	w.vm.serverActions = serverActions
	return w
}

describe('lifecycleActions input hints', () => {
	let warn
	beforeEach(() => {
		warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})
	afterEach(() => warn.mockRestore())

	it('merges picker and fields onto the server input with the same field', async () => {
		const w = mountIt({ autoFetch: true, inputs: { recordMunicipalityFeedback: [{ field: 'municipalityFeedback', fields: ['masRoute', 'note'], picker: { filter: { a: 1 } } }] } })
		await w.vm.$nextTick()
		const [input] = w.vm.visibleTransitions[0].inputs
		expect(input).toEqual({ field: 'municipalityFeedback', required: true, fields: ['masRoute', 'note'], picker: { filter: { a: 1 } } })
	})

	it('ignores a hint for an undeclared field with one warning, and adds no input', async () => {
		const w = mountIt({ autoFetch: true, inputs: { recordMunicipalityFeedback: [{ field: 'extra', fields: ['x'] }] } })
		await w.vm.$nextTick()
		expect(w.vm.visibleTransitions[0].inputs.map((i) => i.field)).toEqual(['municipalityFeedback'])
		w.vm.visibleTransitions
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0][0]).toContain('extra')
	})

	it('leaves transitions alone without hints', async () => {
		const w = mountIt({ autoFetch: true })
		await w.vm.$nextTick()
		expect(w.vm.visibleTransitions[0].inputs).toEqual([{ field: 'municipalityFeedback', required: true }])
	})

	it('hands the dialog the current object and the register', async () => {
		const w = mount(CnLifecycleActions, {
			props: { objectId: 'o1', object: { id: 'o1' }, register: 'learniq', config: { transitions: [{ action: 'merge', to: 'merged', label: 'Merge', inputs: [{ field: 'mergedInto', required: true }] }] } },
		})
		w.vm.inputTransition = { action: 'merge', label: 'Merge', inputs: [{ field: 'mergedInto' }] }
		await w.vm.$nextTick()
		const dialog = w.findComponent({ name: 'CnTransitionInputDialog' })
		expect(dialog.props('register')).toBe('learniq')
		expect(dialog.props('currentObject')).toEqual({ id: 'o1' })
	})
})
